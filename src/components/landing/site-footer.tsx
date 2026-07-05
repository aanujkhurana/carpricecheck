import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background py-10">
      <div className="container-page flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white">
            <span className="font-bold">C</span>
          </span>
          <span className="font-semibold">CarCostCheck.ai</span>
          <span className="text-xs text-muted-foreground">— Australia</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/#how-it-works" className="hover:text-foreground">How it works</Link>
          <Link href="/#sample" className="hover:text-foreground">Sample</Link>
          <Link href="/#faq" className="hover:text-foreground">FAQ</Link>
          <Link href="/check" className="hover:text-foreground">Check a car</Link>
        </nav>
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CarCostCheck. Made for Australian car buyers.
        </div>
      </div>
    </footer>
  );
}
