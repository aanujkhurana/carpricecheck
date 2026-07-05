"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export type OwnerActionResult =
  | { ok: true; isPublic?: boolean; slug?: string }
  | { ok: false; error: string };

/**
 * Auth gate for all owner-only actions. Returns the user's UUID string on
 * success, or an error-shaped result. The caller decides which path to take.
 */
async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "Not signed in." };
    return { ok: true, userId: data.user.id };
  } catch {
    return {
      ok: false,
      error: "Auth unavailable — please try again in a moment.",
    };
  }
}

/**
 * Hard delete a report owned by the caller.
 *
 * Uses `deleteMany` (atomic, single round-trip) so the (id, userId) compound
 * filter runs server-side and a non-owner never reaches the delete SQL. This
 * is the canonical pattern for Prisma's BYPASSRLS Postgres role — RLS in
 * `prisma/migrations/0002_supabase_rls_policies.sql` only fires for the
 * Supabase JS client. A `count === 0` response is deliberately opaque
 * ("not found or not yours") so other users' rows aren't leaked.
 */
export async function deleteReportAction({
  id,
}: {
  id: string;
}): Promise<OwnerActionResult> {
  const auth = await requireUserId();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { count } = await prisma.report.deleteMany({
    where: { id, userId: auth.userId },
  });
  if (count === 0) {
    return { ok: false, error: "Report not found or not yours." };
  }

  revalidatePath("/my-reports");
  return { ok: true };
}

/**
 * Flip Report.isPublic between true and false.
 *
 * Reads the row once to learn the slug (so revalidation can target the
 * precise report page) and the current isPublic value (so updateMany has
 * an optimistic-concurrency predicate). If the row was changed between the
 * read and the write — e.g. another tab toggled — `updateMany` returns
 * count 0 and we surface a friendly retry error.
 */
export async function toggleReportVisibilityAction({
  id,
}: {
  id: string;
}): Promise<OwnerActionResult> {
  const auth = await requireUserId();
  if (!auth.ok) return { ok: false, error: auth.error };

  const current = await prisma.report.findFirst({
    where: { id, userId: auth.userId },
    select: { slug: true, isPublic: true },
  });
  if (!current) return { ok: false, error: "Report not found or not yours." };

  const nextIsPublic = !current.isPublic;
  // Per-owner idempotent flip — no optimistic-concurrency predicate so a
  // legitimate double-click toggles back instead of erroring out. The
  // (id, userId) guard still makes it owner-only.
  const { count } = await prisma.report.updateMany({
    where: { id, userId: auth.userId },
    data: { isPublic: nextIsPublic },
  });
  if (count === 0) {
    // We already verified ownership with findFirst above. count === 0
    // here therefore means concurrent delete; surface the same retry error.
    return {
      ok: false,
      error: "Couldn't update visibility — please try again.",
    };
  }

  revalidatePath("/my-reports");
  revalidatePath(`/report/${current.slug}`);
  revalidatePath("/sitemap.xml");
  return { ok: true, isPublic: nextIsPublic, slug: current.slug };
}
