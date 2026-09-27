import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropicKey } from "@/lib/ai/ambiguity";
import { suggestGroupWithClaude } from "@/lib/ai/group";
import { properNouns, suggestGroupByRules } from "@/lib/meetings/groups";
import { detectSample, SAMPLE_GROUP_OF } from "@/lib/meetings/sample";
import type { GroupSuggestion } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().max(200).default(""),
  lines: z.array(z.object({ speaker: z.string().max(80), side: z.enum(["A", "B"]).nullable(), text: z.string().max(4000), startMs: z.number() })).min(1).max(2000),
  groups: z.array(z.object({
    id: z.string().max(80), name: z.string().max(80), color: z.string().max(20), description: z.string().max(300).nullable(),
    keywords: z.array(z.string().max(60)).max(200), createdAt: z.string().max(40),
  })).max(100),
});

/** Suggest which group a new meeting belongs in (Claude when configured, otherwise pre-set groups and keyword rules). */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a title, transcript lines and the current groups." }, { status: 400 });
  const { title, lines, groups } = parsed.data;

  if (hasAnthropicKey()) {
    try {
      return NextResponse.json(await suggestGroupWithClaude(title, lines, groups));
    } catch (err) {
      console.error("[meetings/group] Claude suggestion failed, using rules:", err);
    }
  }
  // Sample transcripts go to their pre-set group when it still exists.
  const sample = detectSample(lines);
  const preset = sample ? groups.find((g) => g.id === SAMPLE_GROUP_OF[sample]) : undefined;
  if (preset) {
    const body: GroupSuggestion = {
      groupId: preset.id, newName: null, source: "preset", confidence: 0.95,
      terms: properNouns(lines).slice(0, 5).map((n) => n.term),
      reason: `This is a sample meeting from ${preset.name}.`,
    };
    return NextResponse.json(body);
  }
  return NextResponse.json(suggestGroupByRules(title, lines, groups));
}
