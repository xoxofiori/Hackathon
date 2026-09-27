import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AmbiguityScanSchema, type AmbiguityScan } from "@/lib/demo/flags";

/** Fast model for live extraction on transcript windows (the build spec's choice). */
export const LIVE_MODEL = "claude-sonnet-5";

export const hasAnthropicKey = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

export interface Participant {
  name: string;
  title: string;
  side: "wildframe" | "aurel";
  sideLabel: string;
  languages: string[];
}

const SYSTEM = `You review partnership meeting transcripts between two sides and flag statements that the two sides may understand differently, before anything is signed.

Flag only real risks of misunderstanding, for example:
- requests phrased as questions or suggestions ("it would be nice", "perhaps", "would it be possible")
- hedged or indirect yeses that may mean maybe or no ("we'll try", "we will consider it")
- vague time words ("soon", "spring", "Q1", "end of season") — fiscal calendars and hemispheres differ
- unclear owners ("we'll handle that" — which person, which side?)
- the same term meaning different things to each side
- silence or a change of topic after a proposal (silence is not agreement)
- amounts, quantities or scope stated loosely ("about forty", "additional francs")

Rules:
- Quote the transcript line exactly (a verbatim substring of that line).
- Never present an inference about culture, nationality or personality as fact, and never mention them. Describe what the words could mean ("this may have been meant as…") and let the people confirm.
- Write the question neutrally and respectfully, addressed to the side (and person, if clear) who can answer it. It must end with a question mark.
- Skip lines that are already clear. Returning few flags is fine.
- confidence is 0–1: how likely it is that the two sides really do understand this differently.`;

export async function scanTranscript(
  lines: readonly (readonly [string, string])[],
  participants: Record<string, Participant>,
  glossary: string[],
): Promise<{ scan: AmbiguityScan; model: string }> {
  const client = new Anthropic();
  const people = Object.values(participants)
    .map((p) => `- ${p.name}, ${p.title} — side "${p.side}" (${p.sideLabel}); languages: ${p.languages.join(", ")}`)
    .join("\n");
  const transcript = lines
    .map(([speaker, text], i) => {
      const p = participants[speaker];
      return `[${i}] ${p?.name ?? speaker} (${p?.sideLabel ?? "unknown side"}): ${text}`;
    })
    .join("\n");

  const response = await client.messages.parse({
    model: LIVE_MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Participants:\n${people}\n\nShared glossary for this partnership:\n${glossary.map((g) => `- ${g}`).join("\n")}\n\nTranscript (index in brackets):\n${transcript}\n\nReturn the flags. Use the bracketed index as segment_index, and "wildframe" or "aurel" for ask_side.`,
      },
    ],
    output_config: { format: zodOutputFormat(AmbiguityScanSchema) },
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to analyze this transcript.");
  if (!response.parsed_output) throw new Error("The model's response didn't match the expected format.");
  return { scan: response.parsed_output, model: response.model };
}
