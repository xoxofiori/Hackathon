import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropicKey } from "@/lib/ai/ambiguity";
import { generateNotes } from "@/lib/ai/notes";
import { BASIC_CHIPS, basicNotes } from "@/lib/meetings/basic";
import { detectSample, SAMPLE_CHIPS, sampleNotes } from "@/lib/meetings/sample";
import type { NotesResponse } from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().max(200).default(""),
  lines: z
    .array(z.object({ speaker: z.string().max(80), side: z.enum(["A", "B"]).nullable(), text: z.string().max(4000), startMs: z.number() }))
    .min(1)
    .max(2000),
});

const today = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a title and at least one transcript line." }, { status: 400 });
  const { title, lines } = parsed.data;
  const sample = detectSample(lines);

  const fallback = (notice: string | null): NotesResponse =>
    sample
      ? { notes: sampleNotes(sample, today), chips: SAMPLE_CHIPS[sample], source: "pregenerated", model: null, notice, isSample: true }
      : {
          notes: basicNotes(title, lines), chips: BASIC_CHIPS, source: "basic", model: null, isSample: false,
          notice: notice ?? "No Claude API key is configured, so these are basic notes built from simple rules. Add ANTHROPIC_API_KEY for AI notes.",
        };

  if (!hasAnthropicKey()) return NextResponse.json(fallback(null));
  try {
    const { notes, chips, model } = await generateNotes(title || "Untitled meeting", lines);
    const body: NotesResponse = { notes, chips, source: "claude", model, notice: null, isSample: !!sample };
    return NextResponse.json(body);
  } catch (err) {
    const reason =
      err instanceof Anthropic.AuthenticationError ? "the API key was rejected"
      : err instanceof Anthropic.RateLimitError ? "the API is rate-limiting requests"
      : err instanceof Anthropic.APIConnectionError ? "the API couldn't be reached"
      : err instanceof Anthropic.APIError ? `the API returned an error (${err.status ?? "unknown"})`
      : err instanceof Error ? err.message : "note generation failed";
    console.error("[meetings/notes] AI notes failed:", err);
    return NextResponse.json(fallback(`AI notes failed (${reason}), so ${sample ? "pre-generated notes for the sample" : "basic rule-based notes"} are shown instead.`));
  }
}
