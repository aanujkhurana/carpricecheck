// Real OpenAI integration. Activated when:
//   AI_PROVIDER=openai
//   OPENAI_API_KEY=sk-...
//
// The system prompt explicitly inlines the JSON contract so production prompts
// return data that passes ReportPayloadSchema.parse().

import type { ReportPayload, VehicleInput } from "@/lib/types/report";
import { ReportPayloadSchema } from "@/lib/report-schema";

// JSON contract inlined into the system prompt so OpenAI returns matching
// output. Keep in sync with src/lib/report-schema.ts.
const JSON_CONTRACT = `{
  "headline": "string (<=140 chars)",
  "oneLineSummary": "string (<=220 chars)",
  "dealRating": "GREAT_DEAL | FAIR_PRICE | OVERPRICED",
  "verdict": "BUY | NEGOTIATE | AVOID",
  "fairMarketValue": {
    "estimate": integer (AUD),
    "range": { "low": integer, "high": integer, "currency": "AUD" },
    "confidencePct": integer 0..100,
    "reasoning": "string (<=400 chars)"
  },
  "ownershipCosts": {
    "fuel":         { "label":"Fuel",                   "fiveYearAud": int, "yearlyAud": int, "note"?: string },
    "registration": { "label":"Registration",            "fiveYearAud": int, "yearlyAud": int, "note"?: string },
    "insurance":    { "label":"Comprehensive Insurance", "fiveYearAud": int, "yearlyAud": int, "note"?: string },
    "tyres":        { "label":"Tyres...",                "fiveYearAud": int, "yearlyAud": int, "note"?: string },
    "servicing":    { "label":"Scheduled Servicing",     "fiveYearAud": int, "yearlyAud": int, "note"?: string },
    "maintenance":  { "label":"General Maintenance",     "fiveYearAud": int, "yearlyAud": int, "note"?: string },
    "depreciation": { "label":"Depreciation...",         "fiveYearAud": int, "yearlyAud": int, "note"?: string },
    "fiveYearTotalAud": integer
  },
  "reliability": {
    "overallScore": integer 0..100,
    "summary": "string",
    "knownIssues": [{ "area":"string", "severity":"info|warning|critical", "description":"string" }],
    "recalls": ["string"]
  },
  "safety": {
    "ancapRating": integer 0..5 | null,
    "ancapYear": integer | null,
    "airbags": "string",
    "driverAssists": ["string"],
    "warnings": ["string"]
  },
  "runningCosts": {
    "fuelEconomyLPer100km": number | null,
    "fuelEconomyLabel": "string (e.g. '7.5 L/100km combined')",
    "avgYearlyFuelAud": integer,
    "servicingIntervalKm": integer,
    "commonRepairCosts": [{ "item":"string", "typicalAud": integer }]
  },
  "inspectionChecklist": [{ "label":"string", "why":"string" }],
  "sellerQuestions":      [{ "question":"string", "why":"string" }],
  "negotiationScript": {
    "targetPriceAud": integer,
    "openingMessage": "string",
    "followUps": ["string"]
  }
}`;

const SYSTEM_PROMPT = `You are CarCostCheck AI, an expert Australian used-car buying advisor.
You produce structured JSON reports that help Australians decide whether a used
car is worth buying. Be specific, evidence-based, and conservative — never
fabricate exact recall numbers or service costs. Use Australian conventions
(AUD currency, L/100km, ANCAP 0–5 scale, state NSW/VIC/QLD/WA/SA/TAS/ACT/NT).

Always return STRICT JSON (no markdown, no commentary) matching this contract:

${JSON_CONTRACT}

Sanity rules:
- fairMarketValue.range.low <= estimate <= range.high
- dealRating and verdict must be consistent (OVERPRICED → NEGOTIATE or AVOID; GREAT_DEAL → BUY)
- All AUD amounts are positive integers
- inspectionChecklist: 8–12 items
- sellerQuestions: 5–8 items`;

export async function generateOpenAIReport(input: VehicleInput): Promise<ReportPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const userPrompt = JSON.stringify({ task: "produce_report", input });

  // Network layer: 20s hard timeout via AbortSignal + retry on 429 or 5xx so a
  // transient blip never surfaces as "AI couldn't generate this report" to
  // the user. Client errors (4xx other than 429) are surfaced immediately so
  // misconfigurations stay visible. Note: Vercel Hobby's wall-clock is 10s —
  // our 2×20s = 40s window assumes Pro/Enterprise (60s+); document before any
  // Hobby deploy.
  const REQUEST_TIMEOUT_MS = 20_000;
  const MAX_ATTEMPTS = 2;
  const BACKOFF_MS = 200;

  let res: Response;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      // Typically AbortError from the timeout, or a connection-level failure.
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS));
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `OpenAI request timed out or failed to connect: ${msg.slice(0, 240)}`,
      );
    }

    if (res.ok) break;

    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt >= MAX_ATTEMPTS - 1) {
      const body = await res.text();
      throw new Error(`OpenAI request failed: ${res.status} ${body.slice(0, 200)}`);
    }
    // Drain body before retrying so the connection is freed cleanly.
    await res.text();
    await new Promise((r) => setTimeout(r, BACKOFF_MS));
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("OpenAI returned no content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }

  const validated = ReportPayloadSchema.parse(parsed);
  return {
    ...validated,
    generatedAt: new Date().toISOString(),
    aiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  } satisfies ReportPayload;
}
