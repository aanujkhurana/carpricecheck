"use server";

// Server action: validate input → run AI provider → persist Report.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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

  // ----- De-dupe by sourceUrl -----
  if (input.sourceUrl) {
    const existing = await prisma.report.findFirst({
      where: {
        sourceUrl: input.sourceUrl,
        askingPrice: input.askingPrice,
        year: input.year,
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
      await tx.report.create({
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
