/**
 * The built-in Wildframe × Aurel sample used by demo mode. It mirrors the
 * database seed (src/lib/setup/seed.ts) so both modes tell the same story, with
 * every date relative to "today".
 */
import { SAMPLE_TRANSCRIPTS } from "@/lib/sample/wildframe-aurel";
import { sampleRecords } from "@/lib/meetings/sample";
import { deriveStatus } from "./engine";
import { hashVersion } from "./hash";
import { PEOPLE, SIDES } from "./people";
import type {
  ClarificationCategory, CulturalFlag, DeadlineStrength, DemoClarification, DemoItem, DemoMeeting, DemoSegment,
  DemoState, DemoVersion, ItemKind, MeetingKey, SideKey,
} from "./types";

export { DEMO_PEOPLE, PEOPLE, SIDES } from "./people";

const DAY = 86_400_000;

export function initialDemoState(now: Date = new Date()): DemoState {
  const d = (offset: number) => new Date(now.getTime() + offset * DAY).toISOString().slice(0, 10);
  const ts = (offset: number, hour = 14, minute = 0) => {
    const t = new Date(now.getTime() + offset * DAY);
    t.setUTCHours(hour, minute, 0, 0);
    return t.toISOString();
  };

  const meetings: DemoMeeting[] = [
    { key: "m1", title: "Kickoff: Season 3 sponsorship scope", date: ts(-62), status: "done" },
    { key: "m2", title: "Creative review: vignette concepts", date: ts(-31), status: "done" },
    { key: "m3", title: "Budget & deliverables sign-off", date: ts(-9), status: "review" },
    { key: "m4", title: "Production schedule check-in", date: ts(5), status: "prep" },
  ];

  const segments: DemoSegment[] = [];
  for (const key of ["m1", "m2", "m3"] as const) {
    let ms = 60_000;
    SAMPLE_TRANSCRIPTS[key](d).forEach(([speaker, text], index) => {
      segments.push({ id: `${key}-${index}`, meeting: key, index, speaker, side: PEOPLE[speaker]!.side, text, startMs: ms });
      ms += 6_000 + text.length * 55;
    });
  }
  const seg = (m: MeetingKey, ...idx: number[]) => idx.map((i) => `${m}-${i}`);

  const items: DemoItem[] = [];
  const clarifications: DemoClarification[] = [];

  interface VersionIn {
    wording: string; ownerSide?: SideKey | null; owner?: string | null; due?: string | null; dueText?: string | null;
    strength?: DeadlineStrength | null; amount?: number | null; currency?: string | null; at: string; by: string;
    signedBy?: [SideKey, "maya" | "luca", string][];
  }
  const item = (id: string, spec: {
    meeting: MeetingKey; kind: ItemKind; title: string; segmentIds: string[]; confidence: number; rationale: string;
    raisedBy: SideKey; versions: VersionIn[]; flags?: CulturalFlag[]; interpretations?: { meaning: string; likelihood: number }[];
    declined?: string;
  }) => {
    const versions: DemoVersion[] = [];
    const signatures: DemoItem["signatures"] = [];
    spec.versions.forEach((v, i) => {
      const base = {
        version: i + 1, wording: v.wording, ownerSide: v.ownerSide ?? null, ownerName: v.owner ?? null, due: v.due ?? null,
        dueText: v.dueText ?? null, strength: v.strength ?? null, amount: v.amount ?? null, currency: v.currency ?? null,
      };
      const hash = hashVersion(id, base);
      const signed = v.signedBy ?? [];
      for (const [side, who, at] of signed) {
        signatures.push({ version: i + 1, side, by: who, byName: PEOPLE[who]!.name, at, wordingHash: hash });
      }
      const both = (["A", "B"] as SideKey[]).every((s) => signed.some(([x]) => x === s));
      versions.push({
        ...base, hash, status: both ? "in_force" : "draft", amendsVersion: null, createdBy: v.by, createdAt: v.at,
      });
    });
    // an earlier in-force version is superseded by a later one; a later draft amends it
    for (let i = 0; i < versions.length - 1; i++) {
      if (versions[i].status === "in_force" && versions.slice(i + 1).some((v) => v.status === "in_force")) versions[i].status = "superseded";
      if (versions[i].status === "draft") versions[i].status = "void";
    }
    const last = versions[versions.length - 1];
    const prevInForce = versions.slice(0, -1).find((v) => v.status === "in_force");
    if (last.status === "draft" && prevInForce) last.amendsVersion = prevInForce.version;
    items.push({
      id, meeting: spec.meeting, kind: spec.kind, title: spec.title, status: spec.declined ? "declined" : "proposed",
      currentVersion: versions.length, versions, signatures, segmentIds: spec.segmentIds, confidence: spec.confidence,
      rationale: spec.rationale, flags: spec.flags ?? [], interpretations: spec.interpretations ?? [], raisedBySide: spec.raisedBy,
      declinedReason: spec.declined ?? null,
    });
  };
  const clarify = (id: string, itemId: string, c: {
    category: ClarificationCategory; question: string; toSide: SideKey; toName?: string; meanings?: string[]; at: string;
    answer?: [string, string, string];
  }) => {
    clarifications.push({
      id, itemId, category: c.category, question: c.question, meanings: c.meanings ?? [], toSide: c.toSide,
      toName: c.toName ?? null, status: c.answer ? "resolved" : "open", answer: c.answer?.[0] ?? null,
      answeredBy: c.answer?.[1] ?? null, answeredAt: c.answer?.[2] ?? null, raisedBy: "Accord AI", createdAt: c.at, flagId: null,
    });
  };

  // ---- Meeting 1 -----------------------------------------------------------------
  item("fee", {
    meeting: "m1", kind: "money", title: "Presenting sponsorship fee", segmentIds: seg("m1", 2, 3), confidence: 0.96, raisedBy: "A",
    rationale: "Luca explicitly agreed to the amount and the payment schedule (“We can agree to 1.2 million in two instalments”).",
    versions: [{
      wording: "Aurel Watches pays Wildframe Media CHF 1,200,000 for the Season 3 presenting sponsorship, in two instalments: 50% on signature and 50% on delivery of episode 4.",
      ownerSide: "B", owner: "Luca Brunner", strength: "hard", amount: 1_200_000, currency: "CHF", at: ts(-62, 15), by: "Accord AI",
      signedBy: [["A", "maya", ts(-60, 10)], ["B", "luca", ts(-59, 8)]],
    }],
  });
  item("vignettes", {
    meeting: "m1", kind: "commitment", title: "Branded vignettes", segmentIds: [...seg("m1", 4, 11, 12), ...seg("m3", 1, 2)], confidence: 0.93, raisedBy: "A",
    rationale: "Jordan offered three vignettes; Luca confirmed “We sign those three”. Meeting 3 added a fourth as an amendment.",
    versions: [
      {
        wording: "Wildframe Media produces three 60-second branded vignettes featuring Aurel timepieces, released alongside episodes 2, 4 and 6.",
        ownerSide: "A", owner: "Jordan Okafor", strength: "hard", at: ts(-62, 15), by: "Accord AI",
        signedBy: [["A", "maya", ts(-60, 10)], ["B", "luca", ts(-59, 8)]],
      },
      {
        wording: "Wildframe Media produces four 60-second branded vignettes featuring Aurel timepieces, released alongside episodes 2, 4, 6 and 8. Aurel Watches pays an additional CHF 150,000 for the fourth vignette.",
        ownerSide: "A", owner: "Jordan Okafor", strength: "hard", amount: 150_000, currency: "CHF", at: ts(-9, 15), by: "Maya Chen",
        signedBy: [["A", "maya", ts(-8, 9)]],
      },
    ],
  });
  item("credits", {
    meeting: "m1", kind: "commitment", title: "End-credit logo placement", segmentIds: seg("m1", 5, 6), confidence: 0.91, raisedBy: "B",
    rationale: "Sophie asked; Maya confirmed “end credits on all eight episodes”.",
    versions: [{
      wording: "The Aurel Watches logo appears in the end credits of all eight Season 3 episodes.", ownerSide: "A", owner: "Maya Chen",
      strength: "hard", at: ts(-62, 15), by: "Accord AI", signedBy: [["A", "maya", ts(-60, 10)], ["B", "luca", ts(-59, 8)]],
    }],
  });
  item("onscreen", {
    meeting: "m1", kind: "soft_ask", title: "Aurel's say in how watches appear on screen", segmentIds: seg("m1", 8, 9, 10), confidence: 0.64, raisedBy: "B",
    rationale: "Phrased as “it would be important for us to have some say” — could mean approval rights or a preview. Luca then answered “we will consider it”.",
    interpretations: [
      { meaning: "Approval rights over every product shot", likelihood: 0.35 },
      { meaning: "A preview of product shots with the right to comment", likelihood: 0.5 },
      { meaning: "General creative input on the vignettes", likelihood: 0.15 },
    ],
    flags: [
      { type: "soft_ask", note: "This may have been meant as a firm requirement rather than a preference." },
      { type: "hedged_yes", note: "“We will consider it” may mean agreement, a pending internal decision, or a polite no." },
    ],
    versions: [{ wording: "Aurel has input on how its watches appear on screen.", ownerSide: "A", at: ts(-62, 15), by: "Accord AI" }],
  });
  clarify("c-onscreen", "onscreen", {
    category: "soft_ask", toSide: "B", toName: "Luca Brunner", at: ts(-62, 15),
    question: "Luca said Aurel would like “some say in how the watches appear on screen”. Is this a request for approval rights over product shots, or for a preview with the chance to comment?",
    meanings: ["Approval rights over product shots", "Preview and comment only"],
    answer: ["Preview and comment on product shots only — not editorial approval.", "Luca Brunner", ts(-31, 14, 20)],
  });

  // ---- Meeting 2 -----------------------------------------------------------------
  item("previews", {
    meeting: "m2", kind: "commitment", title: "Product-shot previews", segmentIds: seg("m2", 4, 5), confidence: 0.94, raisedBy: "A",
    rationale: "Maya proposed the preview process and Luca accepted it (“That works for us. Comments only”).",
    versions: [{
      wording: "Wildframe shares every shot featuring an Aurel timepiece for comment at least five working days before picture lock. Aurel's comments are advisory; editorial decisions stay with Wildframe.",
      ownerSide: "A", owner: "Priya Nair", strength: "hard", at: ts(-31, 15), by: "Accord AI",
      signedBy: [["A", "maya", ts(-30, 9)], ["B", "luca", ts(-29, 16)]],
    }],
  });
  item("roughcut", {
    meeting: "m2", kind: "deadline", title: "Episode 1 rough cut", segmentIds: seg("m2", 6), confidence: 0.9, raisedBy: "A",
    rationale: "A specific date was stated by the owner and acknowledged by Aurel.",
    versions: [{
      wording: `Wildframe shares the episode 1 rough cut with Aurel by ${d(-15)}.`, ownerSide: "A", owner: "Priya Nair",
      due: d(-15), dueText: `by ${d(-15)}`, strength: "hard", at: ts(-31, 15), by: "Accord AI",
      signedBy: [["A", "maya", ts(-30, 9)], ["B", "luca", ts(-29, 16)]],
    }],
  });
  item("social", {
    meeting: "m2", kind: "one_sided", title: "Weekly social posts from set", segmentIds: seg("m2", 7, 8), confidence: 0.58, raisedBy: "B",
    rationale: "Stated by Aurel as an expectation; Wildframe changed topic without responding. Silence is not agreement.",
    flags: [{ type: "silence", note: "No response from Wildframe before the topic changed. This should not be treated as agreed." }],
    versions: [{ wording: "Wildframe provides weekly social posts from the Patagonia set for Aurel's channels.", ownerSide: "A", at: ts(-31, 15), by: "Accord AI" }],
  });
  clarify("c-social", "social", {
    category: "silence", toSide: "A", toName: "Maya Chen", at: ts(-31, 15),
    question: "Luca mentioned Aurel's social team “will expect weekly posts from the set”. Wildframe didn't respond before the topic changed. Was this agreed, and who would produce the posts?",
    meanings: ["Agreed: Wildframe produces weekly posts", "Not agreed yet — needs scoping and budget", "Aurel's team produces posts from Wildframe's stills"],
  });
  item("summit", {
    meeting: "m2", kind: "soft_ask", title: "Alternative summit version of the Base Camp vignette", segmentIds: seg("m2", 2, 3), confidence: 0.72, raisedBy: "B",
    rationale: "“Perhaps it would be good to see…” is a polite request form; it may have been meant as a request rather than an idea.",
    flags: [{ type: "soft_ask", note: "This may have been meant as a request. Wildframe may want to confirm before scheduling the work." }],
    versions: [{ wording: "Wildframe cuts an alternative sunrise-summit version of the Base Camp vignette for Aurel to review.", ownerSide: "A", owner: "Jordan Okafor", at: ts(-31, 15), by: "Accord AI" }],
  });
  item("premiere", {
    meeting: "m2", kind: "commitment", title: "Co-branded premiere in Geneva", segmentIds: [...seg("m2", 9, 10), ...seg("m3", 10, 11)], confidence: 0.7, raisedBy: "B",
    rationale: "Both sides said “Q1” / “first quarter”, which can map to different months depending on the fiscal calendar.",
    flags: [{ type: "vague_time", note: "“First quarter” may refer to a fiscal quarter. Aurel's fiscal year starts in July." }],
    versions: [{
      wording: "Aurel Watches hosts a co-branded Season 3 premiere in Geneva in late January 2027; Wildframe provides the screening copy.",
      ownerSide: "B", owner: "Luca Brunner", due: "2027-01-29", dueText: "late January (“the first quarter”)", strength: "soft", at: ts(-31, 15), by: "Accord AI",
    }],
  });
  clarify("c-q1", "premiere", {
    category: "vague_time", toSide: "B", toName: "Sophie Keller", at: ts(-31, 15),
    question: "Aurel said “the first quarter” and Wildframe said “Q1 — January”. Aurel's fiscal year starts in July, so its Q1 may mean July–September. Which months do both sides mean?",
    meanings: ["Calendar Q1 2027 (January–March)", "Aurel fiscal Q1 (July–September 2027)"],
    answer: ["Calendar Q1 — late January 2027, in Geneva. Aurel hosts.", "Luca Brunner", ts(-9, 14, 40)],
  });

  // ---- Meeting 3 (the demo meeting) ---------------------------------------------
  item("prototypes", {
    meeting: "m3", kind: "commitment", title: "Watch prototypes for filming", segmentIds: seg("m3", 3), confidence: 0.92, raisedBy: "B",
    rationale: "Sophie stated a specific quantity, destination and date.",
    versions: [{
      wording: `Aurel Watches ships two watch prototypes to Wildframe's Buenos Aires production office by ${d(8)}.`,
      ownerSide: "B", owner: "Sophie Keller", due: d(8), dueText: `by ${d(8)}`, strength: "hard", at: ts(-9, 15), by: "Accord AI",
      signedBy: [["A", "maya", ts(-8, 9)]],
    }],
  });
  item("footage", {
    meeting: "m3", kind: "ambiguous", title: "Footage “by spring”", segmentIds: seg("m3", 4, 5), confidence: 0.55, raisedBy: "B",
    rationale: "“It would be nice” softens what may be a firm request, and “spring” means different months in Geneva and Patagonia.",
    interpretations: [
      { meaning: "Firm deadline: footage by 20 March 2027 (northern spring)", likelihood: 0.45 },
      { meaning: "Footage captured during the Patagonia spring shoot (Sep–Nov 2026)", likelihood: 0.35 },
      { meaning: "A preference with no fixed date", likelihood: 0.2 },
    ],
    flags: [
      { type: "soft_ask", note: "“It would be nice” may have been meant as a firm request. Please confirm." },
      { type: "vague_time", note: "“Spring” differs by hemisphere: March–May in Geneva, September–November in Patagonia." },
    ],
    versions: [{ wording: "Wildframe delivers finished vignette footage to Aurel by spring.", ownerSide: "A", dueText: "by spring", strength: "unclear", at: ts(-9, 15), by: "Accord AI" }],
  });
  clarify("c-footage", "footage", {
    category: "vague_time", toSide: "B", toName: "Luca Brunner", at: ts(-9, 15),
    question: "Luca said “it would be nice to have the footage by spring.” Is this a firm request with a deadline, or a preference? And which spring — Geneva's (March–May 2027) or Patagonia's (September–November 2026)?",
    meanings: ["Firm: by 20 March 2027", "Firm: during the Patagonia shoot", "Preference only"],
  });
  item("finalcut", {
    meeting: "m3", kind: "request_firm", title: "Final cut approval for Aurel", segmentIds: seg("m3", 6, 7, 8), confidence: 0.89, raisedBy: "B",
    rationale: "Direct request from Luca; Wildframe declined and Aurel accepted the preview process instead.",
    declined: "Editorial independence — replaced by the product-shot preview process.",
    versions: [{ wording: "Aurel Watches has final cut approval on all branded vignettes.", ownerSide: "A", at: ts(-9, 15), by: "Accord AI" }],
  });
  item("placement", {
    meeting: "m3", kind: "ambiguous", title: "Product placement approvals", segmentIds: seg("m3", 9), confidence: 0.6, raisedBy: "B",
    rationale: "“We will handle” names no person and no turnaround time.",
    flags: [{ type: "unclear_owner", note: "No named owner or turnaround — Wildframe can't plan the edit schedule around it yet." }],
    versions: [{ wording: "Aurel Watches handles product placement approvals.", ownerSide: "B", at: ts(-9, 15), by: "Accord AI" }],
  });
  clarify("c-placement", "placement", {
    category: "unclear_owner", toSide: "B", toName: "Hiroshi Tanaka", at: ts(-9, 15),
    question: "Hiroshi said “we will handle the product placement approvals.” Who at Aurel will approve, and what turnaround should Wildframe plan for?",
  });
  item("weather", {
    meeting: "m3", kind: "concern_or_risk", title: "Patagonia weather window", segmentIds: seg("m3", 12), confidence: 0.86, raisedBy: "A",
    rationale: "Jordan flagged a schedule risk explicitly.",
    versions: [{ wording: "The Patagonia weather window could delay principal photography by up to two weeks.", ownerSide: "A", at: ts(-9, 15), by: "Accord AI" }],
  });
  item("bts", {
    meeting: "m3", kind: "commitment", title: "Behind-the-scenes photo package", segmentIds: seg("m3", 13), confidence: 0.8, raisedBy: "A",
    rationale: "Offered by Maya; no date yet.",
    versions: [{ wording: "Wildframe delivers a behind-the-scenes photo package of about 40 images to Aurel after the Patagonia shoot.", ownerSide: "A", owner: "Priya Nair", strength: "soft", at: ts(-9, 15), by: "Accord AI" }],
  });

  const base: DemoState = {
    schema: 3, createdAt: now.toISOString(), meetings, segments, items, clarifications, library: sampleRecords(now),
    tasks: sampleTasks(d),
    goals: [
      { id: "g-premiere", side: null, private: false, title: "Launch Season 3 with a co-branded premiere in Geneva", criteria: "Premiere hosted by Aurel in late January 2027; both brands on all launch materials.", progress: 55, status: "on_track", summary: "Date and host agreed. The early “Q1” mismatch was caught and resolved. Guest list and press plan are open." },
      { id: "g-schedule", side: "A", private: false, title: "Deliver all branded content on schedule", criteria: "Every vignette reaches Aurel on or before its signed date.", progress: 45, status: "at_risk", summary: "Episode 1 rough cut arrived 3 days late; weather is a known risk for vignettes 2–4." },
      { id: "g-editorial", side: "A", private: true, title: "Protect editorial independence", criteria: "No sponsor approval rights over the edit; previews and comments only.", progress: 90, status: "on_track", summary: "Aurel accepted the preview-and-comment process twice; final cut was declined without friction." },
      { id: "g-funding", side: "A", private: true, title: "Secure CHF 1.2M+ in Season 3 funding", criteria: "Signed sponsorship of at least CHF 1.2M.", progress: 100, status: "achieved", summary: "CHF 1.2M signed; a further CHF 150k is pending in the vignette amendment." },
      { id: "g-views", side: "B", private: true, title: "Reach 5M views of Aurel-branded content", criteria: "5M combined views within 3 months of the premiere.", progress: 30, status: "at_risk", summary: "Weekly social posts are not yet agreed; the fourth vignette helps once signed." },
      { id: "g-expedition", side: "B", private: true, title: "Position Aurel as the expedition-grade watch", criteria: "Watches shown in real expedition conditions in at least 3 episodes.", progress: 60, status: "on_track", summary: "Prototypes will be filmed in Patagonia; the Night Sky concept lands the positioning." },
    ],
    expectations: [
      { id: "e1", side: "A", meeting: "m3", kind: "must_answer", text: "Will Aurel fund a fourth vignette?", status: "answered", evidence: "Yes — CHF 150,000 for episode 8." },
      { id: "e2", side: "A", meeting: "m3", kind: "must_answer", text: "Is it clear that final cut stays with Wildframe?", status: "answered", evidence: "Aurel accepted the preview process instead." },
      { id: "e3", side: "A", meeting: "m3", kind: "avoid_topic", text: "Don't negotiate the weekly social posts before we've costed them.", status: "answered", evidence: null },
      { id: "e4", side: "B", meeting: "m3", kind: "must_answer", text: "Can we get final cut approval on the vignettes?", status: "answered", evidence: "No — Wildframe keeps final cut; previews stay." },
      { id: "e5", side: "B", meeting: "m3", kind: "must_answer", text: "When exactly will we receive the footage?", status: "partial", evidence: "Only “spring” was mentioned — still unclear which spring." },
      { id: "e6", side: "B", meeting: "m3", kind: "desired_outcome", text: "Add a fourth vignette for episode 8.", status: "answered", evidence: "Wildframe agreed." },
    ],
    notes: [
      { id: "n1", side: "A", by: "Maya Chen", text: "Let's hold firm on final cut — offer the extra vignette as the trade.", at: ts(-9, 14, 20) },
      { id: "n2", side: "A", by: "Priya Nair", text: "Careful with “spring” — they may mean March.", at: ts(-9, 14, 30) },
      { id: "n3", side: "B", by: "Luca Brunner", text: "We can live without final cut if we get the fourth vignette.", at: ts(-9, 14, 22) },
      { id: "n4", side: "B", by: "Hiroshi Tanaka", text: "The addendum still needs CEO sign-off before we countersign anything new.", at: ts(-9, 14, 25) },
    ],
    events: [
      { id: "ev-3", at: ts(-8, 9), actor: "Maya Chen", side: "A", private: false, text: "signed “Watch prototypes for filming” (v1) for Wildframe Media" },
      { id: "ev-2", at: ts(-8, 9), actor: "Maya Chen", side: "A", private: false, text: "signed “Branded vignettes” (amendment v2) for Wildframe Media" },
      { id: "ev-1", at: ts(-9, 15, 5), actor: "Maya Chen", side: "A", private: false, text: "declined “Final cut approval for Aurel”: editorial independence" },
    ],
    scan: null,
    dismissedFlags: [],
  };
  return { ...base, items: base.items.map((i) => ({ ...i, status: deriveStatus(base, i) })) };
}

