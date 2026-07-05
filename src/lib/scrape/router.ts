// Domain → extractor dispatch.
//
// Single responsibility: take a URL, decide which extractor runs, return
// the extracted `ScrapedListing` (or null on a parse-failure). Cache read
// + write lives in the caller (server action) so this stays pure.

import type { ScrapedListing } from "./types";
import { extractCarsales } from "./extractors/carsales";
import { extractGumtree } from "./extractors/gumtree";
import { extractFacebookMarketplace } from "./extractors/facebook-marketplace";

export type ExtractOutcome =
  | { ok: true; data: ScrapedListing; domain: string }
  | { ok: false; reason: "unsupported" | "fetch-failed" | "parse-failed" | "timeout" | "blocked" };

/** Returns the supported domain key (without "www.") or null when unsupported. */
export function domainSlug(rawUrl: string): string | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === "www.carsales.com.au" || host === "carsales.com.au") return "carsales";
  if (host === "www.gumtree.com.au" || host === "gumtree.com.au") return "gumtree";
  if (host === "www.facebook.com" || host === "facebook.com") return "facebook";
  return null;
}

/**
 * Run the right extractor for `rawUrl`. `html` is the page text already
 * fetched via `fetchUrl`; for FB Marketplace the html arg is unused
 * (extractor drives its own browser) and a separate code path runs.
 */
export async function dispatchExtract(
  rawUrl: string,
  html: string | null,
): Promise<ExtractOutcome> {
  const slug = domainSlug(rawUrl);
  if (!slug) return { ok: false, reason: "unsupported" };

  try {
    let data: ScrapedListing | null = null;
    if (slug === "carsales") {
      if (html == null) return { ok: false, reason: "fetch-failed" };
      data = await extractCarsales(html);
    } else if (slug === "gumtree") {
      if (html == null) return { ok: false, reason: "fetch-failed" };
      data = await extractGumtree(html);
    } else if (slug === "facebook") {
      data = await extractFacebookMarketplace(rawUrl);
    }
    if (!data) return { ok: false, reason: "parse-failed" };
    return { ok: true, data, domain: slug };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "timeout") return { ok: false, reason: "timeout" };
    if (msg === "blocked") return { ok: false, reason: "blocked" };
    if (msg.startsWith("fetch-failed")) return { ok: false, reason: "fetch-failed" };
    // Surface in server logs; treat as parse-failed for the user.
    console.error("[dispatchExtract]", msg);
    return { ok: false, reason: "parse-failed" };
  }
}
