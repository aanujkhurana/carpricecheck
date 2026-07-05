import Link from "next/link";
import { Car, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/70 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30">
            <Car className="h-4 w-4" />
          </span>
          <span>CarCostCheck</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">.ai</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">How it works</Link>
          <Link href="/#sample" className="transition-colors hover:text-foreground">Sample report</Link>
          <Link href="/#faq" className="transition-colors hover:text-foreground">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" variant="gradient">
            <Link href="/check">
              <Sparkles className="h-4 w-4" /> Check a car
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
