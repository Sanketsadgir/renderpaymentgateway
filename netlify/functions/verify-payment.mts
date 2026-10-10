import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import { getKeys, json, readJson } from "./_shared/razorpay.mts";

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const keys = getKeys();
  if (!keys) return json({ error: "Payments are not configured yet." }, 503);

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }

  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature)) {
    return json({ error: "Payment details could not be verified. Please contact support before retrying." }, 400);
  }

  const expected = createHmac("sha256", keys.keySecret).update(`${orderId}|${paymentId}`).digest();
  if (!timingSafeEqual(Buffer.from(signature, "hex"), expected)) {
    return json({ error: "Razorpay payment signature is invalid." }, 400);
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId));
    if (!order) return json({ error: "Order not found. Please contact support before retrying." }, 404);

    // Idempotent: a repeated verification for the same payment succeeds again.
    if (order.status === "paid") {
      return order.paymentId === paymentId
        ? json({ verified: true, paymentId })
        : json({ error: "This order has already been paid." }, 409);
    }

    await db
      .update(orders)
      .set({ status: "paid", paymentId, paidAt: new Date() })
      .where(and(eq(orders.orderId, orderId), eq(orders.status, "created")));
    return json({ verified: true, paymentId });
  } catch (error) {
    console.error("verify-payment failed", error);
    return json({ error: "Unable to record the payment. Please contact support." }, 500);
  }
};

export const config: Config = { path: "/api/verify-payment" };
