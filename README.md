# Northstar Razorpay checkout

A choose-your-amount INR checkout using Razorpay Standard Checkout, hosted on Netlify. The browser only ever receives the Razorpay Key ID. The Key Secret stays server-side in Netlify Functions, which create each order in paise and verify Razorpay's payment signature before the page shows success. Orders and their payment status are stored in Netlify Database.

## Project layout

- `public/index.html`: the checkout page (static).
- `netlify/functions/create-order.mts`: `POST /api/create-order`. Creates a Razorpay order and records it.
- `netlify/functions/verify-payment.mts`: `POST /api/verify-payment`. Checks the checkout signature and marks the order paid.
- `db/schema.ts`: the `orders` table (Drizzle ORM). Migrations are in `netlify/database/migrations/` and are applied automatically on deploy.

## Configure Razorpay keys

In the Netlify dashboard, go to **Project configuration → Environment variables** and add:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET` (mark it as a secret)

Start with test-mode keys, then redeploy. Never commit keys to the repository.

## Run locally

```bash
npm install
netlify dev
```

For local development, put test keys in a `.env` file (copy `.env.example`). Git ignores this file.

## Going further

For production fulfilment, also add a Razorpay webhook (`payment.captured`) so that an order is still marked paid if the customer closes the browser before verification finishes.
