import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Current user + profile, or nulls. Cached per request. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { supabase, user, profile };
});

/** Require a signed-in, onboarded user. */
export async function requireUser(next?: string) {
  const session = await getSession();
  if (!session.user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (!session.profile?.onboarded_at) redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return { ...session, user: session.user!, profile: session.profile! };
}

/** Only allow same-site relative redirects. */
export function safeNext(next: FormDataEntryValue | string | null | undefined, fallback = "/partnerships"): string {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}
