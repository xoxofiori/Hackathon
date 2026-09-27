"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/auth/actions";

export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const org = String(form.get("org") ?? "");
  const { data, error } = await supabase.rpc("accept_invite", {
    p_token: String(form.get("token")),
    p_org: org && org !== "new" ? org : null,
  });
  if (error) return { error: error.message };
  const result = data as { partnership_id: string; meeting_id: string | null };
  redirect(`/p/${result.partnership_id}${result.meeting_id ? `?meeting=${result.meeting_id}` : ""}`);
}
