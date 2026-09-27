"use client";

import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SIDES } from "@/lib/demo/people";
import { cn, fmtDate } from "@/lib/utils";
import type { MeetingParticipant, MeetingRecord } from "@/lib/meetings/types";

const NEUTRAL = ["#475569", "#6d28d9", "#0369a1", "#be123c", "#4d7c0f"];
export function colorFor(p: { name: string; side: MeetingParticipant["side"] }): string {
  if (p.side) return SIDES[p.side].color;
  let h = 0;
  for (const c of p.name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return NEUTRAL[h % NEUTRAL.length];
}

export function AvatarStack({ people, max = 4 }: { people: MeetingParticipant[]; max?: number }) {
  return (
    <div className="flex items-center">
      {people.slice(0, max).map((p, i) => (
        <span key={p.name} className={cn("rounded-full ring-2 ring-card", i > 0 && "-ml-2")} title={p.name}>
          <Avatar name={p.name} color={colorFor(p)} className="size-7 text-[10px]" />
        </span>
      ))}
      {people.length > max && (
        <span className="-ml-2 inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-card">
          +{people.length - max}
        </span>
      )}
    </div>
  );
}

export function NotesSourceBadge({ m }: { m: Pick<MeetingRecord, "notesSource" | "model"> }) {
  if (m.notesSource === "claude") return <Badge variant="success"><Sparkles /> AI notes</Badge>;
  if (m.notesSource === "pregenerated") return <Badge variant="secondary"><Sparkles /> Sample notes</Badge>;
  return <Badge variant="muted">Basic notes</Badge>;
}

export function MeetingCard({ m, tint }: { m: MeetingRecord; tint?: string }) {
  return (
    <Link
      href={`/meetings/${m.id}`}
      className="group flex h-full flex-col gap-3 rounded-3xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      style={tint ? { backgroundColor: `color-mix(in oklch, ${tint} 7%, var(--card))` } : undefined}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" /> {fmtDate(m.date)}
        <span className="ml-auto"><NotesSourceBadge m={m} /></span>
      </div>
      <h3 className="font-serif text-xl leading-snug font-medium text-balance">{m.title}</h3>
      <p className="line-clamp-2 text-sm text-muted-foreground">{m.notes.summaryLine}</p>
      <div className="mt-auto flex items-center gap-2 pt-1">
        <AvatarStack people={m.participants} />
        <span className="truncate text-xs text-muted-foreground">
          {m.participants.slice(0, 2).map((p) => p.name.split(" ")[0]).join(", ")}
          {m.participants.length > 2 ? ` +${m.participants.length - 2}` : ""}
        </span>
      </div>
    </Link>
  );
}
