import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import type { ReportPayload } from "@/lib/types/report";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const report = await prisma.report.findUnique({ where: { slug } });
  if (!report || !report.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const payload = safeJsonParse<ReportPayload>(report.reportJson);
  return NextResponse.json({
    slug: report.slug,
    createdAt: report.createdAt,
    make: report.make, model: report.model, year: report.year,
    variant: report.variant, state: report.state,
    askingPrice: report.askingPrice,
    dealRating: report.dealRating,
    verdict: report.verdict,
    fairValueLow: report.fairValueLow,
    fairValueHigh: report.fairValueHigh,
    viewCount: report.viewCount,
    payload,
    sourceUrl: report.sourceUrl,
  });
}
