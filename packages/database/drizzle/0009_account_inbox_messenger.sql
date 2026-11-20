CREATE TABLE IF NOT EXISTS "inbox_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sender_type" varchar(32) DEFAULT 'bizx' NOT NULL,
  "sender_store_id" uuid REFERENCES "stores"("id") ON DELETE SET NULL,
  "sender_name" varchar(160) NOT NULL,
  "sender_avatar_url" text,
  "badge_type" varchar(32),
  "subject" varchar(255) NOT NULL,
  "can_reply" boolean DEFAULT false NOT NULL,
  "related_store_id" uuid REFERENCES "stores"("id") ON DELETE SET NULL,
  "last_message_preview" text,
  "last_message_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_threads_user_idx" ON "inbox_threads" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_threads_last_msg_idx" ON "inbox_threads" ("last_message_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbox_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "inbox_threads"("id") ON DELETE CASCADE,
  "sender_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "sender_role" varchar(32) DEFAULT 'system_bizx' NOT NULL,
  "sender_name" varchar(160) NOT NULL,
  "body" text,
  "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "read_by_recipient_at" timestamp,
  "read_by_staff_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_messages_thread_idx" ON "inbox_messages" ("thread_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_messages_created_idx" ON "inbox_messages" ("created_at");
