"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/data/session";
import { DEMO_USERS, DEMO_PERSONAS, IDS } from "@/lib/setup/demo-ids";

export interface FormState {
  error?: string;
  message?: string;
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : env.siteUrl;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const fullName = String(form.get("full_name") ?? "").trim();
  if (!email || password.length < 8) return { error: "Use a valid email and a password of at least 8 characters." };
  const next = safeNext(form.get("next"), "/onboarding");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}`)}`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email to confirm your account, then come back here." };
  redirect(`/onboarding?next=${encodeURIComponent(next)}`);
}

export async function sendMagicLink(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };
  const next = safeNext(form.get("next"));
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };
  return { message: `We sent a sign-in link to ${email}.` };
}

export async function signInWithProvider(form: FormData) {
  const provider = form.get("provider") === "azure" ? "azure" : "google";
  const next = safeNext(form.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: provider === "azure" ? "email openid profile" : undefined,
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(`${provider === "azure" ? "Microsoft" : "Google"} sign-in isn't configured for this deployment yet.`)}&next=${encodeURIComponent(next)}`);
  }
  redirect(data.url);
}

export async function demoSignIn(form: FormData) {
  const key = String(form.get("persona"));
  const persona = DEMO_PERSONAS.find((p) => p.key === key);
  if (!persona) redirect("/");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_USERS[persona.key].email,
    password: env.demoPassword,
  });
  if (error) redirect(`/?error=${encodeURIComponent("The demo accounts aren't set up yet. Run /setup (or npm run db:setup) first.")}`);
  redirect(`/p/${IDS.p1}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
