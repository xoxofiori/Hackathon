import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "./session";
import type { Partnership, Side, SideMember } from "@/lib/types";

export interface PartnershipContext {
  partnership: Partnership;
  sides: Side[];
  members: SideMember[];
  mySide: Side;
  myRole: SideMember["role"];
  canSign: boolean;
  isOwner: boolean;
  otherSides: Side[];
}

export function sideName(side: Pick<Side, "label" | "organizations" | "teams" | "pending_org_name">): string {
  const org = side.organizations?.name ?? side.pending_org_name;
  const team = side.teams?.name;
  if (org && team && !side.label.includes(team)) return `${org} · ${team}`;
  return side.label || org || "Unnamed side";
}

/** Everything a partnership page needs about who is who. RLS decides what is returned. */
export const getPartnershipContext = cache(async (id: string): Promise<PartnershipContext> => {
  const { supabase, user } = await requireUser(`/p/${id}`);
  const [{ data: partnership }, { data: sides }, { data: members }] = await Promise.all([
    supabase.from("partnerships").select("*").eq("id", id).maybeSingle<Partnership>(),
    supabase.from("sides").select("*, organizations(name), teams(name)").eq("partnership_id", id).order("position"),
    supabase
      .from("side_members")
      .select("side_id, user_id, role, can_sign, created_at, profile:profiles(id, full_name, title, email, timezone, languages)")
      .eq("partnership_id", id)
      .is("removed_at", null)
      .order("created_at"),
  ]);
  if (!partnership || !sides) notFound();
  const typedSides = sides as unknown as Side[];
  const typedMembers = (members ?? []) as unknown as SideMember[];
  const me = typedMembers.find((m) => m.user_id === user.id);
  if (!me) notFound();
  const mySide = typedSides.find((s) => s.id === me.side_id)!;
  return {
    partnership,
    sides: typedSides,
    members: typedMembers,
    mySide,
    myRole: me.role,
    canSign: me.can_sign && me.role !== "viewer",
    isOwner: me.role === "owner",
    otherSides: typedSides.filter((s) => s.id !== mySide.id),
  };
});
