import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

// Auth-aware nav segment — server component, mounted in SiteHeader.
// If Supabase env isn't configured or the user is signed out, falls back to
// a public "Sign in" link so the marketing chrome stays intact under any
// build-time configuration.
export async function AuthNav() {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  if (userId) {
    return (
      <span className="flex items-center gap-1">
        <Link
          href="/my-reports"
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          My reports
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </span>
    );
  }

  return (
    <Link
      href="/auth/sign-in"
      className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      Sign in
    </Link>
  );
}
