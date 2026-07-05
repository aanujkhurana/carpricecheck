"use client";
import { motion } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck as ShieldIcon,
  Gauge, Wrench, Droplets, Lightbulb, MessageSquare, Wand2, ListChecks,
  ClipboardCheck, HelpCircle,
} from "lucide-react";
import { formatAUD, cn } from "@/lib/utils";
import type { DealRating, ReportPayload, Verdict } from "@/lib/types/report";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const fade = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.4 },
};

const ratingVisuals: Record<
  DealRating,
  { label: string; emoji: string; cls: string; description: string }
> = {
  GREAT_DEAL: {
    label: "Great deal",
    emoji: "🟢",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30",
    description: "Listed below market value. Move fast and inspect thoroughly.",
  },
  FAIR_PRICE: {
    label: "Fair price",
    emoji: "🟡",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30",
    description: "In line with the market. Buy only if condition and budget allow.",
  },
  OVERPRICED: {
    label: "Overpriced",
    emoji: "🔴",
    cls: "bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-red-500/30",
    description: "Better-value examples likely exist at this price. Negotiate hard.",
  },
};

const verdictVisuals: Record<
  Verdict,
  { label: string; cls: string; tag: string }
> = {
  BUY: {
    label: "Buy",
    cls: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
    tag: "We recommend buying if the inspection checks out.",
  },
  NEGOTIATE: {
    label: "Negotiate",
    cls: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    tag: "Buy only if you can bring the price down with the script below.",
  },
  AVOID: {
    label: "Avoid",
    cls: "bg-gradient-to-br from-red-500 to-rose-500 text-white",
    tag: "Walk away. There are better options for the same money.",
  },
};

