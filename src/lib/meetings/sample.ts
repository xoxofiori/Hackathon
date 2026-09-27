/**
 * Pre-generated notes and filter chips for the built-in Wildframe × Aurel
 * meetings, used when no Claude API key is configured.
 */
import { PEOPLE } from "@/lib/demo/people";
import { SAMPLE_TRANSCRIPTS, type DayFn } from "@/lib/sample/wildframe-aurel";
import { MORE_TRANSCRIPTS } from "@/lib/sample/more-meetings";
import { fingerprint, participantsOf, sideForSpeaker } from "./parse";
import type { FilterChip, MeetingNotes, MeetingRecord, TranscriptLine } from "./types";

export type SampleKey = "m1" | "m2" | "m3" | "p1" | "p2" | "d1";
const SAMPLE_KEYS: SampleKey[] = ["m3", "m2", "m1", "p1", "p2", "d1"];

/** Pre-set groups for the sample meetings (used as-is when there's no Claude API key). */
export const SAMPLE_GROUP_OF: Record<SampleKey, string> = {
  m1: "g-aurel", m2: "g-aurel", m3: "g-aurel", p1: "g-post", p2: "g-post", d1: "g-dist",
};

const DAY = 86_400_000;

/** Transcript lines with the same timing the demo's analysis page uses. */
export function sampleLines(key: SampleKey, d: DayFn): TranscriptLine[] {
  let ms = 60_000;
  const named: (readonly [string, string])[] =
    key === "m1" || key === "m2" || key === "m3"
      ? SAMPLE_TRANSCRIPTS[key](d).map(([k, text]) => [PEOPLE[k]!.name, text] as const)
      : MORE_TRANSCRIPTS[key](d);
  return named.map(([speaker, text]) => {
    const line = { speaker, side: sideForSpeaker(speaker), text, startMs: ms };
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
  p1: [
    chip("deadlines", "Deadlines", [DATE, "\\bin Q1\\b", "a week before", "this week"], "Dates, payment triggers and time frames"),
    chip("owners", "Owners", ["London can take", "We'll send", "we'll sort that", "I'll share"], "Who said they would do something"),
    chip("metrics", "Metrics", ["episodes one to four", "one to four", "single LUT pack"], "Amounts, counts and quantities"),
    chip("pushback", "Pushback", ["if the locked cuts arrive"], "Conditions attached to a yes"),
    chip("softyes", "Soft yes", ["that's doable", "Q1 is fine"], "Hedged or indirect agreement worth confirming"),
  ],
  p2: [
    chip("deadlines", "Deadlines", [DATE, "two days", "before our next sync"], "Dates, payment triggers and time frames"),
    chip("owners", "Owners", ["we'll deliver", "I'll get", "We can do that"], "Who said they would do something"),
    chip("metrics", "Metrics", ["seventy percent", "two days", "three and four"], "Amounts, counts and quantities"),
    chip("pushback", "Pushback", ["darker than the LA reference", "it might slip"], "Concerns and trade-offs"),
    chip("softyes", "Soft yes", ["Two days is fine as long as", "We can do that, but"], "Agreement with conditions worth confirming"),
  ],
  d1: [
    chip("deadlines", "Deadlines", [DATE, "eighteen months", "until next summer"], "Dates, windows and time frames"),
    chip("owners", "Owners", ["I'll send", "Could you send"], "Who said they would do something"),
    chip("metrics", "Metrics", ["eighteen months", "seasons one and two", "North America", "the Nordics"], "Territories, windows and counts"),
    chip("pushback", "Pushback", ["may restrict on-screen brands", "is contractual"], "Constraints each side raised"),
    chip("softyes", "Soft yes", ["We could probably work with that", "if they're available"], "Hedged or indirect agreement worth confirming"),
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
          { task: "Host the Geneva premiere", owner: "Luca Brunner", deadline: "2027-01-29" },
        ],
        openQuestions: [
          "Which “spring” does Aurel mean for the footage — Geneva's (March–May 2027) or Patagonia's (September–November 2026)? Is it a firm deadline?",
          "Who at Aurel approves product placements, and how quickly?",
          "Is the extra CHF 150,000 paid with the second instalment or on delivery of the fourth vignette?",
          "If the weather pushes the shoot back two weeks, do the vignette dates move too?",
        ],
      };
    case "p1":
      return {
        summaryLine: "London takes the colour grade for episodes 1–4; LA sends locked cuts first and both teams share one LUT pack.",
        summary: [
          "Wildframe London will colour grade episodes one to four.",
          `The grade is due ${d(20)}, provided locked cuts arrive a week before.`,
          `LA will send locked cuts for episodes one to four by ${d(6)}.`,
          "London needs the music licensing budget confirmed “in Q1”.",
          "Both teams will use a single LUT pack so the grades match.",
        ],
        decisions: ["London grades episodes 1–4.", "One shared LUT pack for LA and London."],
        actionItems: [
          { task: "Send locked cuts for episodes 1–4", owner: "Jordan Okafor", deadline: d(6) },
          { task: "Colour grade episodes 1–4", owner: "Olivia Hart", deadline: d(20) },
          { task: "Share the London LUT pack with LA", owner: "Olivia Hart", deadline: d(2) },
          { task: "Confirm the music licensing budget", owner: "Maya Chen", deadline: "“In Q1”" },
        ],
        openQuestions: [
          "Which months does “Q1” mean — London's financial year starts in April, LA's in January?",
        ],
      };
    case "p2":
      return {
        summaryLine: "Episode 1 graded but too dark; a lift will slip episode 2 by two days, and the music licence is the big open cost.",
        summary: [
          "Episode one is graded, but the night sequences are darker than the LA reference.",
          "London will lift the shadows so the watch faces read clearly; episode two slips by two days.",
          `Locked cuts for episodes three and four are on track for ${d(3)}.`,
          "Post is at about seventy percent of budget; the music licence is the largest open cost.",
        ],
        decisions: ["Lift the shadows in episode one, accepting a two-day slip on episode two."],
        actionItems: [
          { task: "Deliver the regraded episode one", owner: "Tom Whitfield", deadline: d(2) },
          { task: "Send locked cuts for episodes 3 and 4", owner: "Jordan Okafor", deadline: d(3) },
          { task: "Deliver the episode two grade", owner: "Tom Whitfield", deadline: d(9) },
          { task: "Get the music licensing number from finance", owner: "Maya Chen", deadline: "Before the next sync" },
        ],
        openQuestions: ["How much of the remaining post budget will the music licence take?"],
      };
    case "d1":
      return {
        summaryLine: "Northlight+ wants exclusive Season 3 streaming rights in North America and the Nordics; avails and rate card to follow.",
        summary: [
          "Northlight+ is interested in exclusive streaming rights for Wild Horizons Season 3.",
          "Territories: North America and the Nordics, with a first window of eighteen months.",
          "They'd also like seasons one and two as library titles — free in North America, licensed in the Nordics until next summer.",
          "Their ad policy may restrict on-screen brands; the Aurel end-credit placement is contractual and stays.",
        ],
        decisions: ["Aim for a term sheet within a month."],
        actionItems: [
          { task: "Send avails and the rate card to Northlight+", owner: "Maya Chen", deadline: d(4) },
          { task: "Agree a term sheet with Northlight+", owner: "Daniel Reyes", deadline: d(30) },
        ],
        openQuestions: [
          "Can the vignettes run on Northlight+ given its ad policy on on-screen brands?",
          "Would Northlight+ take the Nordics library rights from next summer?",
        ],
      };
  }
}

