// Centralised SEO helpers — keeps every page emitting consistent metadata
// without re-deriving absolute URLs or JSON-LD shapes.

import type { Metadata } from "next";
import type { ReportPayload, VehicleInput } from "@/lib/types/report";
import { formatAUD } from "@/lib/utils";

export const SITE_NAME = "CarCostCheck";
export const SITE_TAGLINE =
  "Australia's AI co-pilot for used car buyers. Know if it's worth it before you sign.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export interface PageMetadataInput {
  title: string;
  description: string;
  path?: string;
  imagePath?: string;
  type?: "website" | "article";
}

export function buildMetadata({
  title,
  description,
  path = "/",
  imagePath = "/og-default.svg",
  type = "website",
}: PageMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const imageUrl = `${SITE_URL}${imagePath}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      locale: "en_AU",
      type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: { index: true, follow: true },
  };
}

export function reportTitle(input: VehicleInput): string {
  const variant = input.variant ? ` ${input.variant}` : "";
  return `${input.year} ${input.make} ${input.model}${variant} — is it worth buying?`;
}

export function reportDescription(
  input: VehicleInput,
  payload: ReportPayload,
): string {
  const verdictWord =
    payload.verdict === "BUY"
      ? "Buy"
      : payload.verdict === "NEGOTIATE"
      ? "Negotiate"
      : "Avoid";
  return `AI buying report for the ${input.year} ${input.make} ${input.model}. Fair value ${formatAUD(payload.fairMarketValue.range.low)}–${formatAUD(payload.fairMarketValue.range.high)}. Verdict: ${verdictWord}.`;
}

export function vehicleJsonLd(input: VehicleInput, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${input.year} ${input.make} ${input.model}`,
    brand: { "@type": "Brand", name: input.make },
    model: input.model,
    vehicleModelDate: String(input.year),
    vehicleConfiguration: input.variant ?? undefined,
    fuelType: input.fuelType,
    vehicleTransmission: input.transmission,
    mileageFromOdometer: input.odometer
      ? { "@type": "QuantitativeValue", value: input.odometer, unitCode: "KMT" }
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "AUD",
      price: input.askingPrice,
      url: `${SITE_URL}/report/${slug}`,
    },
  };
}

export function reportFaqJsonLd(payload: ReportPayload) {
  const items = [
    {
      q: `What's the fair market value of this car?`,
      a: `Our estimate is ${formatAUD(payload.fairMarketValue.estimate)}, with a typical range of ${formatAUD(payload.fairMarketValue.range.low)}–${formatAUD(payload.fairMarketValue.range.high)} (${payload.fairMarketValue.confidencePct}% confidence).`,
    },
    {
      q: "How reliable is this model?",
      a: `Reliability score: ${payload.reliability.overallScore}/100. ${payload.reliability.summary}`,
    },
    {
      q: "What does ownership cost over 5 years?",
      a: `Estimated 5-year ownership cost is ${formatAUD(payload.ownershipCosts.fiveYearTotalAud)}, including fuel, registration, insurance, maintenance, tyres, servicing and depreciation.`,
    },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
