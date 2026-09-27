"use client";

import { cn } from "@/lib/utils";
import type { MeetingGroup } from "@/lib/meetings/types";

export function GroupTag({ group, className }: { group: MeetingGroup | null | undefined; className?: string }) {
  if (!group) {
    return <span className={cn("inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground", className)}>Unsorted</span>;
  }
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={{ backgroundColor: `color-mix(in oklch, ${group.color} 14%, var(--card))`, color: `color-mix(in oklch, ${group.color} 80%, var(--foreground))` }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
      <span className="truncate">{group.name}</span>
    </span>
  );
}

export type GroupFilterValue = "all" | "unsorted" | string;

/** Filter chips: All · each group · Unsorted, with meeting counts. */
export function GroupFilter({ groups, counts, value, onChange }: {
  groups: MeetingGroup[]; counts: Map<string, number>; value: GroupFilterValue; onChange: (v: GroupFilterValue) => void;
}) {
  const chip = (key: GroupFilterValue, label: string, color: string | null, n: number) => {
    const on = value === key;
    return (
      <button
        key={key}
        onClick={() => onChange(key)}
        aria-pressed={on}
        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
      >
        {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
        {label} <span className={on ? "opacity-70" : "text-muted-foreground"}>{n}</span>
      </button>
    );
  };
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return (
    <div role="group" aria-label="Filter meetings by group" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {chip("all", "All", null, total)}
      {groups.map((g) => chip(g.id, g.name, g.color, counts.get(g.id) ?? 0))}
      {(counts.get("unsorted") ?? 0) > 0 && chip("unsorted", "Unsorted", null, counts.get("unsorted") ?? 0)}
    </div>
  );
}

export function groupCounts(meetings: { groupId: string | null }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of meetings) m.set(x.groupId ?? "unsorted", (m.get(x.groupId ?? "unsorted") ?? 0) + 1);
  return m;
}
