GLOBAL WINGS & LIVESTOCK — THREE-PAGE WEBSITE UPDATE

Files: index.html (Home), animals.html (Animals & Eggs), reviews-contact.html (Reviews & Contact), styles.css, script.js, sitemap.xml, robots.txt and assets/.

Upload all files/folders from this ZIP as the Worker static assets using Cloudflare's deployment screen. Keep the folder structure, especially assets/.

The payment section lists the methods supplied by the business: PayPal, Zelle, bank transfer, Cash App, Chime, Apple Pay and Venmo. It does not claim that online checkout is integrated; customers are instructed to confirm payment details directly. Availability can depend on customer location and provider eligibility.

The existing five customer feedback summaries are preserved. Public review submission, owner approval, secure owner login and saved owner replies require a database and server-side authentication and are NOT activated in this static website package. They must be built and configured separately before promising customers that submissions or replies are stored.

Google Search Console verification meta tag is preserved. Sitemap includes all three pages.

Review system source and setup notes are in README_BACKEND_SETUP.txt. It requires a Cloudflare D1 database, DB binding, ADMIN_PASSWORD and SESSION_SECRET Worker secrets, and deployment of worker.js. Do not deploy only static assets and assume the review service is active.
