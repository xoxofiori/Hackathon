import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import type { ProfileDefaults } from "@/app/onboarding/profile-form";

export async function profileDefaults(supabase: SupabaseClient, userId: string, profile: Profile | null): Promise<ProfileDefaults> {
  const { data: orgs } = await supabase
    .from("org_members")
    .select("organizations(name), teams(name)")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1);
  const first = orgs?.[0] as unknown as { organizations: { name: string } | null; teams: { name: string } | null } | undefined;
  return {
    full_name: profile?.full_name ?? "",
    title: profile?.title ?? "",
    job_role: profile?.job_role ?? "",
    languages: (profile?.languages ?? []).join(", "),
    timezone: profile?.timezone && profile.timezone !== "UTC" ? profile.timezone : "",
    communication_notes: profile?.communication_notes ?? "",
    org_name: first?.organizations?.name ?? "",
    team_name: first?.teams?.name ?? "",
  };
}
