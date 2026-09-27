"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarClock, Check, FileSignature, NotebookText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/components/demo/demo-provider";
import { MeetingCard } from "@/components/meetings/meeting-bits";
import { deleteGroup, GROUP_COLORS, groupSummary, recolorGroup, renameGroup, type GroupSummaryItem } from "@/lib/meetings/groups";
import { cn, fmtDate, isoDay, relativeDue } from "@/lib/utils";

export function GroupView({ id }: { id: string }) {
  const { state, ready, setState } = useDemo();
  const router = useRouter();
  const group = state.groups.find((g) => g.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (!ready) return <div className="mx-auto max-w-6xl animate-pulse px-4 py-10 md:px-8"><div className="h-10 w-1/2 rounded bg-muted" /></div>;
  if (!group) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-3xl">Group not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        <Button asChild className="mt-6 rounded-full"><Link href="/">Back to Home</Link></Button>
      </div>
    );
  }
  const summary = groupSummary(state, group.id, isoDay());
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setState((s) => renameGroup(s, group.id, name));
    setEditing(false);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Home
        </Link>
        <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-3 rounded-full" style={{ backgroundColor: group.color }} /> Group
            </p>
            {editing ? (
              <form onSubmit={save} className="mt-1 flex items-center gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Group name" className="h-11 max-w-md font-serif text-2xl" />
                <Button type="submit" size="icon" className="rounded-full" aria-label="Save name"><Check /></Button>
              </form>
            ) : (
              <h1 className="font-serif text-4xl font-medium tracking-tight">{group.name}</h1>
            )}
            {group.description && <p className="mt-1 text-muted-foreground">{group.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Group color" className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1.5">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={group.color === c}
                  aria-label={`Color ${c}`}
                  onClick={() => setState((s) => recolorGroup(s, group.id, c))}
                  className={cn("size-5 rounded-full transition-transform hover:scale-110", group.color === c && "ring-2 ring-offset-2 ring-offset-card")}
                  style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
                />
              ))}
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => { setName(group.name); setEditing(!editing); }}>
              <Pencil /> Rename
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-destructive"
              onClick={() => {
                if (window.confirm(`Delete “${group.name}”? Its ${summary.meetings.length} meeting(s) stay and become unsorted.`)) {
                  setState((s) => deleteGroup(s, group.id));
                  router.push("/");
                }
              }}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </header>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={FileSignature}
          color={group.color}
          title="Open commitments"
          value={summary.openCommitments.length}
          items={summary.openCommitments.slice(0, 4)}
          empty="Nothing open."
          show="status"
        />
        <SummaryCard
          icon={CalendarClock}
          color={group.color}
          title="Upcoming deadlines"
          value={summary.upcoming.length}
          items={summary.upcoming.slice(0, 4)}
          empty="No dated deadlines ahead."
          show="due"
        />
        <div className="flex flex-col gap-2 rounded-3xl border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-medium"><NotebookText className="size-4" /> Meetings</p>
          <p className="text-3xl font-semibold tabular-nums">{summary.meetings.length}</p>
          <p className="text-sm text-muted-foreground">{summary.lastMet ? `Last met ${fmtDate(summary.lastMet)}` : "No meetings yet."}</p>
          {group.keywords.length > 0 && (
            <p className="mt-auto text-xs text-muted-foreground">
              New meetings that mention {group.keywords.slice(0, 4).map((k) => `“${k}”`).join(", ")} are suggested here.
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="group-meetings" className="flex flex-col gap-4">
        <h2 id="group-meetings" className="text-lg font-semibold">Meetings <span className="text-muted-foreground">({summary.meetings.length})</span></h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summary.meetings.map((m) => <MeetingCard key={m.id} m={m} group={group} />)}
        </div>
        {summary.meetings.length === 0 && (
          <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">
            No meetings here yet. Open a meeting and choose this group, or accept a suggestion when you create one.
          </p>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, color, title, value, items, empty, show }: {
  icon: typeof FileSignature; color: string; title: string; value: number; items: GroupSummaryItem[]; empty: string; show: "status" | "due";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl p-5" style={{ backgroundColor: `color-mix(in oklch, ${color} 10%, var(--card))` }} aria-label={title} role="region">
      <p className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4" /> {title}</p>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <ul className="mt-1 flex flex-col gap-2">
        {items.map((it, i) => {
          const due = it.due ? relativeDue(it.due) : null;
          return (
            <li key={i}>
              <Link href={it.href} className="block rounded-xl text-sm hover:underline">
                <span className="line-clamp-1">{it.title}</span>
                <span className="text-xs text-muted-foreground">
                  {it.owner ? `${it.owner.split(" ")[0]} · ` : ""}
                  {show === "status" ? it.status : ""}
                  {show === "due" && it.due ? <span className={cn(due?.soon && "text-foreground")}>{fmtDate(it.due)} · {due!.label}</span> : null}
                  {show === "status" && it.due ? ` · due ${fmtDate(it.due)}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
        {items.length === 0 && <li className="text-sm text-muted-foreground">{empty}</li>}
      </ul>
    </div>
  );
}
