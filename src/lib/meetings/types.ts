import type { SideKey } from "@/lib/demo/types";

export interface TranscriptLine {
  speaker: string;
  side: SideKey | null;
  text: string;
  startMs: number;
}

export interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
}

export interface MeetingNotes {
  summaryLine: string;
  summary: string[];
  decisions: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
}

/** A keyword filter. Patterns are regular-expression sources matched case-insensitively. */
export interface FilterChip {
  id: string;
  label: string;
  kind: "ai" | "custom";
  patterns: string[];
  hint?: string;
}

export interface MeetingParticipant {
  name: string;
  side: SideKey | null;
}

export interface MeetingGroup {
  id: string;
  name: string;
  color: string;
  description: string | null;
  /** Words that identify the group's meetings (people, companies, projects, topics). Grows as meetings are added. */
  keywords: string[];
  createdAt: string;
}

/** An AI (or rule-based) suggestion of where a new meeting belongs. */
export interface GroupSuggestion {
  /** An existing group, or null when a new group is suggested. */
  groupId: string | null;
  /** Name for a new group (only when groupId is null). */
  newName: string | null;
  reason: string;
  confidence: number;
  source: "claude" | "rules" | "preset";
  /** Terms from this transcript that identify it (used to teach the chosen group). */
  terms: string[];
}

export interface MeetingRecord {
  id: string;
  title: string;
  date: string;
  participants: MeetingParticipant[];
  lines: TranscriptLine[];
  notes: MeetingNotes;
  chips: FilterChip[];
  customChips: FilterChip[];
  source: "sample" | "pasted" | "audio";
  notesSource: "claude" | "pregenerated" | "basic";
  model: string | null;
  notice: string | null;
  /** The existing analysis / sign-off page for this meeting, when there is one. */
  analysisHref: string | null;
  createdAt: string;
  groupId: string | null;
  /** Shown until the user accepts it or picks a group themselves. */
  groupSuggestion: GroupSuggestion | null;
}

/** What /api/meetings/notes returns. */
export interface NotesResponse {
  notes: MeetingNotes;
  chips: FilterChip[];
  source: MeetingRecord["notesSource"];
  model: string | null;
  notice: string | null;
  isSample: boolean;
  /** Which built-in sample this transcript is, if any. */
  sampleKey: string | null;
}
