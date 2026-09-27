import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { LIVE_MODEL } from "./ambiguity";
import type { GroupSuggestion, MeetingGroup, TranscriptLine } from "@/lib/meetings/types";

const Schema = z.object({
  match: z.enum(["existing", "new"]),
  group_id: z.string(),
  new_group_name: z.string(),
  reason: z.string(),
  confidence: z.number(),
  terms: z.array(z.string()),
});

const SYSTEM = `You sort meetings into groups for a partnership workspace. A group is a partner, project or workstream (for example "Aurel sponsorship" or "Season 3 post-production").

Pick the existing group this meeting belongs to, based on the people, companies, project names and topics in the transcript. If none fits well, suggest a new group with a short name (2–4 words) naming the partner, project or workstream.

- group_id: the id of the chosen existing group, or "" when match is "new".
- new_group_name: the new group's name, or "" when match is "existing".
- reason: one short sentence a user can check against the transcript (cite names or topics).
- confidence: 0–1.
- terms: up to 5 names or phrases from the transcript that identify this meeting.`;

export async function suggestGroupWithClaude(title: string, lines: TranscriptLine[], groups: MeetingGroup[]): Promise<GroupSuggestion> {
  const client = new Anthropic();
  const groupList = groups.length
    ? groups.map((g) => `- id "${g.id}": ${g.name}${g.description ? ` — ${g.description}` : ""} (keywords: ${g.keywords.slice(0, 12).join(", ")})`).join("\n")
    : "(no groups yet)";
  const transcript = lines.slice(0, 400).map((l) => `${l.speaker}: ${l.text}`).join("\n");
  const response = await client.messages.parse({
    model: LIVE_MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    output_config: { format: zodOutputFormat(Schema) },
    messages: [{ role: "user", content: `Existing groups:\n${groupList}\n\nMeeting title: ${title}\n\nTranscript:\n${transcript}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to classify this meeting.");
  const out = response.parsed_output;
  if (!out) throw new Error("The model's response didn't match the expected format.");
  const existing = out.match === "existing" ? groups.find((g) => g.id === out.group_id) : undefined;
  return {
    groupId: existing?.id ?? null,
    newName: existing ? null : out.new_group_name.trim() || title,
    reason: out.reason,
    confidence: Math.max(0, Math.min(1, out.confidence)),
    source: "claude",
    terms: out.terms.slice(0, 5),
  };
}
