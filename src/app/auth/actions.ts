"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readField(formData: FormData, name: string): string {
  const v = formData.get(name);
  return v == null ? "" : v.toString().trim();
}

/**
 * Returns the input if it's a safe same-origin path (e.g. "/my-reports",
 * "/report/abc-123"), otherwise falls back to "/".
 *
 * Rejects:
 *   - empty / non-string
 *   - protocol-relative URLs starting with "//" (which the browser treats
 *     as a same-protocol redirect to an external host)
 *   - any path that doesn't begin with "/" (so external URLs like
 *     "https://evil.com/x" can't be used as a signin redirect)
 */
function safeNextPath(input: string): string {
  if (!input) return "/";
  if (!input.startsWith("/")) return "/";
  if (input.startsWith("//")) return "/";
  // Windows-style backslash normalization trap — some servers/browsers
  // treat "/\foo" as "//foo", a protocol-relative URL pointing at a
  // foreign host. Reject any path containing a backslash.
  if (input.includes("\\")) return "/";
  return input;
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const next = safeNextPath(readField(formData, "next"));

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const params = new URLSearchParams({ error: error.message });
    if (next !== "/") params.set("next", next);
    redirect(`/auth/sign-in?${params.toString()}`);
  }

  // If Supabase Project Settings → Auth has "Enable email confirmations" on,
  // we never reach here until the user has confirmed. The redirect target
  // honours the `next` param so /my-reports ↔ sign-in round-trip works.
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const next = safeNextPath(readField(formData, "next"));

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const params = new URLSearchParams({ error: error.message });
    if (next !== "/") params.set("next", next);
    redirect(`/auth/sign-up?${params.toString()}`);
  }

  // Same `next` honour as signIn so a sign-up flow triggered from /my-reports
  // lands on the dashboard after the email confirmation step (if any).
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
