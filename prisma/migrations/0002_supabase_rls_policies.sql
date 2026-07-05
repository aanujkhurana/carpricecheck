-- =============================================================================
-- Phase 3 — Supabase Row-Level-Security policies on public.Profile +
-- public.Report. Owner-only access for the Supabase JS client path; defense
-- in depth on top of the Prisma-side application guards.
--
-- Run AFTER `0001_supabase_auth_setup.sql` (which sets up the
-- Profile.id → auth.users.id FK + the AFTER INSERT / AFTER DELETE triggers
-- that mirror Profile rows). Apply via either:
--
--   psql "$DATABASE_URL" \
--     -f prisma/migrations/0002_supabase_rls_policies.sql
--   # OR
--   Supabase Dashboard → SQL Editor → New Query → paste + Run.
--
-- ⚠️  IMPORTANT CAVEAT — Prisma connection bypasses RLS:
--
--     PrismaPg connects via `postgresql://postgres:…@db.[ref].supabase.co:5432`.
--     The `postgres` role in Supabase is created with `BYPASSRLS = true` so
--     the Prisma client can perform administrative operations (db push,
--     migrations, internal queries). As a result the policies below do NOT
--     fire for queries issued through the Prisma client.
--
--     The policies DO fire for:
--       • The Supabase JS client running in the browser (anon / authenticated
--         role via the anon key).
--       • Any future OAuth / PostgREST caller running as `anon` or
--         `authenticated`.
--       • The PrismaPg adapter IF we later switch DATABASE_URL to a
--         non-bypass-RLS role (e.g. the `authenticated` Supabase role via
--         Pooler port 6543), accepting a separate admin URL for db push.
--
--     This is the standard Supabase + Prisma split: Prisma is the trusted
--     admin path (auth checks live in app code), the Supabase JS client
--     is the user-facing-restricted path (RLS enforces ownership here).
--
-- Idempotent: `ALTER TABLE … ENABLE ROW LEVEL SECURITY` is a no-op if RLS is
-- already enabled; policies use `DROP POLICY IF EXISTS` + `CREATE POLICY`,
-- safe to re-run.
-- =============================================================================


-- ─── 1) Profile ────────────────────────────────────────────────────────────
ALTER TABLE "public"."Profile" ENABLE ROW LEVEL SECURITY;

-- Owner can SELECT their own row.
DROP POLICY IF EXISTS "profile_owner_select" ON "public"."Profile";
CREATE POLICY "profile_owner_select" ON "public"."Profile"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "id");

-- Owner can UPDATE their own row.
DROP POLICY IF EXISTS "profile_owner_modify" ON "public"."Profile";
CREATE POLICY "profile_owner_modify" ON "public"."Profile"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = "id")
  WITH CHECK (auth.uid() = "id");

-- Profile rows are auto-created by the AFTER INSERT trigger on auth.users
-- (see 0001 migration, runs as SECURITY DEFINER bypassing RLS). Forbid
-- direct inserts from the authenticated role so the trigger remains the
-- single source of truth.
DROP POLICY IF EXISTS "profile_no_direct_insert" ON "public"."Profile";
CREATE POLICY "profile_no_direct_insert" ON "public"."Profile"
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Direct DELETE on Profile is denied by default. The auth.users AFTER
-- DELETE trigger (0001) handles owner cleanup via FK CASCADE. Uncomment
-- the policy below if you later want explicit user-driven Profile.delete().
-- DROP POLICY IF EXISTS "profile_owner_delete" ON "public"."Profile";
-- CREATE POLICY "profile_owner_delete" ON "public"."Profile"
--   FOR DELETE
--   TO authenticated
--   USING (auth.uid() = "id");


-- ─── 2) Report ─────────────────────────────────────────────────────────────
ALTER TABLE "public"."Report" ENABLE ROW LEVEL SECURITY;

-- Anyone with a Supabase session can SELECT a public report; the owner can
-- SELECT any of their own reports, including private ones.
--
-- ⚠️  Anonymous (`anon` role) traffic is intentionally NOT granted SELECT.
--     Public-by-isPublic rows are served by Next.js pages (Prisma path),
--     not by the raw Supabase JS client. This keeps anonymous data-
--     scraping from skipping the Next.js layer.
DROP POLICY IF EXISTS "report_public_or_owner_select" ON "public"."Report";
CREATE POLICY "report_public_or_owner_select" ON "public"."Report"
  FOR SELECT
  TO authenticated
  USING (
    "isPublic" = true
    OR auth.uid() = "userId"
  );

-- Owner can INSERT their own reports. Strict: a `null` userId is rejected
-- from the Supabase JS client path. Backfilling `null` rows for migration
-- scripts is still possible via Prisma (BYPASSRLS=true on `postgres`).
DROP POLICY IF EXISTS "report_owner_insert" ON "public"."Report";
CREATE POLICY "report_owner_insert" ON "public"."Report"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = "userId");

-- Owner can UPDATE their own reports.
DROP POLICY IF EXISTS "report_owner_update" ON "public"."Report";
CREATE POLICY "report_owner_update" ON "public"."Report"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

-- Owner can DELETE their own reports.
DROP POLICY IF EXISTS "report_owner_delete" ON "public"."Report";
CREATE POLICY "report_owner_delete" ON "public"."Report"
  FOR DELETE
  TO authenticated
  USING (auth.uid() = "userId");
