"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, FolderPlus, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/components/demo/demo-provider";
import { assignGroup, createGroup } from "@/lib/meetings/groups";
import { cn } from "@/lib/utils";
import { GroupTag } from "./group-tag";
import type { MeetingRecord } from "@/lib/meetings/types";

/** Change a meeting's group: pick one, create one, or remove it from its group. */
export function GroupPicker({ meeting, trigger }: { meeting: MeetingRecord; trigger?: "tag" | "button" }) {
  const { state, setState } = useDemo();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const current = state.groups.find((g) => g.id === meeting.groupId) ?? null;

  const pick = (groupId: string | null) => {
    setState((s) => assignGroup(s, meeting.id, groupId));
    setOpen(false);
  };
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setState((s) => {
      const r = createGroup(s, name, { keywords: meeting.groupSuggestion?.terms.map((t) => t.toLowerCase()) });
      return assignGroup(r.state, meeting.id, r.group.id);
    });
    setName("");
    setCreating(false);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreating(false); }}>
      <Popover.Trigger asChild>
        {trigger === "button" || !current ? (
          <button className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={current ? `Group: ${current.name}. Change group` : "Choose a group"}>
            <FolderPlus className="size-3.5" /> {current ? "Change group" : "Choose a group"}
          </button>
        ) : (
          <button className="inline-flex items-center gap-1 rounded-full hover:opacity-80" aria-label={`Group: ${current.name}. Change group`}>
            <GroupTag group={current} className="py-1 text-sm" /> <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-50 w-64 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg">
          <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">Move to group</p>
          <ul role="listbox" aria-label="Groups" className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {state.groups.map((g) => (
              <li key={g.id}>
                <button
                  role="option"
                  aria-selected={g.id === meeting.groupId}
                  onClick={() => pick(g.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="flex-1 truncate">{g.name}</span>
                  {g.id === meeting.groupId && <Check className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t pt-1">
            {creating ? (
              <form onSubmit={create} className="flex items-center gap-1.5 p-1">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" autoFocus className="h-8" aria-label="New group name" />
                <button type="submit" disabled={!name.trim()} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30" aria-label="Create group">
                  <Check className="size-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setCreating(true);
                  setName(meeting.groupSuggestion?.newName ?? "");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Plus className="size-4" /> New group
              </button>
            )}
            {current && (
              <button onClick={() => pick(null)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent")}>
                <X className="size-4 shrink-0" /> Remove from {current.name}
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
