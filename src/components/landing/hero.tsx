"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Atmospheric gradient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, hsl(238 75% 60% / 0.20), transparent 60%)",
        }}
      />

      <div className="container-narrow relative pt-16 pb-24 sm:pt-24 sm:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Australia&apos;s first AI co-pilot for used car buyers</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 text-balance text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
        >
          <span className="block">Is this car actually worth it?</span>
          <span className="block bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            Find out in ~45 seconds.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-balance text-center text-base text-muted-foreground sm:text-lg"
        >
          Paste a listing from Carsales, Facebook Marketplace or Gumtree — or enter
          the details manually — and get an AI-built buying report covering fair value,
          reliability, ownership costs, a personal inspection checklist, the questions
          to ask the seller, and a ready-made negotiation script.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button asChild size="xl" variant="gradient">
            <Link href="/check">
              Check a car — it&apos;s free <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link href="/#sample">See a sample report</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            No login required for your first report
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-indigo-500" />
            Average buyers save $1,400 at the negotiation table
          </span>
        </motion.div>

        {/* Decorative floating preview card */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mx-auto mt-16 max-w-3xl"
        >
          <div className="rounded-2xl border border-border/60 bg-card/60 p-2 shadow-2xl shadow-indigo-500/10 backdrop-blur">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">2020 Toyota Corolla Ascent Sport — Brisbane</span>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
                  Great deal
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { k: "Fair value", v: "$21,500" },
                  { k: "Asking", v: "$19,990" },
                  { k: "Save", v: "$1,510" },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg border border-border/50 bg-background/80 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.k}</div>
                    <div className="mt-1 font-mono text-lg font-semibold">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
