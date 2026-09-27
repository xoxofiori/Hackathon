"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, CalendarClock, FileSignature, MessageCircleQuestion, Plus, Sparkles } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { MeetingCard } from "@/components/meetings/meeting-bits";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { fmtDateTime } from "@/lib/utils";

const subscribe = () => () => {};
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
const longDate = () =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

export function HomeDashboard() {
  const { state, persona, ready } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const side = SIDES[me.side];
  // Time-of-day greeting and date come from the viewer's clock (client only, no hydration mismatch).
  const hello = useSyncExternalStore(subscribe, greeting, () => "Hello");
  const today = useSyncExternalStore(subscribe, longDate, () => "");

  const meetings = [...state.library].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const awaiting = state.items.filter(
    (i) => i.status === "partially_signed" && !i.signatures.some((s) => s.version === i.currentVersion && s.side === me.side),
  ).length;
  const questions = state.clarifications.filter((c) => c.status === "open" && c.toSide === me.side).length;
  const next = state.meetings.find((m) => m.status === "prep");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
      <header>
        <p className="text-sm text-muted-foreground" suppressHydrationWarning>{today}</p>
        <h1 className="mt-1 font-serif text-4xl font-medium tracking-tight md:text-5xl" aria-busy={!ready}>
          {hello}, {me.name.split(" ")[0]}
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Link
          href="/meetings/new"
          className="group relative flex min-h-40 items-center gap-5 overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none md:p-8"
        >
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:scale-105 md:size-20">
            <Plus className="size-8 md:size-10" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-2xl font-semibold tracking-tight md:text-3xl">New Meeting</span>
            <span className="text-sm opacity-80 md:text-base">Paste a transcript, upload a recording, or try the sample meeting.</span>
          </span>
          <ArrowRight className="ml-auto hidden size-6 opacity-70 transition-transform group-hover:translate-x-1 sm:block" />
          <span aria-hidden className="pointer-events-none absolute -top-12 -right-10 size-44 rounded-full bg-[#f59e0b] opacity-25 blur-2xl" />
        </Link>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Link href="/demo" className="flex flex-col gap-1 rounded-3xl p-5 transition-shadow hover:shadow-md" style={{ backgroundColor: `color-mix(in oklch, ${SIDES.B.color} 14%, var(--card))` }}>
            <span className="flex items-center gap-2 text-sm font-medium"><FileSignature className="size-4" /> Awaiting your signature</span>
            <span className="text-3xl font-semibold tabular-nums">{awaiting}</span>
            <span className="text-xs text-muted-foreground">Open the sign-off room →</span>
          </Link>
          <Link href="/demo" className="flex flex-col gap-1 rounded-3xl p-5 transition-shadow hover:shadow-md" style={{ backgroundColor: `color-mix(in oklch, ${SIDES.A.color} 12%, var(--card))` }}>
            <span className="flex items-center gap-2 text-sm font-medium"><MessageCircleQuestion className="size-4" /> Questions for {side.label}</span>
            <span className="text-3xl font-semibold tabular-nums">{questions}</span>
            <span className="text-xs text-muted-foreground">Answer before anything is signed →</span>
          </Link>
        </div>
      </div>

      {next && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border bg-card px-5 py-4 text-sm">
          <CalendarClock className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Next up</span>
          <span className="font-medium">{next.title}</span>
          <span className="text-muted-foreground">· {fmtDateTime(next.date)}</span>
        </div>
      )}

      <section aria-labelledby="recent-title" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="recent-title" className="text-lg font-semibold">
            Recent meetings <span className="text-muted-foreground">({meetings.length})</span>
          </h2>
          <Link href="/meetings" className="text-sm text-muted-foreground hover:text-foreground">View all</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {meetings.slice(0, 6).map((m, i) => (
            <MeetingCard key={m.id} m={m} tint={i === 0 ? side.color : undefined} />
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" /> Summaries are written by AI from each transcript and always link back to it.
        </p>
      </section>
    </div>
  );
}
