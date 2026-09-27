import { z } from "zod";
import type { AmbiguityFlagView } from "./types";

export const FLAG_CATEGORIES = [
  "soft_ask", "hedged_yes", "vague_time", "unclear_owner", "term_mismatch", "silence", "mismatch", "scope", "other",
] as const;

/** Shape Claude returns (validated with Zod; kept simple for structured outputs). */
export const AmbiguityScanSchema = z.object({
  flags: z.array(
    z.object({
      segment_index: z.number().int(),
      quote: z.string(),
      category: z.enum(FLAG_CATEGORIES),
      may_mean: z.array(z.string()),
      note: z.string(),
      question: z.string(),
      ask_side: z.enum(["wildframe", "aurel"]),
      ask_person: z.string(),
      confidence: z.number(),
    }),
  ),
});
export type AmbiguityScan = z.infer<typeof AmbiguityScanSchema>;

export const PREGENERATED_MODEL_NOTE =
  "No Claude API key is configured, so these flags were generated ahead of time for this sample transcript.";

/**
 * Pre-generated flags for the meeting 3 transcript ("Budget & deliverables sign-off"),
 * used when ANTHROPIC_API_KEY is missing. Indexes refer to SAMPLE_TRANSCRIPTS.m3.
 */
export const PREGENERATED_FLAGS: AmbiguityScan = {
  flags: [
    {
      segment_index: 1,
      quote: "We can offer an additional 150,000 francs.",
      category: "scope",
      may_mean: [
        "CHF 150,000 on top of the CHF 1.2M fee, paid with instalment 2",
        "CHF 150,000 on top of the fee, paid on delivery of the fourth vignette",
        "A total including VAT or production costs",
      ],
      note: "The amount is clear, but when it's paid and whether it's inclusive of VAT wasn't said. Both sides may be assuming different payment terms.",
      question: "Luca offered “an additional 150,000 francs” for the fourth vignette. Is that CHF 150,000 excluding VAT, and is it paid with the second instalment or on delivery of the fourth vignette?",
      ask_side: "aurel",
      ask_person: "Luca Brunner",
      confidence: 0.62,
    },
    {
      segment_index: 4,
      quote: "It would be nice to have the footage by spring.",
      category: "vague_time",
      may_mean: [
        "Firm deadline: footage by March 2027 (spring in Geneva)",
        "Footage captured during the Patagonia spring (September–November 2026)",
        "A preference with no fixed date",
      ],
      note: "“It would be nice” may have been meant as a firm request, and “spring” is March–May in Geneva but September–November in Patagonia.",
      question: "Luca said “it would be nice to have the footage by spring.” Is this a firm request with a deadline, or a preference? And which spring — Geneva's (March–May 2027) or Patagonia's (September–November 2026)?",
      ask_side: "aurel",
      ask_person: "Luca Brunner",
      confidence: 0.86,
    },
    {
      segment_index: 9,
      quote: "We will handle the product placement approvals.",
      category: "unclear_owner",
      may_mean: ["Hiroshi (Legal) approves", "Luca or the brand team approves", "A committee in Geneva approves"],
      note: "“We will handle” names no person and no turnaround time, so Wildframe can't plan the edit schedule around it.",
      question: "Hiroshi said “we will handle the product placement approvals.” Who at Aurel will approve, and what turnaround should Wildframe plan for?",
      ask_side: "aurel",
      ask_person: "Hiroshi Tanaka",
      confidence: 0.81,
    },
    {
      segment_index: 11,
      quote: "Yes, late January. We host.",
      category: "scope",
      may_mean: [
        "Aurel hosts and pays for venue, guests and press",
        "Aurel provides the venue; costs are shared",
        "A specific date is still to be chosen",
      ],
      note: "The month is agreed, but “we host” may cover the venue only or all costs, and no date was fixed.",
      question: "Luca confirmed “late January, we host.” Is there a target date, and does hosting include venue, guest travel and press costs?",
      ask_side: "aurel",
      ask_person: "Luca Brunner",
      confidence: 0.55,
    },
    {
      segment_index: 12,
      quote: "One risk: the weather window in Patagonia could push the shoot back by two weeks.",
      category: "other",
      may_mean: [
        "Vignette delivery dates would move by up to two weeks",
        "Delivery dates stay fixed; Wildframe absorbs the delay",
      ],
      note: "A possible delay was raised but nobody said what happens to the signed vignette dates if it occurs.",
      question: "If the Patagonia shoot slips by up to two weeks, would Aurel accept vignette delivery dates moving by the same amount?",
      ask_side: "aurel",
      ask_person: "Luca Brunner",
      confidence: 0.67,
    },
    {
      segment_index: 13,
      quote: "We'll also send a behind-the-scenes photo package, about forty images.",
      category: "scope",
      may_mean: ["At least 40 images", "Roughly 40 images, could be fewer", "40 images, delivered with the vignettes"],
      note: "“About forty” and no delivery date — Aurel may plan a campaign around a fixed number and date.",
      question: "Maya offered “about forty” behind-the-scenes images. Is that a minimum of 40, and when will they be delivered?",
      ask_side: "wildframe",
      ask_person: "Maya Chen",
      confidence: 0.7,
    },
  ],
};

/** Normalize Claude's (or the pre-generated) flags into what the UI shows. */
export function toFlagViews(scan: AmbiguityScan, lines: readonly (readonly [string, string])[]): AmbiguityFlagView[] {
  const seen = new Set<number>();
  return scan.flags
    .filter((f) => f.segment_index >= 0 && f.segment_index < lines.length)
    .filter((f) => (seen.has(f.segment_index) ? false : (seen.add(f.segment_index), true)))
    .map((f) => {
      const text = lines[f.segment_index][1];
      // Quotes must be verbatim; fall back to the whole line if the model paraphrased.
      const quote = f.quote && text.includes(f.quote) ? f.quote : text;
      return {
        id: `flag-${f.segment_index}`,
        segmentIndex: f.segment_index,
        quote,
        category: f.category,
        mayMean: f.may_mean.slice(0, 4),
        note: f.note,
        question: f.question,
        askSide: f.ask_side === "wildframe" ? "A" : "B",
        askPerson: f.ask_person || null,
        confidence: Math.max(0, Math.min(1, f.confidence)),
      };
    });
}
