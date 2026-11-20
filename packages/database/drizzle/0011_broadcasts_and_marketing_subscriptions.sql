ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "auto_discount_broadcast_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_marketing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'subscribed' NOT NULL,
	"source" varchar(48) DEFAULT 'storefront_button' NOT NULL,
	"prompt_shown_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broadcast_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" varchar(24) NOT NULL,
	"store_id" uuid,
	"created_by_user_id" uuid,
	"type" varchar(32) NOT NULL,
	"target_audience" jsonb DEFAULT '{"kind":"store_subscribers"}'::jsonb NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"attachment_url" text,
	"related_product_id" uuid,
	"recipients_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "store_marketing_subscriptions" ADD CONSTRAINT "store_marketing_subscriptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "store_marketing_subscriptions" ADD CONSTRAINT "store_marketing_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "store_marketing_subs_store_user_uidx" ON "store_marketing_subscriptions" USING btree ("store_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_marketing_subs_store_status_idx" ON "store_marketing_subscriptions" USING btree ("store_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_marketing_subs_user_idx" ON "store_marketing_subscriptions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_campaigns_scope_created_idx" ON "broadcast_campaigns" USING btree ("scope","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_campaigns_store_created_idx" ON "broadcast_campaigns" USING btree ("store_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcast_campaigns_product_created_idx" ON "broadcast_campaigns" USING btree ("related_product_id","created_at");
