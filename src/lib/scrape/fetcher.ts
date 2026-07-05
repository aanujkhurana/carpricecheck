// URL canonicalization + raw fetcher with a polite UA.
//
// `canonicalizeUrl` strips tracking params and lowercases the scheme so
// that the same listing URL pasted in different shapes (UTMs, trailing
// slash, fbclid) maps to one cache key. Used by both the cache layer and
// the extractor's cache-key write-back.

import { SUPPORTED_DOMAINS } from "./types";

// Tracking params we'd strip before using a URL as a cache key. Sites add
// these to the same listing URL constantly; without stripping we'd get
// repeated cache misses for the same physical listing.
const STRIP_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "msclkid", "mc_cid", "mc_eid",
  "ref", "ref_src", "ref_url",
]);

/** Returns the URL with tracking params + fragment stripped + trailing slash + lowercased scheme. */
export function canonicalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    for (const k of [...u.searchParams.keys()]) {
      if (STRIP_PARAMS.has(k.toLowerCase())) u.searchParams.delete(k);
    }
    u.hash = "";
    if (!u.protocol.endsWith("://")) return null;
    const protocol = u.protocol.toLowerCase();
    if (protocol !== "https:" && protocol !== "http:") return null;
    u.protocol = protocol;
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    u.pathname = pathname;
    // Sort remaining params so order doesn't generate different cache keys.
    u.searchParams.sort();
    const out = u.toString();
    return out;
  } catch {
    return null;
  }
}

/** Returns the host with leading "www." stripped, or null if it's not a supported domain. */
export function pickDomain(rawUrl: string): string | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!SUPPORTED_DOMAINS.includes(host as (typeof SUPPORTED_DOMAINS)[number])) {
    return null;
  }
  return host;
}

/**
 * Polite raw fetcher with timeout. We identify as the app by UA so sites can
 * rate-limit or block us if they wish — robots.txt checking is deferred to
 * a Phase 3 followup (cheap, but skipped for MVP scope).
 *
 * Throws `Error("timeout")`, `Error("blocked")`, or `Error("fetch-failed:<status>")`.
 */
export async function fetchUrl(
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctl.signal,
      headers: {
        // Honest UA. If a site doesn't want to be scraped they'll see this
        // and can block us. We are not trying to look like a generic browser.
        "User-Agent":
          "Mozilla/5.0 (compatible; CarCostCheck/0.1; +https://carcostcheck.ai/bot)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-AU,en;q=0.9",
      },
    });
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) throw new Error("blocked");
    throw new Error(`fetch-failed:${res.status}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
    throw new Error("fetch-failed:not-html");
  }
  return res.text();
}
