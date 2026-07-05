// Supabase server client — used in server components, server actions, and
// route handlers. Each invocation creates a fresh client bound to the current
// request's cookies so SSR auth state stays consistent.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function missingEnvError(): never {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set " +
      "for Supabase Auth. Copy .env.example → .env and paste your Supabase " +
      "project keys (Project Settings → API).",
  );
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) missingEnvError();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies during render — that's OK:
          // the request-level middleware in src/middleware.ts refreshes the
          // session cookie on the next request.
        }
      },
    },
  });
}
