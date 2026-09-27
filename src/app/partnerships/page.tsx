import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, FileSignature, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/app/submit-button";
import { requireUser } from "@/lib/data/session";
import { sideName } from "@/lib/data/partnership";
import { fmtDateTime, isoDay } from "@/lib/utils";
import { markNotificationsRead } from "./actions";
import type { Partnership, Side } from "@/lib/types";

export const metadata: Metadata = { title: "Partnerships" };

export default async function PartnershipsPage() {
  const { supabase, user, profile } = await requireUser("/partnerships");
  const today = isoDay();

  const [{ data: memberships }, { data: notifications }] = await Promise.all([
    supabase
      .from("side_members")
      .select("partnership_id, side_id, role, can_sign, partnerships(*)")
      .eq("user_id", user.id)
      .is("removed_at", null),
    supabase.from("notifications").select("*").is("read_at", null).order("created_at", { ascending: false }).limit(8),
  ]);
  const rows = (memberships ?? []) as unknown as {
    partnership_id: string; side_id: string; role: string; can_sign: boolean; partnerships: Partnership;
  }[];
  const ids = rows.map((r) => r.partnership_id);

  const [{ data: sides }, { data: openClar }, { data: overdue }, { data: awaiting }] = await Promise.all([
    supabase.from("sides").select("*, organizations(name), teams(name)").in("partnership_id", ids).order("position"),
    supabase.from("clarifications").select("partnership_id").in("partnership_id", ids).eq("status", "open"),
    supabase.from("tasks").select("partnership_id").in("partnership_id", ids).neq("status", "done").lt("due_date", today).is("archived_at", null),
    supabase.from("items").select("partnership_id").in("partnership_id", ids).eq("status", "partially_signed"),
  ]);
  const countBy = (list: { partnership_id: string }[] | null, id: string) => (list ?? []).filter((r) => r.partnership_id === id).length;

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Partnerships</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {profile.full_name.split(" ")[0]}.</p>
          </div>
          <Button asChild>
            <Link href="/partnerships/new"><Plus /> New partnership</Link>
          </Button>
        </div>
        {rows.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-8">
              <h2 className="font-medium">No partnerships yet</h2>
              <p className="text-sm text-muted-foreground">
                Start one and invite the other side&apos;s lead, or open an invite link someone sent you.
              </p>
              <Button asChild><Link href="/partnerships/new"><Plus /> Start a partnership</Link></Button>
            </CardContent>
          </Card>
        )}
        {rows.map((r) => {
          const pSides = ((sides ?? []) as unknown as Side[]).filter((s) => s.partnership_id === r.partnership_id);
          const mine = pSides.find((s) => s.id === r.side_id);
          const clar = countBy(openClar, r.partnership_id);
          const late = countBy(overdue, r.partnership_id);
          const sign = countBy(awaiting, r.partnership_id);
          return (
            <Link key={r.partnership_id} href={`/p/${r.partnership_id}`} className="group">
              <Card className="transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{r.partnerships.name}</CardTitle>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {pSides.map((s, i) => (
                      <span key={s.id} className="flex items-center gap-2">
                        {i > 0 && <span className="text-muted-foreground">×</span>}
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {sideName(s)}
                          {!s.claimed_at && <Badge variant="muted">invite pending</Badge>}
                        </span>
                      </span>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                  {mine && (
                    <Badge variant="outline" style={{ borderColor: mine.color }}>
                      You: {mine.label} · {r.role}{r.can_sign ? " · signer" : ""}
                    </Badge>
                  )}
                  {r.partnerships.is_internal && <Badge variant="muted">internal</Badge>}
                  {sign > 0 && <Badge variant="warning"><FileSignature /> {sign} awaiting signature</Badge>}
                  {clar > 0 && <Badge variant="warning"><HelpCircle /> {clar} open clarification{clar > 1 ? "s" : ""}</Badge>}
                  {late > 0 && <Badge variant="destructive"><AlertTriangle /> {late} overdue</Badge>}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <aside id="notifications" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium"><Bell className="size-4" /> Notifications</h2>
          {(notifications?.length ?? 0) > 0 && (
            <form action={markNotificationsRead}>
              <SubmitButton variant="ghost" size="sm">Mark all read</SubmitButton>
            </form>
          )}
        </div>
        {(notifications ?? []).length === 0 && <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>}
        {(notifications ?? []).map((n) => (
          <Link key={n.id} href={n.link ?? "#"} className="rounded-lg border bg-card p-3 text-sm hover:bg-accent">
            <p className="font-medium">{n.title}</p>
            {n.body && <p className="mt-0.5 text-muted-foreground">{n.body}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</p>
          </Link>
        ))}
      </aside>
    </main>
  );
}
