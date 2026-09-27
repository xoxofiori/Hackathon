/**
 * Meeting groups: sample groups, management actions, the per-group summary,
 * and the rule-based suggester used when no Claude API key is configured.
 */
import { approvalStatus } from "@/lib/demo/approvals";
import { currentVersion } from "@/lib/demo/engine";
import type { DemoState } from "@/lib/demo/types";
import type { GroupSuggestion, MeetingGroup, MeetingRecord, TranscriptLine } from "./types";

/** Group colors, all from the app palette. */
export const GROUP_COLORS = ["#b45309", "#7c3aed", "#0369a1", "#0f766e", "#be123c", "#4d7c0f", "#475569"] as const;

export function sampleGroups(now: Date): MeetingGroup[] {
  const at = now.toISOString();
  return [
    {
      id: "g-aurel", name: "Aurel sponsorship", color: "#b45309", createdAt: at,
      description: "Season 3 presenting sponsorship with Aurel Watches.",
      keywords: ["aurel", "sponsorship", "sponsor", "vignette", "vignettes", "watch", "watches", "prototypes", "premiere", "geneva", "final cut", "luca", "sophie", "hiroshi"],
    },
    {
      id: "g-post", name: "Season 3 post-production", color: "#7c3aed", createdAt: at,
      description: "LA × London post-production: locked cuts, grading and music.",
      keywords: ["london", "colour grade", "color grade", "grade", "graded", "locked cut", "locked cuts", "lut", "post budget", "post-production", "music licence", "music licensing", "olivia", "tom"],
    },
    {
      id: "g-dist", name: "Streaming & distribution", color: "#0369a1", createdAt: at,
      description: "Streaming, licensing and distribution deals.",
      keywords: ["northlight", "streaming", "streaming rights", "territories", "window", "avails", "rate card", "library titles", "term sheet", "licensed", "distribution"],
    },
  ];
}

// ------------------------------------------------------------------ actions

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "group";

export function createGroup(state: DemoState, name: string, opts: { color?: string; keywords?: string[]; id?: string } = {}): { state: DemoState; group: MeetingGroup } {
  const clean = name.trim() || "New group";
  const existing = state.groups.find((g) => g.name.toLowerCase() === clean.toLowerCase());
  if (existing) return { state, group: existing };
  const group: MeetingGroup = {
    id: opts.id ?? `g-${slug(clean)}-${state.groups.length}`,
    name: clean,
    color: opts.color ?? GROUP_COLORS[state.groups.length % GROUP_COLORS.length],
    description: null,
    keywords: [...new Set([...clean.toLowerCase().split(/\s+/).filter((w) => w.length > 3), ...(opts.keywords ?? [])])],
    createdAt: new Date().toISOString(),
  };
  return { state: { ...state, groups: [...state.groups, group] }, group };
}

const updateGroup = (state: DemoState, id: string, patch: Partial<MeetingGroup>): DemoState => ({
  ...state,
  groups: state.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
});

export const renameGroup = (state: DemoState, id: string, name: string) => (name.trim() ? updateGroup(state, id, { name: name.trim() }) : state);
export const recolorGroup = (state: DemoState, id: string, color: string) => updateGroup(state, id, { color });

/** Deleting a group keeps its meetings; they become unsorted. */
export const deleteGroup = (state: DemoState, id: string): DemoState => ({
  ...state,
  groups: state.groups.filter((g) => g.id !== id),
  library: state.library.map((m) => (m.groupId === id ? { ...m, groupId: null } : m)),
});

/** Put a meeting in a group (or none). The group learns the meeting's identifying terms. */
export function assignGroup(state: DemoState, meetingId: string, groupId: string | null): DemoState {
  const meeting = state.library.find((m) => m.id === meetingId);
  if (!meeting) return state;
  const terms = meeting.groupSuggestion?.terms ?? [];
  return {
    ...state,
    library: state.library.map((m) => (m.id === meetingId ? { ...m, groupId, groupSuggestion: null } : m)),
    groups: groupId
      ? state.groups.map((g) => (g.id === groupId ? { ...g, keywords: [...new Set([...g.keywords, ...terms.map((t) => t.toLowerCase())])] } : g))
      : state.groups,
  };
}

// ------------------------------------------------------------------ summary

export interface GroupSummaryItem {
  title: string;
  owner: string | null;
  due: string | null;
  status: "Pending" | "Pushed back" | "Open";
  href: string;
}

