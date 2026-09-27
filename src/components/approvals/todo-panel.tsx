"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Lock, MessageCircleQuestion, ThumbsUp, Target } from "lucide-react";
import { useDemo } from "@/components/demo/demo-provider";
import { todosFor } from "@/lib/demo/approvals";
import { toggleTask } from "@/lib/demo/engine";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn, relativeDue } from "@/lib/utils";

const GOAL_TONE = { on_track: "text-success", at_risk: "text-warning", off_track: "text-destructive", achieved: "text-success" } as const;
const SHORT = 6;

/** The viewer's company only: its to-dos (by deadline) and its goals. */
export function TodoPanel() {
  const { state, persona, act } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const side = SIDES[me.side];
  const [all, setAll] = useState(false);
  const todos = todosFor(state, persona);
  const open = todos.filter((t) => !t.done);
  const shown = all ? todos : open.slice(0, SHORT);
  const goals = state.goals.filter((g) => g.side === me.side || g.side === null);

  return (
    <aside
      aria-label={`${side.label} to-dos`}
      className="flex flex-col gap-6 rounded-3xl p-5 md:p-6"
      style={{ backgroundColor: `color-mix(in oklch, ${side.color} 9%, var(--card))` }}
    >
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: side.color }}>
          <Lock className="size-3" /> Only {side.label} sees this
        </p>
        <h2 className="mt-1 font-serif text-2xl font-medium">Your to-dos</h2>
        <p className="text-xs text-muted-foreground">{open.length} open for {side.label} · soonest first</p>
      </div>

      <ul className="flex flex-col gap-1">
        {shown.map((t) => {
          const due = t.due ? relativeDue(t.due) : null;
          const Icon = t.kind === "answer" ? MessageCircleQuestion : t.kind === "approve" ? ThumbsUp : null;
          return (
            <li key={t.id} className={cn("flex items-start gap-3 rounded-2xl px-2 py-2.5", !t.done && "hover:bg-card/70")}>
              {t.taskId ? (
                <button
                  onClick={() => act((s, p) => toggleTask(s, p, t.taskId!), t.done ? "Reopened." : "Done — nice.")}
                  aria-label={`${t.done ? "Reopen" : "Complete"}: ${t.title}`}
                  aria-pressed={t.done}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {t.done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5" />}
                </button>
              ) : (
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: side.color }}>
                  {Icon && <Icon className="size-3" />}
                </span>
              )}
              <div className="min-w-0 flex-1">
                {t.itemId && !t.taskId ? (
                  <a href={`#item-${t.itemId}`} className="text-sm leading-snug hover:underline">{t.title}</a>
                ) : (
                  <p className={cn("text-sm leading-snug", t.done && "text-muted-foreground line-through")}>{t.title}</p>
                )}
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                  {t.owner && <span>{t.owner.split(" ")[0]}</span>}
                  {due && !t.done && <span className={cn(due.overdue && "font-medium text-destructive", due.soon && "text-foreground")}>{due.label}</span>}
                  {!due && !t.done && t.kind === "answer" && <span className="text-foreground">Blocks approval</span>}
                </p>
              </div>
            </li>
          );
        })}
        {open.length === 0 && !all && <li className="px-2 text-sm text-muted-foreground">Nothing open. 🎉</li>}
      </ul>
      {todos.length > SHORT && (
        <button onClick={() => setAll(!all)} className="-mt-4 self-start px-2 text-xs text-muted-foreground hover:text-foreground">
          {all ? "Show less" : `Show all (${todos.length}, including done)`}
        </button>
      )}

      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Target className="size-4" /> Goals</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {goals.map((g) => (
            <li key={g.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="leading-snug">{g.title}</span>
                <span className={cn("shrink-0 text-xs", GOAL_TONE[g.status])}>{g.status === "achieved" ? "Achieved" : `${g.progress}%`}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuenow={g.progress} aria-valuemin={0} aria-valuemax={100} aria-label={g.title}>
                <div className="h-full rounded-full" style={{ width: `${g.progress}%`, backgroundColor: side.color }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
