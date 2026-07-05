// Supabase browser client. Used inside `"use client"` components
// (sign-out button, profile badge, etc.). Server components use
// src/lib/supabase/server.ts instead.
"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
