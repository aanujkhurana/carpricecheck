-- =============================================================================
-- Phase 3 — Supabase Auth scaffold setup.
--
-- What this does:
--   1. Adds an FK from public.Profile.id → auth.users(id) ON DELETE CASCADE
--      so deleting an auth.users row cascades into the Profile mirror.
--      (Prisma's prior `prisma db push` created the Profile table; we just
--       need the FK since Prisma doesn't yet model cross-schema relations.)
--   2. Adds an AFTER INSERT trigger on auth.users that auto-creates the
--      corresponding public.Profile row so the mirror stays symmetric.
--   3. Adds a symmetrical AFTER DELETE trigger that cleans up a Profile row
--      if its auth.users row is deleted (the FK CASCADE already handles this
--      for ordinary deletes; the trigger is defensive/programmatic-delete
--      fallback for service-role operations).
--
-- Run AFTER `pnpm prisma db push` succeeds:
--   psql "$DATABASE_URL" -f prisma/migrations/0001_supabase_auth_setup.sql
-- OR paste into Supabase Dashboard → SQL Editor → New Query and Run.
--
-- Idempotent: FK is drop-and-recreated, triggers are drop-and-recreated,
-- function bodies use CREATE OR REPLACE.
-- =============================================================================

-- 1) Foreign key: Profile.id → auth.users(id).
--    Use a non-default constraint name so Prisma's own FK generator (which
--    picks `Profile_id_fkey` as the default) can coexist without us
--    accidentally dropping the wrong constraint if Prisma later adds a
--    self-referential FK on Profile.id.
ALTER TABLE "public"."Profile"
  DROP CONSTRAINT IF EXISTS "Profile_id_auth_users_fkey";

ALTER TABLE "public"."Profile"
  ADD CONSTRAINT "Profile_id_auth_users_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id")
  ON DELETE CASCADE;

-- 2) AFTER INSERT trigger on auth.users → auto-create Profile row.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- bypass any future RLS on Profile inserts
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public."Profile" (id, "createdAt", "updatedAt")
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3) AFTER DELETE trigger for symmetry; FK CASCADE is the primary path.
CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public."Profile" WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_auth_user();
