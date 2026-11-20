-- 0007: Full RBAC normalization — remove redundant role strings, i18n-only permissions, nullable lucide role icons

ALTER TABLE "permissions" DROP COLUMN IF EXISTS "description_uk";--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "description_en";--> statement-breakpoint

ALTER TABLE "roles" ALTER COLUMN "icon" TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "icon" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "icon" DROP DEFAULT;--> statement-breakpoint

UPDATE "roles" SET "icon" = 'crown' WHERE "icon" = '👑';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'briefcase' WHERE "icon" = '💼';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'shopping-bag' WHERE "icon" = '🛒';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'zap' WHERE "icon" = '⚡';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'headphones' WHERE "icon" = '🎧';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'coffee' WHERE "icon" = '☕';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'package' WHERE "icon" = '📦';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'flame' WHERE "icon" = '🔥';--> statement-breakpoint
UPDATE "roles" SET "icon" = 'shield' WHERE "icon" = '🛡️';--> statement-breakpoint

ALTER TABLE "store_members" DROP COLUMN IF EXISTS "role";--> statement-breakpoint

ALTER TABLE "users" DROP COLUMN IF EXISTS "role";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "system_role";
