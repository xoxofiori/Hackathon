"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, AudioLines, Check, ClipboardPaste, FileAudio, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useDemo } from "@/components/demo/demo-provider";
import { addMeeting } from "@/lib/meetings/actions";
import { parseTranscript, participantsOf, serializeTranscript } from "@/lib/meetings/parse";
import { SAMPLE_TITLE, sampleLines } from "@/lib/meetings/sample";
import { cn } from "@/lib/utils";
import type { MeetingRecord, NotesResponse, TranscriptLine } from "@/lib/meetings/types";

const STEPS = ["Reading the transcript", "Writing notes", "Finding keywords and owners", "Opening your meeting"];
const today = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function NewMeeting() {
  const router = useRouter();
  const { setState } = useDemo();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"paste" | "audio">("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const useSample = () => {
    setTitle(SAMPLE_TITLE);
    setText(serializeTranscript(sampleLines("m3", today)));
    setMode("paste");
    setError(null);
    setAudioBlocked(false);
  };

  async function create(lines: TranscriptLine[], source: MeetingRecord["source"]) {
    setStep(1);
    const started = Date.now();
    const res = await fetch("/api/meetings/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || "Untitled meeting", lines }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't write notes for that transcript.");
    const data = (await res.json()) as NotesResponse;
    setStep(2);
    await wait(Math.max(0, 1400 - (Date.now() - started)));
    const id = `mtg-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const record: MeetingRecord = {
      id, title: title.trim() || "Untitled meeting", date: now, participants: participantsOf(lines), lines,
      notes: data.notes, chips: data.chips, customChips: [], source: data.isSample ? "sample" : source,
      notesSource: data.source, model: data.model, notice: data.notice, analysisHref: data.isSample ? "/demo" : null, createdAt: now,
    };
    setState((s) => addMeeting(s, record));
    setStep(3);
    await wait(350);
    router.push(`/meetings/${id}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAudioBlocked(false);
    try {
      setStep(0);
      if (mode === "paste") {
        const lines = parseTranscript(text);
        if (!lines.length) throw new Error("Paste a transcript first — one line per speaker, like “Maya Chen: …”.");
        await wait(400);
        await create(lines, "pasted");
      } else {
        if (!file) throw new Error("Choose an audio file first.");
        const form = new FormData();
        form.append("audio", file);
        const res = await fetch("/api/meetings/transcribe", { method: "POST", body: form });
        const body = await res.json().catch(() => ({}));
        if (res.status === 501) {
          setAudioBlocked(true);
          throw new Error(body.error ?? "Audio transcription isn't configured.");
        }
        if (!res.ok) throw new Error(body.error ?? "Transcription failed.");
        await create(body.lines as TranscriptLine[], "audio");
      }
    } catch (err) {
      setStep(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (step !== null) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center px-4" role="status" aria-live="polite">
        <div className="w-full max-w-sm rounded-[2rem] border bg-card p-8 shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-6 animate-pulse" />
          </div>
          <h2 className="mt-5 text-center font-serif text-2xl">{title.trim() || "Untitled meeting"}</h2>
          <ol className="mt-6 flex flex-col gap-3">
            {STEPS.map((label, i) => (
              <li key={label} className={cn("flex items-center gap-3 text-sm", i > step && "text-muted-foreground")}>
                <span className={cn("flex size-6 items-center justify-center rounded-full border", i < step && "border-success bg-success text-white")}>
                  {i < step ? <Check className="size-3.5" /> : i === step ? <Loader2 className="size-3.5 animate-spin" /> : null}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Home
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium tracking-tight">New meeting</h1>
          <p className="mt-1 text-muted-foreground">Name it, add the conversation, and Accord writes the notes.</p>
        </div>
        <Button type="button" variant="outline" size="lg" onClick={useSample} className="rounded-full">
          <Wand2 /> Use sample meeting
        </Button>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-6 rounded-[2rem] border bg-card p-5 shadow-xs md:p-8">
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Meeting name</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Budget & deliverables sign-off" className="h-11 text-base" />
        </div>

        <div role="tablist" aria-label="How to add the conversation" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {([["paste", "Paste transcript", ClipboardPaste], ["audio", "Upload audio", AudioLines]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={cn("flex items-center justify-center gap-2 rounded-full py-2 text-sm", mode === key ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {mode === "paste" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="transcript">Transcript</Label>
            <Textarea
              id="transcript"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="font-mono text-sm leading-relaxed"
              placeholder={"[0:12] Maya Chen: Thanks for making the time…\n[0:31] Luca Brunner: It would be nice to have the footage by spring.\n\nOne line per speaker. Timestamps are optional."}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>Recording</Label>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) setFile(f);
              }}
              className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed p-10 text-center hover:bg-accent/50"
            >
              {file ? <FileAudio className="size-8" /> : <Upload className="size-8 text-muted-foreground" />}
              <span className="font-medium">{file ? file.name : "Drop an audio file or click to choose"}</span>
              <span className="text-xs text-muted-foreground">
                {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "MP3, M4A, WAV or WebM · up to 25 MB · speakers are separated automatically"}
              </span>
            </button>
            <input ref={fileInput} type="file" accept="audio/*,video/webm" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Audio file" />
          </div>
        )}

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            {audioBlocked && (
              <Button type="button" size="sm" variant="outline" onClick={useSample}>
                <Wand2 /> Use the sample meeting instead
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" className="rounded-full px-8">
            <Sparkles /> Create meeting notes
          </Button>
          <span className="text-xs text-muted-foreground">Saved in this browser (demo mode).</span>
        </div>
      </form>
    </div>
  );
}
