"use client";

import { useState } from "react";
import { Check, ChevronDown, FileSignature, History, MessageCircleQuestion, PenLine, Quote, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  askClarification, currentVersion, decline, inForceVersion, openClarifications, proposeChanges, sign, signBlocker,
} from "@/lib/demo/engine";
import { KIND_LABEL, STATUS_LABEL, STATUS_VARIANT } from "@/lib/demo/labels";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";
import { useDemo } from "./demo-provider";
import type { DemoItem, SideKey } from "@/lib/demo/types";

const STEPS = ["Proposed", "Clarified", "Signed by Wildframe", "Signed by Aurel", "Committed"] as const;

/** Where the current version is in Proposed → Clarified → Signed A → Signed B → Committed. */
function stepState(item: DemoItem) {
  const v = currentVersion(item);
  const signed = (s: SideKey) => item.signatures.some((x) => x.version === v.version && x.side === s);
  return [
    true,
    item.status !== "needs_clarification" && item.status !== "proposed",
    signed("A"),
    signed("B"),
    item.status === "committed",
  ];
}

export function StatusSteps({ item }: { item: DemoItem }) {
  if (item.status === "declined") return null;
  const done = stepState(item);
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px]" aria-label="Sign-off progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-1">
          {i > 0 && <span className="h-px w-3 bg-border" />}
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5", done[i] ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground")}>
            {done[i] && <Check className="size-3" />} {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ItemCard({ item, compact = false }: { item: DemoItem; compact?: boolean }) {
  const { state, persona, act } = useDemo();
  const me = DEMO_PEOPLE[persona];
  const [mode, setMode] = useState<null | "ask" | "change" | "decline">(null);
  const [showHistory, setShowHistory] = useState(false);
  const v = currentVersion(item);
  const inForce = inForceVersion(item);
  const open = openClarifications(state, item.id);
  const blocker = signBlocker(state, persona, item);
  const quotes = item.segmentIds.map((id) => state.segments.find((s) => s.id === id)).filter(Boolean).slice(0, 3);
  const actionable = item.status !== "declined" && v.status === "draft";
  const mySideSigned = item.signatures.some((s) => s.version === v.version && s.side === me.side);

  return (
    <article
      id={`item-${item.id}`}
      className={cn("rounded-xl border bg-card p-4 shadow-xs", item.status === "needs_clarification" && "border-warning/50")}
      aria-labelledby={`item-title-${item.id}`}
    >
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{KIND_LABEL[item.kind]}</Badge>
            <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
            {v.amendsVersion && v.status === "draft" && <Badge variant="warning">Amendment to v{v.amendsVersion}</Badge>}
            <span className="text-xs text-muted-foreground">
              from {state.meetings.find((m) => m.key === item.meeting)?.title}
            </span>
          </div>
          <h3 id={`item-title-${item.id}`} className="mt-1.5 font-medium">{item.title}</h3>
        </div>
      </header>

      {inForce && v.status === "draft" && (
        <div className="mt-3 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-success"><ShieldCheck className="size-3.5" /> In force: v{inForce.version}</p>
          <p className="mt-1">{inForce.wording}</p>
        </div>
      )}

      <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{v.status === "in_force" ? "Signed wording" : inForce ? "Proposed amendment" : "Proposed wording"} · v{v.version}</span>
          <span title="Content hash of the exact wording each side signs">#{v.hash.slice(0, 8)}</span>
          {v.createdBy && <span>by {v.createdBy}</span>}
        </p>
        <p className="mt-1">{v.wording}</p>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {v.ownerSide && <div><dt className="inline">Owner: </dt><dd className="inline text-foreground">{v.ownerName ? `${v.ownerName}, ` : ""}{SIDES[v.ownerSide].label}</dd></div>}
          {(v.due || v.dueText) && (
            <div>
              <dt className="inline">Due: </dt>
              <dd className="inline text-foreground">{v.due ? fmtDate(v.due) : "—"}{v.dueText && <span className="text-muted-foreground"> (“{v.dueText}”)</span>}{v.strength && ` · ${v.strength}`}</dd>
            </div>
          )}
          {v.amount && <div><dt className="inline">Amount: </dt><dd className="inline text-foreground">{v.currency} {v.amount.toLocaleString("en-GB")}</dd></div>}
        </dl>
      </div>

      {!compact && <div className="mt-3"><StatusSteps item={item} /></div>}

      {item.flags.length > 0 && !compact && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {item.flags.map((f, i) => (
            <li key={i} className="flex gap-2 text-xs"><MessageCircleQuestion className="mt-0.5 size-3.5 shrink-0 text-warning" /><span>{f.note}</span></li>
          ))}
        </ul>
      )}

      {!compact && (
        <details className="group mt-3 text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /> Why the AI flagged this · confidence {Math.round(item.confidence * 100)}%
          </summary>
          <p className="mt-2">{item.rationale}</p>
          {item.interpretations.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {item.interpretations.map((m) => <li key={m.meaning}>May mean: {m.meaning}</li>)}
            </ul>
          )}
          <ul className="mt-2 flex flex-col gap-1.5">
            {quotes.map((s) => (
              <li key={s!.id} className="flex gap-2">
                <Quote className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                <span><span className="font-medium">{DEMO_NAME[s!.speaker] ?? s!.speaker}:</span> “{s!.text}”</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {open.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
          <MessageCircleQuestion className="size-3.5" /> {open.length} open clarification{open.length > 1 ? "s" : ""} — answer {open.length > 1 ? "them" : "it"} in the queue before anyone can sign.
        </p>
      )}
      {item.status === "declined" && item.declinedReason && (
        <p className="mt-3 text-xs text-destructive">Declined: {item.declinedReason}</p>
      )}

      {actionable && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={!!blocker}
            title={blocker ?? undefined}
            onClick={() => act((s, p) => sign(s, p, item.id), `Signed for ${SIDES[me.side].label}.`)}
          >
            <FileSignature /> {mySideSigned ? "Signed" : `Sign for ${SIDES[me.side].label}`}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode(mode === "ask" ? null : "ask")} aria-expanded={mode === "ask"}>
            <MessageCircleQuestion /> Ask a question
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode(mode === "change" ? null : "change")} aria-expanded={mode === "change"}>
            <PenLine /> Propose changes
          </Button>
          {me.canSign && !inForce && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setMode(mode === "decline" ? null : "decline")} aria-expanded={mode === "decline"}>
              <X /> Decline
            </Button>
          )}
          {blocker && !mySideSigned && <span className="text-xs text-muted-foreground">{blocker}</span>}
        </div>
      )}
      {!actionable && item.status === "committed" && (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={() => setMode(mode === "change" ? null : "change")}>
            <PenLine /> Propose an amendment
          </Button>
        </div>
      )}

      {mode === "ask" && (
        <PushbackForm
          label={`Question for ${SIDES[me.side === "A" ? "B" : "A"].label}`}
          placeholder="e.g. Can the prototypes arrive a week earlier?"
          submit="Send question"
          onCancel={() => setMode(null)}
          onSubmit={(text) => !act((s, p) => askClarification(s, p, item.id, text), "Question added to the clarification queue.") && setMode(null)}
        />
      )}
      {mode === "decline" && (
        <PushbackForm
          label="Reason (shared with the other side)"
          placeholder="e.g. Out of scope for Season 3."
          submit="Decline"
          destructive
          onCancel={() => setMode(null)}
          onSubmit={(text) => !act((s, p) => decline(s, p, item.id, text), "Item declined.") && setMode(null)}
        />
      )}
      {mode === "change" && (
        <ChangeForm
          initialWording={v.wording}
          initialDue={v.due}
          amending={!!inForce}
          onCancel={() => setMode(null)}
          onSubmit={(wording, due) =>
            !act((s, p) => proposeChanges(s, p, item.id, { wording, due, dueText: due ? null : v.dueText }), inForce ? "Amendment proposed — both sides need to sign it." : "New wording proposed — both sides need to sign it.") && setMode(null)
          }
        />
      )}

      {item.versions.length > 1 || item.signatures.length > 0 ? (
        <div className="mt-3">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory}>
            <History className="size-3.5" /> {showHistory ? "Hide" : "Show"} versions and signatures
          </button>
          {showHistory && (
            <ol className="mt-2 flex flex-col gap-2 border-l pl-3 text-xs">
              {[...item.versions].reverse().map((ver) => (
                <li key={ver.version}>
                  <p className="font-medium">
                    v{ver.version} · {ver.status === "in_force" ? "in force" : ver.status === "void" ? "replaced before signing" : ver.status}
                    <span className="font-normal text-muted-foreground"> · #{ver.hash.slice(0, 8)} · {fmtDateTime(ver.createdAt)}</span>
                  </p>
                  <p className={cn("text-muted-foreground", ver.status === "void" && "line-through")}>{ver.wording}</p>
                  {item.signatures.filter((s) => s.version === ver.version).map((s) => (
                    <p key={s.side} className="text-success">✓ Signed by {s.byName} for {SIDES[s.side].label} · {fmtDateTime(s.at)}</p>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </article>
  );
}

const DEMO_NAME: Record<string, string> = {
  maya: "Maya", jordan: "Jordan", priya: "Priya", luca: "Luca", sophie: "Sophie", hiroshi: "Hiroshi",
};

function PushbackForm({ label, placeholder, submit, destructive, onSubmit, onCancel }: {
  label: string; placeholder: string; submit: string; destructive?: boolean; onSubmit: (text: string) => void; onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-3 flex flex-col gap-2 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(text);
      }}
    >
      <Label className="text-xs">{label}</Label>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={2} autoFocus />
      <div className="flex gap-2">
        <Button size="sm" type="submit" variant={destructive ? "destructive" : "default"} disabled={!text.trim() && !destructive}>{submit}</Button>
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ChangeForm({ initialWording, initialDue, amending, onSubmit, onCancel }: {
  initialWording: string; initialDue: string | null; amending: boolean; onSubmit: (wording: string, due: string | null) => void; onCancel: () => void;
}) {
  const [wording, setWording] = useState(initialWording);
  const [due, setDue] = useState(initialDue ?? "");
  return (
    <form
      className="mt-3 flex flex-col gap-2 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(wording, due || null);
      }}
    >
      <p className="text-xs text-muted-foreground">
        {amending
          ? "The signed version stays in force until both sides sign this amendment."
          : "This creates a new version. Any signature on the current version no longer counts — both sides sign the new wording."}
      </p>
      <Label className="text-xs" htmlFor="wording">New wording</Label>
      <Textarea id="wording" value={wording} onChange={(e) => setWording(e.target.value)} rows={3} autoFocus />
      <Label className="text-xs" htmlFor="due">Due date (optional)</Label>
      <Input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-44" />
      <div className="flex gap-2">
        <Button size="sm" type="submit">{amending ? "Propose amendment" : "Propose new wording"}</Button>
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