const TITLES: Record<SampleKey, string> = {
  m1: "Kickoff: Season 3 sponsorship scope",
  m2: "Creative review: vignette concepts",
  m3: "Budget & deliverables sign-off",
  p1: "London post-production handoff",
  p2: "Colour grade review: episodes 1–2",
  d1: "Streaming rights intro: Northlight+",
};
const OFFSETS: Record<SampleKey, number> = { m1: -62, m2: -31, m3: -9, p1: -14, p2: -3, d1: -5 };

/** The three past sample meetings, as they appear on Home and Meetings. */
export function sampleRecords(now: Date): MeetingRecord[] {
  const d: DayFn = (n) => new Date(now.getTime() + n * DAY).toISOString().slice(0, 10);
  return SAMPLE_KEYS.map((key) => {
    const date = new Date(now.getTime() + OFFSETS[key] * DAY);
    date.setUTCHours(14, 0, 0, 0);
    const lines = sampleLines(key, d);
    return {
      id: key, title: TITLES[key], date: date.toISOString(), participants: participantsOf(lines), lines,
      notes: sampleNotes(key, d), chips: SAMPLE_CHIPS[key], customChips: [], source: "sample", notesSource: "pregenerated",
      model: null, notice: null, createdAt: date.toISOString(),
      // Only the Aurel meetings have commitments tracked for approval.
      analysisHref: key === "m3" ? "/demo" : key === "m1" || key === "m2" ? "/commitments" : null,
      groupId: SAMPLE_GROUP_OF[key], groupSuggestion: null,
    };
  });
}

/** Recognise one of the sample transcripts (dates inside the text are ignored). */
export function detectSample(lines: TranscriptLine[]): SampleKey | null {
  const fp = fingerprint(lines);
  const d: DayFn = () => "#";
  for (const key of SAMPLE_KEYS) if (fingerprint(sampleLines(key, d)) === fp) return key;
  return null;
}

export const SAMPLE_TITLE = TITLES.m3;
