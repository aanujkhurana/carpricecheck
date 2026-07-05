import { z } from "zod";

// Runtime validator for AI-generated reports. The mock produces values that
// already satisfy this; the OpenAI provider parses against it before saving.
export const ReportPayloadSchema = z.object({
  headline: z.string().min(5).max(140),
  oneLineSummary: z.string().min(10).max(220),
  dealRating: z.enum(["GREAT_DEAL", "FAIR_PRICE", "OVERPRICED"]),
  verdict: z.enum(["BUY", "NEGOTIATE", "AVOID"]),
  fairMarketValue: z.object({
    estimate: z.number().int().nonnegative(),
    range: z.object({
      low: z.number().int().nonnegative(),
      high: z.number().int().nonnegative(),
      currency: z.literal("AUD"),
    }),
    confidencePct: z.number().int().min(0).max(100),
    reasoning: z.string().min(10).max(400),
  }),
  ownershipCosts: z.object({
    fuel: z.object({
      label: z.string(),
      fiveYearAud: z.number().int().nonnegative(),
      yearlyAud: z.number().int().nonnegative(),
      note: z.string().optional(),
    }),
    registration: z.object({
      label: z.string(),
      fiveYearAud: z.number().int().nonnegative(),
      yearlyAud: z.number().int().nonnegative(),
      note: z.string().optional(),
    }),
    insurance: z.object({
      label: z.string(),
      fiveYearAud: z.number().int().nonnegative(),
      yearlyAud: z.number().int().nonnegative(),
      note: z.string().optional(),
    }),
    maintenance: z.object({
      label: z.string(),
      fiveYearAud: z.number().int().nonnegative(),
      yearlyAud: z.number().int().nonnegative(),
      note: z.string().optional(),
    }),
    tyres: z.object({
      label: z.string(),
      fiveYearAud: z.number().int().nonnegative(),
      yearlyAud: z.number().int().nonnegative(),
      note: z.string().optional(),
    }),
    servicing: z.object({
      label: z.string(),
      fiveYearAud: z.number().int().nonnegative(),
      yearlyAud: z.number().int().nonnegative(),
      note: z.string().optional(),
    }),
    depreciation: z.object({
      label: z.string(),
      fiveYearAud: z.number().int().nonnegative(),
      yearlyAud: z.number().int().nonnegative(),
      note: z.string().optional(),
    }),
    fiveYearTotalAud: z.number().int().nonnegative(),
  }),
  reliability: z.object({
    overallScore: z.number().int().min(0).max(100),
    summary: z.string().min(10).max(400),
    knownIssues: z.array(
      z.object({
        area: z.string(),
        severity: z.enum(["info", "warning", "critical"]),
        description: z.string(),
      }),
    ),
    recalls: z.array(z.string()),
  }),
  safety: z.object({
    ancapRating: z.number().int().min(0).max(5).nullable(),
    ancapYear: z.number().int().nullable(),
    airbags: z.string(),
    driverAssists: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
  runningCosts: z.object({
    fuelEconomyLPer100km: z.number().nullable(),
    fuelEconomyLabel: z.string(),
    avgYearlyFuelAud: z.number().int().nonnegative(),
    servicingIntervalKm: z.number().int().positive(),
    commonRepairCosts: z.array(
      z.object({
        item: z.string(),
        typicalAud: z.number().int().nonnegative(),
      }),
    ),
  }),
  inspectionChecklist: z.array(
    z.object({
      label: z.string(),
      why: z.string(),
    }),
  ),
  sellerQuestions: z.array(
    z.object({
      question: z.string(),
      why: z.string(),
    }),
  ),
  negotiationScript: z.object({
    targetPriceAud: z.number().int().nonnegative(),
    openingMessage: z.string(),
    followUps: z.array(z.string()),
  }),
});

export type ValidatedReportPayload = z.infer<typeof ReportPayloadSchema>;
