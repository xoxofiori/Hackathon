import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, FileSignature, HelpCircle, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { getPartnershipContext, sideName } from "@/lib/data/partnership";
import { requireUser } from "@/lib/data/session";
import { activityActor, describeActivity, type ActivityRow } from "@/lib/activity";
import { fmtDate, fmtDateTime, isoDay } from "@/lib/utils";

export default async function PartnershipOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getPartnershipContext(id);
  const { supabase } = await requireUser();
  const today = isoDay();
  const weekOut = isoDay(7);

  const [items, clar, tasks, meetings, activity] = await Promise.all([
    supabase.from("items").select("id, title, status").eq("partnership_id", id).is("archived_at", null),
    supabase.from("clarifications").select("id").eq("partnership_id", id).eq("status", "open"),
    supabase.from("tasks").select("id, title, status, due_date, side_id").eq("partnership_id", id).is("archived_at", null),
    supabase.from("meetings").select("id, title, scheduled_at, status").eq("partnership_id", id).order("scheduled_at"),
    supabase
      .from("activity_log")
      .select("id, action, entity, entity_id, data, at, side_id, visibility, actor:profiles(full_name)")
      .eq("partnership_id", id)
      .in("entity", ["items", "signatures", "clarifications", "tasks", "meetings", "side_members", "partnerships", "sides", "goals"])
      .order("at", { ascending: false })
      .limit(60),
  ]);

  const itemRows = items.data ?? [];
  const taskRows = tasks.data ?? [];
  const committed = itemRows.filter((i) => i.status === "committed").length;
  const awaiting = itemRows.filter((i) => i.status === "partially_signed").length;
  const overdue = taskRows.filter((t) => t.status !== "done" && t.due_date && t.due_date < today);
  const dueSoon = taskRows.filter((t) => t.status !== "done" && t.due_date && t.due_date >= today && t.due_date <= weekOut);
  const done = taskRows.filter((t) => t.status === "done").length;
  const nowIso = `${today}T00:00:00Z`;
  const next = (meetings.data ?? []).find((m) => m.scheduled_at && m.scheduled_at >= nowIso && m.status !== "done");

  const titles = new Map<string, string>();
  for (const i of itemRows) titles.set(i.id, i.title);
  for (const t of taskRows) titles.set(t.id, t.title);
  for (const m of meetings.data ?? []) titles.set(m.id, m.title);
  const feed = ((activity.data ?? []) as unknown as ActivityRow[])
    .map((a) => ({ a, text: describeActivity(a, titles) }))
    .filter((x) => x.text)
    .slice(0, 12);

  const tiles = [
    { label: "Commitments in force", value: committed, icon: CheckCircle2, tone: "text-success" },
    { label: "Awaiting signature", value: awaiting, icon: FileSignature, tone: awaiting ? "text-warning" : "text-muted-foreground" },
    { label: "Open clarifications", value: clar.data?.length ?? 0, icon: HelpCircle, tone: (clar.data?.length ?? 0) ? "text-warning" : "text-muted-foreground" },
    { label: "Overdue tasks", value: overdue.length, icon: AlertTriangle, tone: overdue.length ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        {ctx.partnership.description && <p className="max-w-3xl text-sm text-muted-foreground">{ctx.partnership.description}</p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((t) => (
            <Card key={t.label}>
              <CardContent className="flex flex-col gap-1 p-4">
                <t.icon className={`size-4 ${t.tone}`} />
                <span className="text-2xl font-semibold tabular-nums">{t.value}</span>
                <span className="text-xs text-muted-foreground">{t.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4" /> Tasks</CardTitle>
            <CardDescription>
              {taskRows.length ? `${done} of ${taskRows.length} done · ${dueSoon.length} due in the next 7 days` : "No tasks yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {[...overdue, ...dueSoon].slice(0, 6).map((t) => {
              const side = ctx.sides.find((s) => s.id === t.side_id);
              const late = t.due_date! < today;
              return (
                <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: side?.color ?? "var(--muted-foreground)" }} />
                  <span className="flex-1">{t.title}</span>
                  <Badge variant={late ? "destructive" : "muted"}>{late ? "overdue · " : "due "}{fmtDate(t.due_date)}</Badge>
                </div>
              );
            })}
            {overdue.length + dueSoon.length === 0 && <p className="py-2 text-sm text-muted-foreground">Nothing overdue or due this week.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>From the permanent audit log. Your side&apos;s private activity is visible only to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {feed.map(({ a, text }) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <Avatar name={activityActor(a)} className="size-6 text-[10px]" />
                  <div className="flex-1">
                    <span className="font-medium">{activityActor(a)}</span> {text}
                    {a.visibility === "private_to_side" && <Badge variant="muted" className="ml-2">private</Badge>}
                    <div className="text-xs text-muted-foreground">{fmtDateTime(a.at)}</div>
                  </div>
                </li>
              ))}
              {feed.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            </ol>
          </CardContent>
        </Card>
      </div>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4" /> Next meeting</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {next ? (
              <>
                <p className="font-medium">{next.title}</p>
                <p className="text-muted-foreground">{fmtDateTime(next.scheduled_at)}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Nothing scheduled.</p>
            )}
          </CardContent>
        </Card>
        {ctx.sides.map((s) => {
          const people = ctx.members.filter((m) => m.side_id === s.id);
          return (
            <Card key={s.id} style={{ borderTop: `3px solid ${s.color}` }}>
              <CardHeader>
                <CardTitle className="text-base">{sideName(s)}</CardTitle>
                <CardDescription>
                  {s.claimed_at ? `${people.length} member${people.length === 1 ? "" : "s"}` : "Waiting for their lead to accept the invite"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {people.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2 text-sm">
                    <Avatar name={m.profile?.full_name} color={s.color} className="size-6 text-[10px]" />
                    <span className="flex-1">
                      {m.profile?.full_name}
                      <span className="block text-xs text-muted-foreground">{m.profile?.title}</span>
                    </span>
                    {m.can_sign && <Badge variant="outline">signer</Badge>}
                  </div>
                ))}
                <Link href={`/p/${id}/members`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  Manage members and invites
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </aside>
    </div>
  );
}
