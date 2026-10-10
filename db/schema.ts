import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// One row per Razorpay order. Amounts are stored in paise.
export const orders = pgTable("orders", {
  orderId: text("order_id").primaryKey(),
  amount: integer().notNull(),
  currency: text().notNull().default("INR"),
  receipt: text().notNull(),
  status: text().notNull().default("created"),
  paymentId: text("payment_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});
