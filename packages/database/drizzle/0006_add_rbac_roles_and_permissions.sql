CREATE TABLE IF NOT EXISTS "permissions" (
  "id" smallint PRIMARY KEY NOT NULL,
  "code" varchar(80) NOT NULL UNIQUE,
  "scope" varchar(20) NOT NULL,
  "category" varchar(40) NOT NULL,
  "action" varchar(20) NOT NULL,
  "owner_only" boolean DEFAULT false NOT NULL,
  "description_uk" varchar(255) NOT NULL,
  "description_en" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope" varchar(20) NOT NULL,
  "store_id" uuid REFERENCES "stores"("id") ON DELETE cascade,
  "name" varchar(100) NOT NULL,
  "icon" varchar(40) DEFAULT '🛡️' NOT NULL,
  "color" varchar(20) DEFAULT '#334155' NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_scope_store_idx" ON "roles" USING btree ("scope", "store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_priority_idx" ON "roles" USING btree ("priority");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE cascade,
  "permission_id" smallint NOT NULL REFERENCES "permissions"("id") ON DELETE cascade,
  CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id", "permission_id")
);
--> statement-breakpoint
ALTER TABLE "store_members" ADD COLUMN IF NOT EXISTS "role_id" uuid REFERENCES "roles"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "store_members" ADD COLUMN IF NOT EXISTS "is_custom" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "store_members" ADD COLUMN IF NOT EXISTS "custom_priority" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_member_permissions" (
  "store_member_id" uuid NOT NULL REFERENCES "store_members"("id") ON DELETE cascade,
  "permission_id" smallint NOT NULL REFERENCES "permissions"("id") ON DELETE cascade,
  CONSTRAINT "store_member_permissions_store_member_id_permission_id_pk" PRIMARY KEY("store_member_id", "permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role_id" uuid REFERENCES "roles"("id") ON DELETE set null,
  "is_custom" boolean DEFAULT false NOT NULL,
  "custom_priority" integer DEFAULT 0 NOT NULL,
  "department" varchar(100),
  "is_owner" boolean DEFAULT false NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_members_user_idx" ON "platform_members" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_member_permissions" (
  "platform_member_id" uuid NOT NULL REFERENCES "platform_members"("id") ON DELETE cascade,
  "permission_id" smallint NOT NULL REFERENCES "permissions"("id") ON DELETE cascade,
  CONSTRAINT "platform_member_permissions_platform_member_id_permission_id_pk" PRIMARY KEY("platform_member_id", "permission_id")
);
