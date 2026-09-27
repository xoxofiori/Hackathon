"use client";

import { useState } from "react";
import { CornerDownRight, MessageCircleQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { answerClarification } from "@/lib/demo/engine";
import { CATEGORY_LABEL } from "@/lib/demo/labels";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn } from "@/lib/utils";
import { useDemo } from "./demo-provider";
import type { DemoClarification } from "@/lib/demo/types";

export function ClarificationQueue() {
  const { state, persona } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const open = state.clarifications
    .filter((c) => c.status === "open")
    .sort((a, b) => Number(b.toSide === me.side) - Number(a.toSide === me.side));
  return (
    <section aria-labelledby="queue-title" className="flex flex-col gap-3">
      <h2 id="queue-title" className="flex items-center gap-2 font-medium">
        <MessageCircleQuestion className="size-4" /> Clarification queue
        <Badge variant={open.length ? "warning" : "success"}>{open.length} open</Badge>
      </h2>
      <p className="text-xs text-muted-foreground">
        Nothing can be signed while one of its clarifications is open. Either side can answer.
      </p>
      {open.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No open questions. Everything left can be signed.</p>}
      {open.map((c) => <ClarificationCard key={c.id} c={c} mine={c.toSide === me.side} />)}
    </section>
  );
}

function ClarificationCard({ c, mine }: { c: DemoClarification; mine: boolean }) {
  const { state, act } = useDemo();
  const [answer, setAnswer] = useState("");
  const item = state.items.find((i) => i.id === c.itemId);
  return (
    <article className={cn("rounded-xl border bg-card p-4", mine && "border-warning/60 ring-1 ring-warning/30")}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge variant="warning">{CATEGORY_LABEL[c.category]}</Badge>
        <span className="text-muted-foreground">
          for <span className="font-medium text-foreground" style={{ color: SIDES[c.toSide].color }}>{c.toName ? `${c.toName}, ` : ""}{SIDES[c.toSide].label}</span>
          {mine && " · your side"}
        </span>
        <span className="text-muted-foreground">· raised by {c.raisedBy}</span>
      </div>
      <p className="mt-2 text-sm">{c.question}</p>
      {item && (
        <a href={`#item-${item.id}`} className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <CornerDownRight className="size-3" /> {item.title}
        </a>
      )}
      {c.meanings.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.meanings.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setAnswer(m)}
              className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
              title="Use this as your answer"
            >
              {m}
            </button>
          ))}
        </div>
      )}
      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!act((s, p) => answerClarification(s, p, c.id, answer), "Clarification resolved.")) setAnswer("");
        }}
      >
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder="Answer in plain words — this becomes part of the record." aria-label="Your answer" />
        <Button size="sm" type="submit" className="w-fit" disabled={!answer.trim()}>Answer and resolve</Button>
      </form>
    </article>
  );
}
