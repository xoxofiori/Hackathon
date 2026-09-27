import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const MAX_BYTES = 25 * 1024 * 1024;

interface DeepgramUtterance { speaker?: number; transcript: string; start: number }

/** Transcribe an uploaded recording with Deepgram (speaker diarization). Needs DEEPGRAM_API_KEY. */
export async function POST(request: Request) {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Audio transcription needs DEEPGRAM_API_KEY. In demo mode, the sample transcript is used instead." },
      { status: 501 },
    );
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach an audio file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Audio files are limited to 25 MB." }, { status: 413 });

  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true&detect_language=true", {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": file.type || "application/octet-stream" },
    body: await file.arrayBuffer(),
  }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: "Transcription failed. Check DEEPGRAM_API_KEY and the file format." }, { status: 502 });
  const data = (await res.json()) as { results?: { utterances?: DeepgramUtterance[] } };
  const lines = (data.results?.utterances ?? []).map((u) => ({
    speaker: `Speaker ${(u.speaker ?? 0) + 1}`, side: null, text: u.transcript, startMs: Math.round(u.start * 1000),
  }));
  if (!lines.length) return NextResponse.json({ error: "No speech was found in that recording." }, { status: 422 });
  return NextResponse.json({ lines });
}
