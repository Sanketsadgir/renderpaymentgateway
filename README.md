# Northstar Razorpay checkout

A choose-your-amount INR checkout using Razorpay Standard Checkout. The browser receives only the Razorpay Key ID. The Key Secret stays on the server. The server creates each order in paise and verifies Razorpay's checkout signature before showing success.

## Deploy as a website with Render

1. Push this folder to a GitHub repository.
2. In Render, create a new **Blueprint** and connect that repository. Render will read `render.yaml` and set up the Node web service.
3. When prompted, enter `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the Razorpay Dashboard. Use test-mode keys first; keep the Key Secret in Render's environment settings, never in source files.
4. Deploy and open the `onrender.com` URL shown for the service. Test a payment using Razorpay's test mode before switching to live keys.

Render deploys pushes to the connected branch automatically. Its environment settings are used for API keys; the local `.env` file is excluded from Git.

## Run locally

1. Install Node.js 18 or newer.
2. Copy your Razorpay test credentials into `.env`:

```text
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

3. Run `npm start` and open http://localhost:3000.

For live payments, use live keys after Razorpay activates your account. This starter keeps pending order IDs in memory for signature checks; use a persistent database and Razorpay webhooks for production order fulfillment.
