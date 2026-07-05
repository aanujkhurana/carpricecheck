"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Car, Sparkles, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { VehicleInputSchema, type VehicleInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { createReportAction } from "@/app/actions/create-report";
import { extractListingAction } from "@/app/actions/extract-listing";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
const TRANSMISSIONS = [
  { v: "auto", label: "Automatic" },
  { v: "manual", label: "Manual" },
  { v: "cvt",   label: "CVT" },
  { v: "dct",   label: "Dual-clutch (DCT)" },
  { v: "other", label: "Other" },
] as const;
const FUELS = [
  { v: "petrol",         label: "Petrol" },
  { v: "diesel",         label: "Diesel" },
  { v: "hybrid",         label: "Hybrid" },
  { v: "plug-in-hybrid", label: "Plug-in hybrid" },
  { v: "electric",       label: "Electric" },
  { v: "lpg",            label: "LPG" },
] as const;
const DRIVES = [
  { v: "fwd", label: "Front-wheel drive" },
  { v: "rwd", label: "Rear-wheel drive" },
  { v: "awd", label: "All-wheel drive" },
  { v: "4wd", label: "4x4" },
] as const;
const SELLERS = [
  { v: "private",           label: "Private seller" },
  { v: "dealer",            label: "Dealer" },
  { v: "authorized-dealer", label: "Authorised dealer" },
] as const;

type Step = 0 | 1;

