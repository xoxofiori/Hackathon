import { PEOPLE } from "@/lib/demo/people";
import type { SideKey } from "@/lib/demo/types";
import type { MeetingParticipant, TranscriptLine } from "./types";

const LINE = /^\s*(?:\[?\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\]?\s*[-–]?\s*)?([^:\n]{1,48}?)\s*(?:\((\d{1,2}:\d{2}(?::\d{2})?)\))?\s*:\s+(.+)$/;
const toMs = (t: string) => t.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0) * 1000;

const KNOWN_SIDES = new Map<string, SideKey>(
  Object.values(PEOPLE).map((p) => [p!.name.toLowerCase(), p!.side] as [string, SideKey]),
);
export const sideForSpeaker = (name: string): SideKey | null => KNOWN_SIDES.get(name.trim().toLowerCase()) ?? null;

/**
 * Parse a pasted transcript. Accepts "Name: text", "[1:23] Name: text" or
 * "Name (1:23): text" per line; other lines continue the previous speaker.
 * Missing timestamps are estimated from speaking pace.
 */
export function parseTranscript(raw: string): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  let clock = 0;
  for (const rawLine of raw.split(/\r?\n/)) {
    const text = rawLine.trim();
    if (!text) continue;
    const m = LINE.exec(text);
    if (m && !/^https?$/i.test(m[2])) {
      const stamp = m[1] ?? m[3];
      const startMs = stamp ? toMs(stamp) : clock;
      const speaker = m[2].trim();
      lines.push({ speaker, side: sideForSpeaker(speaker), text: m[4].trim(), startMs });
      clock = startMs + estimateMs(m[4]);
    } else if (lines.length) {
      const prev = lines[lines.length - 1];
      prev.text = `${prev.text} ${text}`;
      clock += estimateMs(text);
    } else {
      lines.push({ speaker: "Speaker 1", side: null, text, startMs: clock });
      clock += estimateMs(text);
    }
  }
  return lines;
}

/** ~150 words per minute plus a short pause. */
const estimateMs = (text: string) => Math.round((text.split(/\s+/).length / 150) * 60_000) + 1500;

export function serializeTranscript(lines: TranscriptLine[]): string {
  const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
  return lines.map((l) => `[${clock(l.startMs)}] ${l.speaker}: ${l.text}`).join("\n");
}

export function participantsOf(lines: TranscriptLine[]): MeetingParticipant[] {
  const seen = new Map<string, MeetingParticipant>();
  for (const l of lines) if (!seen.has(l.speaker)) seen.set(l.speaker, { name: l.speaker, side: l.side });
  return [...seen.values()];
}

/** Normalized text used to recognise the built-in sample transcript. */
export const fingerprint = (lines: TranscriptLine[]) =>
  lines.map((l) => `${l.speaker.toLowerCase()}|${l.text.toLowerCase().replace(/\s+/g, " ").replace(/\d{4}-\d{2}-\d{2}/g, "#")}`).join("\n");
