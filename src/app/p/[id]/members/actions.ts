"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/auth/actions";

export async function createInvite(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const partnershipId = String(form.get("partnership_id"));
  const role = String(form.get("role") ?? "member");
  const { error } = await supabase.from("invites").insert({
    partnership_id: partnershipId,
    side_id: String(form.get("side_id")),
    purpose: "join_side",
    role,
    can_sign: form.get("can_sign") === "on" && role !== "viewer",
    meeting_id: form.get("meeting_id") ? String(form.get("meeting_id")) : null,
    created_by: user?.id,
  });
  if (error) return { error: error.message };
  revalidatePath(`/p/${partnershipId}/members`);
  return { message: "Invite link created." };
}

export async function revokeInvite(form: FormData) {
  const supabase = await createClient();
  const partnershipId = String(form.get("partnership_id"));
  await supabase.from("invites").update({ revoked_at: new Date().toISOString() }).eq("id", String(form.get("invite_id")));
  revalidatePath(`/p/${partnershipId}/members`);
}

export async function setMemberRole(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const partnershipId = String(form.get("partnership_id"));
  const { error } = await supabase.rpc("set_member_role", {
    p_side: String(form.get("side_id")),
    p_user: String(form.get("user_id")),
    p_role: String(form.get("role")),
    p_can_sign: form.get("can_sign") === "on",
  });
  if (error) return { error: error.message };
  revalidatePath(`/p/${partnershipId}`, "layout");
  return { message: "Saved." };
}
