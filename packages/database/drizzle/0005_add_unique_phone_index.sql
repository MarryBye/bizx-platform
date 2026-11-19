CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_unique_idx" ON "users" USING btree ("phone") WHERE "phone" IS NOT NULL;
