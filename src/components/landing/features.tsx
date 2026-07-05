import {
  Gauge, Wrench, ShieldAlert, ShieldCheck as ShieldIcon, ClipboardList,
  MessageSquare, Wand2, CarFront, Fuel,
} from "lucide-react";

const features = [
  {
    icon: Gauge,
    title: "Fair Market Value",
    body: "Our model compares your listing against the Australian market and gives you a price range with a confidence score.",
  },
  {
    icon: Wrench,
    title: "5-Year Ownership Costs",
    body: "Fuel, rego, insurance, tyres, servicing, repairs and depreciation — broken down and totalled.",
  },
  {
    icon: ShieldAlert,
    title: "Reliability & Recalls",
    body: "Known issues for the make and model — including transmissions, turbos, hybrids and diesels.",
  },
  {
    icon: ShieldIcon,
    title: "ANCAP Safety",
    body: "ANCAP rating, airbag count and the driver assists actually fitted to that year.",
  },
  {
    icon: ClipboardList,
    title: "Inspection Checklist",
    body: "A personal checklist of what to check when you arrive — beyond the obvious oil and tyre checks.",
  },
  {
    icon: MessageSquare,
    title: "Questions for the Seller",
    body: "Direct, evidence-based questions that protect you from buying someone else's problem.",
  },
  {
    icon: Wand2,
    title: "Negotiation Script",
    body: "A ready-to-send message calibrated to the listing's price vs market value — keep thousands.",
  },
  {
    icon: CarFront,
    title: "Buying Verdict",
    body: "Clear Buy / Negotiate / Avoid recommendation with the reasoning behind it.",
  },
];

export function Features() {
  return (
    <section className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">One report. Eight answers.</h2>
        <p className="mt-3 text-balance text-muted-foreground">
          Every report answers the only question that matters: should I buy this car,
          and if so, what should I pay?
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, idx) => (
          <div
            key={f.title}
            className="group relative rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 via-violet-500/15 to-fuchsia-500/15 text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-400">
              <f.icon className="h-4 w-4" />
            </div>
            <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
