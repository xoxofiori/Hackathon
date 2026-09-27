import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

/** Which optional integrations are configured (never returns the keys themselves). */
export function GET() {
  return NextResponse.json({
    mode: isDemoMode() ? "demo" : "live",
    claude: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    transcription: Boolean(process.env.DEEPGRAM_API_KEY?.trim()),
  });
}
