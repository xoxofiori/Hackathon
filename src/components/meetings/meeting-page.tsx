"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, Copy, Hash, Info, ListChecks, Plus, Search, Sparkles, UserRound, X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/components/demo/demo-provider";
import { addCustomChip, removeCustomChip } from "@/lib/meetings/actions";
import { boardItems, groupFor } from "@/lib/demo/approvals";
import { chipRegex, countMatches, fmtClock, matchLines, splitMatches } from "@/lib/meetings/highlight";
import { cn, fmtDate } from "@/lib/utils";
import { AvatarStack, colorFor, NotesSourceBadge } from "./meeting-bits";
import type { FilterChip, MeetingNotes, MeetingRecord } from "@/lib/meetings/types";

const CHIP_COLORS: Record<string, string> = {
  deadlines: "#b45309", owners: "#0f766e", metrics: "#4338ca", pushback: "#be123c", softyes: "#7c3aed",
};
const chipColor = (c: FilterChip) =>
  c.kind === "custom" ? "#475569" : CHIP_COLORS[c.id] ?? CHIP_COLORS[c.id.replace(/-\d+$/, "").replace(/-/g, "")] ?? "#0369a1";

/** Text with every match of `re` wrapped in <mark>. */
function Hl({ text, re, color }: { text: string; re: RegExp | null; color?: string }) {
  const parts = splitMatches(text, re);
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded-sm px-0.5 text-inherit" style={{ backgroundColor: `color-mix(in oklch, ${color ?? "var(--warning)"} 28%, transparent)` }}>
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function MeetingPage({ id }: { id: string }) {
  const { state, ready, setState } = useDemo();
  const m = state.library.find((x) => x.id === id);
  if (!ready) return <MeetingSkeleton />;
  if (!m) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-3xl">Meeting not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been created in another browser, or the demo was reset.</p>
        <Button asChild className="mt-6 rounded-full"><Link href="/">Back to Home</Link></Button>
      </div>
    );
  }
  return <MeetingView m={m} setState={setState} />;
}

