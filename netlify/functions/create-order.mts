import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import { getKeys, json, readJson, toPaise } from "./_shared/razorpay.mts";

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const keys = getKeys();
  if (!keys) {
    return json({ error: "Payments are not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the site's environment variables." }, 503);
  }

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }

  const paise = toPaise(body.amount);
  if (paise === null) return json({ error: "Choose a valid amount from ₹1.00 to ₹1,00,00,000.00." }, 400);

  const receipt = `northstar_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keys.keyId}:${keys.keySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: paise, currency: "INR", receipt }),
    });
    const order = await response.json().catch(() => ({}));
    if (!response.ok || !order.id) {
      console.error("Razorpay order creation failed", response.status, order?.error?.description);
      return json({ error: order?.error?.description || "Razorpay could not create the order." }, 502);
    }

    await db.insert(orders).values({ orderId: order.id, amount: order.amount, currency: order.currency, receipt });
    return json({ keyId: keys.keyId, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error("create-order failed", error);
    return json({ error: "Unable to start checkout right now. Please try again." }, 502);
  }
};

export const config: Config = { path: "/api/create-order" };
