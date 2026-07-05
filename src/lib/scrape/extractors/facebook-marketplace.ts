// Facebook Marketplace extractor (playwright fallback).
//
// Facebook Marketplace is heavily JS-rendered — raw fetch returns the
// login shell, not the listing data. Playwright/chromium is the realistic
// path to populated content. This is gated behind `SCRAPER_FB` so that we
// can ship the cheerio-only path on Vercel Hobby (where a chromium
// cold-start would exceed the 10s wall-clock) and only enable when the
// deployment runs on Pro/Enterprise.
//
// We use minimal anti-detection: a desktop Chrome UA + viewport + a short
// `domcontentloaded` wait. Stronger stealth is out of scope; if FB starts
// blocking us, the `parse-failed` reason lets the user proceed with
// manual entry.

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

const FB_ENABLED = process.env.SCRAPER_FB !== "off";

export async function extractFacebookMarketplace(
  url: string,
): Promise<ScrapedListing | null> {
  if (!FB_ENABLED) {
    throw new Error(
      "Facebook Marketplace scraping is disabled on this deployment " +
        "(set SCRAPER_FB=on for Pro/Enterprise; Hobby tier can't bridge " +
        "a chromium cold-start within the 10s wall-clock).",
    );
  }
  // Lazy import so a Hobby deploy without chromium binaries doesn't crash
  // the module loader. The dynamic import also keeps any bundled chromium
  // assets out of the cheerio-only code paths.
  const playwright = await import("playwright");

  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "en-AU",
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Best-effort: wait briefly so the SPA shell renders something to parse.
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => {/* timeout OK; we work with whatever rendered */});
    const html = await page.content();
    const out = parseFacebookMarketplaceHtml(html);
    return out;
  } finally {
    await browser.close().catch(() => {/* ignore */});
  }
}

function parseFacebookMarketplaceHtml(html: string): ScrapedListing | null {
  const $ = cheerio.load(html);
  const out: ScrapedListing = {};

  // Title is rendered in a single h1 by FB Marketplace.
  const h1 = $("h1").first().text().trim();
  if (h1) {
    const cleaned = h1.replace(/\s+/g, " ");
    const yearMatch = cleaned.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const y = Number(yearMatch[0]);
      if (y >= 1985 && y <= new Date().getFullYear() + 1) out.year = y;
    }
    const remainder = cleaned
      .replace(/\b(19|20)\d{2}\b/, "")
      .trim();
    // Best-effort: first token = make, second = model, rest = variant.
    const parts = remainder.split(" ").filter(Boolean);
    if (parts.length >= 2) out.make = parts[0];
    if (parts.length >= 3) out.model = parts[1];
    if (parts.length >= 4) out.variant = parts.slice(2).join(" ");
  }

  // Price in span under heading; price text starts with "$".
  const priceRegex = /\$[\d,]+/;
  const htmlText = $("body").text();
  const priceMatch = htmlText.match(priceRegex);
  if (priceMatch) {
    const p = parsePriceAud(priceMatch[0]);
    if (p != null) out.askingPrice = p;
  }

  // FB lists vehicle details in `<span>` rows under the price. Look for
  // known detail tokens like "X km", "Automatic", "Petrol".
  $("span").each((_, el) => {
    const text = $(el).text().trim();
    if (out.odometer == null) {
      const km = parseOdometerKm(text);
      if (km != null && km > 0) out.odometer = km;
    }
    if (out.transmission == null) {
      const tr = normaliseTransmission(text);
      if (tr) out.transmission = tr;
    }
    if (out.fuelType == null) {
      const ft = normaliseFuel(text);
      if (ft) out.fuelType = ft;
    }
    if (out.driveType == null) {
      const dr = normaliseDrive(text);
      if (dr) out.driveType = dr;
    }
    if (out.state == null) {
      const st = normaliseState(text);
      if (st) out.state = st;
    }
  });

  if (!out.make || !out.model || out.askingPrice == null) {
    // Without these the extraction is too noisy to be useful.
    return null;
  }
  const filled = countFieldsFilled(out as Record<string, unknown>);
  if (filled < 3) return null;
  return out;
}
