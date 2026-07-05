import type { Metadata } from "next";
import { buildMetadata, SITE_NAME } from "@/lib/seo";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { VehicleForm } from "@/components/form/vehicle-form";

// Form page prerenders as static HTML. The VehicleForm component is already
// declared `"use client"` and contains the framer-motion transitions, so
// motion.* renders as initial-state inline styles during prerender.

export const metadata: Metadata = buildMetadata({
  title: `Check a car — ${SITE_NAME}`,
  description:
    "Paste a listing URL or enter the details manually and get a ~45-second AI-built buying report.",
  path: "/check",
});

export default function CheckPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-narrow relative pb-24 pt-10 sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72 bg-mesh" />
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            Free · No login · ~45 seconds
          </span>
          <h1 className="mt-6 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Tell us about the car.
          </h1>
          <p className="mt-3 text-balance text-muted-foreground">
            The more accurate the details, the sharper the report. Paste a Carsales,
            Gumtree or Facebook Marketplace URL to auto-fill the form, or enter the
            details manually below.
          </p>
        </div>

        <div className="mt-10">
          <VehicleForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