/** The same delivery tasks as the database seed, per side. */
function sampleTasks(d: (offset: number) => string): DemoState["tasks"] {
  const t = (id: string, title: string, side: SideKey, owner: string, due: number | null, done = false, itemId: string | null = null) =>
    ({ id, title, side, owner, due: due === null ? null : d(due), done, itemId });
  return [
    t("t-cue", "Share the music cue sheet for episode 1", "A", "Jordan Okafor", -2),
    t("t-travel", "Book Patagonia crew travel", "A", "Priya Nair", 3, false, "prototypes"),
    t("t-fallback", "Prepare a fallback if the prototypes arrive late", "A", "Maya Chen", 6, false, "prototypes"),
    t("t-v1", "Vignette 1 — Night Sky (episode 2)", "A", "Jordan Okafor", 10, false, "vignettes"),
    t("t-v2", "Vignette 2 — Glacier (episode 4)", "A", "Jordan Okafor", 40, false, "vignettes"),
    t("t-invoice2", "Invoice instalment 2 on episode 4 delivery", "A", "Maya Chen", 75, false, "fee"),
    t("t-roughcut", "Deliver the episode 1 rough cut", "A", "Priya Nair", -12, true, "roughcut"),
    t("t-logo", "Send Aurel logo lockups for the end credits", "B", "Sophie Keller", -6, false, "credits"),
    t("t-legal", "Finish the legal review of the sponsorship addendum", "B", "Hiroshi Tanaka", -3, false, "fee"),
    t("t-ceo", "Brief the CEO on Season 3 ROI", "B", "Luca Brunner", 4),
    t("t-ship", "Ship two watch prototypes to Buenos Aires", "B", "Sophie Keller", 8, false, "prototypes"),
    t("t-guests", "Draft the premiere guest list", "B", "Luca Brunner", 20, false, "premiere"),
    t("t-pay1", "Pay instalment 1 (CHF 600,000)", "B", "Sophie Keller", -40, true, "fee"),
  ];
}

export const sideLabel = (s: SideKey | null) => (s ? SIDES[s].label : "Joint");
