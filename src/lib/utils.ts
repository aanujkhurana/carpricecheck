import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combine class names with Tailwind merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer AUD price into "$12,345". */
export function formatAUD(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format kilometres. */
export function formatKm(km: number | null | undefined): string {
  if (km == null) return "—";
  return `${new Intl.NumberFormat("en-AU").format(km)} km`;
}

/** Safe JSON.parse that returns a typed object or null. */
export function safeJsonParse<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Return a stable short id, useful for share URLs / analytics. */
export function shortId(len = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
