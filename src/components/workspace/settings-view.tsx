"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, CircleDashed, Mic, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/demo/demo-provider";
import { DEMO_PEOPLE, SIDES } from "@/lib/demo/people";
import { cn } from "@/lib/utils";
import type { PersonaKey } from "@/lib/demo/types";

interface Status { mode: string; claude: boolean; transcription: boolean }

export function SettingsView() {
  const { persona, setPersona, reset, state } = useDemo();
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
      <h1 className="font-serif text-4xl font-medium tracking-tight">Settings</h1>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="font-semibold">You are viewing as</h2>
        <p className="text-sm text-muted-foreground">Each side sees shared records plus its own private goals, notes and expectations.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(DEMO_PEOPLE) as PersonaKey[]).map((key) => {
            const p = DEMO_PEOPLE[key];
            const side = SIDES[p.side];
            return (
              <button
                key={key}
                onClick={() => setPersona(key)}
                aria-pressed={persona === key}
                className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors", persona === key ? "ring-2" : "hover:bg-accent")}
                style={persona === key ? { backgroundColor: `color-mix(in oklch, ${side.color} 10%, var(--card))`, ["--tw-ring-color" as string]: side.color } : undefined}
              >
                <Avatar name={p.name} color={side.color} className="size-10" />
                <span>
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.title}, {side.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="font-semibold">AI and transcription</h2>
        <ul className="mt-4 flex flex-col gap-3 text-sm">
          <Row icon={Bot} on={status?.claude} label="Claude notes and ambiguity scan"
            onText="Live — notes by claude-opus-5-5, ambiguity scan by claude-sonnet-5."
            offText="No ANTHROPIC_API_KEY — the sample uses pre-generated notes and flags; pasted transcripts get basic notes." />
          <Row icon={Mic} on={status?.transcription} label="Audio transcription"
            onText="Live — uploads are transcribed with speaker separation (Deepgram)."
            offText="No DEEPGRAM_API_KEY — paste a transcript or use the sample meeting instead." />
        </ul>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="font-semibold">Demo data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Demo mode runs entirely in this browser: {state.library.length} meetings, {state.items.length} tracked items and every
          sign-off are saved on this device only. Set <code>ACCORD_MODE=live</code> to use the real backend.
        </p>
        <Button
          variant="outline"
          className="mt-4 rounded-full"
          onClick={() => {
            if (window.confirm("Reset the demo? Meetings you created, sign-offs and notes in this browser will be cleared.")) reset();
          }}
        >
          <RotateCcw /> Reset demo data
        </Button>
      </section>
    </div>
  );
}

function Row({ icon: Icon, on, label, onText, offText }: {
  icon: typeof Bot; on: boolean | undefined; label: string; onText: string; offText: string;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <p className="flex items-center gap-2 font-medium">
          {label}
          {on === undefined ? null : on ? <CheckCircle2 className="size-4 text-success" /> : <CircleDashed className="size-4 text-muted-foreground" />}
        </p>
        <p className="text-muted-foreground">{on === undefined ? "Checking…" : on ? onText : offText}</p>
      </div>
    </li>
  );
}
