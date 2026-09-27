"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { approvalStatus, boardItems, groupFor, type ApprovalStatus, type Group } from "@/lib/demo/approvals";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn } from "@/lib/utils";
import { CommitmentCard, StatusTag } from "./commitment-card";
import { TodoPanel } from "./todo-panel";
import type { DemoItem } from "@/lib/demo/types";

/**
 * One list of commitments, grouped by what the viewer has to do, with the
 * viewer's company to-dos alongside.
 *  - scope "meeting": what came out of the sample meeting plus anything still open from earlier ones
 *  - scope "all": every commitment in the partnership
 */
export function ApprovalBoard({ scope }: { scope: "meeting" | "all" }) {
  const { state, persona, ready } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const other = SIDES[me.side === "A" ? "B" : "A"];
  const items = boardItems(state, scope);
  const byGroup = (g: Group) => items.filter((i) => groupFor(state, i, persona) === g).sort(byDue);
  const needsYou = byGroup("needs_you");
  const waiting = byGroup("waiting");
  const closed = byGroup("closed");
  const counts = (["pending", "approved", "pushed_back"] as ApprovalStatus[]).map((s) => [s, items.filter((i) => approvalStatus(state, i) === s).length] as const);
  const meeting = state.meetings.find((m) => m.key === "m3");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10" aria-busy={!ready}>
      {scope === "meeting" && (
        <Link href="/meetings/m3" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Meeting notes
        </Link>
      )}
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{scope === "meeting" ? "Analysis" : "Wildframe × Aurel — Season 3 sponsorship"}</p>
          <h1 className="font-serif text-4xl font-medium tracking-tight">{scope === "meeting" ? meeting?.title : "Commitments"}</h1>
          <p className="mt-1 text-muted-foreground">
            {needsYou.length
              ? `${needsYou.length} need${needsYou.length === 1 ? "s" : ""} a decision from ${SIDES[me.side].label}.`
              : `Nothing needs ${SIDES[me.side].label} right now.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Status summary">
          {counts.map(([s, n]) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <StatusTag status={s} /> <span className="text-sm tabular-nums text-muted-foreground">{n}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-10">
          <Section title="Needs your decision" count={needsYou.length} empty="You're all caught up." items={needsYou} />
          <Section title={`Waiting on ${other.label}`} count={waiting.length} empty={`Nothing waiting on ${other.label}.`} items={waiting} />
          {closed.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-semibold">
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                Approved & closed <span className="text-muted-foreground">({closed.length})</span>
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                {closed.map((i) => <CommitmentCard key={i.id} item={i} />)}
              </div>
            </details>
          )}
        </div>
        <div className="order-first lg:order-none">
          <div className="lg:sticky lg:top-6">
            <TodoPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, empty, items }: { title: string; count: number; empty: string; items: DemoItem[] }) {
  return (
    <section aria-label={title}>
      <h2 className="text-lg font-semibold">
        {title} <span className="text-muted-foreground">({count})</span>
      </h2>
      <div className={cn("mt-4 flex flex-col gap-4")}>
        {items.map((i) => <CommitmentCard key={i.id} item={i} />)}
        {items.length === 0 && <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}

const byDue = (a: DemoItem, b: DemoItem) => {
  const da = a.versions.find((v) => v.version === a.currentVersion)?.due ?? "9999";
  const db = b.versions.find((v) => v.version === b.currentVersion)?.due ?? "9999";
  return da.localeCompare(db);
};
