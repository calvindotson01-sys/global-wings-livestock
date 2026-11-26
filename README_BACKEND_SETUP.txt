GLOBAL WINGS & LIVESTOCK — THREE-PAGE SITE + REVIEW SYSTEM

IMPORTANT: The static pages can be uploaded as assets, but the customer review service requires a Cloudflare Worker deployment with a D1 database binding and two Worker secrets. The review features are not live until these steps are completed.

FILES
- index.html, animals.html, reviews-contact.html: public pages
- admin.html: private owner dashboard (open /admin.html)
- reviews.js, admin.js: browser logic
- worker.js: API, secure signed admin session and static asset handler
- schema.sql: database tables and the five supplied review summaries
- wrangler.toml: deployment configuration template

CLOUDFLARE CONFIGURATION REQUIRED
1. In Cloudflare Dashboard, open Workers & Pages > D1 SQL Database > Create database. Name it gwl-reviews.
2. Open the new database > Console and execute the complete contents of schema.sql. This creates the reviews table and seeds the five existing customer feedback summaries as approved.
3. Open the Worker global-wings-livestock > Settings > Bindings > Add > D1 database. Set variable name DB and select gwl-reviews. Save.
4. Add Worker secrets under Settings > Variables and Secrets: ADMIN_PASSWORD (choose a strong unique password; never send it to ChatGPT) and SESSION_SECRET (a long random secret of at least 32 characters). These are server-side secrets.
5. Deploy worker.js as the Worker entry point with static assets directory set to this package's root and binding name ASSETS. Use wrangler.toml as the configuration template; replace database_id with the ID shown by Cloudflare. If deploying from the dashboard, ensure the Worker script is worker.js and the static assets are bound as ASSETS.
6. Once deployed, open /api/reviews to confirm it returns approved reviews, then open /admin.html and sign in with your ADMIN_PASSWORD. Test a new review; it must appear under Pending Reviews until you approve it.

SECURITY NOTES
- The admin password is never embedded in website HTML or JavaScript. Store it only as a Cloudflare Worker secret.
- The admin session is an HttpOnly, Secure, SameSite cookie, signed with SESSION_SECRET and expires after 8 hours.
- Public submissions are pending by default. Only the owner dashboard can approve/reject reviews or publish owner replies.
- Do not publish the admin password or SESSION_SECRET. Choose a unique strong password.
- The payment methods are informational only; no payment processor or checkout is integrated.
- Admin URL is /admin.html. It is noindex/nofollow, but security comes from server-side authentication, not from hiding the URL.

This package cannot configure your Cloudflare account or create the D1 database on your behalf. Complete the dashboard setup before announcing that customer reviews and replies are active.
