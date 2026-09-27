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
}

/** What /api/meetings/notes returns. */
export interface NotesResponse {
  notes: MeetingNotes;
  chips: FilterChip[];
  source: MeetingRecord["notesSource"];
  model: string | null;
  notice: string | null;
  isSample: boolean;
}
