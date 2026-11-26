
const COOKIE = 'gwl_admin';

const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, ...extra }
  });
}

function b64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function unb64(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(
    atob(s + '='.repeat((4 - s.length % 4) % 4)),
    c => c.charCodeAt(0)
  );
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return b64(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(value)
    )
  );
}

async function token(secret) {
  const payload = b64(
    new TextEncoder().encode(
      JSON.stringify({
        exp: Date.now() + 8 * 60 * 60 * 1000,
        nonce: crypto.randomUUID()
      })
    )
  );

  return payload + '.' + await sign(payload, secret);
}

async function authorized(req, env) {
  const cookie = req.headers.get('Cookie') || '';
  const match = cookie.match(
    new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)')
  );

  if (!match) return false;

  const parts = match[1].split('.');
  const payload = parts[0];
  const signature = parts[1];

  if (!payload || !signature) return false;

  const expected = await sign(payload, env.SESSION_SECRET);

  if (signature.length !== expected.length) return false;

  let difference = 0;

  for (let i = 0; i < signature.length; i++) {
    difference |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  if (difference) return false;

  try {
    const data = JSON.parse(
      new TextDecoder().decode(unb64(payload))
    );
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

function sameOrigin(req) {
  return req.headers.get('Origin') === new URL(req.url).origin;
}

async function body(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) {
        return json({ error: 'Review service is not configured.' }, 503);
      }

      if (req.method === 'GET' && url.pathname === '/api/reviews') {
        const result = await env.DB.prepare(
          "SELECT id, name, location, rating, comment, reply FROM reviews WHERE status = 'approved' ORDER BY created_at DESC"
        ).all();

        return json({ reviews: result.results || [] });
      }

      if (req.method === 'POST' && !sameOrigin(req)) {
        return json({ error: 'Invalid request origin.' }, 403);
      }

      if (req.method === 'POST' && url.pathname === '/api/reviews') {
        const data = await body(req);

        if (
          !data ||
          typeof data.name !== 'string' ||
          typeof data.location !== 'string' ||
          typeof data.comment !== 'string' ||
          !Number.isInteger(data.rating) ||
          data.rating < 1 ||
          data.rating > 5
        ) {
          return json({ error: 'Please complete all review fields.' }, 400);
        }

        const name = data.name.trim();
        const location = data.location.trim();
        const comment = data.comment.trim();

        if (
          name.length < 2 || name.length > 80 ||
          location.length < 2 || location.length > 100 ||
          comment.length < 10 || comment.length > 1200
        ) {
          return json({ error: 'Please check the length of your details and review.' }, 400);
        }

        await env.DB.prepare(
          "INSERT INTO reviews (name, location, rating, comment, status, created_at) VALUES (?, ?, ?, ?, 'pending', datetime('now'))"
        ).bind(name, location, data.rating, comment).run();

        return json({
          ok: true,
          message: 'Review submitted for approval.'
        }, 201);
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/login') {
        if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
          return json({ error: 'Admin secrets are not configured.' }, 503);
        }

        const data = await body(req);
        const supplied = String(data?.password || '');

        if (supplied.length > 200 || supplied !== env.ADMIN_PASSWORD) {
          return json({ error: 'Incorrect password.' }, 401);
        }

        const session = await token(env.SESSION_SECRET);

        return json({ ok: true }, 200, {
          'Set-Cookie': `${COOKIE}=${session}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800`
        });
      }

      if (url.pathname.startsWith('/api/admin/')) {
        if (!await authorized(req, env)) {
          return json({ error: 'Please sign in again.' }, 401);
        }

        if (req.method === 'GET' && url.pathname === '/api/admin/reviews') {
          const pending = await env.DB.prepare(
            "SELECT * FROM reviews WHERE status = 'pending' ORDER BY created_at ASC"
          ).all();

          const approved = await env.DB.prepare(
            "SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC"
          ).all();

          return json({
            pending: pending.results || [],
            approved: approved.results || []
          });
        }

        if (req.method === 'POST' && url.pathname === '/api/admin/review-status') {
          const data = await body(req);

          if (
            !Number.isInteger(Number(data?.id)) ||
            !['approved', 'rejected'].includes(data?.status)
          ) {
            return json({ error: 'Invalid review action.' }, 400);
          }

          await env.DB.prepare(
            'UPDATE reviews SET status = ? WHERE id = ?'
          ).bind(data.status, Number(data.id)).run();

          return json({ ok: true });
        }

        if (req.method === 'POST' && url.pathname === '/api/admin/reply') {
          const data = await body(req);
          const reply = String(data?.reply || '').trim();

          if (!Number.isInteger(Number(data?.id)) || reply.length > 1500) {
            return json({ error: 'Please enter a reply of up to 1,500 characters.' }, 400);
          }

          await env.DB.prepare(
            "UPDATE reviews SET reply = ?, replied_at = datetime('now') WHERE id = ? AND status = 'approved'"
          ).bind(reply || null, Number(data.id)).run();

          return json({ ok: true });
        }

        if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
          return json({ ok: true }, 200, {
            'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0`
          });
        }
      }

      return json({ error: 'Not found.' }, 404);
    }

    return env.ASSETS.fetch(req);
  }
};
