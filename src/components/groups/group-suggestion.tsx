"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/demo/demo-provider";
import { assignGroup, createGroup } from "@/lib/meetings/groups";
import { GroupPicker } from "./group-picker";
import { GroupTag } from "./group-tag";
import type { MeetingRecord } from "@/lib/meetings/types";

/** "This looks like it belongs in…" — accept, pick another group, or create the suggested one in one click. */
export function GroupSuggestionBanner({ meeting }: { meeting: MeetingRecord }) {
  const { state, setState } = useDemo();
  const s = meeting.groupSuggestion;
  if (!s || meeting.groupId) return null;
  const group = s.groupId ? state.groups.find((g) => g.id === s.groupId) : null;
  const newName = group ? null : s.newName;
  if (!group && !newName) return null;

  const accept = () =>
    setState((st) => {
      if (group) return assignGroup(st, meeting.id, group.id);
      const r = createGroup(st, newName!, { keywords: s.terms.map((t) => t.toLowerCase()) });
      return assignGroup(r.state, meeting.id, r.group.id);
    });

  return (
    <div role="region" aria-label="Suggested group" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border bg-background px-4 py-3">
      <Sparkles className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground">{group ? "Suggested group" : "Suggested new group"}</span>
          {group ? <GroupTag group={group} /> : <span className="font-medium">“{newName}”</span>}
          <span className="text-xs text-muted-foreground">
            · {s.source === "claude" ? "by Claude" : s.source === "preset" ? "pre-set" : "from keywords"}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{s.reason}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="rounded-full" onClick={accept}>
          {group ? `Add to ${group.name}` : `Create “${newName}”`}
        </Button>
        <GroupPicker meeting={meeting} trigger="button" />
      </div>
    </div>
  );
}
