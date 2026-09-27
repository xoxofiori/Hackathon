import { Mail, PenLine, QrCode, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/app/form-message";
import { getPartnershipContext, sideName } from "@/lib/data/partnership";
import { requireUser } from "@/lib/data/session";
import { qrSvg } from "@/lib/qr";
import { baseUrl } from "@/lib/url";
import { fmtDate } from "@/lib/utils";
import { CopyLink, NewInviteForm, RoleForm } from "./member-forms";
import { revokeInvite } from "./actions";
import type { Invite } from "@/lib/types";

export default async function MembersPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const ctx = await getPartnershipContext(id);
  const { supabase, user } = await requireUser();
  const base = await baseUrl();
  const now = new Date().toISOString();

  // RLS returns only invites for sides this user owns (plus claim links if they own the partnership).
  const [{ data: invites }, { data: meetings }] = await Promise.all([
    supabase.from("invites").select("*").eq("partnership_id", id).is("revoked_at", null).gt("expires_at", now).order("created_at"),
    supabase.from("meetings").select("id, title").eq("partnership_id", id).in("status", ["prep", "live"]).order("scheduled_at"),
  ]);
  const active = ((invites ?? []) as Invite[]).filter((i) => i.uses < i.max_uses);
  const withQr = await Promise.all(
    active.map(async (i) => ({ ...i, url: `${base}/invite/${i.token}`, qr: await qrSvg(`${base}/invite/${i.token}`) })),
  );

  return (
    <div className="flex flex-col gap-6">
      {created && (
        <FormMessage message="Partnership created. Send the claim link below to the other side's lead — they'll claim their side and invite their own team." />
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {ctx.sides.map((side) => {
          const people = ctx.members.filter((m) => m.side_id === side.id);
          const iOwnThisSide = ctx.isOwner && ctx.mySide.id === side.id;
          const sideInvites = withQr.filter((i) => i.side_id === side.id);
          const claim = sideInvites.find((i) => i.purpose === "claim_side");
          return (
            <Card key={side.id} style={{ borderTop: `3px solid ${side.color}` }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {sideName(side)}
                  {side.id === ctx.mySide.id && <Badge variant="outline">your side</Badge>}
                </CardTitle>
                <CardDescription>
                  {side.claimed_at
                    ? "Owners manage invites and choose who can sign for this side."
                    : "Not claimed yet. Their lead becomes the side owner when they accept the claim link."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="flex flex-col divide-y">
                  {people.map((m) => (
                    <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <Avatar name={m.profile?.full_name} color={side.color} />
                      <div className="min-w-40 flex-1">
                        <p className="text-sm font-medium">
                          {m.profile?.full_name}
                          {m.user_id === user.id && <span className="text-muted-foreground"> (you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.profile?.title}
                          {m.profile?.timezone ? ` · ${m.profile.timezone}` : ""}
                          {m.profile?.languages?.length ? ` · ${m.profile.languages.join(", ")}` : ""}
                        </p>
                      </div>
                      {iOwnThisSide ? (
                        <RoleForm partnershipId={id} sideId={side.id} userId={m.user_id} role={m.role} canSign={m.can_sign} />
                      ) : (
                        <div className="flex gap-1.5">
                          <Badge variant={m.role === "owner" ? "default" : "muted"}>
                            {m.role === "owner" && <ShieldCheck />} {m.role}
                          </Badge>
                          {m.can_sign && <Badge variant="outline"><PenLine /> signer</Badge>}
                        </div>
                      )}
                    </li>
                  ))}
                  {people.length === 0 && <li className="py-2 text-sm text-muted-foreground">No members yet.</li>}
                </ul>

                {claim && (
                  <InviteCard
                    title="Claim link for their lead"
                    note="Single use. Whoever opens it becomes this side's owner and signer."
                    invite={claim}
                    partnershipId={id}
                  />
                )}
                {iOwnThisSide && (
                  <div className="flex flex-col gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium"><Mail className="size-4" /> Invite teammates to {side.label}</h3>
                    {sideInvites.filter((i) => i.purpose === "join_side").map((i) => (
                      <InviteCard
                        key={i.id}
                        title={`Joins as ${i.role}${i.can_sign ? " · signer" : ""}${i.meeting_id ? ` · ${meetings?.find((m) => m.id === i.meeting_id)?.title ?? "meeting"}` : ""}`}
                        note={`Used ${i.uses}/${i.max_uses} · expires ${fmtDate(i.expires_at)}`}
                        invite={i}
                        partnershipId={id}
                      />
                    ))}
                    <NewInviteForm partnershipId={id} sideId={side.id} meetings={meetings ?? []} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InviteCard({ title, note, invite, partnershipId }: {
  title: string; note: string; invite: Invite & { url: string; qr: string }; partnershipId: string;
}) {
  return (
    <div className="flex gap-4 rounded-lg border bg-muted/40 p-3">
      <div
        className="size-24 shrink-0 overflow-hidden rounded-md bg-white p-1 [&_svg]:size-full"
        role="img"
        aria-label="QR code for this invite link"
        dangerouslySetInnerHTML={{ __html: invite.qr }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-sm font-medium"><QrCode className="size-3.5" /> {title}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
        <code className="truncate rounded bg-card px-1.5 py-0.5 text-xs">{invite.url}</code>
        <div className="flex gap-2">
          <CopyLink url={invite.url} />
          <form action={revokeInvite}>
            <input type="hidden" name="invite_id" value={invite.id} />
            <input type="hidden" name="partnership_id" value={partnershipId} />
            <Button variant="ghost" size="sm">Revoke</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
