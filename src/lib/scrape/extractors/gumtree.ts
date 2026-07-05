// Gumtree.com.au extractor (cheerio).
//
// Gumtree's listing pages have most structured data inside an inline JSON
// object (~ `window.__INITIAL_STATE__` or similar) which we read first;
// DOM-level scraping is a fallback. Gumtree is comparatively loose on
// schema.org but its listing-detail JSON contains make/model/year/price
// reliably.

import * as cheerio from "cheerio";
import type { ScrapedListing } from "../types";
import {
  countFieldsFilled,
  normaliseDrive,
  normaliseFuel,
  normaliseState,
  normaliseTransmission,
  parseOdometerKm,
  parsePriceAud,
} from "../normalize";

export async function extractGumtree(html: string): Promise<ScrapedListing | null> {
  const $ = cheerio.load(html);

  const out: ScrapedListing = {};

  // ----- Inline JSON state pattern -----
  // Gumtree uses Redux-style hydration. We scan for candidate window-var
  // names that commonly carry listing-detail data, then bracket-match the
  // JSON object so we don't have to write a regex tolerant of excluded
  // characters inside the inline payload.
  const inlinePayloads = extractInlineStatePayloads(html);
  for (const raw of inlinePayloads) {
    try {
      const data = JSON.parse(raw) as unknown;
      const listing = findListingInState(data);
      if (listing) {
        applyListingToOut(listing, out);
        break;
      }
    } catch {/* keep scanning */}
  }

  // ----- Fallback: title + meta -----
  if (!out.make || !out.model) {
    const title = $('meta[property="og:title"]').attr("content")
      ?? $("h1").first().text()
      ?? $("title").text();
    const cleaned = title
      .replace(/\b(for sale|used|new|in [a-z ]+)\b/gi, "")
      .replace(/\b\d{4}\b/, "")
      .replace(/\s+/g, " ")
      .trim();
    const parts = cleaned.split(" ").filter(Boolean);
    if (parts.length >= 2 && !out.make) out.make = parts[0];
    if (parts.length >= 3 && !out.model) out.model = parts[1];
    if (parts.length >= 4 && !out.variant) out.variant = parts.slice(2).join(" ");
  }

  // Year from title.
  if (out.year == null) {
    const titleForYear = $("title").text();
    const yearMatch = titleForYear.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const y = Number(yearMatch[0]);
      if (y >= 1985 && y <= new Date().getFullYear() + 1) out.year = y;
    }
  }

  // Price from meta price tag.
  if (out.askingPrice == null) {
    const ogPrice =
      $('meta[property="product:price:amount"]').attr("content") ??
      $('meta[itemprop="price"]').attr("content");
    if (ogPrice) {
      const p = parsePriceAud(ogPrice);
      if (p != null) out.askingPrice = p;
    }
  }

  if (!out.make || !out.model || out.year == null) return null;
  const filled = countFieldsFilled(out as Record<string, unknown>);
  if (filled < 3) return null;
  return out;
}

interface MaybeListing {
  make?: unknown;
  model?: unknown;
  variant?: unknown;
  year?: unknown;
  price?: unknown;
  odometer?: unknown;
  transmission?: unknown;
  fuel?: unknown;
  drive?: unknown;
  state?: unknown;
  description?: unknown;
  image?: unknown;
  [k: string]: unknown;
}

/**
 * Candidate hydration-var names that Gumtree (and similar SSR sites) use to
 * embed listing-detail JSON inline. We look for these as `name =` markers
 * in the HTML and bracket-match the JSON value so we don't have to write a
 * regex tolerant of excluded characters in nested payloads.
 */
const HYDRATION_VARS = [
  "window.__INITIAL_STATE__ =",
  "window.__NEXT_DATA__ =",
  "window.__APOLLO_STATE__ =",
  "window.PRELOADED_STATE =",
];

/**
 * Returns the JSON-balanced substring for each hydration marker found in
 * `html`. Empty array if none found, or if no balanced object can be matched.
 */
function extractInlineStatePayloads(html: string): string[] {
  const out: string[] = [];
  for (const marker of HYDRATION_VARS) {
    const idx = html.indexOf(marker);
    if (idx < 0) continue;
    const start = html.indexOf("{", idx + marker.length);
    if (start < 0) continue;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < html.length; i++) {
      const c = html[i];
      if (inString) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          out.push(html.slice(start, i + 1));
          break;
        }
      }
    }
  }
  return out;
}

function findListingInState(state: unknown): MaybeListing | null {
  if (state == null) return null;
  if (typeof state !== "object") return null;
  // Heuristic: walk the tree, return the first object that has at least
  // 2 of {make, model, year, price, odometer}.
  const queue: unknown[] = [state];
  while (queue.length) {
    const node = queue.shift();
    if (node == null || typeof node !== "object") continue;
    if (Array.isArray(node)) {
      for (const v of node) queue.push(v);
      continue;
    }
    const obj = node as Record<string, unknown>;
    const hits =
      ("make" in obj ? 1 : 0) +
      ("model" in obj ? 1 : 0) +
      ("year" in obj ? 1 : 0) +
      ("price" in obj ? 1 : 0) +
      ("odometer" in obj ? 1 : 0);
    if (hits >= 2) return obj as MaybeListing;
    for (const v of Object.values(obj)) queue.push(v);
  }
  return null;
}

function applyListingToOut(l: MaybeListing, out: ScrapedListing): void {
  if (typeof l.make === "string") out.make = l.make;
  if (typeof l.model === "string") out.model = l.model;
  if (typeof l.variant === "string") out.variant = l.variant;
  if (typeof l.year === "number" || typeof l.year === "string") {
    const y = Number(l.year);
    if (Number.isFinite(y) && y >= 1985 && y <= new Date().getFullYear() + 1) {
      out.year = y;
    }
  }
  if (l.price != null) {
    const p = parsePriceAud(l.price as string | number | undefined);
    if (p != null) out.askingPrice = p;
  }
  if (l.odometer != null) {
    const km = parseOdometerKm(l.odometer as string | number | undefined);
    if (km != null) out.odometer = km;
  }
  if (typeof l.transmission === "string") {
    out.transmission = normaliseTransmission(l.transmission);
  }
  if (typeof l.fuel === "string") out.fuelType = normaliseFuel(l.fuel);
  if (typeof l.drive === "string") out.driveType = normaliseDrive(l.drive);
  if (typeof l.state === "string") out.state = normaliseState(l.state);
  if (typeof l.description === "string") out.description = l.description.slice(0, 2000);
  if (typeof l.image === "string") out.imageUrl = l.image;
}
