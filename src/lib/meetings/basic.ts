/**
 * Rule-based notes for pasted transcripts when no Claude API key is set.
 * Deliberately simple and conservative; the UI labels them as basic notes.
 */
import type { ActionItem, FilterChip, MeetingNotes, TranscriptLine } from "./types";

const TIME =
  "\\b(?:by|before|until|on|in|end of|next|this)\\s+(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}(?:st|nd|rd|th)?(?:\\s+of)?\\s+\\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|fall|winter|q[1-4]|week|month|quarter|year|eod|eow)\\b";
const OWNER = "\\b(?:I'll|I will|we'll|we will|I'm going to|we're going to|let me|I can take|we can take|I'll take)\\b";
const METRIC = "(?:[$€£]|\\b(?:CHF|USD|EUR|GBP)\\s?)\\d[\\d,.]*(?:\\s?(?:k|m|million|thousand))?|\\b\\d[\\d,.]*\\s?(?:%|percent|francs|dollars|euros|pounds|users|images|units|hours|days|weeks|people)\\b";
const PUSHBACK = "\\b(?:can't|cannot|won't|not able to|unfortunately|I'm sorry|that's not|we'd rather not|no, )";
const SOFT_YES = "\\b(?:would be nice|we'll try|we will try|we'll consider|we will consider|perhaps|maybe|probably|should be fine|in principle|we'll see|might work)\\b";

export const BASIC_CHIPS: FilterChip[] = [
  { id: "deadlines", label: "Deadlines", kind: "ai", patterns: [TIME], hint: "Dates and time frames" },
  { id: "owners", label: "Owners", kind: "ai", patterns: [OWNER], hint: "Someone taking something on" },
  { id: "metrics", label: "Metrics", kind: "ai", patterns: [METRIC], hint: "Amounts and quantities" },
  { id: "pushback", label: "Pushback", kind: "ai", patterns: [PUSHBACK], hint: "Where someone said no" },
  { id: "softyes", label: "Soft yes", kind: "ai", patterns: [SOFT_YES], hint: "Hedged agreement worth confirming" },
];

const first = (s: string, max = 160) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export function basicNotes(title: string, lines: TranscriptLine[]): MeetingNotes {
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const time = new RegExp(TIME, "i");
  const owner = new RegExp(OWNER, "i");
  const substantive = lines.filter((l) => l.text.split(/\s+/).length >= 6);

  const actionItems: ActionItem[] = lines
    .filter((l) => owner.test(l.text))
    .slice(0, 8)
    .map((l) => ({ task: first(l.text, 140), owner: l.speaker, deadline: l.text.match(time)?.[0] ?? "Not set" }));
  const decisions = lines
    .filter((l) => /\b(agree|agreed|decided|let's go with|confirmed|works for us|deal)\b/i.test(l.text))
    .slice(0, 6)
    .map((l) => `${l.speaker}: ${first(l.text)}`);
  const openQuestions = lines
    .filter((l) => l.text.trim().endsWith("?"))
    .slice(0, 6)
    .map((l) => `${l.speaker} asked: ${first(l.text)}`);

  const summary = [
    `${speakers.length} participant${speakers.length === 1 ? "" : "s"} (${speakers.join(", ")}) discussed ${title || "the meeting topic"}.`,
    ...substantive.slice(0, 3).map((l) => `${l.speaker}: ${first(l.text, 140)}`),
  ];
  return {
    summaryLine: first(substantive[0]?.text ?? `Conversation between ${speakers.join(" and ")}.`, 120),
    summary,
    decisions,
    actionItems,
    openQuestions,
  };
}
