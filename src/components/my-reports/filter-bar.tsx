"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const RATINGS = ["GREAT_DEAL", "FAIR_PRICE", "OVERPRICED"] as const;
type Rating = (typeof RATINGS)[number];

export function FilterBar() {
  const params = useSearchParams();
  const make = params.get("make") ?? "";
  const model = params.get("model") ?? "";
  const rating = params.get("rating") ?? "";

  const hasFilters = Boolean(make || model || rating);

  return (
    <form
      action="/my-reports"
      method="get"
      className="flex flex-wrap items-end gap-3"
    >
      <Field
        label="Make"
        name="make"
        type="text"
        defaultValue={make}
        placeholder="Toyota"
      />
      <Field
        label="Model"
        name="model"
        type="text"
        defaultValue={model}
        placeholder="Corolla"
      />
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">
          Deal rating
        </span>
        <select
          name="rating"
          defaultValue={rating}
          className="mt-1 block w-40 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Any</option>
          {RATINGS.map((r) => (
            <option key={r} value={r}>
              {dealLabel(r)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        Apply
      </button>
      {hasFilters && (
        <Link
          href="/my-reports"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          Clear
        </Link>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type: "text";
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 block w-40 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}

function dealLabel(r: Rating): string {
  return {
    GREAT_DEAL: "Great deal",
    FAIR_PRICE: "Fair price",
    OVERPRICED: "Overpriced",
  }[r];
}
