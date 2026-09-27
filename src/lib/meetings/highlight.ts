import type { FilterChip, TranscriptLine } from "./types";

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One global, case-insensitive regex for a chip (invalid patterns are skipped). */
export function chipRegex(chip: Pick<FilterChip, "patterns">): RegExp | null {
  const valid = chip.patterns.filter((p) => {
    try {
      new RegExp(p, "i");
      return p.length > 0;
    } catch {
      return false;
    }
  });
  return valid.length ? new RegExp(`(?:${valid.join("|")})`, "gi") : null;
}

export interface LineMatch {
  lineIndex: number;
  count: number;
}

export function matchLines(lines: TranscriptLine[], chip: Pick<FilterChip, "patterns">): LineMatch[] {
  const re = chipRegex(chip);
  if (!re) return [];
  const out: LineMatch[] = [];
  lines.forEach((l, lineIndex) => {
    const count = l.text.match(re)?.length ?? 0;
    if (count) out.push({ lineIndex, count });
  });
  return out;
}

export const countMatches = (lines: TranscriptLine[], chip: Pick<FilterChip, "patterns">) =>
  matchLines(lines, chip).reduce((n, m) => n + m.count, 0);

/** Split text into plain and matched parts for rendering <mark>s. */
export function splitMatches(text: string, re: RegExp | null): { text: string; match: boolean }[] {
  if (!re) return [{ text, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(re.source, "gi"))) {
    if (!m[0]) continue;
    if (m.index! > last) parts.push({ text: text.slice(last, m.index), match: false });
    parts.push({ text: m[0], match: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

export const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
