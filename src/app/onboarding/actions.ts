"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/data/session";
import type { FormState } from "@/app/auth/actions";

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const str = (k: string) => String(form.get(k) ?? "").trim();
  if (!str("full_name")) return { error: "Please enter your name." };
  if (!str("org_name")) return { error: "Please enter your organization." };
  const languages = str("languages").split(/[,\s]+/).map((l) => l.trim().toLowerCase()).filter(Boolean);
  const { error } = await supabase.rpc("setup_profile", {
    p_full_name: str("full_name"),
    p_title: str("title") || null,
    p_job_role: str("job_role") || null,
    p_languages: languages,
    p_timezone: str("timezone") || "UTC",
    p_org_name: str("org_name"),
    p_team_name: str("team_name") || null,
    p_communication_notes: str("communication_notes") || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  if (form.get("mode") === "edit") return { message: "Profile saved." };
  redirect(safeNext(form.get("next")));
}
