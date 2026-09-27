"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/components/demo/demo-provider";
import { MeetingCard } from "./meeting-bits";
import { GroupFilter, groupCounts, type GroupFilterValue } from "@/components/groups/group-tag";

export function MeetingsList() {
  const { state } = useDemo();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<GroupFilterValue>("all");
  const all = [...state.library];
  const list = all
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter((m) => filter === "all" || (filter === "unsorted" ? !m.groupId : m.groupId === filter))
    .filter((m) => `${m.title} ${m.notes.summaryLine} ${m.participants.map((p) => p.name).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Meetings</h1>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/meetings/new"><Plus /> New Meeting</Link>
        </Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meetings, people or summaries" className="h-10 rounded-full pl-9" aria-label="Search meetings" />
      </div>
      <GroupFilter groups={state.groups} counts={groupCounts(all)} value={filter} onChange={setFilter} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((m) => <MeetingCard key={m.id} m={m} group={state.groups.find((g) => g.id === m.groupId) ?? null} />)}
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No meetings match{q ? ` “${q}”` : " this filter"}.</p>}
    </div>
  );
}
