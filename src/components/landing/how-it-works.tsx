import { ClipboardPaste, Sparkles, Share2 } from "lucide-react";

const steps = [
  {
    icon: ClipboardPaste,
    title: "Paste a listing URL or enter the details",
    body: "Works with Carsales, Drive, Facebook Marketplace, Gumtree and dealer sites. No URL scraping today? Just type the make, model, year and price.",
  },
  {
    icon: Sparkles,
    title: "Get an AI-built report in seconds",
    body: "Our AI reviews fair value, ownership costs, reliability, safety, and builds a tailored checklist and negotiation script.",
  },
  {
    icon: Share2,
    title: "Take the script to the seller",
    body: "Walk in with the report on your phone. Negotiate from facts, leave with confidence.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/30 py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Three steps. One smart decision.</h2>
          <p className="mt-3 text-muted-foreground">
            Built for first-car buyers and veteran car buyers alike.
          </p>
        </div>

        <div className="relative mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, idx) => (
            <div
              key={s.title}
              className="relative rounded-xl border border-border/60 bg-card p-6 shadow-sm"
            >
              <span className="absolute -top-4 left-6 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30">
                {idx + 1}
              </span>
              <s.icon className="mt-2 h-6 w-6 text-indigo-500" />
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
