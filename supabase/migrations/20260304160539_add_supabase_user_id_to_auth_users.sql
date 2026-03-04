-- Add supabase_user_id column to auth_users for faster Supabase Auth lookups.
-- Nullable because existing users don't have this set yet.
-- Will be populated on next login via the /auth/callback route.

ALTER TABLE "auth_users" ADD COLUMN IF NOT EXISTS "supabase_user_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "auth_users_supabase_user_id_idx"
  ON "auth_users" ("supabase_user_id")
  WHERE "supabase_user_id" IS NOT NULL;
