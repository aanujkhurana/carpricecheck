import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 moved the connection URL out of schema.prisma and into prisma.config.ts.
// We keep schema.prisma as the schema source and load DATABASE_URL from .env.
//
// Phase 3: the schema is on provider = "postgresql" so DATABASE_URL is required
// to be a postgres:// URL. We deliberately throw on missing env rather than fall
// back to a phantom URL — a placeholder Postgres string would silently attempt
// a connection to a non-existent server and fail with a confusing ECONNREFUSED.
const url = process.env.DATABASE_URL;
if (!url || !(url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
  throw new Error(
    `DATABASE_URL must be a postgres://… or postgresql://… URL for Phase 3 ` +
      `(got: ${url ?? "<unset>"}). Copy .env.example → .env and fill in your ` +
      `Postgres connection string before running prisma CLI commands.`,
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url,
  },
});
