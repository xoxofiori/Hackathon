/**
 * Pre-generated notes and filter chips for the built-in Wildframe × Aurel
 * meetings, used when no Claude API key is configured.
 */
import { PEOPLE } from "@/lib/demo/people";
import { SAMPLE_TRANSCRIPTS, type DayFn } from "@/lib/sample/wildframe-aurel";
import { fingerprint, participantsOf } from "./parse";
import type { FilterChip, MeetingNotes, MeetingRecord, TranscriptLine } from "./types";

export type SampleKey = "m1" | "m2" | "m3";

const DAY = 86_400_000;

/** Transcript lines with the same timing the demo's analysis page uses. */
export function sampleLines(key: SampleKey, d: DayFn): TranscriptLine[] {
  let ms = 60_000;
  return SAMPLE_TRANSCRIPTS[key](d).map(([speaker, text]) => {
    const p = PEOPLE[speaker]!;
    const line = { speaker: p.name, side: p.side, text, startMs: ms };
    ms += 6_000 + text.length * 55;
    return line;
  });
}

const chip = (id: string, label: string, patterns: string[], hint: string): FilterChip => ({ id, label, kind: "ai", patterns, hint });
const DATE = "\\bby \\d{4}-\\d{2}-\\d{2}\\b";

export const SAMPLE_CHIPS: Record<SampleKey, FilterChip[]> = {
  m1: [
    chip("deadlines", "Deadlines", ["first on signature", "delivery of episode four", "a few weeks"], "Dates, payment triggers and time frames"),
    chip("owners", "Owners", ["we'd produce", "Our legal team", "We can definitely show you", "We sign those three"], "Who said they would do something"),
    chip("metrics", "Metrics", ["1\\.2 million", "two instalments", "three sixty-second", "all eight episodes"], "Amounts, counts and quantities"),
    chip("pushback", "Pushback", ["Final editorial control has to stay with us"], "Where one side said no or held a line"),
    chip("softyes", "Soft yes", ["We will consider it", "It would be important for us", "within the range"], "Hedged or indirect agreement worth confirming"),
  ],
  m2: [
    chip("deadlines", "Deadlines", [DATE, "first quarter", "\\bQ1\\b", "January", "five working days"], "Dates, payment triggers and time frames"),
    chip("owners", "Owners", ["we'll share", "We could soften", "our social team will expect", "We will come back to you"], "Who said they would do something"),
    chip("metrics", "Metrics", ["five working days", "three vignette concepts", "weekly posts"], "Amounts, counts and quantities"),
    chip("pushback", "Pushback", ["might be a bit rough", "Comments only"], "Where one side said no or held a line"),
    chip("softyes", "Soft yes", ["Perhaps it would be good", "That works for us", "perhaps in the first quarter", "come back to you soon"], "Hedged or indirect agreement worth confirming"),
  ],
  m3: [
    chip("deadlines", "Deadlines", [DATE, "by spring", "late January", "in September", "by two weeks"], "Dates, payment triggers and time frames"),
    chip("owners", "Owners", ["We will handle", "We host", "Aurel hosts", "we will send", "We'll also send", "we provide"], "Who said they would do something"),
    chip("metrics", "Metrics", ["150,000 francs", "two watch prototypes", "forty images", "fourth vignette", "four vignettes", "two weeks"], "Amounts, counts and quantities"),
    chip("pushback", "Pushback", ["we can't offer final cut", "final cut approval", "I'm sorry"], "Where one side said no or held a line"),
    chip("softyes", "Soft yes", ["It would be nice", "Then we accept", "That works"], "Hedged or indirect agreement worth confirming"),
  ],
};

