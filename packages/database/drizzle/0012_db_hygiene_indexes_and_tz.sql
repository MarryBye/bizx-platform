-- Hot performance indexes for auth, RBAC, orders, products & stores
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_members_user_idx" ON "store_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_store_created_idx" ON "orders" USING btree ("store_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_customer_created_idx" ON "orders" USING btree ("customer_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_store_active_idx" ON "products" USING btree ("store_id", "is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stores_owner_status_idx" ON "stores" USING btree ("owner_id", "status");
--> statement-breakpoint
-- Align custom_domain uniqueness to active (non-archived) stores only
ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_custom_domain_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stores_custom_domain_active_uidx" ON "stores" USING btree ("custom_domain") WHERE ("custom_domain" IS NOT NULL AND "archived_at" IS NULL);
--> statement-breakpoint
-- Standardize inbox timestamps to TIMESTAMPTZ
ALTER TABLE "inbox_threads" ALTER COLUMN "last_message_at" TYPE timestamp with time zone USING "last_message_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "inbox_threads" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "inbox_threads" ALTER COLUMN "updated_at" TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "inbox_messages" ALTER COLUMN "read_by_recipient_at" TYPE timestamp with time zone USING "read_by_recipient_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "inbox_messages" ALTER COLUMN "read_by_staff_at" TYPE timestamp with time zone USING "read_by_staff_at" AT TIME ZONE 'UTC';
--> statement-breakpoint
ALTER TABLE "inbox_messages" ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';