export interface GroupSummary {
  meetings: MeetingRecord[];
  openCommitments: GroupSummaryItem[];
  upcoming: GroupSummaryItem[];
  lastMet: string | null;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Open commitments: tracked items from the group's meetings that aren't approved or
 * declined, plus action items from meetings that have no tracked items.
 * Upcoming deadlines: every dated open item, soonest first.
 */
export function groupSummary(state: DemoState, groupId: string | null, today: string): GroupSummary {
  const meetings = state.library.filter((m) => m.groupId === groupId).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const ids = new Set(meetings.map((m) => m.id));
  const open: GroupSummaryItem[] = [];
  const tracked = state.items.filter((i) => ids.has(i.meeting) && i.status !== "committed" && i.status !== "declined");
  for (const i of tracked) {
    if (["concern_or_risk", "positive_feedback", "negative_feedback", "decision"].includes(i.kind) || i.id === "onscreen" || i.id === "summit") continue;
    const v = currentVersion(i);
    open.push({
      title: i.title, owner: v.ownerName, due: v.due,
      status: approvalStatus(state, i) === "pushed_back" ? "Pushed back" : "Pending", href: `/demo#item-${i.id}`,
    });
  }
  const meetingsWithTracked = new Set(state.items.map((i) => i.meeting as string));
  for (const m of meetings) {
    if (meetingsWithTracked.has(m.id)) continue;
    for (const a of m.notes.actionItems) {
      open.push({ title: a.task, owner: a.owner, due: ISO.test(a.deadline) ? a.deadline : null, status: "Open", href: `/meetings/${m.id}` });
    }
  }
  // Tasks delivering this group's commitments also have deadlines.
  const itemIds = new Set(state.items.filter((i) => ids.has(i.meeting)).map((i) => i.id));
  const taskDeadlines: GroupSummaryItem[] = state.tasks
    .filter((t) => !t.done && t.itemId && itemIds.has(t.itemId) && t.due)
    .map((t) => ({ title: t.title, owner: t.owner, due: t.due, status: "Open" as const, href: "/demo" }));
  const upcoming = [...open.filter((o) => o.due), ...taskDeadlines]
    .filter((o) => o.due! >= today)
    .sort((a, b) => a.due!.localeCompare(b.due!));
  return { meetings, openCommitments: open, upcoming, lastMet: meetings[0]?.date ?? null };
}

// --------------------------------------------------------- rule-based suggestion

const STOP = new Set(
  ("I We You He She They It The A An And But Or So Yes No Thanks Thank Great Good Also Then That This These Those Our Your Their " +
    "Can Could Would Should Will Let Lets Let's Okay OK Sure One Two Three Four Five Six Seven Eight Nine Ten First Second Next Last " +
    "Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October " +
    "November December Spring Summer Autumn Fall Winter Q1 Q2 Q3 Q4 Hi Hello Sorry Perhaps Maybe Which What When Where Why How Does Do Did " +
    "Is Are Was Were Episode Season Seasons Team Budget").split(" ").map((w) => w.toLowerCase()),
);

/** Capitalised names in the transcript (companies, projects, places), most frequent first. */
export function properNouns(lines: TranscriptLine[]): { term: string; count: number }[] {
  const speakers = new Set(lines.flatMap((l) => l.speaker.toLowerCase().split(/\s+/)));
  const counts = new Map<string, number>();
  for (const l of lines) {
    for (const m of l.text.matchAll(/\b[A-Z][a-zA-Z0-9+&'-]*(?:\s+[A-Z][a-zA-Z0-9+&'-]*)*/g)) {
      const words = m[0].split(/\s+/).filter((w) => !STOP.has(w.toLowerCase().replace(/'s$/, "")) && !speakers.has(w.toLowerCase()));
      const term = words.join(" ").replace(/'s$/, "");
      if (term.length < 3) continue;
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count || b.term.length - a.term.length);
}

/** Score every group by how often its keywords and name appear in the meeting. */
export function suggestGroupByRules(title: string, lines: TranscriptLine[], groups: MeetingGroup[]): GroupSuggestion {
  const text = `${title}\n${lines.map((l) => `${l.speaker}: ${l.text}`).join("\n")}`.toLowerCase();
  const nouns = properNouns(lines);
  const terms = nouns.slice(0, 5).map((n) => n.term);
  let best: { group: MeetingGroup; score: number; hits: string[] } | null = null;
  for (const g of groups) {
    const hits: string[] = [];
    let score = 0;
    for (const k of new Set([...g.keywords, g.name.toLowerCase()])) {
      const n = text.split(k.toLowerCase()).length - 1;
      if (n > 0) {
        hits.push(k);
        score += n * (k.includes(" ") ? 2 : 1);
      }
    }
    if (!best || score > best.score) best = { group: g, score, hits };
  }
  if (best && best.score >= 3) {
    const shown = best.hits.slice(0, 4).map((h) => `“${h}”`).join(", ");
    return {
      groupId: best.group.id, newName: null, terms, source: "rules",
      confidence: Math.min(0.95, 0.4 + best.score / 20),
      reason: `Mentions ${shown} — like other meetings in ${best.group.name}.`,
    };
  }
  const name = nouns[0]?.term ?? (title.split(/[:\-–—]/)[0].trim() || "New project");
  return {
    groupId: null, newName: name, terms, source: "rules", confidence: nouns[0] ? 0.6 : 0.3,
    reason: nouns[0]
      ? `No existing group matches. “${nouns[0].term}” comes up ${nouns[0].count} time${nouns[0].count === 1 ? "" : "s"}, so it could be its own group.`
      : "No existing group matches this meeting.",
  };
}
