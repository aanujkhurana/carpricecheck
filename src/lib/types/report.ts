// Canonical shape of an AI-generated car-buying report.
// This is the contract our UI renders and our AI providers must produce.

export type DealRating = "GREAT_DEAL" | "FAIR_PRICE" | "OVERPRICED";
export type Verdict = "BUY" | "NEGOTIATE" | "AVOID";
export type FuelType =
  | "petrol"
  | "diesel"
  | "hybrid"
  | "plug-in-hybrid"
  | "electric"
  | "lpg";
export type Transmission = "auto" | "manual" | "cvt" | "dct" | "other";
export type DriveType = "fwd" | "rwd" | "awd" | "4wd";
export type SellerType = "private" | "dealer" | "authorized-dealer";
export type State =
  | "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

export interface VehicleInput {
  make: string;
  model: string;
  year: number;
  variant?: string;
  odometer?: number;
  transmission?: Transmission;
  fuelType?: FuelType;
  driveType?: DriveType;
  vin?: string;
  askingPrice: number;
  sellerType?: SellerType;
  state?: State;
  description?: string;
  imageUrl?: string;
}

export interface MoneyRange {
  low: number;
  high: number;
  currency: "AUD";
}

export interface FairMarketValue {
  estimate: number;
  range: MoneyRange;
  confidencePct: number; // 0–100
  reasoning: string; // 1–3 sentences
}

export interface OwnershipCostLineItem {
  label: string;
  fiveYearAud: number;
  yearlyAud: number;
  note?: string;
}

export interface OwnershipCosts {
  fuel: OwnershipCostLineItem;
  registration: OwnershipCostLineItem;
  insurance: OwnershipCostLineItem;
  maintenance: OwnershipCostLineItem;
  tyres: OwnershipCostLineItem;
  servicing: OwnershipCostLineItem;
  depreciation: OwnershipCostLineItem;
  fiveYearTotalAud: number;
}

export interface ReliabilityItem {
  area: string; // e.g. "Transmission"
  severity: "info" | "warning" | "critical";
  description: string;
}

export interface Reliability {
  overallScore: number; // 0–100
  summary: string;
  knownIssues: ReliabilityItem[];
  recalls: string[];
}

export interface Safety {
  ancapRating: number | null; // 0–5, null when unknown
  ancapYear: number | null;
  airbags: string;
  driverAssists: string[];
  warnings: string[];
}

export interface RunningCosts {
  fuelEconomyLPer100km: number | null;
  fuelEconomyLabel: string; // "6.5 L/100km combined"
  avgYearlyFuelAud: number;
  servicingIntervalKm: number;
  commonRepairCosts: { item: string; typicalAud: number }[];
}

export interface ChecklistItem {
  label: string;
  why: string;
}

export interface SellerQuestion {
  question: string;
  why: string;
}

export interface NegotiationScript {
  targetPriceAud: number;
  openingMessage: string;
  followUps: string[];
}

export interface ReportPayload {
  // Header summary
  headline: string; // "Solid pick, but negotiate hard"
  oneLineSummary: string;
  dealRating: DealRating;
  verdict: Verdict;

  fairMarketValue: FairMarketValue;
  ownershipCosts: OwnershipCosts;
  reliability: Reliability;
  safety: Safety;
  runningCosts: RunningCosts;
  inspectionChecklist: ChecklistItem[];
  sellerQuestions: SellerQuestion[];
  negotiationScript: NegotiationScript;

  // Meta
  generatedAt: string; // ISO
  aiModel: string;
}