export function sampleNotes(key: SampleKey, d: DayFn): MeetingNotes {
  switch (key) {
    case "m1":
      return {
        summaryLine: "Presenting sponsorship agreed at CHF 1.2M, with three branded vignettes and end-credit placement.",
        summary: [
          "Aurel agreed to a CHF 1.2M presenting sponsorship of Season 3, paid in two instalments.",
          "Wildframe will produce three 60-second branded vignettes to run with episodes 2, 4 and 6.",
          "Aurel's logo will appear in the end credits of all eight episodes.",
          "Aurel wants “some say” in how the watches appear on screen. Wildframe offered to share cuts but keeps final editorial control.",
        ],
        decisions: [
          "Fee: CHF 1.2M — first instalment on signature, second on delivery of episode four.",
          "Three branded vignettes (episodes 2, 4 and 6).",
          "Aurel logo in the end credits of all eight episodes.",
        ],
        actionItems: [
          { task: "Send the fee, vignettes and credits terms for signature", owner: "Maya Chen", deadline: "This week" },
          { task: "Legal review of the sponsorship addendum", owner: "Hiroshi Tanaka", deadline: "“A few weeks”" },
          { task: "Produce three branded vignettes", owner: "Jordan Okafor", deadline: "With episodes 2, 4 and 6" },
        ],
        openQuestions: [
          "Does Aurel's “some say” mean approval rights over product shots, or a preview with comments?",
          "Luca said “we will consider it” about editorial control — agreed, or pending an internal decision?",
        ],
      };
    case "m2":
      return {
        summaryLine: "Night Sky concept chosen, product-shot previews agreed, and the premiere's “Q1” needs clarifying.",
        summary: [
          "Aurel's Geneva team preferred the Night Sky concept; Base Camp may be softened or swapped for a summit sequence.",
          "Wildframe will share every shot featuring a watch for comment five working days before picture lock. Comments are advisory.",
          `The episode 1 rough cut is due ${d(-15)}.`,
          "Aurel expects weekly social posts from set — Wildframe moved on without responding.",
          "A premiere in “Q1” was discussed, which may mean different months to each side.",
        ],
        decisions: [
          "Product-shot previews: Aurel comments, Wildframe keeps the edit.",
          "Night Sky is the lead vignette concept.",
        ],
        actionItems: [
          { task: "Cut a sunrise-summit version of the Base Camp vignette", owner: "Jordan Okafor", deadline: "Before the next review" },
          { task: "Share the episode 1 rough cut", owner: "Priya Nair", deadline: d(-15) },
          { task: "Finish the addendum review", owner: "Hiroshi Tanaka", deadline: "“Soon”" },
        ],
        openQuestions: [
          "Were weekly social posts from set agreed, and who produces them?",
          "Which months does “Q1” mean — calendar or Aurel's fiscal year (starting July)?",
        ],
      };
    case "m3":
      return {
        summaryLine: "Fourth vignette added for CHF 150k, final cut declined in favour of previews, premiere set for late January in Geneva.",
        summary: [
          "Aurel added a fourth branded vignette (episode 8) for an additional CHF 150,000, and Wildframe agreed.",
          `Aurel will ship two watch prototypes to Buenos Aires by ${d(8)} for filming in Patagonia.`,
          "Aurel asked again for final cut approval. Wildframe declined, and Aurel accepted the existing product-shot preview process.",
          "The premiere is set for late January in Geneva, hosted by Aurel.",
          "Jordan flagged that the Patagonia weather window could push the shoot back by two weeks.",
        ],
        decisions: [
          "Four vignettes instead of three — episodes 2, 4, 6 and 8 — for an extra CHF 150,000.",
          "Final cut stays with Wildframe; Aurel keeps preview-and-comment rights.",
          "Premiere in late January 2027 in Geneva. Aurel hosts; Wildframe provides the screening copy.",
        ],
        actionItems: [
          { task: "Ship two watch prototypes to Buenos Aires", owner: "Sophie Keller", deadline: d(8) },
          { task: "Produce the fourth vignette (episode 8)", owner: "Jordan Okafor", deadline: "With episode 8" },
          { task: "Send the behind-the-scenes photo package (about 40 images)", owner: "Maya Chen", deadline: "After the shoot — no date yet" },
          { task: "Handle product placement approvals", owner: "Hiroshi Tanaka", deadline: "Not set" },
          { task: "Host the Geneva premiere", owner: "Luca Brunner", deadline: "Late January 2027" },
        ],
        openQuestions: [
          "Which “spring” does Aurel mean for the footage — Geneva's (March–May 2027) or Patagonia's (September–November 2026)? Is it a firm deadline?",
          "Who at Aurel approves product placements, and how quickly?",
          "Is the extra CHF 150,000 paid with the second instalment or on delivery of the fourth vignette?",
          "If the weather pushes the shoot back two weeks, do the vignette dates move too?",
        ],
      };
  }
}

const TITLES: Record<SampleKey, string> = {
  m1: "Kickoff: Season 3 sponsorship scope",
  m2: "Creative review: vignette concepts",
  m3: "Budget & deliverables sign-off",
};
const OFFSETS: Record<SampleKey, number> = { m1: -62, m2: -31, m3: -9 };

/** The three past sample meetings, as they appear on Home and Meetings. */
export function sampleRecords(now: Date): MeetingRecord[] {
  const d: DayFn = (n) => new Date(now.getTime() + n * DAY).toISOString().slice(0, 10);
  return (["m3", "m2", "m1"] as const).map((key) => {
    const date = new Date(now.getTime() + OFFSETS[key] * DAY);
    date.setUTCHours(14, 0, 0, 0);
    const lines = sampleLines(key, d);
    return {
      id: key, title: TITLES[key], date: date.toISOString(), participants: participantsOf(lines), lines,
      notes: sampleNotes(key, d), chips: SAMPLE_CHIPS[key], customChips: [], source: "sample", notesSource: "pregenerated",
      model: null, notice: null, analysisHref: key === "m3" ? "/demo" : "/demo?tab=commitments", createdAt: date.toISOString(),
    };
  });
}

/** Recognise one of the sample transcripts (dates inside the text are ignored). */
export function detectSample(lines: TranscriptLine[]): SampleKey | null {
  const fp = fingerprint(lines);
  const d: DayFn = () => "#";
  for (const key of ["m3", "m2", "m1"] as const) if (fingerprint(sampleLines(key, d)) === fp) return key;
  return null;
}

export const SAMPLE_TITLE = TITLES.m3;
