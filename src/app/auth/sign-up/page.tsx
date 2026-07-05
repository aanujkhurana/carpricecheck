import Link from "next/link";
import { signUp } from "../actions";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="container-narrow relative pb-24 pt-10">
        <div className="mx-auto max-w-md">
          <h1 className="text-balance text-3xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign up to save reports, revisit them from any device, and unlock
            Phase-3 features like the saved garage.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}

          <form action={signUp} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-1 block w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </label>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
            >
              Sign up
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-indigo-500 underline" href="/auth/sign-in">
              Sign in
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
