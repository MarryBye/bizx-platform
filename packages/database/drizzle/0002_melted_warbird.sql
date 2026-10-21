ALTER TABLE "users" ADD COLUMN "status" varchar(50) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "store_categories" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "store_members" ADD COLUMN "archived_at" timestamp with time zone;