export function VehicleForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractInfo, setExtractInfo] = useState<string | null>(null);

  // Marker comment for the cast directly below:
  // `zodResolver` is typed against `Resolver<TFieldValues>` where TFieldValues
  // is the *input* shape, but Zod 4's `preprocess` helpers widen inferred types
  // slightly beyond the form value shape. We assert that the schema's runtime
  // Zod parse produces a shape assignable to `VehicleInput`, which we know is
  // true because we hand-validate inputs through the same schema in
  // `src/app/actions/create-report.ts`.
  const form = useForm<VehicleInput>({
    resolver: zodResolver(VehicleInputSchema) as Resolver<VehicleInput>,
    defaultValues: {
      sourceUrl: undefined,
      make: "",
      model: "",
      variant: undefined,
      year: new Date().getFullYear(),
      odometer: undefined,
      transmission: undefined,
      fuelType: undefined,
      driveType: undefined,
      vin: undefined,
      askingPrice: 0,
      sellerType: undefined,
      state: undefined,
      description: undefined,
      imageUrl: undefined,
    },
    mode: "onTouched",
  });

  const {
    register, handleSubmit, formState: { errors, dirtyFields }, watch, setValue, trigger,
  } = form;

  const sourceUrlValue = watch("sourceUrl");

  async function handleNext() {
    const ok = await trigger(["make", "model", "year"]);
    if (!ok) return;
    setStep(1);
  }

  /**
   * Pull a listing from a pasted URL. Only fills fields that are currently
   * empty so that any user input arriving first is preserved (e.g. if
   * they typed the make while extraction was running).
   */
  async function handleExtract() {
    const url = sourceUrlValue?.trim();
    if (!url) {
      setExtractError("Paste a URL first.");
      return;
    }
    setExtractError(null);
    setExtractInfo(null);
    setExtracting(true);
    try {
      const r = await extractListingAction(url);
      if (!r.ok) {
        setExtractError(r.error);
        toast.error("Couldn't extract listing", { description: r.error });
        return;
      }
      const filled: string[] = [];
      if (r.partial.make && !dirtyFields.make) { setValue("make", r.partial.make, { shouldDirty: true }); filled.push("make"); }
      if (r.partial.model && !dirtyFields.model) { setValue("model", r.partial.model, { shouldDirty: true }); filled.push("model"); }
      if (r.partial.variant && !dirtyFields.variant) { setValue("variant", r.partial.variant, { shouldDirty: true }); filled.push("variant"); }
      if (r.partial.year && !dirtyFields.year) { setValue("year", r.partial.year, { shouldDirty: true }); filled.push("year"); }
      if (r.partial.askingPrice && !dirtyFields.askingPrice) { setValue("askingPrice", r.partial.askingPrice, { shouldDirty: true }); filled.push("asking price"); }
      if (r.partial.odometer && !dirtyFields.odometer) { setValue("odometer", r.partial.odometer, { shouldDirty: true }); filled.push("odometer"); }
      if (r.partial.transmission && !dirtyFields.transmission) { setValue("transmission", r.partial.transmission, { shouldDirty: true }); filled.push("transmission"); }
      if (r.partial.fuelType && !dirtyFields.fuelType) { setValue("fuelType", r.partial.fuelType, { shouldDirty: true }); filled.push("fuel"); }
      if (r.partial.driveType && !dirtyFields.driveType) { setValue("driveType", r.partial.driveType, { shouldDirty: true }); filled.push("drivetrain"); }
      if (r.partial.state && !dirtyFields.state) { setValue("state", r.partial.state, { shouldDirty: true }); filled.push("state"); }
      if (r.partial.description && !dirtyFields.description) { setValue("description", r.partial.description, { shouldDirty: true }); filled.push("description"); }
      if (r.partial.imageUrl && !dirtyFields.imageUrl) { setValue("imageUrl", r.partial.imageUrl, { shouldDirty: true }); filled.push("image URL"); }
      // Reset dirty-fields tracking after a successful extract so the next
      // click on Extract isn't a silent no-op (otherwise every auto-filled
      // field becomes `dirty`, gating subsequent extractions behind user
      // edits the user didn't make).
      if (filled.length > 0) form.reset(undefined, { keepValues: true });
      const info = filled.length === 0
        ? `We couldn't extract any new fields from ${r.sourceDomain}${r.cached ? " (cached)" : ""}.`
        : `Auto-filled ${filled.length} field${filled.length === 1 ? "" : "s"} from ${r.sourceDomain}${r.cached ? " (cached)" : ""}.`;
      setExtractInfo(info);
      toast.success("Listing extracted", {
        description: info,
        icon: <Sparkles className="h-4 w-4 text-indigo-500" />,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed.";
      setExtractError(msg);
      toast.error("Extraction failed", { description: msg });
    } finally {
      setExtracting(false);
    }
  }

  function onSubmit(data: VehicleInput) {
    setServerError(null);
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      // Drop undefined / null / NaN / "" so FormData only carries real values.
      if (v === undefined || v === null || v === "") return;
      if (typeof v === "number" && Number.isNaN(v)) return;
      fd.append(k, String(v));
    });
    startTransition(async () => {
      const result = await createReportAction(null, fd);
      if (result.ok) {
        toast.success("Report generated", {
          description: `Redirecting to your ${data.make} ${data.model} report.`,
          icon: <Sparkles className="h-4 w-4 text-indigo-500" />,
        });
        router.push(`/report/${result.slug}`);
      } else {
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof VehicleInput, { message: msgs?.[0] ?? "Invalid" });
          }
          if (Object.keys(result.fieldErrors).some((k) => ["make", "model", "year"].includes(k))) {
            setStep(0);
          }
        }
        setServerError(result.error);
        toast.error(result.error);
      }
    });
  }

  // Radix's onValueChange returns `string`, but our form fields are typed
  // unions. The field param is a literal union (not a generic `K`), so RHF's
  // `setValue<FieldPath<TFieldValues>>` infers `value` directly from the
  // literal field name. Runtime safety: each Select's options must come from
  // the same `as const` array as VehicleInput's matching union.
  type EnumField =
    | "transmission" | "fuelType" | "driveType" | "sellerType" | "state";
  function setEnum(field: EnumField, v: string) {
    if (v === "") setValue(field, undefined as VehicleInput[EnumField]);
    else setValue(field, v as VehicleInput[EnumField]);
  }

  const makeValue = watch("make");

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8"
      noValidate
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <span className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition",
            step >= 0 ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground",
          )}>
            {step > 0 ? <Check className="h-3.5 w-3.5" /> : "1"}
          </span>
          <span className={cn(step > 0 && "text-muted-foreground line-through")}>Vehicle details</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition",
            step >= 1 ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground",
          )}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "2"}
          </span>
          <span className={step >= 1 ? "text-foreground font-medium" : "text-muted-foreground"}>Generate report</span>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">AI · 45s</Badge>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-7"
          >
            <section className="rounded-xl border border-dashed border-border bg-background/60 p-4">
              <Label htmlFor="sourceUrl" className="block">Listing URL (optional)</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="sourceUrl"
                  placeholder="https://www.carsales.com.au/..."
                  className="flex-1"
                  aria-invalid={!!errors.sourceUrl}
                  {...register("sourceUrl")}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExtract}
                  disabled={extracting || !sourceUrlValue?.trim()}
                  aria-label="Extract listing details from URL"
                  title="Extract listing details"
                >
                  {extracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  <span>Extract</span>
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Paste a <strong>Carsales</strong>, <strong>Gumtree AU</strong> or{" "}
                <strong>Facebook Marketplace</strong> URL and click Extract — we&apos;ll
                auto-fill the form. Or enter the details manually below.
              </p>
              {errors.sourceUrl && (
                <p className="mt-1 text-xs text-destructive">{errors.sourceUrl.message}</p>
              )}
              {extractError && (
                <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                  {extractError}
                </p>
              )}
              {extractInfo && !extractError && (
                <p className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-700 dark:text-emerald-400">
                  {extractInfo}
                </p>
              )}
            </section>

            <section className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  placeholder="Toyota"
                  className="mt-1.5"
                  aria-invalid={!!errors.make}
                  {...register("make")}
                />
                {errors.make && <p className="mt-1 text-xs text-destructive">{errors.make.message}</p>}
              </div>
              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  placeholder={makeValue ? `${makeValue} ` : "Corolla"}
                  className="mt-1.5"
                  aria-invalid={!!errors.model}
                  {...register("model")}
                />
                {errors.model && <p className="mt-1 text-xs text-destructive">{errors.model.message}</p>}
              </div>
              <div>
                <Label htmlFor="variant">Variant</Label>
                <Input id="variant" placeholder="Ascent Sport" className="mt-1.5" {...register("variant")} />
              </div>
              <div>
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  inputMode="numeric"
                  className="mt-1.5"
                  {...register("year", { valueAsNumber: true })}
                  aria-invalid={!!errors.year}
                />
                {errors.year && <p className="mt-1 text-xs text-destructive">{errors.year.message}</p>}
              </div>
              <div>
                <Label htmlFor="odometer">Odometer (km)</Label>
                <Input
                  id="odometer"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 75000"
                  className="mt-1.5"
                  {...register("odometer", { valueAsNumber: true })}
                />
                {errors.odometer && <p className="mt-1 text-xs text-destructive">{errors.odometer.message}</p>}
              </div>
              <div>
                <Label htmlFor="vin">VIN (optional)</Label>
                <Input id="vin" placeholder="17-character VIN" className="mt-1.5" {...register("vin")} />
                {errors.vin && <p className="mt-1 text-xs text-destructive">{errors.vin.message}</p>}
              </div>

              <div>
                <Label>Transmission</Label>
                <Select
                  value={(watch("transmission") as string) ?? ""}
                  onValueChange={(v) => setEnum("transmission", v)}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((t) => (
                      <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fuel</Label>
                <Select
                  value={(watch("fuelType") as string) ?? ""}
                  onValueChange={(v) => setEnum("fuelType", v)}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {FUELS.map((f) => (
                      <SelectItem key={f.v} value={f.v}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Drivetrain</Label>
                <Select
                  value={(watch("driveType") as string) ?? ""}
                  onValueChange={(v) => setEnum("driveType", v)}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {DRIVES.map((d) => (
                      <SelectItem key={d.v} value={d.v}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-6">
              <Button type="button" variant="gradient" size="lg" onClick={handleNext}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.18 }}
            className="space-y-7"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="askingPrice">Asking price (AUD) *</Label>
                <Input
                  id="askingPrice"
                  type="number"
                  inputMode="numeric"
                  placeholder="19990"
                  className="mt-1.5"
                  aria-invalid={!!errors.askingPrice}
                  {...register("askingPrice", { valueAsNumber: true })}
                />
                {errors.askingPrice && <p className="mt-1 text-xs text-destructive">{errors.askingPrice.message}</p>}
              </div>
              <div>
                <Label>Seller type</Label>
                <Select
                  value={(watch("sellerType") as string) ?? ""}
                  onValueChange={(v) => setEnum("sellerType", v)}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {SELLERS.map((s) => (
                      <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State</Label>
                <Select
                  value={(watch("state") as string) ?? ""}
                  onValueChange={(v) => setEnum("state", v)}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Where is it located?" /></SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input id="imageUrl" placeholder="https://…" className="mt-1.5" {...register("imageUrl")} />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Listing description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Paste any details or notes from the seller — extras, faults, service history, modifications…"
                className="mt-1.5"
                rows={5}
                {...register("description")}
              />
            </div>

            {serverError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-6">
              <Button type="button" variant="ghost" onClick={() => setStep(0)} disabled={pending}>
                Back
              </Button>
              <Button type="submit" variant="gradient" size="lg" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Car className="h-4 w-4" /> Generate report
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
