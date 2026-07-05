"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "carcostcheck-theme";

type Theme = "light" | "dark";

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.style.colorScheme = t;
}

export function ThemeToggle() {
  // We render a neutral placeholder until hydration is complete to avoid the
  // icon flashing dark→light or light→dark on initial load.
  const [theme, setTheme] = useState<Theme | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark =
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const initial: Theme = stored ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    if (theme === null) return;
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-background text-foreground/80 shadow-sm transition-colors hover:bg-accent"
    >
      {!mounted ? (
        <span aria-hidden className="block h-4 w-4 rounded-sm bg-muted/80" />
      ) : theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

/** Inline script that runs before React hydrates to avoid theme flash. */
export const ThemeBootstrap = () => (
  <script
    suppressHydrationWarning
    dangerouslySetInnerHTML={{
      __html: `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var t = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  } catch (_) {}
})();`.replace(/\n\s*/g, ""),
    }}
  />
);
