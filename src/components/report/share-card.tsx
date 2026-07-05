"use client";
import { useState } from "react";
import {
  Link as LinkIcon, Mail, Send, Copy, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { ReportPayload, VehicleInput } from "@/lib/types/report";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReportShareCard({
  input, payload, reportUrl,
}: { input: VehicleInput; payload: ReportPayload; reportUrl: string }) {
  const [copied, setCopied] = useState(false);

  const phrase = {
    GREAT_DEAL: "looks underpriced",
    FAIR_PRICE: "is priced fairly",
    OVERPRICED: "is overpriced",
  }[payload.dealRating];

  const shareText = encodeURIComponent(
    `${input.year} ${input.make} ${input.model} ${phrase}. Full AI breakdown: ${reportUrl}`,
  );
  const subject = encodeURIComponent(
    `Buying report: ${input.year} ${input.make} ${input.model}`,
  );

  function copy() {
    navigator.clipboard.writeText(reportUrl).then(
      () => {
        setCopied(true);
        toast.success("Link copied", { description: "Paste it into a message to the seller." });
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Couldn't copy — please copy manually."),
    );
  }

  // Two monogram entries for social platforms (replacing icons that aren't
  // available in the current lucide-react set due to trademark policy).
  const socials: { label: string; href: string; mark: string; tone: string }[] = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${shareText}`,
      mark: "WA",
      tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    },
    {
      label: "X / Twitter",
      href: `https://twitter.com/intent/tweet?text=${shareText}`,
      mark: "X",
      tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-sky-500/30",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reportUrl)}`,
      mark: "in",
      tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 ring-indigo-500/30",
    },
    {
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(reportUrl)}&title=${subject}`,
      mark: "r/",
      tone: "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-orange-500/30",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reportUrl)}`,
      mark: "f",
      tone: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30",
    },
  ];

  return (
    <Card className="border-border/60">
      <div className="border-b border-border/60 p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Share this report
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Send the link to a friend, group chat or the seller.
        </p>
      </div>

      <div className="space-y-2 p-5">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={copy}
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>

        {socials.map((s) => (
          <Button
            key={s.label}
            asChild
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <a href={s.href} target="_blank" rel="noopener noreferrer">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ring-1 ${s.tone}`}
                aria-hidden
              >
                {s.mark}
              </span>
              {s.label}
            </a>
          </Button>
        ))}

        <Button asChild variant="outline" className="w-full justify-start gap-2">
          <a href={`mailto:?subject=${subject}&body=${shareText}`}>
            <Mail className="h-4 w-4" /> Email
          </a>
        </Button>

        <Button asChild variant="ghost" className="w-full justify-start gap-2">
          <a href={reportUrl}>
            <LinkIcon className="h-4 w-4" /> Raw link
          </a>
        </Button>

        <div className="rounded-md border border-dashed border-border/60 p-2.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Send className="h-3 w-3" /> Coming in Phase 2: PDF export
          </span>
        </div>
      </div>
    </Card>
  );
}
