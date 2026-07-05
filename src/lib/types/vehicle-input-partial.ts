// Re-export shape used by extract-listing so that callers don't have to
// import from `lib/schemas` directly when consuming the action's
// `ScrapeResult.partial` field. Mirrors the relevant subset of
// `VehicleInput` without re-exporting the full schema surface.

import type { VehicleInput } from "@/lib/schemas";

export type PartialVehicleInput = Partial<VehicleInput>;
