// Carsales.com.au extractor (cheerio).
//
// Strategy:
//   1. JSON-LD `schema.org/Vehicle` block (canonical structured data CarSales
//      publishes on every listing page) -> primary signal for most fields.
//   2. Open Graph + meta tags + DOM heuristics as fallback for fields that
//      aren't in JSON-LD (year, odometer, transmission).
//
// Selector-level DOM scraping is intentionally conservative — Carsales
// change CSS classes with redesigns, but schema.org tends to be stable.
//
// TypeScript narrowing: schema.org uses `string | { name?: string }` for
// `brand`, `vehicleTransmission`, `contentLocation`, and a more complex
// `number | string | { value?: ... }` for `mileageFromOdometer`. Optional
// chains alone don't narrow the underlying union, so the helpers below
// take `unknown` and re-narrow inside (avoids the indexed-access-type
// collapse-to-`never` issue we hit when helpers took `SchemaOrgVehicle["brand"]`).

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

interface SchemaOrgVehicle {
  "@type"?: string | string[];
  name?: string;
  brand?: { name?: string } | string;
  model?: string;
  vehicleModelDate?: number | string;
  mileageFromOdometer?:
    | { value?: number | string; unitText?: string }
    | string
    | number;
  fuelType?: string;
  vehicleTransmission?: string | { name?: string };
  driveWheelConfiguration?: string;
  vehicleConfiguration?: string;
  offers?: {
    price?: number | string;
    priceCurrency?: string;
    availability?: string;
  };
  description?: string;
  image?: string | string[];
  contentLocation?: { name?: string } | string;
}

/** Narrow `unknown` -> `string | undefined`. Picks `string` directly, or
 *  the `.name` of a non-array object with a string `name`. */
function namedStringField(b: unknown): string | undefined {
  if (typeof b === "string") return b;
  if (b && typeof b === "object" && !Array.isArray(b) && "name" in b) {
    const name = (b as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return undefined;
}

/** Narrow `unknown` -> `string | number | undefined`. Picks `string|number`
 *  or a contained `.value` of a non-array object. */
function mileageValueField(m: unknown): string | number | undefined {
  if (typeof m === "number" || typeof m === "string") return m;
  if (m && typeof m === "object" && !Array.isArray(m) && "value" in m) {
    const v = (m as { value?: unknown }).value;
    if (typeof v === "number" || typeof v === "string") return v;
  }
  return undefined;
}

export async function extractCarsales(html: string): Promise<ScrapedListing | null> {
  const $ = cheerio.load(html);

  // ----- JSON-LD -----
  let vehicle: SchemaOrgVehicle | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (vehicle) return;
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const graph = (data as { "@graph"?: unknown[] })["@graph"];
      const candidates: unknown[] = Array.isArray(data)
        ? data
        : graph !== undefined
          ? graph
          : [data];
      for (const c of candidates) {
        const t = (c as { "@type"?: string | string[] })["@type"];
        const types = Array.isArray(t) ? t : [t];
        if (types.some((x) => typeof x === "string" && /Vehicle|Car/i.test(x))) {
          vehicle = c as SchemaOrgVehicle;
          break;
        }
      }
    } catch {/* keep scanning */}
  });

  const out: ScrapedListing = {};

  if (vehicle) {
    // Capture into a fresh `const` so TS narrowing survives across the
    // closure below — `let vehicle` is shared with the each() callback,
    // and TS sometimes loses narrowing on `let` across closures.
    const v: SchemaOrgVehicle = vehicle;
    const helpersCtx: {
      brand: string | undefined;
      transmission: string | undefined;
      contentLocation: string | undefined;
      mileageRaw: string | number | undefined;
    } = {
      brand: namedStringField(v.brand),
      transmission: namedStringField(v.vehicleTransmission),
      contentLocation: namedStringField(v.contentLocation),
      mileageRaw: mileageValueField(v.mileageFromOdometer),
    };

    if (helpersCtx.brand) out.make = helpersCtx.brand.trim();

    if (typeof v.model === "string") out.model = v.model.trim();

    if (v.name && (!out.make || !out.model)) {
      const yearMatch = v.name.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) out.year = Number(yearMatch[0]);
      const remainder = v.name
        .replace(/\b(19|20)\d{2}\b/, "")
        .replace(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i, "")
        .trim();
      if (!out.make && out.model) {
        const parts = remainder.split(" ").filter(Boolean);
        if (parts.length > 1) out.make = parts.slice(0, -1).join(" ").trim();
      }
    }

    if (v.vehicleModelDate != null) {
      const y = Number(v.vehicleModelDate);
      if (Number.isFinite(y) && y >= 1985 && y <= new Date().getFullYear() + 1) {
        out.year = y;
      }
    }

    const km = parseOdometerKm(helpersCtx.mileageRaw);
    if (km != null) out.odometer = km;

    if (v.fuelType) out.fuelType = normaliseFuel(v.fuelType);

    if (helpersCtx.transmission) {
      out.transmission = normaliseTransmission(helpersCtx.transmission);
    }

    if (v.driveWheelConfiguration) {
      out.driveType = normaliseDrive(v.driveWheelConfiguration);
    }
    if (v.offers?.price != null) {
      const price = parsePriceAud(v.offers.price);
      if (price != null) out.askingPrice = price;
    }
    if (v.description) out.description = v.description.slice(0, 2000).trim();
    if (v.image) {
      const img = Array.isArray(v.image) ? v.image[0] : v.image;
      if (img) out.imageUrl = img;
    }
    if (helpersCtx.contentLocation) {
      const state = normaliseState(helpersCtx.contentLocation);
      if (state) out.state = state;
    }
  }

  // ----- Fallbacks via Open Graph + title -----
  if (!out.make || !out.model) {
    const ogTitle = $('meta[property="og:title"]').attr("content")
      ?? $("title").text();
    const cleaned = ogTitle
      .replace(/\b(for sale|in australia|new|used|\d{4})\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const parts = cleaned.split(" ").filter(Boolean);
    if (parts.length >= 2 && !out.make) out.make = parts[0];
    if (parts.length >= 3 && !out.model) out.model = parts[1];
    if (parts.length >= 4 && !out.variant) out.variant = parts.slice(2).join(" ");
  }

  if (out.askingPrice == null) {
    const ogPrice = $('meta[property="product:price:amount"]').attr("content")
      ?? $('meta[property="og:price:amount"]').attr("content");
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
