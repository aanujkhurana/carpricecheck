# CarCostCheck.ai

> Australia's AI co-pilot for used car buyers — paste a listing URL or enter details, get a full buying report in ~45 seconds.

Built as a Phase-1 MVP from a tight scope: polished landing → manual vehicle entry → AI-built report → shareable URL. Auth, scraping, payments and the admin dashboard are deliberately deferred to later phases.

---

## Quickstart

```bash
pnpm install
cp .env.example .env                  # default works out of the box
pnpm prisma migrate dev --name init    # create dev.db
pnpm dev                              # http://localhost:3000
```

If you don't want migrations during local dev:

```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
pnpm prisma db push                    # apply schema without a migration
pnpm dev
```

---

## Tech stack

- **Next.js 16 / React 19 / TypeScript** — single full-stack app (App Router + Server Actions).
- **Tailwind v4** — design tokens via CSS variables + `@theme`.
- **Prisma + SQLite** — schema is portable to Postgres by swapping the datasource.
- **AI provider abstraction (`src/lib/ai`)** — `mock` (offline heuristic engine) today, swap to `openai` later via env. No UI changes required.
- **shadcn-style UI** primitives (Radix + CVA + Tailwind).
- **Framer Motion** for entrance animations; React Hook Form + Zod for forms.

Roadmap items not in this MVP (per spec): URL scraping (Phase 2), Stripe/Clerk/Resend (Phase 3), admin dashboard (Phase 3), content/blog engine (Phase 2).

---

## Scripts

| Command                     | What it does                                       |
|-----------------------------|----------------------------------------------------|
| `pnpm dev`                  | Run Next.js dev server                             |
| `pnpm build`                | Production build (also typechecks via TS plugin)   |
| `pnpm start`                | Run production build                               |
| `pnpm prisma migrate dev`   | Create / apply migrations                          |
| `pnpm prisma db push`       | Push schema to DB without a migration              |
| `pnpm prisma studio`        | Open Prisma Studio                                 |

---

## Architecture

```
src/
├── app/
│   ├── actions/create-report.ts   server action: validate → AI → persist
│   ├── api/
│   │   ├── health/route.ts
│   │   └── reports/[slug]/route.ts  GET → public JSON for a report
│   ├── check/page.tsx              form page
│   ├── report/[slug]/page.tsx      public SEO-friendly report view
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── landing/*       (header, hero, features, how-it-works, sample, FAQ, CTA, footer)
│   ├── form/vehicle-form.tsx
│   ├── report/report-sections.tsx + share-card.tsx
│   ├── shared/theme-toggle.tsx
│   └── ui/*            (button, input, label, card, badge, select, separator, progress, tabs, tooltip, skeleton, textarea)
└── lib/
    ├── ai/             provider interface + openai-provider + mock-provider (heuristics)
    ├── schemas.ts      Zod for vehicle input
    ├── report-schema.ts Zod validator for parsed AI JSON
    ├── db.ts           Prisma singleton
    ├── seo.ts          Metadata + JSON-LD helpers
    ├── slug.ts         SEO-friendly URL slugs
    ├── types/report.ts canonical ReportPayload contract
    └── utils.ts        cn(), formatters, safeJsonParse()
```

### Canonical report shape

Every report (mock or real AI) conforms to `src/lib/types/report.ts::ReportPayload`. The UI renders this shape directly — switching `AI_PROVIDER=openai` and adding `OPENAI_API_KEY` is the only change required to swap in a real AI.

### Database model

See [`prisma/schema.prisma`](./prisma/schema.prisma). The Phase 1 schema models `Report`, `Vehicle`, `ScrapeCache` (empty placeholder for Phase 2) and `AnalyticsEvent` (fire-and-forget).

---

## Replacing the mock AI with OpenAI

Set in `.env`:

```
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"   # optional override
```

Restart `pnpm dev`. No UI changes needed — the report JSON contract is identical.

---

## Roadmap mapping

| Phase | Spec milestone                                  | Status |
|-------|-------------------------------------------------|--------|
| 1     | Project setup, landing, DB, AI, manual entry, report gen, deploy-ready | ✅ Done |
| 2     | URL scraping, SEO pages (sitemap is in), sharing, PDF, ads, analytics | ⏳ Next |
| 3     | Auth, payments, saved garage, affiliate links, admin dashboard | ⏳ Next |
| 4     | VIN decoding, vehicle history, dealer integrations, AI chat | ⏳ Next |

---

## License

UNLICENSED — internal MVP.
