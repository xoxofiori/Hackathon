import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/data/session";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitation" };

interface Preview {
  partnership: string; side: string; side_color: string; purpose: "claim_side" | "join_side"; role: string;
  meeting: string | null; claimed: boolean; org: string; valid: boolean; invited_by: string | null;
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("invite_preview", { p_token: token });
  const preview = data as Preview | null;
  const { user, profile } = await getSession();
  const here = `/invite/${token}`;

  if (!preview) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>Check the link, or ask the person who invited you for a new one.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  let orgs: { id: string; name: string }[] = [];
  if (user) {
    const { data: rows } = await supabase.from("org_members").select("organization_id, organizations(name)").eq("user_id", user.id);
    orgs = ((rows ?? []) as unknown as { organization_id: string; organizations: { name: string } }[])
      .map((r) => ({ id: r.organization_id, name: r.organizations.name }));
  }
  const claim = preview.purpose === "claim_side";

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Card style={{ borderTop: `4px solid ${preview.side_color}` }}>
        <CardHeader>
          <CardDescription>{preview.invited_by ? `${preview.invited_by} invited you to` : "You're invited to"}</CardDescription>
          <CardTitle className="text-xl">{preview.partnership}</CardTitle>
          <p className="text-sm">
            {claim ? "Claim the side " : "Join the side "}
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: preview.side_color }} />
              {preview.side}
            </span>
            {claim ? " as its owner and signer." : ` as a ${preview.role}.`}
            {preview.meeting && <> You&apos;ll also be added to <span className="font-medium">{preview.meeting}</span>.</>}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!preview.valid ? (
            <p className="text-sm text-muted-foreground">
              This invite has expired or has already been used.{" "}
              {user && <Link href="/partnerships" className="underline">Go to your partnerships</Link>}
            </p>
          ) : !user ? (
            <>
              <p className="text-sm text-muted-foreground">Sign in or create an account first — each person has their own login.</p>
              <Button asChild size="lg"><Link href={`/signup?next=${encodeURIComponent(here)}`}>Create an account</Link></Button>
              <Button asChild variant="outline"><Link href={`/login?next=${encodeURIComponent(here)}`}>I already have an account</Link></Button>
            </>
          ) : !profile?.onboarded_at ? (
            <Button asChild size="lg"><Link href={`/onboarding?next=${encodeURIComponent(here)}`}>Set up your profile to continue</Link></Button>
          ) : (
            <AcceptForm token={token} claim={claim && !preview.claimed} orgs={orgs} pendingOrg={preview.org} sideLabel={preview.side} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