function MeetingView({ m, setState }: { m: MeetingRecord; setState: ReturnType<typeof useDemo>["setState"] }) {
  const chips = useMemo(() => [...m.chips, ...m.customChips], [m.chips, m.customChips]);
  const counts = useMemo(() => new Map(chips.map((c) => [c.id, countMatches(m.lines, c)])), [chips, m.lines]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = chips.find((c) => c.id === activeId) ?? null;
  const re = active ? chipRegex(active) : null;
  const color = active ? chipColor(active) : undefined;
  const matches = active ? matchLines(m.lines, active) : [];
  const matchedLines = new Set(matches.map((x) => x.lineIndex));
  const [tab, setTab] = useState<"notes" | "transcript">("notes");
  const [flash, setFlash] = useState<{ index: number; key: number } | null>(null);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [keyword, setKeyword] = useState("");
  const [copied, setCopied] = useState(false);

  const jumpTo = (index: number) => {
    setTab("transcript");
    setFlash((f) => ({ index, key: (f?.key ?? 0) + 1 }));
    requestAnimationFrame(() => lineRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const addKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const k = keyword.trim();
    if (!k) return;
    const existing = chips.find((c) => c.label.toLowerCase() === k.toLowerCase());
    if (existing) {
      setActiveId(existing.id);
    } else {
      const id = `custom-${m.customChips.length}-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`;
      setState((s) => addCustomChip(s, m.id, k, id).state);
      setActiveId(id);
    }
    setKeyword("");
  };

  const durationMs = m.lines.length ? m.lines[m.lines.length - 1].startMs + 20_000 : 0;

  return (
    <div className="flex flex-col lg:h-dvh">
      {/* Header */}
      <header className="shrink-0 border-b bg-card px-4 pt-5 pb-4 md:px-8">
        <Link href="/meetings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Meetings
        </Link>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">{m.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 whitespace-nowrap"><CalendarDays className="size-3.5" /> {fmtDate(m.date)}</span>
              <span className="inline-flex items-center gap-2 rounded-full border py-0.5 pr-2.5 pl-1 whitespace-nowrap">
                <AvatarStack people={m.participants} max={5} /> {m.participants.length} people
              </span>
              <NotesSourceBadge m={m} />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={async () => {
                await navigator.clipboard.writeText(notesMarkdown(m));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy notes"}
            </Button>
            <AnalysisButton href={m.analysisHref} />
          </div>
        </div>
        {m.notice && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" /> {m.notice}</p>
        )}
      </header>

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[250px_minmax(0,1.15fr)_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Left: keyword filters */}
        <aside className="border-b bg-card/60 px-4 py-5 lg:overflow-y-auto lg:border-r lg:border-b-0 md:px-5" aria-label="Keyword filters">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Sparkles className="size-3.5" /> Smart filters
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => {
              const on = c.id === activeId;
              const col = chipColor(c);
              return (
                <span key={c.id} className="relative inline-flex">
                  <button
                    onClick={() => setActiveId(on ? null : c.id)}
                    aria-pressed={on}
                    title={c.hint}
                    className={cn("rounded-full border px-3 py-1.5 text-sm transition-all", c.kind === "custom" && "pr-7", on && "shadow-sm ring-2")}
                    style={{
                      backgroundColor: `color-mix(in oklch, ${col} ${on ? 22 : 10}%, var(--card))`,
                      borderColor: `color-mix(in oklch, ${col} ${on ? 60 : 22}%, transparent)`,
                      color: `color-mix(in oklch, ${col} 75%, var(--foreground))`,
                      ["--tw-ring-color" as string]: `color-mix(in oklch, ${col} 35%, transparent)`,
                    }}
                  >
                    {c.label} · {counts.get(c.id) ?? 0}
                  </button>
                  {c.kind === "custom" && (
                    <button
                      aria-label={`Remove ${c.label}`}
                      onClick={() => {
                        if (activeId === c.id) setActiveId(null);
                        setState((s) => removeCustomChip(s, m.id, c.id));
                      }}
                      className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          <form onSubmit={addKeyword} className="relative mt-4">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Add a keyword…" className="h-9 rounded-full pr-10 pl-9" aria-label="Add a custom keyword filter" />
            <button type="submit" disabled={!keyword.trim()} aria-label="Add keyword" className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30">
              <Plus className="size-4" />
            </button>
          </form>

          {active && (
            <div className="mt-5">
              <p className="text-sm font-medium">
                {counts.get(active.id) ?? 0} match{(counts.get(active.id) ?? 0) === 1 ? "" : "es"} for “{active.label}”
              </p>
              {active.hint && <p className="text-xs text-muted-foreground">{active.hint}</p>}
              <ol className="mt-2 flex flex-col gap-1" aria-label="Moments in the transcript">
                {matches.map(({ lineIndex }) => {
                  const l = m.lines[lineIndex];
                  return (
                    <li key={lineIndex}>
                      <button onClick={() => jumpTo(lineIndex)} className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-accent">
                        <span className="font-mono font-medium" style={{ color }}>{fmtClock(l.startMs)}</span>
                        <span className="min-w-0 flex-1 truncate"><span className="font-medium">{l.speaker.split(" ")[0]}:</span> {l.text}</span>
                      </button>
                    </li>
                  );
                })}
                {matches.length === 0 && <li className="px-2 text-xs text-muted-foreground">Not mentioned in this transcript.</li>}
              </ol>
            </div>
          )}

          <SpeakerShare m={m} />
        </aside>

        {/* Mobile tabs */}
        <div role="tablist" aria-label="Notes or transcript" className="sticky top-14 z-20 grid grid-cols-2 gap-1 border-b bg-background/95 p-2 backdrop-blur lg:hidden">
          {(["notes", "transcript"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-full py-2 text-sm capitalize", tab === t ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
              {t}
            </button>
          ))}
        </div>

        {/* Middle: notes */}
        <section className={cn("px-5 py-8 md:px-10 lg:block lg:overflow-y-auto", tab !== "notes" && "hidden")} aria-label="Meeting notes">
          <NotesView notes={m.notes} re={re} color={color} />
        </section>

        {/* Right: transcript */}
        <section className={cn("bg-card/60 px-4 py-6 lg:block lg:overflow-y-auto lg:border-l md:px-6", tab !== "transcript" && "hidden")} aria-label="Transcript">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Hash className="size-4" /> Transcript</h2>
            <span className="text-xs text-muted-foreground">{m.lines.length} lines · {Math.max(1, Math.round(durationMs / 60000))} min</span>
          </div>
          <ol className="mt-4 flex flex-col gap-1">
            {m.lines.map((l, i) => {
              const hit = matchedLines.has(i);
              return (
                <li
                  key={`${i}-${flash?.index === i ? flash.key : 0}`}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className={cn("scroll-mt-24 rounded-xl border-l-2 border-transparent px-3 py-2.5", hit && "bg-card", flash?.index === i && "animate-flash")}
                  style={hit ? { borderLeftColor: color } : undefined}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Avatar name={l.speaker} color={colorFor({ name: l.speaker, side: l.side })} className="size-6 text-[10px]" />
                    <span className="font-medium">{l.speaker}</span>
                    <button onClick={() => jumpTo(i)} className="font-mono text-muted-foreground hover:text-foreground" aria-label={`Jump to ${fmtClock(l.startMs)}`}>
                      {fmtClock(l.startMs)}
                    </button>
                  </div>
                  <p className="mt-1 pl-8 text-sm leading-relaxed"><Hl text={l.text} re={re} color={color} /></p>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

/** The main call to action on a meeting: open its Analysis (approve / push back). */
function AnalysisButton({ href }: { href: string | null }) {
  const { state, persona } = useDemo();
  const waiting = href ? boardItems(state, "meeting").filter((i) => groupFor(state, i, persona) === "needs_you").length : 0;
  const body = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:scale-105">
        <BarChart3 className="size-5" />
      </span>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-lg font-semibold">View Analysis</span>
        <span id="analysis-hint" className="text-xs font-normal opacity-80">
          {href ? (waiting ? `${waiting} decision${waiting === 1 ? "" : "s"} waiting for you` : "Approve & push back") : "Available for the sample meeting"}
        </span>
      </span>
      <ArrowRight className="ml-auto size-5 opacity-70 transition-transform group-hover:translate-x-0.5 sm:ml-2" />
      <span aria-hidden className="pointer-events-none absolute -top-8 -right-6 size-24 rounded-full bg-[#f59e0b] opacity-30 blur-2xl" />
    </>
  );
  const cls = "group relative flex min-h-16 w-full items-center gap-3 overflow-hidden rounded-full bg-primary py-2.5 pr-6 pl-2.5 text-primary-foreground shadow-lg transition-transform sm:w-auto sm:min-w-72";
  return href ? (
    <Link href={href} aria-label="View Analysis" aria-describedby="analysis-hint" className={cn(cls, "hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none")}>
      {body}
    </Link>
  ) : (
    <button type="button" disabled aria-label="View Analysis" aria-describedby="analysis-hint" className={cn(cls, "cursor-not-allowed opacity-60")} title="Analysis and sign-off are available for the sample meeting in demo mode.">
      {body}
    </button>
  );
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="mt-9 first:mt-0">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="font-normal text-muted-foreground/50">#</span> {title}
      </h2>
      {empty ? <p className="mt-2 pl-5 text-sm text-muted-foreground">Nothing recorded.</p> : children}
    </section>
  );
}

function Bullets({ items, re, color }: { items: string[]; re: RegExp | null; color?: string }) {
  return (
    <ul className="mt-3 flex flex-col gap-2.5 pl-1">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
          <span className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-foreground/70" />
          <span><Hl text={t} re={re} color={color} /></span>
        </li>
      ))}
    </ul>
  );
}

function NotesView({ notes, re, color }: { notes: MeetingNotes; re: RegExp | null; color?: string }) {
  return (
    <article className="mx-auto max-w-2xl">
      <p className="font-serif text-xl leading-relaxed text-pretty text-foreground/90 italic"><Hl text={notes.summaryLine} re={re} color={color} /></p>
      <div className="mt-8">
        <Section title="Summary" empty={!notes.summary.length}><Bullets items={notes.summary} re={re} color={color} /></Section>
        <Section title="Decisions" empty={!notes.decisions.length}><Bullets items={notes.decisions} re={re} color={color} /></Section>
        <Section title="Action Items" empty={!notes.actionItems.length}>
          <ul className="mt-3 flex flex-col gap-3">
            {notes.actionItems.map((a, i) => (
              <li key={i} className="flex gap-3">
                <ListChecks className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-[15px] leading-relaxed"><Hl text={a.task} re={re} color={color} /></p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><UserRound className="size-3" /> <Hl text={a.owner} re={re} color={color} /></span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><CalendarDays className="size-3" /> <Hl text={a.deadline} re={re} color={color} /></span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Open Questions" empty={!notes.openQuestions.length}><Bullets items={notes.openQuestions} re={re} color={color} /></Section>
      </div>
    </article>
  );
}

function SpeakerShare({ m }: { m: MeetingRecord }) {
  const totals = new Map<string, number>();
  for (const l of m.lines) totals.set(l.speaker, (totals.get(l.speaker) ?? 0) + l.text.length);
  const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <div className="mt-7 hidden lg:block">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Speakers</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map(([name, n]) => {
          const p = m.participants.find((x) => x.name === name) ?? { name, side: null };
          const pct = Math.round((n / sum) * 100);
          return (
            <li key={name} className="text-xs">
              <div className="flex justify-between"><span>{name}</span><span className="text-muted-foreground tabular-nums">{pct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colorFor(p) }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MeetingSkeleton() {
  return (
    <div className="animate-pulse px-4 py-8 md:px-8" aria-busy>
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-4 h-9 w-2/3 rounded bg-muted" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[250px_1fr_1fr]">
        {[0, 1, 2].map((i) => <div key={i} className="h-96 rounded-3xl bg-muted" />)}
      </div>
    </div>
  );
}

function notesMarkdown(m: MeetingRecord): string {
  const n = m.notes;
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- Nothing recorded");
  return [
    `# ${m.title}`,
    `${fmtDate(m.date)} · ${m.participants.map((p) => p.name).join(", ")}`,
    "", `_${n.summaryLine}_`,
    "", "## Summary", list(n.summary),
    "", "## Decisions", list(n.decisions),
    "", "## Action Items", n.actionItems.length ? n.actionItems.map((a) => `- [ ] ${a.task} — **${a.owner}**, ${a.deadline}`).join("\n") : "- Nothing recorded",
    "", "## Open Questions", list(n.openQuestions),
  ].join("\n");
}
