import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { prisma } from "@/lib/db";
import { safeJsonParse, formatAUD } from "@/lib/utils";
import {
  buildMetadata, reportTitle, reportDescription,
  SITE_URL, vehicleJsonLd, reportFaqJsonLd,
} from "@/lib/seo";
import type { ReportPayload, State } from "@/lib/types/report";
import type { VehicleInput } from "@/lib/schemas";

import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { ReportSections } from "@/components/report/report-sections";
import { ReportShareCard } from "@/components/report/share-card";
import { createClient } from "@/lib/supabase/server";
import { VisibilityToggle } from "@/components/my-reports/visibility-toggle";
import { DeleteReportButton } from "@/components/my-reports/delete-report-button";

// /report/[slug] is auto-detected as dynamic: `noStore()` in both
// `generateMetadata` and `ReportPage` is an early bailout that opts the route
// into runtime rendering before Prisma is ever touched, so `next build` skips
// prerender for this segment without an explicit `force-dynamic` flag.

const STATES_LIST = ["NSW","VIC","QLD","WA","SA","TAS","ACT","NT"] as const satisfies readonly State[];

// Narrow an unknown Prisma string field into our `State` union, or `undefined`.
function asState(value: string | null | undefined): State | undefined {
  return value && (STATES_LIST as readonly string[]).includes(value) ? (value as State) : undefined;
}

// Bots inflate view counts; gate the increment.
const BOT_UA_PATTERN =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|googlebot|yahoo|duckduck|baidu|yandex|sogou|exabot|ia_archiver|facebot|discordbot|telegrambot/i;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  noStore();
  const { slug } = await params;
  const report = await prisma.report.findUnique({ where: { slug } });
  if (!report) return buildMetadata({ title: "Report not found", description: "" });

  const payload = safeJsonParse<ReportPayload>(report.reportJson);
  const input: VehicleInput = {
    make: report.make,
    model: report.model,
    year: report.year,
    variant: report.variant ?? undefined,
    state: asState(report.state),
    askingPrice: report.askingPrice,
  };
  const title = reportTitle(input);
  const description = payload
    ? reportDescription(input, payload)
    : `AI buying report for the ${input.year} ${input.make} ${input.model}.`;

  return buildMetadata({
    title, description,
    path: `/report/${slug}`,
    imagePath: "/og-default.png",
    type: "article",
  });
}

export default async function ReportPage({ params }: PageProps) {
  noStore();
  const { slug } = await params;
  const report = await prisma.report.findUnique({ where: { slug } });
  if (!report) notFound();

  // Owner check: signed-in user with a matching userId on the row sees their
  // own private report. Non-owners are 404'd on private reports.
  let isOwner = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (
      data.user &&
      report.userId &&
      data.user.id === report.userId
    ) {
      isOwner = true;
    }
  } catch {
    isOwner = false;
  }

  if (!report.isPublic && !isOwner) notFound();

  const payload = safeJsonParse<ReportPayload>(report.reportJson);
  if (!payload) notFound();

  // Increment view count for non-bot traffic only.
  const ua = (await headers()).get("user-agent") ?? "";
  if (!BOT_UA_PATTERN.test(ua)) {
    prisma.report.update({
      where: { id: report.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {/* fire-and-forget */});
  }

  const input: VehicleInput = {
    make: report.make,
    model: report.model,
    year: report.year,
    variant: report.variant ?? undefined,
    state: asState(report.state),
    askingPrice: report.askingPrice,
  };
  const reportUrl = `${SITE_URL}/report/${slug}`;

  return (
    <>
      <SiteHeader />
      <main className="container-page pb-24 pt-6 sm:pt-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/"><ArrowLeft className="h-4 w-4" /> New report</Link>
          </Button>
          <ThemeToggle />
        </div>

        <SummaryBar input={input} report={report} payload={payload} />

        {isOwner && <OwnerControls report={{ id: report.id, isPublic: report.isPublic }} />}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ReportSections payload={payload} />
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <ReportShareCard input={input} payload={payload} reportUrl={reportUrl} />
          </aside>
        </div>
      </main>
      <SiteFooter />

      {/* JSON-LD: Vehicle + FAQPage, emitted as separate <script> tags per
          Google's structured data guidelines. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleJsonLd(input, slug)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportFaqJsonLd(payload)) }}
      />
    </>
  );
}

function OwnerControls({
  report,
}: {
  report: { id: string; isPublic: boolean };
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/5">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Owner controls
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Only you can see this section.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VisibilityToggle id={report.id} isPublic={report.isPublic} />
          <DeleteReportButton id={report.id} />
        </div>
      </div>
    </div>
  );
}

function SummaryBar({
  input, report, payload,
}: {
  input: VehicleInput;
  report: {
    id: string;
    make: string; model: string; year: number;
    variant: string | null; state: string | null; askingPrice: number;
  };
  payload: ReportPayload;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="bg-mesh p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Buying report</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {input.year} {input.make} {input.model}
              {input.variant && <span className="text-muted-foreground"> · {input.variant}</span>}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {input.state ?? "AU"} · {payload.fairMarketValue.confidencePct}% confidence ·{" "}
              <span className="font-mono text-foreground/80">{report.id.slice(0, 6)}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl border border-border/60 bg-background/60 p-3 sm:p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Asking</div>
              <div className="mt-1 font-mono text-xl font-semibold">{formatAUD(report.askingPrice)}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-3 sm:p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fair value</div>
              <div className="mt-1 font-mono text-xl font-semibold bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                {formatAUD(payload.fairMarketValue.estimate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
