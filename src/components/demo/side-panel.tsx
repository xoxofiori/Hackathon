"use client";

import { useState } from "react";
import { Lock, StickyNote, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { addNote, setExpectation } from "@/lib/demo/engine";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { fmtDateTime } from "@/lib/utils";
import { useDemo } from "./demo-provider";

const GOAL_VARIANT = { on_track: "success", at_risk: "warning", off_track: "destructive", achieved: "success" } as const;

/** Everything here is private to the viewer's side — switch persona to see the other side's version. */
export function SidePanel() {
  const { state, persona, act } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const side = SIDES[me.side];
  const [note, setNote] = useState("");
  const goals = state.goals.filter((g) => g.side === me.side || (!g.private && g.side === null));
  const expectations = state.expectations.filter((e) => e.side === me.side && e.meeting === "m3");
  const notes = state.notes.filter((n) => n.side === me.side);

  return (
    <aside className="flex flex-col gap-5 rounded-xl border p-4" style={{ borderColor: side.color, backgroundColor: `color-mix(in oklch, ${side.color} 5%, var(--card))` }} aria-label={`${side.label} private panel`}>
      <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: side.color }}>
        <Lock className="size-3.5" /> Only {side.label} can see this panel
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-medium"><Target className="size-4" /> Goals</h2>
        {goals.map((g) => (
          <div key={g.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm font-medium">{g.title}</p>
              {g.private ? <Badge variant="muted"><Lock /> private</Badge> : <Badge variant="outline">{g.side ? "shared" : "joint"}</Badge>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={g.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.title} progress`}>
                <div className="h-full rounded-full" style={{ width: `${g.progress}%`, backgroundColor: side.color }} />
              </div>
              <Badge variant={GOAL_VARIANT[g.status]}>{g.status.replace("_", " ")}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{g.summary}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Must-get answers for this meeting</h2>
        {expectations.map((e) => (
          <div key={e.id} className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-sm">
            <div className="flex items-start gap-2">
              <p className="flex-1">{e.kind === "avoid_topic" ? "Avoid: " : ""}{e.text}</p>
              <NativeSelect
                aria-label="Answer status"
                className="h-7 w-32 text-xs"
                value={e.status}
                onChange={(ev) => act((s, p) => setExpectation(s, p, e.id, ev.target.value as typeof e.status))}
              >
                <option value="unanswered">Unanswered</option>
                <option value="partial">Partially</option>
                <option value="answered">Answered</option>
              </NativeSelect>
            </div>
            {e.evidence && <p className="text-xs text-muted-foreground">{e.evidence}</p>}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-medium"><StickyNote className="size-4" /> Private notes</h2>
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border bg-card p-2.5 text-sm">
            <p>{n.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">{n.by} · {fmtDateTime(n.at)}</p>
          </div>
        ))}
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!act((s, p) => addNote(s, p, note), "Note saved — only your side can see it.")) setNote("");
          }}
        >
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={`Note for ${side.label} only…`} aria-label="Private note" />
          <Button size="sm" type="submit" variant="secondary" className="w-fit" disabled={!note.trim()}>Save note</Button>
        </form>
      </section>
    </aside>
  );
}
