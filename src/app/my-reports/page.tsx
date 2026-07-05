import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { FilterBar } from "@/components/my-reports/filter-bar";
import { ReportCard, type ReportCardData } from "@/components/my-reports/report-card";

interface PageProps {
  searchParams: Promise<{
    make?: string;
    model?: string;
    rating?: string;
  }>;
}

// Server component reading auth + DB — never cache.
export const dynamic = "force-dynamic";

const RATINGS = new Set(["GREAT_DEAL", "FAIR_PRICE", "OVERPRICED"]);

export default async function MyReportsPage({ searchParams }: PageProps) {
  let userId: string;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      redirect("/auth/sign-in?next=/my-reports");
    }
    userId = data.user.id;
  } catch {
    // Supabase env not configured — defer to the sign-in flow.
    redirect("/auth/sign-in?next=/my-reports");
  }

  const { make, model, rating } = await searchParams;
  const ratingFilter =
    rating && RATINGS.has(rating) ? rating : undefined;

  const rows = await prisma.report.findMany({
    where: {
      userId,
      ...(make ? { make: { equals: make } } : {}),
      ...(model ? { model: { contains: model, mode: "insensitive" as const } } : {}),
      ...(ratingFilter ? { dealRating: ratingFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      slug: true,
      createdAt: true,
      make: true,
      model: true,
      year: true,
      variant: true,
      askingPrice: true,
      dealRating: true,
      verdict: true,
      fairValueLow: true,
      fairValueHigh: true,
      isPublic: true,
      viewCount: true,
    },
  });

  const reports: ReportCardData[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    createdAt: r.createdAt,
    make: r.make,
    model: r.model,
    year: r.year,
    variant: r.variant,
    askingPrice: r.askingPrice,
    dealRating: r.dealRating,
    verdict: r.verdict,
    fairValueLow: r.fairValueLow,
    fairValueHigh: r.fairValueHigh,
    isPublic: r.isPublic,
    viewCount: r.viewCount,
  }));

  const hasFilters = Boolean(make || model || ratingFilter);

  return (
    <>
      <SiteHeader />
      <main className="container-page pb-24 pt-6 sm:pt-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            My reports
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Reports you've generated in this account. New reports default to
            public — flip the switch on any card to make it private.
          </p>
        </header>

        <FilterBar />

        {reports.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <div className="mt-2 text-xs text-muted-foreground">
              {reports.length} {reports.length === 1 ? "report" : "reports"}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center">
      <h2 className="text-lg font-semibold">
        {hasFilters ? "No reports match your filters" : "No reports yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Try clearing the filters or generate a new analysis."
          : "Generate your first analysis by pasting a listing URL or filling the form."}
      </p>
      <a
        href="/check"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Check a car
      </a>
    </div>
  );
}
