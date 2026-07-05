// Shared normalisation helpers for ScrapeCache extractors.
//
// Each helper takes the *raw* string or number an extractor surfaced and
// converts to the canonical VehicleInput enum tuple (or returns
// `undefined` when the input is unrecognised, so the client knows to
// skip the field rather than persist a bad value).

import type {
  DriveType,
  FuelType,
  State,
  Transmission,
} from "@/lib/types/report";

/** "$21,500" / "21500" / "$21.5k" → 21500. Returns undefined on garbage. */
export function parsePriceAud(raw: string | number | undefined | null): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw) : undefined;
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n > 5_000_000) return undefined; // outside schema max
  return Math.round(n);
}

/** "75,000 km" / "75000 km" / "75k km" / 75000 → 75000. */
export function parseOdometerKm(
  raw: string | number | undefined | null,
): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return undefined;
    return Math.round(raw);
  }
  const lower = raw.toLowerCase().replace(/,/g, "").trim();
  // "75k", "75 k", "75,000km" all normalize.
  const kMatch = lower.match(/^(\d+(?:\.\d+)?)k/);
  if (kMatch) return Math.round(Number(kMatch[1]) * 1_000);
  const digits = lower.replace(/[^\d.]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return undefined;
  return Math.round(n);
}

/** "Used" / "Brand new" + "Automatic" / "Manual" / etc. → schema enum. */
export function normaliseTransmission(raw: string | undefined | null): Transmission | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (/auto|cvt|tiptronic/.test(lower) && !/dual.clutch|dct/.test(lower)) {
    if (lower.includes("cvt")) return "cvt";
    return "auto";
  }
  if (/dct|dual.clutch/.test(lower)) return "dct";
  if (/manual/.test(lower)) return "manual";
  if (/other/.test(lower)) return "other";
  return undefined;
}

export function normaliseFuel(raw: string | undefined | null): FuelType | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (/plug.?in.?hybrid|phev/.test(lower)) return "plug-in-hybrid";
  if (/hybrid/.test(lower)) return "hybrid";
  if (/electric|\bev\b/.test(lower)) return "electric";
  if (/diesel/.test(lower)) return "diesel";
  if (/lpg|gas/.test(lower)) return "lpg";
  if (/petrol|gasoline|unleaded/.test(lower)) return "petrol";
  return undefined;
}

export function normaliseDrive(raw: string | undefined | null): DriveType | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (/4x4|4wd|4.wheel/.test(lower)) return "4wd";
  if (/awd|all.wheel|quattro|xdrive/.test(lower)) return "awd";
  if (/rwd|rear.wheel/.test(lower)) return "rwd";
  if (/fwd|front.wheel/.test(lower)) return "fwd";
  return undefined;
}

/**
 * "Brisbane, QLD" / "NSW" / "Sydney NSW" → enum. Falls back to undefined
 * when no 2-3 letter token matches the AU state set.
 */
export function normaliseState(raw: string | undefined | null): State | undefined {
  if (!raw) return undefined;
  const tokens = raw.toUpperCase().match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/);
  return (tokens?.[0] as State | undefined) ?? undefined;
}

/** Counts how many keys are non-empty. Used to decide "found 8 fields" UX. */
export function countFieldsFilled(
  o: Record<string, unknown>,
): number {
  return Object.values(o).filter(
    (v) => v !== undefined && v !== null && v !== "",
  ).length;
}