export function ReportSections({ payload }: { payload: ReportPayload }) {
  return (
    <div className="space-y-6">
      {/* Verdict banner — always at the top */}
      <VerdictBanner payload={payload} />

      <motion.section {...fade}>
        <FairValueCard payload={payload} />
      </motion.section>

      <motion.section {...fade}>
        <OwnershipCostsCard payload={payload} />
      </motion.section>

      <motion.section {...fade}>
        <ReliabilityCard payload={payload} />
      </motion.section>

      <motion.section {...fade}>
        <SafetyCard payload={payload} />
      </motion.section>

      <motion.section {...fade}>
        <RunningCostsCard payload={payload} />
      </motion.section>

      <motion.section {...fade}>
        <TabsCard payload={payload} />
      </motion.section>

      <motion.section {...fade}>
        <NegotiationCard payload={payload} />
      </motion.section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function VerdictBanner({ payload }: { payload: ReportPayload }) {
  const r = ratingVisuals[payload.dealRating];
  const v = verdictVisuals[payload.verdict];
  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="grid gap-6 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold ${r.cls}`}>
              <span aria-hidden>{r.emoji}</span>{r.label}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              AI verdict
            </Badge>
          </div>
          <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            {payload.headline}
          </h1>
          <p className="mt-2 text-muted-foreground">{payload.oneLineSummary}</p>
        </div>
        <div className="flex flex-col items-stretch justify-center gap-3">
          <div className={`flex items-center justify-center rounded-xl px-5 py-4 text-lg font-bold shadow-lg shadow-black/5 ${v.cls}`}>
            {v.label}
          </div>
          <p className="text-sm text-muted-foreground">{v.tag}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function FairValueCard({ payload }: { payload: ReportPayload }) {
  const f = payload.fairMarketValue;
  return (
    <Section
      icon={<Gauge className="h-4 w-4" />}
      title="Fair market value"
      subtitle="Compared against Australian market data for similar listings"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Our estimate"
          value={formatAUD(f.estimate)}
          accent="from-indigo-500 via-violet-500 to-fuchsia-500"
        />
        <Stat
          label="Typical range"
          value={`${formatAUD(f.range.low)} – ${formatAUD(f.range.high)}`}
        />
        <Stat
          label="Confidence"
          value={`${f.confidencePct}%`}
          trailing={
            <Progress value={f.confidencePct} className="mt-2 h-1.5" />
          }
        />
      </div>
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{f.reasoning}</p>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function OwnershipCostsCard({ payload }: { payload: ReportPayload }) {
  const o = payload.ownershipCosts;
  const items = [
    o.fuel, o.registration, o.insurance, o.tyres, o.servicing, o.maintenance, o.depreciation,
  ];
  return (
    <Section
      icon={<Wrench className="h-4 w-4" />}
      title="Hidden ownership costs"
      subtitle="Estimated 5-year costs of running this vehicle in Australia"
      trailing={
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">5-year total</div>
          <div className="font-mono text-xl font-semibold">{formatAUD(o.fiveYearTotalAud)}</div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-lg border border-border/60 bg-background/40 p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-medium">{it.label}</div>
              <div className="font-mono text-sm font-semibold">{formatAUD(it.yearlyAud)}<span className="text-xs font-normal text-muted-foreground">/yr</span></div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              ≈ {formatAUD(it.fiveYearAud)} over 5 years
            </div>
            {it.note && <div className="mt-2 text-xs italic text-muted-foreground">{it.note}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function ReliabilityCard({ payload }: { payload: ReportPayload }) {
  const r = payload.reliability;
  const sevClass: Record<"info" | "warning" | "critical", string> = {
    info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    critical: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  };
  return (
    <Section
      icon={<ShieldAlert className="h-4 w-4" />}
      title="Reliability"
      subtitle="Model-specific weaknesses and outstanding considerations"
      trailing={
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
          <div className="font-mono text-xl font-semibold">{r.overallScore}<span className="text-base font-normal text-muted-foreground">/100</span></div>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">{r.summary}</p>

      {r.knownIssues.length > 0 && (
        <div className="mt-4 space-y-2">
          {r.knownIssues.map((it, i) => (
            <div key={i} className={cn("rounded-lg border p-3 text-sm", sevClass[it.severity])}>
              <div className="font-semibold">{it.area}</div>
              <div className="mt-1 opacity-90">{it.description}</div>
            </div>
          ))}
        </div>
      )}

      {r.recalls.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="text-xs">
            <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Recalls</div>
            <ul className="space-y-1">
              {r.recalls.map((rec, i) => (
                <li key={i} className="text-muted-foreground">— {rec}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

function SafetyCard({ payload }: { payload: ReportPayload }) {
  const s = payload.safety;
  return (
    <Section
      icon={<ShieldIcon className="h-4 w-4" />}
      title="Safety"
      subtitle="ANCAP rating and key safety equipment"
      trailing={
        s.ancapRating != null ? (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ANCAP</div>
            <div className="font-mono text-xl font-semibold">{s.ancapRating}<span className="text-base font-normal text-muted-foreground">/5</span></div>
            {s.ancapYear && <div className="text-[10px] text-muted-foreground">{s.ancapYear}</div>}
          </div>
        ) : null
      }
    >
      <p className="text-sm">{s.airbags}</p>
      {s.driverAssists.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Driver assists</div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {s.driverAssists.map((a) => (
              <li key={a} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.warnings.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {s.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

function RunningCostsCard({ payload }: { payload: ReportPayload }) {
  const r = payload.runningCosts;
  return (
    <Section
      icon={<Droplets className="h-4 w-4" />}
      title="Running costs"
      subtitle="Year-round operating cost and service cadence"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Fuel economy" value={r.fuelEconomyLabel} />
        <Stat label="Avg yearly fuel" value={formatAUD(r.avgYearlyFuelAud)} />
        <Stat label="Service interval" value={`${(r.servicingIntervalKm ?? 10000).toLocaleString()} km`} />
      </div>
      {r.commonRepairCosts.length > 0 && (
        <>
          <Separator className="my-5" />
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Common repairs</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {r.commonRepairCosts.map((c) => (
              <div key={c.item} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="text-xs text-muted-foreground">{c.item}</div>
                <div className="mt-1 font-mono text-sm font-semibold">{formatAUD(c.typicalAud)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

function TabsCard({ payload }: { payload: ReportPayload }) {
  return (
    <Tabs defaultValue="check" className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Inspection & questions</h3>
          <p className="text-xs text-muted-foreground">Take this with you to the inspection.</p>
        </div>
        <TabsList className="self-start sm:self-auto">
          <TabsTrigger value="check" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> Questions
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="check" className="border-t border-border/60 p-5 sm:p-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {payload.inspectionChecklist.map((it, i) => (
            <li key={i} className="rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <div className="text-sm font-medium">{it.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{it.why}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="questions" className="border-t border-border/60 p-5 sm:p-6">
        <ul className="space-y-3">
          {payload.sellerQuestions.map((q, i) => (
            <li key={i} className="rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <div>
                  <div className="text-sm font-medium">{q.question}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{q.why}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------

function NegotiationCard({ payload }: { payload: ReportPayload }) {
  const n = payload.negotiationScript;
  return (
    <Section
      icon={<Wand2 className="h-4 w-4" />}
      title="Negotiation script"
      subtitle="Calibrated to your listing's price vs market value"
      trailing={
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Target price</div>
          <div className="font-mono text-xl font-semibold">{formatAUD(n.targetPriceAud)}</div>
        </div>
      }
    >
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Opening line
        </div>
        <p className="mt-2 text-sm leading-relaxed">{n.openingMessage}</p>
      </div>

      {n.followUps.length > 0 && (
        <>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Follow-ups if they push back
          </div>
          <ul className="mt-2 space-y-2">
            {n.followUps.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export function Section({
  icon, title, subtitle, trailing, children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 via-violet-500/15 to-fuchsia-500/15 text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-400">
                {icon}
              </span>
            )}
            <div>
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {trailing}
        </div>
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  );
}

export function Stat({
  label, value, accent, trailing,
}: {
  label: string;
  value: string;
  accent?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 font-mono text-2xl font-semibold",
          accent && `bg-gradient-to-r ${accent} bg-clip-text text-transparent`,
        )}
      >
        {value}
      </div>
      {trailing}
    </div>
  );
}


