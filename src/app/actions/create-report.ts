"use server";

// Server action: validate input → run AI provider → persist Report.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VehicleInputSchema, type VehicleInput } from "@/lib/schemas";
import { ai } from "@/lib/ai/provider";
import { prisma } from "@/lib/db";
import { buildReportSlug } from "@/lib/slug";
import { rateLimit } from "@/lib/rate-limit";

export type CreateReportState =
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | { ok: true; slug: string };

const RATE_MAX = 5;             // 5 reports
const RATE_WINDOW_MS = 15 * 60_000; // per 15 min per IP

export async function createReportAction(
  _prev: CreateReportState | null,
  formData: FormData,
): Promise<CreateReportState> {
  // ----- Optional owner attribution -----
  // We don't gate the action on auth (anonymous flow stays intact); we only
  // attach `userId` if a Supabase session is present. Wrapped in try/catch
  // so a missing Supabase env doesn't break anonymous report creation.
  let ownerUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) ownerUserId = data.user.id;
  } catch {
    ownerUserId = null;
  }

  // ----- Rate limit -----
  const reqHeaders = await headers();
  let ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    reqHeaders.get("x-real-ip") ??
    "anonymous";
  // Strip IPv6-mapped IPv4 prefix if present (::ffff:1.2.3.4)
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  const rl = rateLimit(`create-report:${ip}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    const minutes = Math.ceil(rl.retryAfterMs / 60_000);
    return {
      ok: false,
      error: `You're generating reports too quickly. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  // ----- Parse + validate -----
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of formData.entries()) raw[k] = v;

  const parsed = VehicleInputSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const input: VehicleInput = parsed.data;

  // ----- De-dupe by sourceUrl (per-owner) -----
  // Scoped to the caller's userId so two users re-listing the same listing
  // each get their own report. For anonymous flows, ownerUserId is null and
  // Prisma's `where: { userId: null }` matches existing anonymous rows.
  if (input.sourceUrl) {
    const existing = await prisma.report.findFirst({
      where: {
        sourceUrl: input.sourceUrl,
        askingPrice: input.askingPrice,
        year: input.year,
        userId: ownerUserId,
      },
    });
    if (existing) return { ok: true, slug: existing.slug };
  }

  // ----- AI generation -----
  let payload;
  try {
    payload = await ai.generateReport(input);
  } catch (err) {
    console.error("[createReportAction] AI generation failed:", err);
    return {
      ok: false,
      error: "Our AI couldn't generate this report. Please try again in a moment.",
    };
  }

  // ----- Persist (transactional) -----
  let sourceDomain: string | null = null;
  if (input.sourceUrl) {
    try {
      sourceDomain = new URL(input.sourceUrl).hostname;
    } catch {/* ignore malformed URL */}
  }
  const slug = buildReportSlug({
    year: input.year,
    make: input.make,
    model: input.model,
    variant: input.variant,
    state: input.state,
  });

  try {
    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: {
          make: input.make,
          model: input.model,
          year: input.year,
          variant: input.variant ?? null,
          odometer: input.odometer ?? null,
          transmission: input.transmission ?? null,
          fuelType: input.fuelType ?? null,
          driveType: input.driveType ?? null,
          vin: input.vin ?? null,
          askingPrice: input.askingPrice,
          sellerType: input.sellerType ?? null,
          state: input.state ?? null,
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
        },
      });
      const report = await tx.report.create({
        data: {
          slug,
          reportJson: JSON.stringify(payload),
          make: input.make,
          model: input.model,
          year: input.year,
          variant: input.variant ?? null,
          state: input.state ?? null,
          askingPrice: input.askingPrice,
          dealRating: payload.dealRating,
          verdict: payload.verdict,
          fairValueLow: payload.fairMarketValue.range.low,
          fairValueHigh: payload.fairMarketValue.range.high,
          sourceUrl: input.sourceUrl ?? null,
          sourceDomain,
          isPublic: true,
          vehicleId: vehicle.id,
        },
      });
      if (ownerUserId !== null) {
        // ⚠ Prisma 7 typing workaround — DO NOT copy this pattern into
        // other create paths until Prisma 8 ships typed
        // ReportUncheckedCreateInput for nullable Profile? relations.
        // The relation connect syntax `user: { connect: { id } }` IS
        // writable, but the inferred
        // `Without<ReportCreateInput, ReportUncheckedCreateInput> &
        // ReportUncheckedCreateInput` type rejects both `user` and
        // `userId`. We bypass with a parameterized `$executeRaw` cast:
        // `${ownerUserId}::uuid` narrows to the @db.Uuid column type;
        // SQL injection is impossible because parameters are bound
        // server-side, never concatenated into the query string.
        await tx.$executeRaw`UPDATE "Report" SET "userId" = ${ownerUserId}::uuid WHERE "id" = ${report.id}`;
      }
    });
  } catch (err) {
    console.error("[createReportAction] Persist failed:", err);
    return {
      ok: false,
      error: "We couldn't save your report. Please try again.",
    };
  }

  // Fire-and-forget analytics (best-effort)
  prisma.analyticsEvent
    .create({ data: { event: "report_created", path: "/check" } })
    .catch(() => {/* ignore */});

  revalidatePath("/");
  return { ok: true, slug };
}
