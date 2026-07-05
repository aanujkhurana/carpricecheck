// Prisma singleton — survives Next.js hot reloads.
//
// Phase 3: Postgres is the only supported datasource. Prisma 7's default
// "client" engine requires a driver adapter for every provider (including
// Postgres); we wrap the PrismaClient with @prisma/adapter-pg so the URL
// goes through `pg`-compatible socket transport instead of being rejected
// at construction time.
//
// DATABASE_URL must be a postgres:// URL — explicitly required, no inline
// fallback (a stale SQLite default URL is worse than a hard startup error
// during Phase 3 because the schema is on provider = "postgresql").
//
// === Why the lazy Proxy (vs a plain module-load `new PrismaClient()`) ===
//
// The Proxy preserves `prisma.report.findMany(...)` everywhere in the
// codebase — no caller refactor is required. It does that by deferring
// PrismaClient construction to the FIRST property access on `prisma`,
// instead of running at module import time. Concrete effect:
//   - `next build` walks all routes; pages that are `force-dynamic`
//     (/, /check, /report/[slug], /sitemap.xml) never dereference
//     `prisma.X` during prerender, so the validator's throw fires only
//     when a real request is made against the affected route.
//   - A stale `DATABASE_URL=file:./prisma/dev.db` in `.env` no longer
//     fails the build; the error now surfaces at the moment the dev
//     hits a /check or /report/[slug] request, with a clear hint to copy
//     .env.example → .env.
//   - The trade-off is ~15 lines of Proxy boilerplate instead of a single
//     `globalForPrisma.prisma ?? createPrismaClient()` line. We accept
//     that cost explicitly for forward-compatibility: any future caller
//     that adds a top-level `prisma.X` access without `force-dynamic`
//     still gets the lazy behaviour instead of crashing the build.
//   - Caveat: a top-level `const { report } = prisma;` would still
//     trigger construction at module load — destructure defeats the
//     Proxy. We rely on the existing `prisma.report.findMany()` chained
//     call style as the codebase norm.
//
// All DB-touching pages (/, /check, /report/[slug], /sitemap.xml) remain
// force-dynamic for now so `next build` never tries to invoke Prisma
// during prerender. Removing those flags is a Phase-4 optimisation that
// depends on a stable build-time DB connection.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7's @prisma/client no longer exports `LogLevel` as a named type.
// Inline the union to keep the call site typed without namespace churn.
type LogLevel = "info" | "query" | "warn" | "error";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Scrub credentials (user:pass@) from a URL before logging it. Production
// DATABASE_URLs commonly include a password in their userinfo segment;
// printing it straight into server logs / Sentry breadcrumbs would leak.
function redactUrl(raw: string): string {
  return raw.replace(/\/\/[^@]+@/, "//<redacted>@");
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  const isPostgresUrl =
    !!url && (url.startsWith("postgres://") || url.startsWith("postgresql://"));
  if (!isPostgresUrl) {
    throw new Error(
      `DATABASE_URL must be a postgres://… or postgresql://… URL for Phase 3 ` +
        `(got: ${url ? redactUrl(url) : "<unset>"}). Copy .env.example → .env ` +
        `and fill in your Postgres connection string.`,
    );
  }
  const log: LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter, log });
}

let _client: PrismaClient | undefined;
function getClient(): PrismaClient {
  if (!_client) {
    _client = globalForPrisma.prisma ?? createPrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _client;
  }
  return _client;
}

// Proxy preserves the existing `prisma.report.findMany(...)` shape while
// deferring construction to the first property access.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
