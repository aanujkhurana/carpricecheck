// Prisma-backed cache layer for ScrapeCache.
//
// Reads drop entries past `expiresAt` and entries with a stale
// `EXTRACTOR_VERSION` (so that whenever we bump extractors, old cached
// payloads are silently discarded). Writes upsert on `url @unique` —
// refresh-in-place is preferred over creating a duplicate cache row per
// successful scrape.
//
// We use the chained `prisma.scrapeCache.X` style consistently with the
// rest of the codebase. Destructuring `const { scrapeCache } = prisma`
// would trigger PrismaClient construction at module load (defeating the
// lazy Proxy in src/lib/db.ts) — keep the chain.

import { prisma } from "@/lib/db";
import type { ScrapedListing } from "./types";
import { EXTRACTOR_VERSION } from "./types";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedPayload {
  v: typeof EXTRACTOR_VERSION;
  d: ScrapedListing;
}

export async function getCached(
  url: string,
): Promise<ScrapedListing | null> {
  const row = await prisma.scrapeCache.findUnique({ where: { url } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  try {
    const parsed = JSON.parse(row.payload) as CachedPayload;
    if (parsed.v !== EXTRACTOR_VERSION) return null;
    return parsed.d;
  } catch {
    return null;
  }
}

export async function setCached(
  url: string,
  domain: string,
  data: ScrapedListing,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<void> {
  const payload: CachedPayload = { v: EXTRACTOR_VERSION, d: data };
  const expiresAt = new Date(Date.now() + ttlMs);
  // upsert on the @unique url. Failed scrape payloads are NOT written —
  // a fetch error shouldn't survive a cache and we want a re-try to
  // succeed on the next request.
  await prisma.scrapeCache.upsert({
    where: { url },
    update: { domain, payload: JSON.stringify(payload), expiresAt },
    create: { url, domain, payload: JSON.stringify(payload), expiresAt },
  });
}
