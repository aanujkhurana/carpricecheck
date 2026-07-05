import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth / magic-link callback handler. Wire redirect URLs in the Supabase
// dashboard (Authentication → URL Configuration) to `/auth/callback`. When
// an OAuth provider or magic-link is used, the auth code lands in `?code=…`,
// we exchange it for a session cookie via Supabase, and redirect to home.
//
// Phase-3 auth scaffold ships without OAuth providers — this route is a
// placeholder that becomes active the moment a provider is configured. The
// password sign-in / sign-up flow in src/app/auth/actions.ts does NOT use
// this route (no redirect round-trip is required for password auth).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/", request.url));
}
