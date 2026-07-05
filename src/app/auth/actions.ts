"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readField(formData: FormData, name: string): string {
  const v = formData.get(name);
  return v == null ? "" : v.toString().trim();
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = readField(formData, "email");
  const password = readField(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = readField(formData, "email");
  const password = readField(formData, "password");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  // If Supabase Project Settings → Auth has "Enable email confirmations" on,
  // the user is created but no session is issued yet. The redirect target
  // becomes a confirmation-on-success page in Phase 4.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
