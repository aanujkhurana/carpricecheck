import Link from "next/link";
import { formatAUD } from "@/lib/utils";
import { VisibilityToggle } from "./visibility-toggle";
import { DeleteReportButton } from "./delete-report-button";

export interface ReportCardData {
  id: string;
  slug: string;
  createdAt: Date;
  make: string;
  model: string;
  year: number;
  variant: string | null;
  askingPrice: number;
  dealRating: string;
  verdict: string;
  fairValueLow: number;
  fairValueHigh: number;
  isPublic: boolean;
  viewCount: number;
}

export function ReportCard({ report }: { report: ReportCardData }) {
  const verdictTone = toneFor(report.verdict);
  const dealTone = toneFor(report.dealRating);

  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {report.year} · {report.make}
            </div>
            <Link href={`/report/${report.slug}`} className="hover:underline">
              <h3 className="mt-0.5 truncate text-base font-semibold">
                {report.model}
                {report.variant && (
                  <span className="text-muted-foreground"> · {report.variant}</span>
                )}
              </h3>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={dealTone}>{dealLabel(report.dealRating)}</Badge>
            <Badge tone={verdictTone}>{report.verdict}</Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Stat label="Asking" value={formatAUD(report.askingPrice)} />
          <Stat
            label="Fair value"
            value={`${formatAUD(report.fairValueLow)}–${formatAUD(report.fairValueHigh)}`}
          />
          <Stat label="Views" value={String(report.viewCount)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Created{" "}
            <time dateTime={report.createdAt.toISOString()}>
              {report.createdAt.toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          </span>
          <span className="flex items-center gap-2">
            <VisibilityToggle id={report.id} isPublic={report.isPublic} />
            <DeleteReportButton id={report.id} />
          </span>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "good" | "neutral" | "bad";
  children: React.ReactNode;
}) {
  const cls = {
    good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    neutral: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    bad: "bg-red-500/15 text-red-700 dark:text-red-400",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

function toneFor(value: string): "good" | "neutral" | "bad" {
  if (value === "GREAT_DEAL" || value === "BUY") return "good";
  if (value === "OVERPRICED" || value === "AVOID") return "bad";
  return "neutral";
}

function dealLabel(rating: string): string {
  return {
    GREAT_DEAL: "Great deal",
    FAIR_PRICE: "Fair price",
    OVERPRICED: "Overpriced",
  }[rating] ?? rating;
}
