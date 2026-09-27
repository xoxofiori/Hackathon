"use client";

import { CalendarDays, CircleCheck, Info, ListTodo, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/demo/demo-provider";
import { setIntegration } from "@/lib/demo/engine";
import { fmtDateTime } from "@/lib/utils";
import type { IntegrationKey } from "@/lib/demo/types";

export const INTEGRATIONS: { key: IntegrationKey; name: string; color: string; icon: typeof CalendarDays; body: string }[] = [
  {
    key: "google_calendar", name: "Google Calendar", color: "#0369a1", icon: CalendarDays,
    body: "Bring upcoming partner meetings into Home, and add approved deadlines to your calendar.",
  },
  {
    key: "linear", name: "Linear", color: "#7c3aed", icon: ListTodo,
    body: "Send approved commitments to Linear as issues, with the owner and due date.",
  },
  {
    key: "notion", name: "Notion", color: "#475569", icon: NotebookPen,
    body: "Publish meeting notes, decisions and action items to a Notion page.",
  },
];

export function IntegrationsView() {
  const { state, act } = useDemo();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-serif text-4xl font-medium tracking-tight">Integrations</h1>
        <p className="mt-1 text-muted-foreground">Connect the tools your team already uses.</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" /> Demo only — connecting doesn&apos;t sign in to or call any real service.
        </p>
      </header>
      <ul className="grid gap-4 md:grid-cols-3">
        {INTEGRATIONS.map(({ key, name, color, icon: Icon, body }) => {
          const s = state.integrations[key];
          return (
            <li key={key} className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-xs" aria-label={name}>
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `color-mix(in oklch, ${color} 14%, var(--card))`, color }}>
                  <Icon className="size-6" />
                </span>
                <h2 className="font-serif text-xl font-medium">{name}</h2>
              </div>
              <p className="flex-1 text-sm text-muted-foreground">{body}</p>
              {s.connected ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-success">
                    <CircleCheck className="size-4" /> Connected
                  </span>
                  <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => act((st, p) => setIntegration(st, p, key, false), `${name} disconnected.`)}>
                    Disconnect
                  </Button>
                  {s.connectedAt && <p className="w-full text-xs text-muted-foreground">Since {fmtDateTime(s.connectedAt)}</p>}
                </div>
              ) : (
                <Button className="w-fit rounded-full px-6" onClick={() => act((st, p) => setIntegration(st, p, key, true), `${name} connected.`)}>
                  Connect
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
