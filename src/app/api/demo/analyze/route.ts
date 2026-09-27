import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { hasAnthropicKey, scanTranscript, type Participant } from "@/lib/ai/ambiguity";
import { PREGENERATED_FLAGS, PREGENERATED_MODEL_NOTE, toFlagViews } from "@/lib/demo/flags";
import { SAMPLE_TRANSCRIPTS } from "@/lib/sample/wildframe-aurel";
import type { ScanResult } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

const PARTICIPANTS: Record<string, Participant> = {
  maya: { name: "Maya Chen", title: "Partnerships Lead", side: "wildframe", sideLabel: "Wildframe Media", languages: ["en", "zh"] },
  jordan: { name: "Jordan Okafor", title: "Executive Producer", side: "wildframe", sideLabel: "Wildframe Media", languages: ["en"] },
  priya: { name: "Priya Nair", title: "Post-production Manager", side: "wildframe", sideLabel: "Wildframe Media", languages: ["en", "hi"] },
  luca: { name: "Luca Brunner", title: "Brand Director", side: "aurel", sideLabel: "Aurel Watches", languages: ["de", "en", "fr"] },
  sophie: { name: "Sophie Keller", title: "Marketing Manager", side: "aurel", sideLabel: "Aurel Watches", languages: ["fr", "en"] },
  hiroshi: { name: "Hiroshi Tanaka", title: "Legal Counsel", side: "aurel", sideLabel: "Aurel Watches", languages: ["ja", "en", "de"] },
};
const GLOSSARY = [
  "Q1: Wildframe means January–March; Aurel's fiscal Q1 is July–September.",
  "Spring: the Patagonia shoot is in the southern spring (September–November 2026); in Geneva spring is March–May.",
  "Exclusivity: category exclusivity — no other watch brand sponsors Season 3.",
];

// The sample transcript never changes, so one live scan per server process is enough.
let cached: Promise<ScanResult> | null = null;

function pregenerated(notice: string): ScanResult {
  const lines = SAMPLE_TRANSCRIPTS.m3((n) => String(n));
  return { source: "pregenerated", model: null, notice, scannedAt: new Date().toISOString(), flags: toFlagViews(PREGENERATED_FLAGS, lines) };
}

async function liveScan(): Promise<ScanResult> {
  const lines = SAMPLE_TRANSCRIPTS.m3((n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10));
  const { scan, model } = await scanTranscript(lines, PARTICIPANTS, GLOSSARY);
  return { source: "claude", model, notice: null, scannedAt: new Date().toISOString(), flags: toFlagViews(scan, lines) };
}

export async function POST(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  if (!hasAnthropicKey()) return NextResponse.json(pregenerated(PREGENERATED_MODEL_NOTE));
  if (fresh || !cached) {
    cached = liveScan();
    cached.catch(() => {
      cached = null;
    });
  }
  try {
    return NextResponse.json(await cached);
  } catch (err) {
    const reason =
      err instanceof Anthropic.AuthenticationError ? "the API key was rejected"
      : err instanceof Anthropic.RateLimitError ? "the API is rate-limiting requests"
      : err instanceof Anthropic.APIConnectionError ? "the API couldn't be reached"
      : err instanceof Anthropic.APIError ? `the API returned an error (${err.status ?? "unknown"})`
      : err instanceof Error ? err.message : "the scan failed";
    console.error("[demo/analyze] live scan failed:", err);
    return NextResponse.json(pregenerated(`Live analysis failed (${reason}), so these are the pre-generated flags for this sample.`));
  }
}
