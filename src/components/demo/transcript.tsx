"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dismissFlag, itemForFlag, raiseFlag } from "@/lib/demo/engine";
import { CATEGORY_LABEL } from "@/lib/demo/labels";
import { PEOPLE, SIDES } from "@/lib/demo/people";
import { cn } from "@/lib/utils";
import { useDemo } from "./demo-provider";
import type { AmbiguityFlagView, ScanResult } from "@/lib/demo/types";

const fmtMs = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

export function Transcript() {
  const { state, ready, setState } = useDemo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const segments = state.segments.filter((s) => s.meeting === "m3");
  const flags = state.scan?.flags ?? [];

  const runScan = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/demo/analyze${fresh ? "?fresh=1" : ""}`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const scan = (await res.json()) as ScanResult;
      setState((s) => ({ ...s, scan }));
    } catch {
      setError("Couldn't run the ambiguity scan. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [setState]);

  // First visit: scan automatically (live with an API key, pre-generated flags without).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a fetch once storage has loaded
    if (ready && !state.scan && !loading) void runScan();
  }, [ready, state.scan, loading, runScan]);

  return (
    <section aria-labelledby="transcript-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="transcript-title" className="font-medium">Transcript</h2>
        {state.scan && (
          <Badge variant={state.scan.source === "claude" ? "success" : "secondary"} title={state.scan.notice ?? undefined}>
            <Sparkles /> {state.scan.source === "claude" ? `Live scan · ${state.scan.model}` : "Pre-generated flags"}
          </Badge>
        )}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => runScan(true)} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} {loading ? "Scanning…" : "Re-scan"}
        </Button>
      </div>
      {state.scan?.notice && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{state.scan.notice}</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <ol className="flex flex-col gap-1">
        {segments.map((s) => {
          const person = PEOPLE[s.speaker]!;
          const flag = flags.find((f) => f.segmentIndex === s.index);
          return (
            <li key={s.id} id={`seg-${s.id}`} className={cn("rounded-lg px-3 py-2", flag && !state.dismissedFlags.includes(flag.id) && "bg-warning/10")}>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-medium" style={{ color: SIDES[person.side].color }}>{person.name}</span>
                <span className="text-muted-foreground">{SIDES[person.side].label}</span>
                <span className="ml-auto font-mono text-muted-foreground">{fmtMs(s.startMs)}</span>
              </div>
              <p className="mt-0.5 text-sm">{s.text}</p>
              {flag && <FlagCard flag={flag} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function FlagCard({ flag }: { flag: AmbiguityFlagView }) {
  const { state, act } = useDemo();
  const dismissed = state.dismissedFlags.includes(flag.id);
  const raised = state.clarifications.find((c) => c.flagId === flag.id);
  const item = itemForFlag(state, flag);
  const alreadyOpen = !raised && item ? state.clarifications.find((c) => c.itemId === item.id && c.status === "open" && c.category === flag.category) : null;
  if (dismissed) {
    return <p className="mt-1 text-xs text-muted-foreground">Flag dismissed as not an issue.</p>;
  }
  return (
    <div className="mt-2 rounded-lg border border-warning/40 bg-card p-3 text-xs">
      <p className="flex flex-wrap items-center gap-1.5">
        <AlertTriangle className="size-3.5 text-warning" />
        <span className="font-medium">{CATEGORY_LABEL[flag.category]}</span>
        <span className="text-muted-foreground">· confidence {Math.round(flag.confidence * 100)}%</span>
      </p>
      <p className="mt-1.5">{flag.note}</p>
      {flag.mayMean.length > 0 && (
        <ul className="mt-1.5 list-disc pl-4 text-muted-foreground">
          {flag.mayMean.map((m) => <li key={m}>May mean: {m}</li>)}
        </ul>
      )}
      <p className="mt-2 italic">“{flag.question}”</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {raised ? (
          <Badge variant={raised.status === "open" ? "warning" : "success"}>{raised.status === "open" ? "In the clarification queue" : "Answered"}</Badge>
        ) : alreadyOpen ? (
          <Badge variant="warning">Already in the queue</Badge>
        ) : item && (item.status === "committed" || item.status === "declined") ? (
          <Badge variant="muted">“{item.title}” is {item.status}</Badge>
        ) : (
          <>
            <Button size="sm" onClick={() => act((s, p) => raiseFlag(s, p, flag), "Added to the clarification queue.")}>
              Ask {SIDES[flag.askSide].label}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => act((s, p) => dismissFlag(s, p, flag.id))}>Not an issue</Button>
          </>
        )}
        {item && <a href={`#item-${item.id}`} className="text-muted-foreground underline-offset-4 hover:underline">About: {item.title}</a>}
      </div>
    </div>
  );
}
