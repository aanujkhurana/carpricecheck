import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SampleReport } from "@/components/landing/sample-report";
import { Faq } from "@/components/landing/faq";
import { CtaBanner } from "@/components/landing/cta-banner";
import { SiteFooter } from "@/components/landing/site-footer";

// Landing page prerenders as static HTML. Framer-motion lives inside
// `Hero` which is a `"use client"` component, so motion.* is rendered as
// initial-state inline styles during prerender and animates after hydration.

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <SampleReport />
        <Faq />
        <CtaBanner />
      </main>
      <SiteFooter />
    </>
  );
}
