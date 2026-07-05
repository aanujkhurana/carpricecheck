// Deterministic mock report generator. The heuristics here are deliberately
// conservative and pickable apart from a real AI output — they're meant to
// make the MVP demo feel real, not to claim false accuracy. The output
// contract is identical to the OpenAI provider, so flipping AI_PROVIDER
// changes nothing in the UI.

import type {
  ChecklistItem,
  DealRating,
  FuelType,
  OwnershipCostLineItem,
  OwnershipCosts,
  ReliabilityItem,
  ReportPayload,
  Safety,
  SellerQuestion,
  VehicleInput,
  Verdict,
} from "@/lib/types/report";

const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Domain heuristics — small lookup tables to inject realism.
// ---------------------------------------------------------------------------

const RELIABILITY_SCORES: Record<string, number> = {
  toyota: 92, lexus: 95, mazda: 86, honda: 84, kia: 81, hyundai: 80,
  subaru: 78, mitsubishi: 76, volkswagen: 70, ford: 67, holden: 60,
  bmw: 64, mercedes: 62, audi: 66, "land rover": 55, jaguar: 50,
  tesla: 70, nissan: 74, suzuki: 80, isuzu: 82,
};

const COMMON_ISSUES_BY_MAKE: Record<string, ReliabilityItem[]> = {
  bmw: [
    { area: "Timing chain", severity: "critical",
      description: "Older N20/B48 engines can stretch timing chains above 80,000 km — budget for inspection." },
    { area: "Cooling system", severity: "warning",
      description: "Plastic coolant tanks and water pumps are known weak points." },
  ],
  audi: [
    { area: "DSG/DCT mechatronics", severity: "warning",
      description: "Dual-clutch units can fault at 100–140k km without prior warning; check software updates." },
  ],
  "land rover": [
    { area: "Air suspension", severity: "critical",
      description: "Air struts and compressor failures are expensive. Confirm ride height holds overnight." },
    { area: "Electrical gremlins", severity: "warning",
      description: "Known for window modules and infotainment faults." },
  ],
  holden: [
    { area: "Parts supply", severity: "warning",
      description: "Several Holden models are now out of official support; long lead times on common parts." },
  ],
  ford: [
    { area: "Dual-clutch (PowerShift)", severity: "critical",
      description: "Early Ford DCTs are notorious; shudder on take-off is a tell-tale sign." },
  ],
  volkswagen: [
    { area: "DSG/DCT mechatronics", severity: "warning",
      description: "Same family of issues as Audi dual-clutch units; verify service history." },
  ],
  tesla: [
    { area: "Panel gaps", severity: "info",
      description: "Cosmetic panel alignment is hit-and-miss, especially in early Model 3 builds." },
    { area: "Battery longevity", severity: "info",
      description: "Confirm battery health via service menu if possible." },
  ],
};

const FUEL_ECONOMY: Record<FuelType, number | null> = {
  petrol: 8.0,
  diesel: 7.0,
  hybrid: 5.5,
  "plug-in-hybrid": 2.5, // combined, weighted
  electric: null, // kWh/100km reported elsewhere
  lpg: 10.5,
};

const TYRE_SET_COST: Record<string, number> = {
  // approximate per-set AUD, varies with vehicle class
  small: 800, mid: 1100, large: 1600,
};

function normaliseMake(make: string): string {
  return make.trim().toLowerCase().replace(/\s+/g, " ");
}

