-- 0008: Order messaging, disputes, escrow/refund offers, store strikes, star reviews, and custom storefront domains

ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "custom_domain" varchar(255),
  ADD COLUMN IF NOT EXISTS "custom_domain_verified" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "domain_verification_token" varchar(120),
  ADD COLUMN IF NOT EXISTS "suspended_until" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "suspension_reason" text,
  ADD COLUMN IF NOT EXISTS "payout_balance" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "rating_avg" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "rating_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stores_custom_domain_unique" ON "stores" ("custom_domain") WHERE "custom_domain" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "payout_status" varchar(30) DEFAULT 'held' NOT NULL,
  ADD COLUMN IF NOT EXISTS "refund_offer_status" varchar(30),
  ADD COLUMN IF NOT EXISTS "refund_offer_amount" integer,
  ADD COLUMN IF NOT EXISTS "refund_offer_reason" text,
  ADD COLUMN IF NOT EXISTS "refund_offered_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "refund_offered_at" timestamp with time zone;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "order_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "sender_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "sender_type" varchar(20) NOT NULL,
  "body" text,
  "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "read_by_customer_at" timestamp with time zone,
  "read_by_store_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_messages_order_created_idx" ON "order_messages" ("order_id", "created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "order_disputes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "customer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "category" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(30) DEFAULT 'open_store' NOT NULL,
  "escalated_at" timestamp with time zone,
  "escalation_reason" text,
  "resolved_at" timestamp with time zone,
  "resolved_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "resolution_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_disputes_order_idx" ON "order_disputes" ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_disputes_store_status_idx" ON "order_disputes" ("store_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_disputes_status_idx" ON "order_disputes" ("status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "store_strikes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "dispute_id" uuid REFERENCES "order_disputes"("id") ON DELETE SET NULL,
  "issued_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reason" text NOT NULL,
  "suspension_days" integer,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "revoked_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "revoke_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_strikes_store_idx" ON "store_strikes" ("store_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "store_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "order_id" uuid NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE CASCADE,
  "customer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_reviews_store_created_idx" ON "store_reviews" ("store_id", "created_at");
