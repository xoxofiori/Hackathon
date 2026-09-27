"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/demo/demo-provider";
import { sendToLinear, setIntegration } from "@/lib/demo/engine";

/** On approved commitments: create a Linear issue (demo only — no real API call). */
export function SendToLinear({ itemId }: { itemId: string }) {
  const { state, act } = useDemo();
  const [askConnect, setAskConnect] = useState(false);
  const issue = state.linearIssues[itemId];

  if (issue) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-success" role="status">
        <CircleCheck className="size-4" /> Issue created · {issue.key}
      </span>
    );
  }
  const send = () => {
    if (!state.integrations.linear.connected) {
      setAskConnect(true);
      return;
    }
    act((s, p) => sendToLinear(s, p, itemId), "Issue created.");
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="rounded-full" onClick={send}>
        <ListTodo /> Send to Linear
      </Button>
      {askConnect && (
        <span className="inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Linear isn&apos;t connected yet.
          <Button
            size="sm"
            className="h-7 rounded-full"
            onClick={() => act((s, p) => sendToLinear(setIntegration(s, p, "linear", true), p, itemId), "Linear connected. Issue created.")}
          >
            Connect & send
          </Button>
          <Link href="/integrations" className="underline-offset-4 hover:text-foreground hover:underline">Integrations</Link>
        </span>
      )}
    </span>
  );
}
