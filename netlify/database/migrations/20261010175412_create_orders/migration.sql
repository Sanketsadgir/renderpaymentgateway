CREATE TABLE "orders" (
	"order_id" text PRIMARY KEY,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"receipt" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"payment_id" text UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
