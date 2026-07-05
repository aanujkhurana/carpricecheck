"use server";

// Server action: Extract listing metadata from a URL the user pasted.
//
// Mirrors `createReportAction`'s IP-based rate-limit pattern. Reads cache
// first; on miss, dispatches to the right cheerio / Playwright extractor
// and writes the parsed payload back. Returns a discriminated result so
// the form can render precise error messages (don't auto-fill on a bad
// parse).

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { canonicalizeUrl, fetchUrl, pickDomain } from "@/lib/scrape/fetcher";
import { getCached, setCached } from "@/lib/scrape/cache";
import { dispatchExtract, domainSlug } from "@/lib/scrape/router";
import type { PartialVehicleInput } from "@/lib/types/vehicle-input-partial";
import { countFieldsFilled } from "@/lib/scrape/normalize";
import type { ScrapeResult } from "@/lib/scrape/types";

const RATE_MAX = 10;            // 10 extractions per IP
const RATE_WINDOW_MS = 15 * 60_000;

/** Map a ScrapeCache Domain and the extractor's ScrapedListing to a Partial<VehicleInput>. */
function toVehiclePartial(
  d: import("@/lib/scrape/types").ScrapedListing,
): PartialVehicleInput {
  const out: PartialVehicleInput = {};
  if (d.make) out.make = d.make;
  if (d.model) out.model = d.model;
  if (d.variant) out.variant = d.variant;
  if (d.year != null) out.year = d.year;
  if (d.askingPrice != null) out.askingPrice = d.askingPrice;
  if (d.odometer != null) out.odometer = d.odometer;
  if (d.transmission) out.transmission = d.transmission;
  if (d.fuelType) out.fuelType = d.fuelType;
  if (d.driveType) out.driveType = d.driveType;
  if (d.state) out.state = d.state;
  if (d.description) out.description = d.description;
  if (d.imageUrl) out.imageUrl = d.imageUrl;
  return out;
}

export async function extractListingAction(
  url: string,
): Promise<ScrapeResult> {
  // ----- Rate limit (IP-keyed like the rest of the codebase) -----
  const reqHeaders = await headers();
  let ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    reqHeaders.get("x-real-ip") ??
    "anonymous";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  const rl = rateLimit(`extract-listing:${ip}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    const minutes = Math.ceil(rl.retryAfterMs / 60_000);
    return {
      ok: false,
      reason: "rate-limited",
      error: `Too many extractions. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  // ----- Validate URL -----
  const canonical = canonicalizeUrl(url);
  if (!canonical) {
    return { ok: false, reason: "invalid-url", error: "That doesn't look like a valid URL." };
  }
  if (!domainSlug(canonical)) {
    const host = pickDomain(canonical);
    return {
      ok: false,
      reason: "unsupported",
      error: host
        ? `We don't currently support ${host}. Carsales, Gumtree AU and Facebook Marketplace are supported.`
        : "We don't currently support that website.",
    };
  }

  // ----- Cache lookup -----
  const cached = await getCached(canonical);
  if (cached) {
    const partial = toVehiclePartial(cached);
    return {
      ok: true,
      partial,
      sourceDomain: domainSlug(canonical) ?? "",
      fieldsFilled: countFieldsFilled(partial as Record<string, unknown>),
      cached: true,
    };
  }

  // ----- Fetch + dispatch -----
  let html: string | null = null;
  if (domainSlug(canonical) !== "facebook") {
    try {
      html = await fetchUrl(canonical);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "timeout") {
        return { ok: false, reason: "timeout", error: "The site took too long to respond. Try again, or enter the details manually." };
      }
      if (msg === "blocked") {
        return {
          ok: false,
          reason: "blocked",
          error: "The site appears to be blocking automated access. Please enter the details manually.",
        };
      }
      return {
        ok: false,
        reason: "fetch-failed",
        error: "We couldn't load that listing page. Check the URL or try entering the details manually.",
      };
    }
  }

  const outcome = await dispatchExtract(canonical, html);
  if (!outcome.ok) {
    switch (outcome.reason) {
      case "unsupported":
        return { ok: false, reason: "unsupported", error: "That website isn't currently supported." };
      case "fetch-failed":
        return {
          ok: false,
          reason: "fetch-failed",
          error: "We couldn't load that listing page. Check the URL or try entering the details manually.",
        };
      case "timeout":
        return {
          ok: false,
          reason: "timeout",
          error: "The site took too long to respond. Try again, or enter the details manually.",
        };
      case "blocked":
        return {
          ok: false,
          reason: "blocked",
          error: "The site appears to be blocking automated access. Please enter the details manually.",
        };
      case "parse-failed":
      default:
        return {
          ok: false,
          reason: "parse-failed",
          error: "We couldn't read the listing details automatically. Please enter them manually — we kept your URL for provenance.",
        };
    }
  }

  // ----- Persist + return -----
  try {
    await setCached(canonical, domainSlug(canonical) ?? "unknown", outcome.data);
  } catch (err) {
    // Cache write failure must NOT break the success path — log and move on.
    console.warn("[extractListingAction] cache write failed:", err);
  }
  const partial = toVehiclePartial(outcome.data);
  return {
    ok: true,
    partial,
    sourceDomain: outcome.domain,
    fieldsFilled: countFieldsFilled(partial as Record<string, unknown>),
    cached: false,
  };
}
