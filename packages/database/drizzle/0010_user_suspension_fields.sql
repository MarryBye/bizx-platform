ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspension_reason" text;
