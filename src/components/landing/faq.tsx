"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const QA = [
  {
    q: "How accurate is the AI report?",
    a: "Honest answer: it's a strong starting point, not a substitute for a physical pre-purchase inspection. We combine Australian market data, manufacturer reliability records, ANCAP scores and known model-specific faults to give you a calibrated view. The confidence score on each report tells you how sure we are.",
  },
  {
    q: "Does it work with any car listing?",
    a: "Today you can paste a listing URL from Carsales, Drive, Facebook Marketplace, Gumtree and major dealer sites — or enter the details manually. Phase 2 will add automatic listing extraction; for now the manual form is fast and includes every spec the AI needs.",
  },
  {
    q: "Is my data safe?",
    a: "We never sell your data. Anonymous reports share only the data you entered. We'll add sign-in and a private garage in Phase 3 so you can revisit your saved analyses.",
  },
  {
    q: "Can I take the report to the dealer?",
    a: "Yes — every report has a permanent share URL and a PDF export option coming in Phase 2. Walk in with the script on your phone.",
  },
  {
    q: "What does it cost?",
    a: "Generating a report is free for individual buyers. Premium features (unlimited reports, saved garage, price alerts, dealer comparisons) launch in Phase 3.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-muted/30 py-16 sm:py-24">
      <div className="container-narrow">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>
          <p className="mt-3 text-muted-foreground">
            Honest answers, no spin.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border/60 bg-card shadow-sm">
          {QA.map((it, i) => {
            const isOpen = open === i;
            return (
              <button
                key={it.q}
                onClick={() => setOpen(isOpen ? null : i)}
                className={cn(
                  "block w-full px-6 py-5 text-left transition-colors",
                  i !== 0 && "border-t border-border/60",
                  isOpen ? "bg-muted/40" : "hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-medium">{it.q}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                </div>
                {isOpen && <p className="mt-3 text-sm text-muted-foreground">{it.a}</p>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