function vehicleClass(make: string, model: string): "small" | "mid" | "large" {
  const m = (make + " " + model).toLowerCase();
  if (/corolla|yaris|i30|swift|mazda2|civic|polo|city|kona|raize|starlet|mg3/.test(m)) return "small";
  if (/landcruiser|range|hilux|prado|discovery|q7|x5|gls|patrick|aurion|fairlane/.test(m)) return "large";
  return "mid";
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function estimateFairValue(input: VehicleInput): {
  estimate: number; low: number; high: number; confidencePct: number;
} {
  // Base price by year curve (very rough) — falls ~14% per year from a $40k peak
  const age = Math.max(0, CURRENT_YEAR - input.year);
  const baseValue = Math.max(3500, 40_000 * Math.pow(0.86, age));

  // Make premium/discount
  const makeKey = normaliseMake(input.make);
  const premium: Record<string, number> = {
    bmw: 1.05, audi: 1.05, mercedes: 1.05, lexus: 1.0, "land rover": 1.02,
    toyota: 1.0, mazda: 0.97, honda: 0.97, kia: 0.93, hyundai: 0.94,
    holden: 0.85, ford: 0.9, mitsubishi: 0.9,
  };
  const mult = premium[makeKey] ?? 1.0;

  // Odometer penalty: ~1.3% per 10k km over expected
  const expectedKm = age * 15_000;
  const excessKm = Math.max(0, (input.odometer ?? expectedKm) - expectedKm);
  const kmPenalty = 1 - Math.min(0.30, (excessKm / 10_000) * 0.013);

  let estimate = Math.round(baseValue * mult * kmPenalty);
  estimate = Math.max(1500, estimate);
  const low = Math.round(estimate * 0.92);
  const high = Math.round(estimate * 1.08);
  const confidencePct = Math.max(50, Math.min(92, 90 - age * 1.5));
  return { estimate, low, high, confidencePct };
}

function classifyDeal(price: number, estimate: number): {
  rating: DealRating; percentageDiff: number;
} {
  const diff = ((price - estimate) / estimate) * 100;
  if (diff <= -7) return { rating: "GREAT_DEAL", percentageDiff: diff };
  if (diff <= 7) return { rating: "FAIR_PRICE", percentageDiff: diff };
  return { rating: "OVERPRICED", percentageDiff: diff };
}

function verdictFromDeal(
  rating: DealRating,
  age: number,
  fuelType: FuelType | undefined,
): Verdict {
  if (rating === "OVERPRICED") return age > 12 ? "AVOID" : "NEGOTIATE";
  if (rating === "FAIR_PRICE") return age > 15 || fuelType === "diesel" ? "NEGOTIATE" : "BUY";
  return "BUY";
}

function ownershipCostsFor(input: VehicleInput, age: number): OwnershipCosts {
  const fuelType: FuelType = input.fuelType ?? "petrol";
  const kmPerYear = Math.max(8_000, input.odometer ? Math.round(input.odometer / Math.max(age, 1)) : 12_000);

  // Fuel (assume ~$1.85/L petrol, $1.95/L diesel, $0.30/kWh for EV)
  const fuelEcon = FUEL_ECONOMY[fuelType] ?? 8.0;
  let yearlyFuelAud = 0;
  let fuelNote: string | undefined;
  if (fuelType === "electric") {
    yearlyFuelAud = Math.round((kmPerYear / 100) * 18 * 0.35); // 18 kWh/100km
    fuelNote = "Estimated at $0.35/kWh home charging.";
  } else {
    const pricePerL = fuelType === "diesel" ? 1.95 : fuelType === "lpg" ? 0.95 : 1.85;
    yearlyFuelAud = Math.round((kmPerYear / 100) * (fuelEcon ?? 8) * pricePerL);
    fuelNote = `${(fuelEcon ?? 0).toFixed(1)} L/100km assumed, prices indicative.`;
  }

  // Registration: states vary, depreciate with vehicle value
  const regBase = input.state === "NSW" ? 750 : input.state === "VIC" ? 830 : 700;
  const yearlyReg = Math.round(regBase * Math.max(0.55, 1 - age * 0.03));

  const cls = vehicleClass(input.make, input.model);
  const tyreSet = TYRE_SET_COST[cls];
  const yearlyTyres = Math.round(tyreSet / 3.5); // set every ~3.5y
  const tyreNote = cls === "large" ? "Premium tyres run larger and costlier." : undefined;

  // Insurance — depends on vehicle class and age
  const insBase = cls === "large" ? 1800 : cls === "mid" ? 1300 : 1100;
  const yearlyInsurance = Math.round(insBase * Math.max(0.7, 1.15 - age * 0.025));

  // Servicing & maintenance — grows with age
  const yearlyServicing = Math.round(350 * (1 + age * 0.05));
  const yearlyMaintenance = Math.round(cls === "large" ? 750 : cls === "mid" ? 500 : 380 + age * 30);

  // Depreciation: assumption that 5-year residual = 50% of asking price for young cars,
  // less for older ones (already depreciated).
  const futureResidual = Math.max(0, Math.round(input.askingPrice * (0.5 - Math.min(0.4, age * 0.02))));
  const dep5y = input.askingPrice - futureResidual;

  const line = (
    label: string,
    yearlyAud: number,
    note?: string,
  ): OwnershipCostLineItem => ({
    label,
    fiveYearAud: yearlyAud * 5,
    yearlyAud,
    note,
  });

  const fuel = line("Fuel", yearlyFuelAud, fuelNote);
  const registration = line("Registration", yearlyReg);
  const insurance = line("Comprehensive Insurance", yearlyInsurance);
  const tyres = line("Tyres (set every ~3.5 years)", yearlyTyres, tyreNote);
  const servicing = line("Scheduled Servicing", yearlyServicing);
  const maintenance = line("General Maintenance & Repairs", yearlyMaintenance);
  const depreciation = line("Depreciation over 5 years", dep5y / 5, "Estimate assumes ~50% residual at year 5.");

  const arr = [fuel, registration, insurance, tyres, servicing, maintenance, depreciation];
  const fiveYearTotalAud = arr.reduce((s, l) => s + l.fiveYearAud, 0);

  return {
    fuel, registration, insurance, tyres, servicing, maintenance, depreciation,
    fiveYearTotalAud,
  };
}

function reliabilityFor(input: VehicleInput): ReportPayload["reliability"] {
  const key = normaliseMake(input.make);
  const age = Math.max(0, CURRENT_YEAR - input.year);
  const base = RELIABILITY_SCORES[key] ?? 72;
  const score = Math.max(40, base - age * 0.8);
  const issues: ReliabilityItem[] = (COMMON_ISSUES_BY_MAKE[key] ?? []).slice(0, 3);
  if (input.fuelType === "diesel" && age > 8) {
    issues.push({
      area: "DPF (Diesel Particulate Filter)",
      severity: "warning",
      description: "Mostly urban-driven diesels suffer DPF clogging; confirm regular long drives.",
    });
  }
  if (input.fuelType === "hybrid" && input.year <= 2015) {
    issues.push({
      area: "Hybrid battery",
      severity: "info",
      description: "First-gen hybrid batteries can degrade; check for warning lights and age of replacement.",
    });
  }
  if (input.year >= 2010 && issues.length < 2) {
    issues.push({
      area: "Wear items",
      severity: "info",
      description: "Age-related wear items (suspension bushes, dampers) — budget $700–1,400 in the first year.",
    });
  }
  return {
    overallScore: Math.round(score),
    summary: score >= 85
      ? "Strong long-term reliability expected for this model. Routine servicing is the main cost."
      : score >= 75
      ? "Generally reliable with known weaknesses. Pre-purchase inspection will catch most issues."
      : "Mixed reliability — budget for higher repair costs and insist on full service history.",
    knownIssues: issues,
    recalls: ["No outstanding recalls detected for this listing (mock data)."],
  };
}

function safetyFor(input: VehicleInput): Safety {
  // Rough ANCAP heuristic — newer vehicles tend to have higher ratings, but
  // historic luxury makes sometimes score lower.
  const age = CURRENT_YEAR - input.year;
  let rating: number | null;
  if (input.year >= 2018) rating = 5;
  else if (input.year >= 2014) rating = 5;
  else if (input.year >= 2010) rating = 4;
  else if (input.year >= 2005) rating = 3;
  else rating = 2;

  const make = normaliseMake(input.make);
  if ((make === "holden" || make === "ford") && input.year <= 2015) rating = 4;

  return {
    ancapRating: rating,
    ancapYear: input.year >= 2010 ? input.year - 1 : null,
    airbags: input.year >= 2015
      ? "Dual front, side and curtain airbags standard"
      : "Dual front + front side airbags (pre-2015 spec)",
    driverAssists: input.year >= 2018
      ? ["Autonomous Emergency Braking (AEB)", "Lane-keep assist", "Blind-spot monitoring", "Rear cross-traffic alert"]
      : input.year >= 2013
      ? ["Reverse camera", "Electronic stability control"]
      : ["Electronic stability control (mandatory since 2013)"],
    warnings: input.year >= 2010
      ? []
      : ["ANCAP protocols have evolved — older scores may not reflect modern crash avoidance tech."],
  };
}

function runningCostsFor(input: VehicleInput, age: number, ownership: OwnershipCosts): ReportPayload["runningCosts"] {
  const ft: FuelType = input.fuelType ?? "petrol";
  const cls = vehicleClass(input.make, input.model);
  const clsRepairMap: Record<string, { item: string; typicalAud: number }[]> = {
    small: [
      { item: "Brake pads (front pair)", typicalAud: 280 },
      { item: "Battery replacement", typicalAud: 220 },
    ],
    mid: [
      { item: "Brake pads (front pair)", typicalAud: 320 },
      { item: "Battery replacement", typicalAud: 240 },
      { item: "Timing belt kit", typicalAud: 650 },
    ],
    large: [
      { item: "Brake pads (front pair)", typicalAud: 420 },
      { item: "Battery replacement", typicalAud: 320 },
      { item: "Suspension strut (each)", typicalAud: 480 },
    ],
  };
  return {
    fuelEconomyLPer100km: ft === "electric" ? null : FUEL_ECONOMY[ft] ?? 8,
    fuelEconomyLabel: ft === "electric"
      ? "≈ 18 kWh/100km (home charging)"
      : `${(FUEL_ECONOMY[ft] ?? 8).toFixed(1)} L/100km combined (indicative)`,
    avgYearlyFuelAud: ownership.fuel.yearlyAud,
    servicingIntervalKm: 10_000,
    commonRepairCosts: clsRepairMap[cls],
  };
}

function checklistFor(input: VehicleInput): ChecklistItem[] {
  const base: ChecklistItem[] = [
    { label: "Cold-start inspection", why: "Listen for rattle, smoke or uneven idle — flags engine wear before the engine is warm." },
    { label: "Transmission shifts (auto/manual)", why: "Slow or harsh shifts indicate worn synchros or transmission fluid issues." },
    { label: "Brake feel & fluid", why: "Spongy pedal suggests air in the system or worn pads/discs." },
    { label: "Suspension bounce test", why: "Bounce each corner — more than 1.5 oscillations means likely worn dampers." },
    { label: "Service history completeness", why: "Gaps in history commonly correlate with skipped maintenance and faster depreciation." },
    { label: "VIN & build plate consistency", why: "Confirm stickers, build plates and VIN match the paperwork (write-off check)." },
    { label: "Underbody rust or leaks", why: "Scan for leaks from power steering, transmission, oil pan and radiator." },
    { label: "Paint meter check", why: "Inconsistent panel readings may indicate accident repairs." },
    { label: "Tyre age & even wear", why: "DOT date code on sidewall — older than 5 years means tyres should be replaced soon." },
  ];
  if (input.fuelType === "hybrid" || input.fuelType === "plug-in-hybrid") {
    base.push({ label: "Hybrid system diagnostics", why: "Ask for a dealer scan to confirm battery state-of-health and any historical DTCs." });
  }
  if (input.fuelType === "diesel") {
    base.push({ label: "DPF & EGR inspection", why: "Confirm regular long drives and no dashboard DPF warnings; replacement is expensive." });
  }
  if (input.year <= 2012) {
    base.push({ label: "Timing belt / chain status", why: "Critical service item on older vehicles; replacement cost is significant if overdue." });
  }
  return base.slice(0, 12);
}

function questionsFor(input: VehicleInput): SellerQuestion[] {
  const base: SellerQuestion[] = [
    { question: "Why are you selling?", why: "A direct answer reveals ownership intent — vague answers can hide known issues." },
    { question: "Has the car ever been in an accident or written off?", why: "Affects insurance, resale and structural integrity." },
    { question: "Is there any finance owing on the vehicle?", why: "Critical to settle before transfer of ownership (PPSR check recommended)." },
    { question: "Do you have a full service history?", why: "Indicates how the vehicle has been maintained." },
    { question: "Has the timing belt/chain been replaced at the recommended interval?", why: "Major service item; skipping it often means engine damage." },
    { question: "Are there any known mechanical issues or upcoming repairs?", why: "Lets you negotiate from a position of fact, not speculation." },
  ];
  if (input.fuelType === "hybrid" || input.fuelType === "plug-in-hybrid") {
    base.push({ question: "Has the hybrid battery ever been replaced or serviced?",
      why: "Replacement is expensive; a healthy battery will report on the dash diagnostics." });
  }
  if (input.fuelType === "diesel") {
    base.push({ question: "How often is the car driven on long trips?",
      why: "Short-trip diesels clog the DPF and EGR — a common cause of expensive repairs." });
  }
  return base.slice(0, 8);
}

function negotiationScriptFor(
  input: VehicleInput,
  fairValue: { low: number; high: number; estimate: number },
  rating: DealRating,
): ReportPayload["negotiationScript"] {
  const target = rating === "OVERPRICED"
    ? Math.round(fairValue.estimate * 0.93)
    : rating === "FAIR_PRICE"
    ? Math.round(fairValue.estimate * 0.96)
    : Math.max(fairValue.low, input.askingPrice - 1500);

  const opening = rating === "OVERPRICED"
    ? `Thanks for showing me the ${input.year} ${input.make} ${input.model}. I've researched the market and similar vehicles are selling between $${fairValue.low.toLocaleString()} and $${fairValue.high.toLocaleString()}. Based on the odometer and condition, I'd be comfortable at $${target.toLocaleString()} today.`
    : `I really like the ${input.year} ${input.make} ${input.model}. I have finance pre-approved and can settle quickly — would you accept $${target.toLocaleString()}?`;

  const followUps = rating === "OVERPRICED"
    ? [
        "I'd like to bring in an independent mechanic for a pre-purchase inspection. If they're happy, I'll meet you at $X.",
        "Books of service history would help me move up from $X to $Y — happy to share the inspection report.",
      ]
    : [
        "If you can include a roadworthy certificate, I can stretch a little further.",
        "Could you throw in a fresh service before handover? It's the difference for me.",
      ];

  return { targetPriceAud: target, openingMessage: opening, followUps };
}

function headlineFor(input: VehicleInput, rating: DealRating, age: number, score: number): { headline: string; oneLine: string } {
  const name = `${input.year} ${input.make} ${input.model}`.trim();
  if (rating === "GREAT_DEAL") {
    return {
      headline: `${name}: at this price, it's worth a serious look`,
      oneLine: `Listed below market value with acceptable risk for a ${age}-year-old ${input.make}. Move quickly and inspect before paying.`,
    };
  }
  if (rating === "FAIR_PRICE") {
    return {
      headline: `${name}: fair price, but negotiation expected`,
      oneLine: `In line with the market. Buy only if the inspection and ownership costs suit your budget.`,
    };
  }
  return {
    headline: `${name}: overpriced — negotiate hard or walk away`,
    oneLine: `${score < 75 ? "Reliability concerns compound the price problem." : "There are better-value examples on the market at this price point."}`,
  };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function generateMockReport(input: VehicleInput): Promise<ReportPayload> {
  const age = Math.max(0, CURRENT_YEAR - input.year);
  const fair = estimateFairValue(input);
  const { rating, percentageDiff } = classifyDeal(input.askingPrice, fair.estimate);
  const verdict = verdictFromDeal(rating, age, input.fuelType);
  const ownership = ownershipCostsFor(input, age);
  const reliability = reliabilityFor(input);
  const safety = safetyFor(input);
  const running = runningCostsFor(input, age, ownership);
  const checklist = checklistFor(input);
  const sellerQs = questionsFor(input);
  const negotiation = negotiationScriptFor(input, fair, rating);
  const { headline, oneLine: oneLineSummary } = headlineFor(input, rating, age, reliability.overallScore);

  // Reason text varies a bit with age
  let reasoning: string;
  if (age <= 3) reasoning = "Near-new vehicle, asking is ${pct}% vs our estimate. Limited room to negotiate, but warranty support remains.";
  else if (age <= 8) reasoning = "Mid-life vehicle; condition and km drive the price more than year. Listing sits ${pct}% against our market estimate.";
  else reasoning = "Older vehicle; comparable listings vary widely. Estimate is based on make/model/age and current odometer.";
  reasoning = reasoning.replace("${pct}", `${percentageDiff >= 0 ? "+" : ""}${percentageDiff.toFixed(1)}%`);

  return {
    headline,
    oneLineSummary,
    dealRating: rating,
    verdict,
    fairMarketValue: {
      estimate: fair.estimate,
      range: { low: fair.low, high: fair.high, currency: "AUD" },
      confidencePct: fair.confidencePct,
      reasoning,
    },
    ownershipCosts: ownership,
    reliability,
    safety,
    runningCosts: running,
    inspectionChecklist: checklist,
    sellerQuestions: sellerQs,
    negotiationScript: negotiation,
    generatedAt: new Date().toISOString(),
    aiModel: "carcostcheck-mock-v1",
  };
}
