import { z } from "zod";

// VehicleInput is declared locally below as the single canonical type, derived
// from VehicleInputSchema. (`@/lib/types/report` still exports a structurally
// identical interface for clarity at module boundaries, but importing it here
// would cause a name-conflict TS error.)

// Convert "" → undefined before the inner schema runs, then chain `.optional()`.
// The trailing `.optional()` is required so fields are TRUE optional properties
// in `z.infer<typeof VehicleInputSchema>` (without it, the inferred type treats
// the property as required even though the value can be undefined, which breaks
// object-literal assignments like `{ make, model, year, askingPrice }`).

const optionalNumber = (min: number, max: number) =>
  z
    .preprocess((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "string" ? Number(v) : (v as number);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().int().min(min).max(max))
    .optional();

const optionalEnum = <T extends string>(values: readonly T[]) =>
  z
    .preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.enum(values as unknown as [T, ...T[]]),
    )
    .optional();

const optionalString = (max: number) =>
  z
    .preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.string().max(max),
    )
    .optional();

const optionalUrl = () =>
  z
    .preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.string().url(),
    )
    .optional();

export const VehicleInputSchema = z.object({
  sourceUrl: optionalUrl(),
  make: z.string().min(1, "Make is required").max(60),
  model: z.string().min(1, "Model is required").max(60),
  year: z.coerce
    .number()
    .int()
    .min(1985, "Year must be 1985 or later")
    .max(new Date().getFullYear() + 1),
  variant: optionalString(80),
  odometer: optionalNumber(0, 1_000_000),
  transmission: optionalEnum(["auto", "manual", "cvt", "dct", "other"]),
  fuelType: optionalEnum(["petrol", "diesel", "hybrid", "plug-in-hybrid", "electric", "lpg"]),
  driveType: optionalEnum(["fwd", "rwd", "awd", "4wd"]),
  vin: optionalString(17).refine(
    (v) => !v || /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(v),
    { message: "Invalid VIN" },
  ),
  askingPrice: z.coerce
    .number()
    .int()
    .min(100, "Asking price seems too low")
    .max(5_000_000, "Asking price seems unrealistic"),
  sellerType: optionalEnum(["private", "dealer", "authorized-dealer"]),
  state: optionalEnum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]),
  description: optionalString(2000),
  imageUrl: optionalUrl(),
});

export type VehicleInput = z.infer<typeof VehicleInputSchema>;
