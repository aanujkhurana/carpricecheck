import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

// Sitemap reads Prisma every render. To keep this safe across CI / first
// deploys where DATABASE_URL may not be provisioned yet, we keep
// `force-dynamic` here even though the schema is now on Postgres. The
// trade-off:
//   - Phase-3 prod: route is server-rendered per request, served with the
//     Next.js response cache. Latency is fine for an XML feed that crawlers
//     fetch once per crawl.
//   - Build: no `pnpm prisma db push` / Phase-3 DATABASE_URL requirement —
//     `next build` passes in CI environments without Postgres provisioned.
//
// To flip this to a build-time prerender later (Phase 4), drop this flag
// once DATABASE_URL is guaranteed-available per-build-environment.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reports = await prisma.report.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { slug: true, updatedAt: true },
  });

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,              changeFrequency: "weekly",  priority: 1 },
    { url: `${SITE_URL}/check`,         changeFrequency: "monthly", priority: 0.8 },
  ];

  const reportEntries: MetadataRoute.Sitemap = reports.map((r) => ({
    url: `${SITE_URL}/report/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...reportEntries];
}
