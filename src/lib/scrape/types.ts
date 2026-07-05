// Shared types for the ScrapeCache infra.
//
// EXTRACTOR_VERSION is bumped when any extractor's parsing logic changes,
// forcing cached payloads with the old version to be discarded — avoids
// silently serving stale partial inputs when selectors shift upstream.

import type { VehicleInput } from "@/lib/schemas";

/** Bumped whenever an extractor's parsing logic changes. */
export const EXTRACTOR_VERSION = "v1-2026-07";

/** Domains we currently support. Anything else returns `unsupported`. */
export const SUPPORTED_DOMAINS = [
  "carsales.com.au",
  "www.carsales.com.au",
  "gumtree.com.au",
  "www.gumtree.com.au",
  "facebook.com",
  "www.facebook.com",
] as const;

export type SupportedDomain = (typeof SUPPORTED_DOMAINS)[number];

/**
 * What an extractor returns. We don't try to fill every field of
 * `VehicleInput` — most sellers omit, e.g. drivetrain. Empty/`undefined`
 * fields are skipped on the client; the user can fill the rest.
 */
export interface ScrapedListing {
  /** Optional headline that the extractor is confident about. */
  make?: string;
  model?: string;
  variant?: string;
  year?: number;
  askingPrice?: number;
  odometer?: number;
  transmission?: "auto" | "manual" | "cvt" | "dct" | "other";
  fuelType?:
    | "petrol"
    | "diesel"
    | "hybrid"
    | "plug-in-hybrid"
    | "electric"
    | "lpg";
  driveType?: "fwd" | "rwd" | "awd" | "4wd";
  state?: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
  description?: string;
  imageUrl?: string;
}

/**
 * Discriminated union returned by the server action. The client uses
 * `result.ok` + `result.partial` to fill form fields; on failure, the
 * inline `error` lets the form render a tight, actionable message.
 */
export type ScrapeResult =
  | {
      ok: true;
      partial: Partial<VehicleInput>;
      sourceDomain: string;
      fieldsFilled: number;
      cached: boolean;
    }
  | {
      ok: false;
      reason:
        | "unsupported"
        | "invalid-url"
        | "fetch-failed"
        | "parse-failed"
        | "timeout"
        | "blocked"
        | "rate-limited";
      error: string;
    };
