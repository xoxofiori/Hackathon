"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSignature, History, Lock, PenLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { deriveStatus } from "@/lib/demo/engine";
import { KIND_LABEL, SIGNABLE_KINDS, STATUS_LABEL, STATUS_VARIANT, UNDERSTANDING_GROUPS } from "@/lib/demo/labels";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn, fmtDateTime } from "@/lib/utils";
import { ClarificationQueue } from "./clarification-queue";
import { useDemo } from "./demo-provider";
import { ItemCard } from "./item-card";
import { SidePanel } from "./side-panel";
import { Transcript } from "./transcript";
import type { DemoItem, ItemStatus } from "@/lib/demo/types";

const TABS = [
  { key: "meeting", label: "Meeting review" },
  { key: "commitments", label: "Commitments" },
  { key: "activity", label: "Activity" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function DemoApp({ initialTab }: { initialTab?: string }) {
  const { state, persona, ready } = useDemo();
  const [tab, setTab] = useState<Tab>(() => (TABS.some((t) => t.key === initialTab) ? (initialTab as Tab) : "meeting"));
  const me = DEMO_PEOPLE[persona];
  const side = SIDES[me.side];
  const awaitingMe = state.items.filter((i) => i.status === "partially_signed" && !i.signatures.some((s) => s.version === i.currentVersion && s.side === me.side)).length;
  const forMe = state.clarifications.filter((c) => c.status === "open" && c.toSide === me.side).length;

  return (
    <div aria-busy={!ready}>
      <div className="border-b" style={{ backgroundColor: `color-mix(in oklch, ${side.color} 10%, var(--background))` }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <span className="size-3 rounded-full" style={{ backgroundColor: side.color }} /> You&apos;re {me.name} on {side.label}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground"><ShieldCheck className="size-3.5" /> Side owner</span>
          {me.canSign && <span className="inline-flex items-center gap-1 text-muted-foreground"><PenLine className="size-3.5" /> Authorized signer</span>}
          <span className="ml-auto text-xs text-muted-foreground">Switch persona in the header to see the other side.</span>
        </div>
      </div>
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 pt-5">
          <h1 className="text-xl font-semibold tracking-tight">Wildframe × Aurel — Season 3 sponsorship</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            <span>{state.meetings.find((m) => m.key === "m3")?.title} · {fmtDateTime(state.meetings.find((m) => m.key === "m3")?.date)}</span>
            {awaitingMe > 0 && <span className="text-warning">{awaitingMe} awaiting your signature</span>}
            {forMe > 0 && <span className="text-warning">{forMe} question{forMe > 1 ? "s" : ""} for your side</span>}
            <Link href="/meetings/m3" className="underline-offset-4 hover:text-foreground hover:underline">Meeting notes →</Link>
          </p>
          <nav className="-mb-px mt-3 flex gap-1 overflow-x-auto" aria-label="Demo sections">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn("border-b-2 px-3 py-2.5 text-sm whitespace-nowrap", tab === t.key ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {tab === "meeting" && <MeetingView />}
        {tab === "commitments" && <CommitmentsView />}
        {tab === "activity" && <ActivityView />}
      </div>
    </div>
  );
}

function MeetingView() {
  const { state, persona } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const m3 = state.items.filter((i) => i.meeting === "m3");
  const signOff = state.items
    .filter((i) => SIGNABLE_KINDS.includes(i.kind) && ["needs_clarification", "clarified", "partially_signed", "proposed"].includes(i.status))
    .filter((i) => i.meeting === "m3" || ["partially_signed", "needs_clarification", "clarified"].includes(i.status))
    .filter((i) => i.id !== "onscreen")
    .sort((a, b) => priority(b, me.side) - priority(a, me.side));
  const recentlyCommitted = state.items.filter((i) => i.status === "committed" && i.signatures.some((s) => s.version === i.currentVersion && Date.parse(s.at) > Date.parse(state.createdAt)));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_300px]">
      <div className="order-2 lg:order-1 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto lg:pr-2">
        <Transcript />
      </div>
      <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
        <section aria-labelledby="understanding-title" className="rounded-xl border bg-card p-4">
          <h2 id="understanding-title" className="font-medium">Understanding panel</h2>
          <p className="text-xs text-muted-foreground">What the AI extracted from this meeting, grouped by type.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {UNDERSTANDING_GROUPS.map((g) => {
              const list = m3.filter((i) => g.kinds.includes(i.kind));
              if (!list.length) return null;
              return (
                <div key={g.label}>
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.label}</h3>
                  <ul className="mt-1 flex flex-col gap-1">
                    {list.map((i) => (
                      <li key={i.id}>
                        <a href={`#item-${i.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent">
                          <span className="min-w-0 flex-1 truncate">{i.title}</span>
                          <Badge variant={STATUS_VARIANT[i.status]} className="shrink-0">{STATUS_LABEL[i.status]}</Badge>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
        <ClarificationQueue />
        <section aria-labelledby="signoff-title" className="flex flex-col gap-3">
          <h2 id="signoff-title" className="flex items-center gap-2 font-medium"><FileSignature className="size-4" /> Sign-off</h2>
          <p className="text-xs text-muted-foreground">
            Proposed → Clarified → Signed by Wildframe → Signed by Aurel → Committed. Each signature records the signer, time and the exact wording.
          </p>
          {signOff.map((i) => <ItemCard key={i.id} item={i} />)}
          {signOff.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Everything from this meeting is signed or declined.</p>}
          {recentlyCommitted.length > 0 && (
            <>
              <h3 className="mt-2 text-sm font-medium">Committed in this session</h3>
              {recentlyCommitted.map((i) => <ItemCard key={i.id} item={i} />)}
            </>
          )}
        </section>
      </div>
      <div className="order-3 lg:col-span-2 xl:col-span-1">
        <div className="xl:sticky xl:top-4">
          <SidePanel />
        </div>
      </div>
    </div>
  );
}

/** Items needing the viewer's action first. */
function priority(i: DemoItem, mySide: "A" | "B"): number {
  const signedByMe = i.signatures.some((s) => s.version === i.currentVersion && s.side === mySide);
  if (i.status === "partially_signed" && !signedByMe) return 5;
  if (i.status === "clarified") return 4;
  if (i.status === "needs_clarification") return 3;
  if (i.status === "proposed") return 2;
  return 1;
}

const ORDER: ItemStatus[] = ["partially_signed", "needs_clarification", "clarified", "proposed", "committed", "declined"];

export function CommitmentsView() {
  const { state } = useDemo();
  const [filter, setFilter] = useState<ItemStatus | "all">("all");
  const items = state.items.filter((i) => SIGNABLE_KINDS.includes(i.kind));
  const counts = Object.fromEntries(ORDER.map((s) => [s, items.filter((i) => deriveStatus(state, i) === s).length]));
  const shown = (filter === "all" ? items : items.filter((i) => i.status === filter)).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {(["all", ...ORDER] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={cn("rounded-full border px-3 py-1 text-sm", filter === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            {s === "all" ? `All (${items.length})` : `${STATUS_LABEL[s]} (${counts[s]})`}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Signed commitments are never edited or deleted. Changes are amendments that both sides sign again; the original stays in the history.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((i) => <ItemCard key={i.id} item={i} compact />)}
      </div>
      <p className="text-xs text-muted-foreground">{KIND_LABEL.concern_or_risk}s and feedback appear in the meeting&apos;s Understanding panel.</p>
    </div>
  );
}

function ActivityView() {
  const { state, persona } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const events = state.events.filter((e) => !e.private || e.side === me.side);
  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm text-muted-foreground">Append-only history of this demo. Private events (like notes) show only to their own side.</p>
      <ol className="flex flex-col gap-3">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-3 text-sm">
            <Avatar name={e.actor} color={e.side ? SIDES[e.side].color : undefined} className="size-7 text-[10px]" />
            <div>
              <span className="font-medium">{e.actor}</span> {e.text}
              {e.private && <Badge variant="muted" className="ml-2"><Lock /> private</Badge>}
              <div className="text-xs text-muted-foreground">{fmtDateTime(e.at)}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground"><History className="size-3.5" /> Stored in this browser only. Use the reset button in the header to start over.</p>
    </div>
  );
}
