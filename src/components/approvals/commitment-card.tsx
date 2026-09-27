"use client";

import { useState } from "react";
import { CalendarDays, Check, Lightbulb, MessageCircleQuestion, ThumbsUp, Undo2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useDemo } from "@/components/demo/demo-provider";
import {
  APPROVAL_LABEL, approvalStatus, approvedBy, isAmendment, openQuestions, ownerOf, standing, whenOf, type ApprovalStatus,
} from "@/lib/demo/approvals";
import { answerClarification, askClarification, currentVersion, decline, inForceVersion, proposeChanges, sign, signBlocker } from "@/lib/demo/engine";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn, fmtDate, relativeDue } from "@/lib/utils";
import type { DemoItem } from "@/lib/demo/types";

const TAG: Record<ApprovalStatus, string> = {
  pending: "bg-warning/20 text-[color-mix(in_oklch,var(--warning)_65%,var(--foreground))]",
  approved: "bg-success/15 text-success",
  pushed_back: "bg-[#be123c]/12 text-[#be123c] dark:text-[#fb7185]",
};

export function StatusTag({ status }: { status: ApprovalStatus }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TAG[status])}>{APPROVAL_LABEL[status]}</span>;
}

type Mode = "question" | "change" | "decline";

export function CommitmentCard({ item }: { item: DemoItem }) {
  const { state, persona, act } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const status = approvalStatus(state, item);
  const owner = ownerOf(item);
  const when = whenOf(item);
  const due = when.date ? relativeDue(when.date) : null;
  const questions = openQuestions(state, item);
  const blocker = signBlocker(state, persona, item);
  const approved = approvedBy(item);
  const amendment = isAmendment(item);
  const closed = item.status === "committed" || item.status === "declined";
  const [mode, setMode] = useState<Mode | null>(null);
  const [text, setText] = useState("");
  // An AI hint only while nobody has looked into this item yet (answered questions make it stale).
  const hint = !closed && !state.clarifications.some((c) => c.itemId === item.id) ? item.flags[0]?.note : null;
  const questionForMe = questions.some((q) => q.toSide === me.side);
  // Plain-language reason Approve is unavailable (the engine's wording is more formal).
  const reason = questionForMe ? "Answer the question above first." : blocker;
  const showApprove = !(questions.length > 0 && !questionForMe); // waiting on their answer: nothing to approve yet

  const openPushback = (m: Mode) => {
    setMode(mode === m ? null : m);
    setText(m === "change" ? currentVersion(item).wording : "");
  };
  const submitPushback = () => {
    const ok =
      mode === "question" ? !act((s, p) => askClarification(s, p, item.id, text), "Pushed back — your question was sent to the other side.")
      : mode === "change" ? !act((s, p) => proposeChanges(s, p, item.id, { wording: text }), "New wording proposed — both sides approve it again.")
      : !act((s, p) => decline(s, p, item.id, text), "Declined.");
    if (ok) setMode(null);
  };

  return (
    <article id={`item-${item.id}`} aria-labelledby={`t-${item.id}`} className="scroll-mt-6 rounded-3xl border bg-card p-5 shadow-xs md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusTag status={status} />
        {amendment && <span className="text-xs text-muted-foreground">Change to approved terms</span>}
        <span className="ml-auto flex items-center gap-1" aria-label={`Approved by ${approved.map((s) => SIDES[s].label).join(" and ") || "nobody yet"}`}>
          {(["A", "B"] as const).map((s) => (
            <span
              key={s}
              title={`${SIDES[s].label}: ${approved.includes(s) || item.status === "committed" ? "approved" : "not yet"}`}
              className="flex size-6 items-center justify-center rounded-full border text-white"
              style={approved.includes(s) || item.status === "committed" ? { backgroundColor: SIDES[s].color, borderColor: SIDES[s].color } : { borderColor: SIDES[s].color }}
            >
              {(approved.includes(s) || item.status === "committed") && <Check className="size-3.5" />}
            </span>
          ))}
        </span>
      </div>

      <h3 id={`t-${item.id}`} className="mt-3 font-serif text-xl leading-snug font-medium">{item.title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{currentVersion(item).wording}</p>
      {amendment && <p className="mt-2 text-xs text-muted-foreground">Currently agreed: {inForceVersion(item)!.wording}</p>}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
          <UserRound className="size-3.5 text-muted-foreground" />
          {owner.side && <span className="size-2 rounded-full" style={{ backgroundColor: SIDES[owner.side].color }} />}
          {owner.name ?? (owner.side ? SIDES[owner.side].label : "Owner not set")}
          {owner.name && owner.side && <span className="text-muted-foreground">· {SIDES[owner.side].label}</span>}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1", due?.overdue && !closed ? "bg-destructive/10 text-destructive" : "bg-muted")}>
          <CalendarDays className="size-3.5 opacity-70" />
          {when.date ? <>{fmtDate(when.date)}{!closed && <span className="opacity-70">· {due!.label}</span>}</> : when.text ? `“${when.text}” — no date yet` : "No deadline"}
        </span>
      </div>

      <p className="mt-4 text-sm">{standing(state, item, persona)}</p>
      {hint && <p className="mt-2 flex gap-2 text-xs text-muted-foreground"><Lightbulb className="mt-0.5 size-3.5 shrink-0" /> Worth checking: {hint}</p>}

      {questions.map((q) => (
        <Question key={q.id} id={q.id} question={q.question} mine={q.toSide === me.side} toLabel={q.toName ?? SIDES[q.toSide].label} options={q.meanings} />
      ))}

      {!closed && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {showApprove && (
            <Button
              className="rounded-full px-5"
              disabled={!!blocker}
              onClick={() => act((s, p) => sign(s, p, item.id), `Approved for ${SIDES[me.side].label}.`)}
            >
              {approved.includes(me.side) ? <><Check /> Approved</> : <><ThumbsUp /> Approve</>}
            </Button>
          )}
          <Button variant="outline" className="rounded-full px-5" onClick={() => openPushback("question")} aria-expanded={mode !== null}>
            <Undo2 /> Push back
          </Button>
          {showApprove && reason && !approved.includes(me.side) && <span className="text-xs text-muted-foreground">{reason}</span>}
        </div>
      )}
      {item.status === "committed" && (
        <Button variant="ghost" size="sm" className="mt-3 -ml-2 rounded-full text-muted-foreground" onClick={() => openPushback("change")}>
          Suggest a change
        </Button>
      )}

      {mode && (
        <form
          className="mt-4 flex flex-col gap-3 rounded-2xl bg-muted/60 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitPushback();
          }}
        >
          {item.status !== "committed" && (
            <div role="radiogroup" aria-label="How do you want to push back?" className="flex flex-wrap gap-1.5">
              {([["question", "Ask a question"], ["change", "Suggest new wording"], ...(me.canSign ? [["decline", "Decline"] as const] : [])] as [Mode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => openPushback(m)}
                  className={cn("rounded-full border px-3 py-1 text-sm", mode === m ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={mode === "change" ? 3 : 2}
            autoFocus
            aria-label={mode === "question" ? "Your question" : mode === "change" ? "New wording" : "Reason for declining"}
            placeholder={mode === "question" ? "What needs to be clarified before you can approve?" : mode === "decline" ? "Why can't your side agree to this?" : ""}
          />
          <p className="text-xs text-muted-foreground">
            {mode === "question" && "The other side answers on this card. Nobody can approve until they do."}
            {mode === "change" && (item.status === "committed" ? "The approved version stays in force until both sides approve the change." : "Both sides approve the new wording; earlier approvals no longer count.")}
            {mode === "decline" && "Declining closes this item. It stays in the record."}
          </p>
          <div className="flex gap-2">
            <Button type="submit" className="rounded-full" variant={mode === "decline" ? "destructive" : "default"} disabled={mode !== "decline" && !text.trim()}>
              {mode === "question" ? "Send question" : mode === "change" ? "Propose change" : "Decline"}
            </Button>
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </form>
      )}
    </article>
  );
}

function Question({ id, question, mine, toLabel, options }: { id: string; question: string; mine: boolean; toLabel: string; options: string[] }) {
  const { act } = useDemo();
  const [answer, setAnswer] = useState("");
  return (
    <div className={cn("mt-4 rounded-2xl p-4", mine ? "bg-warning/12 ring-1 ring-warning/40" : "bg-muted/60")}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MessageCircleQuestion className="size-3.5" /> {mine ? "Question for your side" : `Waiting on ${toLabel}`}
      </p>
      <p className="mt-1 text-sm">{question}</p>
      {mine && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!act((s, p) => answerClarification(s, p, id, answer), "Answered — this can be approved now.")) setAnswer("");
          }}
        >
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => (
                <button key={o} type="button" onClick={() => setAnswer(o)} className="rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-accent">{o}</button>
              ))}
            </div>
          )}
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder="Your answer" aria-label="Your answer" />
          <Button type="submit" size="sm" className="w-fit rounded-full" disabled={!answer.trim()}>Send answer</Button>
        </form>
      )}
    </div>
  );
}
