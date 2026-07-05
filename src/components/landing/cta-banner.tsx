import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section className="container-page pb-24 pt-8 sm:pb-32">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white shadow-2xl shadow-indigo-500/30">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0px, transparent 60px), radial-gradient(circle at 80% 60%, white 0px, transparent 90px)",
          }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Stop second-guessing the listing.
          </h2>
          <p className="mt-3 text-balance text-white/90">
            Run a free AI report on the next car you&apos;re considering. It takes ~45 seconds
            and could save you thousands.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="xl" variant="secondary" className="bg-white text-indigo-700 hover:bg-white/90">
              <Link href="/check">
                Check a car now <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
