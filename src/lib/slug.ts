import { shortId } from "./utils";

const STOPWORDS = new Set([
  "a", "an", "and", "of", "the", "in", "on", "for", "to", "with",
]);

/** Slugify a string for use in URLs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter((part) => part && !STOPWORDS.has(part))
    .join("-");
}

/**
 * Build a deterministic, SEO-friendly slug like
 * `2020-toyota-corolla-ascent-sport-brisbane-abc12345`.
 */
export function buildReportSlug(parts: {
  year: number;
  make: string;
  model: string;
  variant?: string | null;
  state?: string | null;
}): string {
  const core = [parts.year, parts.make, parts.model, parts.variant, parts.state]
    .filter(Boolean)
    .map((p) => slugify(String(p)))
    .filter(Boolean)
    .join("-");

  return `${core}-${shortId(8)}`;
}
