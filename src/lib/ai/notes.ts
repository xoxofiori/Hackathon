import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { escapeRegex } from "@/lib/meetings/highlight";
import type { FilterChip, MeetingNotes, TranscriptLine } from "@/lib/meetings/types";

/** Stronger model for post-meeting synthesis (the build spec's choice). */
export const SYNTHESIS_MODEL = "claude-opus-5-5";

const NotesSchema = z.object({
  summary_line: z.string(),
  summary: z.array(z.string()),
  decisions: z.array(z.string()),
  action_items: z.array(z.object({ task: z.string(), owner: z.string(), deadline: z.string() })),
  open_questions: z.array(z.string()),
  filters: z.array(z.object({ label: z.string(), hint: z.string(), phrases: z.array(z.string()) })),
});

const SYSTEM = `You write meeting notes for partnership calls. Notes are read by both sides, so they must be accurate, neutral and easy to scan.

Write:
- summary_line: one sentence (under 25 words) for a meeting list.
- summary: 3–5 short bullets on what happened.
- decisions: only things both sides clearly agreed.
- action_items: task, owner (the person's name as spoken; "Unassigned" if nobody took it), and deadline in the words used or an ISO date; "Not set" if none was given.
- open_questions: anything unresolved, ambiguous or answered only vaguely — including vague dates, unclear owners and hedged yeses. Phrase each as a neutral question.
- filters: 4–6 keyword filters that help someone scan the transcript. Always include "Deadlines", "Owners", "Metrics", "Pushback" and "Soft yes" when the transcript has matches, plus up to one topic-specific filter. For each, list the exact phrases (verbatim substrings of transcript lines) that belong to it.

Never state an inference about someone's culture, nationality or personality. Don't invent facts that aren't in the transcript.`;

export async function generateNotes(title: string, lines: TranscriptLine[]): Promise<{ notes: MeetingNotes; chips: FilterChip[]; model: string }> {
  const client = new Anthropic();
  const transcript = lines.map((l, i) => `[${i}] ${l.speaker}: ${l.text}`).join("\n");
  const response = await client.messages.parse({
    model: SYNTHESIS_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(NotesSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: `Meeting title: ${title}\n\nTranscript:\n${transcript}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to summarize this transcript.");
  const out = response.parsed_output;
  if (!out) throw new Error("The model's response didn't match the expected format.");

  // Keep only phrases that really occur in the transcript, so every chip count is real.
  const corpus = lines.map((l) => l.text.toLowerCase());
  const chips: FilterChip[] = out.filters
    .map((f, i) => ({
      id: `${f.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`,
      label: f.label,
      kind: "ai" as const,
      hint: f.hint,
      patterns: [...new Set(f.phrases.map((p) => p.trim()).filter((p) => p && corpus.some((c) => c.includes(p.toLowerCase()))))].map(escapeRegex),
    }))
    .filter((c) => c.patterns.length > 0);

  return {
    model: response.model,
    chips,
    notes: {
      summaryLine: out.summary_line,
      summary: out.summary,
      decisions: out.decisions,
      actionItems: out.action_items,
      openQuestions: out.open_questions,
    },
  };
}
