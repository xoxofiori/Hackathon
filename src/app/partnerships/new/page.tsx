import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/data/session";
import { NewPartnershipForm } from "./new-partnership-form";

export const metadata: Metadata = { title: "New partnership" };

export default async function NewPartnershipPage() {
  const { supabase, user } = await requireUser("/partnerships/new");
  const { data } = await supabase
    .from("org_members")
    .select("organization_id, organizations(name), teams(name)")
    .eq("user_id", user.id);
  const orgs = ((data ?? []) as unknown as { organization_id: string; organizations: { name: string }; teams: { name: string } | null }[])
    .map((r) => ({ id: r.organization_id, name: r.organizations.name, team: r.teams?.name ?? null }));
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Start a partnership</CardTitle>
          <CardDescription>
            A partnership is the permanent shared space between two sides. Everything signed, due or learned lives here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPartnershipForm orgs={orgs} />
        </CardContent>
      </Card>
    </main>
  );
}
