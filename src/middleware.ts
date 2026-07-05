// Root middleware — runs on every request (excluding static assets) and
// refreshes the Supabase auth session cookie via updateSession().
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip Next.js internal routes and common static asset extensions. The
  // rest of the routes (including the auth pages) get session refresh.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
