import { escapeRegex } from "./highlight";
import type { DemoState } from "@/lib/demo/types";
import type { FilterChip, MeetingRecord } from "./types";

export const addMeeting = (state: DemoState, record: MeetingRecord): DemoState => ({
  ...state,
  library: [record, ...state.library.filter((m) => m.id !== record.id)],
});

const updateMeeting = (state: DemoState, id: string, fn: (m: MeetingRecord) => MeetingRecord): DemoState => ({
  ...state,
  library: state.library.map((m) => (m.id === id ? fn(m) : m)),
});

/** A custom keyword becomes a new chip (returned so the UI can select it). */
export function addCustomChip(state: DemoState, meetingId: string, keyword: string, id?: string): { state: DemoState; chip: FilterChip | null } {
  const k = keyword.trim();
  const meeting = state.library.find((m) => m.id === meetingId);
  if (!k || !meeting) return { state, chip: null };
  const existing = [...meeting.chips, ...meeting.customChips].find((c) => c.label.toLowerCase() === k.toLowerCase());
  if (existing) return { state, chip: existing };
  const chip: FilterChip = { id: id ?? `custom-${Date.now().toString(36)}`, label: k, kind: "custom", patterns: [escapeRegex(k)] };
  return { state: updateMeeting(state, meetingId, (m) => ({ ...m, customChips: [...m.customChips, chip] })), chip };
}

export const removeCustomChip = (state: DemoState, meetingId: string, chipId: string): DemoState =>
  updateMeeting(state, meetingId, (m) => ({ ...m, customChips: m.customChips.filter((c) => c.id !== chipId) }));
