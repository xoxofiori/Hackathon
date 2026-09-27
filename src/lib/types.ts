export type Visibility = "shared" | "private_to_side";
export type SideRole = "owner" | "member" | "viewer";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  title: string | null;
  job_role: string | null;
  timezone: string | null;
  languages: string[];
  communication_notes: string | null;
  onboarded_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  color: string;
}

export interface Side {
  id: string;
  partnership_id: string;
  position: number;
  label: string;
  color: string;
  organization_id: string | null;
  team_id: string | null;
  pending_org_name: string | null;
  claimed_at: string | null;
  organizations: { name: string } | null;
  teams: { name: string } | null;
}

export interface SideMember {
  side_id: string;
  user_id: string;
  role: SideRole;
  can_sign: boolean;
  created_at: string;
  profile: Pick<Profile, "id" | "full_name" | "title" | "email" | "timezone" | "languages"> | null;
}

export interface Partnership {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "closed";
  is_internal: boolean;
  created_at: string;
}

export interface Invite {
  id: string;
  token: string;
  side_id: string;
  meeting_id: string | null;
  purpose: "claim_side" | "join_side";
  role: SideRole;
  can_sign: boolean;
  uses: number;
  max_uses: number;
  expires_at: string;
  revoked_at: string | null;
}
