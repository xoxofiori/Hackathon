"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/auth/actions";

export async function createPartnership(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const internal = form.get("internal") === "on";
  if (!str("name")) return { error: "Give the partnership a name." };
  if (!str("my_org")) return { error: "Choose the organization you represent." };
  if (!str("my_label") || !str("other_label")) return { error: "Name both sides." };
  if (internal && !str("other_team")) return { error: "Name the other team or branch." };
  const { data, error } = await supabase.rpc("create_partnership", {
    p_name: str("name"),
    p_description: str("description") || null,
    p_my_label: str("my_label"),
    p_my_org: str("my_org"),
    p_my_team_name: str("my_team") || null,
    p_other_label: str("other_label"),
    p_other_org_name: internal ? null : str("other_org") || str("other_label"),
    p_other_team_name: internal ? str("other_team") : null,
    p_internal: internal,
  });
  if (error) return { error: error.message };
  revalidatePath("/partnerships");
  redirect(`/p/${data}/members?created=1`);
}

export async function markNotificationsRead() {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/", "layout");
}
