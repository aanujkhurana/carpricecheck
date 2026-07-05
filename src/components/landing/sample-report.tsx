import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { formatAUD, formatKm } from "@/lib/utils";
import type { DealRating, ReportPayload, VehicleInput } from "@/lib/types/report";

const sampleInput: VehicleInput = {
  make: "Toyota",
  model: "Corolla",
  year: 2020,
  variant: "Ascent Sport",
  odometer: 54_200,
  transmission: "auto",
  fuelType: "petrol",
  driveType: "fwd",
  askingPrice: 19_990,
  sellerType: "private",
  state: "QLD",
};

const sampleReport: Pick<
  ReportPayload,
  "headline" | "dealRating" | "verdict" | "fairMarketValue" | "reliability" | "ownershipCosts"
> = {
  headline: "2020 Toyota Corolla Ascent Sport: at this price, it's worth a serious look",
  dealRating: "GREAT_DEAL",
  verdict: "BUY",
  fairMarketValue: {
    estimate: 21_500,
    range: { low: 19_800, high: 23_200, currency: "AUD" },
    confidencePct: 86,
    reasoning:
      "Market asking is -7.0% vs our estimate. Strong make reliability, low odo for age, dealer-sale price history supports this.",
  },
  reliability: { overallScore: 91, summary: "", knownIssues: [], recalls: [] },
  ownershipCosts: { fiveYearTotalAud: 0 } as ReportPayload["ownershipCosts"],
};

const ratingVisuals: Record<DealRating, { label: string; cls: string; emoji: string }> = {
  GREAT_DEAL:  { label: "Great deal",   cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30", emoji: "🟢" },
  FAIR_PRICE:  { label: "Fair price",   cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30", emoji: "🟡" },
  OVERPRICED:  { label: "Overpriced",   cls: "bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30", emoji: "🔴" },
};

export function SampleReport() {
  const r = ratingVisuals[sampleReport.dealRating];
  return (
    <section id="sample" className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">See what your report looks like.</h2>
        <p className="mt-3 text-muted-foreground">
          Here&apos;s the kind of report CarCostCheck generates for a typical Australian
          used-car listing.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border/60 bg-card shadow-2xl shadow-indigo-500/10">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 p-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              {sampleInput.year} {sampleInput.make} {sampleInput.model} {sampleInput.variant}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {sampleInput.state} &middot; {sampleInput.fuelType} &middot; {sampleInput.transmission} &middot; {formatKm(sampleInput.odometer)}
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold ${r.cls}`}>
            <span>{r.emoji}</span>{r.label}
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-background p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fair value estimate</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{formatAUD(sampleReport.fairMarketValue.estimate)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatAUD(sampleReport.fairMarketValue.range.low)}–{formatAUD(sampleReport.fairMarketValue.range.high)} range
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Asking price</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{formatAUD(sampleInput.askingPrice)}</div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">−7.0% under estimate</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-background p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reliability</div>
            <div className="mt-1 font-mono text-2xl font-semibold">{sampleReport.reliability.overallScore}<span className="text-base font-normal text-muted-foreground">/100</span></div>
            <div className="mt-1 text-xs text-muted-foreground">Strong long-term confidence</div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-xl border border-border/60 bg-background p-4">
            <div className="text-sm font-medium">Bottom line</div>
            <p className="mt-1 text-sm text-muted-foreground">{sampleReport.headline}</p>
          </div>
        </div>

        <div className="border-t border-border/60 p-6">
          <Button asChild variant="ghost" className="text-indigo-600 dark:text-indigo-400">
            <Link href="/check">
              Build a real report for your car
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// avoid unused import warnings
import { Button } from "@/components/ui/button";
