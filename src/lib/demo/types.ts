import type { DemoUserKey } from "@/lib/setup/demo-ids";

export type SideKey = "A" | "B";
export type PersonaKey = "maya" | "luca";
export type MeetingKey = "m1" | "m2" | "m3" | "m4";

export type ItemKind =
  | "commitment" | "request_firm" | "soft_ask" | "question" | "ambiguous" | "deadline" | "decision"
  | "concern_or_risk" | "dependency" | "positive_feedback" | "negative_feedback" | "open_issue" | "one_sided" | "money";
export type ItemStatus = "proposed" | "needs_clarification" | "clarified" | "partially_signed" | "committed" | "declined";
export type VersionStatus = "draft" | "in_force" | "superseded" | "void";
export type DeadlineStrength = "hard" | "soft" | "aspirational" | "unclear";
export type ClarificationCategory =
  | "soft_ask" | "hedged_yes" | "vague_time" | "unclear_owner" | "term_mismatch" | "silence" | "mismatch" | "scope" | "other";

export interface DemoPerson {
  key: DemoUserKey;
  name: string;
  title: string;
  side: SideKey;
  canSign: boolean;
}

export interface DemoSide {
  key: SideKey;
  label: string;
  color: string;
}

export interface DemoMeeting {
  key: MeetingKey;
  title: string;
  date: string;
  status: "prep" | "live" | "review" | "done";
}

export interface DemoSegment {
  id: string;
  meeting: MeetingKey;
  index: number;
  speaker: DemoUserKey;
  side: SideKey;
  text: string;
  startMs: number;
}

export interface DemoVersion {
  version: number;
  wording: string;
  ownerSide: SideKey | null;
  ownerName: string | null;
  due: string | null;
  dueText: string | null;
  strength: DeadlineStrength | null;
  amount: number | null;
  currency: string | null;
  hash: string;
  status: VersionStatus;
  amendsVersion: number | null;
  createdBy: string;
  createdAt: string;
}

export interface DemoSignature {
  version: number;
  side: SideKey;
  by: DemoUserKey;
  byName: string;
  at: string;
  /** Hash of the exact wording signed — must equal the version hash. */
  wordingHash: string;
}

export interface CulturalFlag {
  type: ClarificationCategory;
  note: string;
}

export interface DemoItem {
  id: string;
  meeting: MeetingKey;
  kind: ItemKind;
  title: string;
  status: ItemStatus;
  currentVersion: number;
  versions: DemoVersion[];
  signatures: DemoSignature[];
  segmentIds: string[];
  confidence: number;
  rationale: string;
  flags: CulturalFlag[];
  interpretations: { meaning: string; likelihood: number }[];
  raisedBySide: SideKey;
  declinedReason: string | null;
}

export interface DemoClarification {
  id: string;
  itemId: string;
  category: ClarificationCategory;
  question: string;
  meanings: string[];
  toSide: SideKey;
  toName: string | null;
  status: "open" | "resolved" | "dismissed";
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  raisedBy: string;
  createdAt: string;
  /** Set when the clarification came from an ambiguity-scan flag. */
  flagId: string | null;
}

export interface DemoGoal {
  id: string;
  side: SideKey | null;
  private: boolean;
  title: string;
  criteria: string;
  progress: number;
  status: "on_track" | "at_risk" | "off_track" | "achieved";
  summary: string;
}

export interface DemoExpectation {
  id: string;
  side: SideKey;
  meeting: MeetingKey;
  kind: "must_answer" | "desired_outcome" | "avoid_topic";
  text: string;
  status: "unanswered" | "partial" | "answered";
  evidence: string | null;
}

export interface DemoNote {
  id: string;
  side: SideKey;
  by: string;
  text: string;
  at: string;
}

export interface DemoEvent {
  id: string;
  at: string;
  actor: string;
  side: SideKey | null;
  /** Private events are only shown to their own side. */
  private: boolean;
  text: string;
}

export interface AmbiguityFlagView {
  id: string;
  segmentIndex: number;
  quote: string;
  category: ClarificationCategory;
  mayMean: string[];
  note: string;
  question: string;
  askSide: SideKey;
  askPerson: string | null;
  confidence: number;
}

export interface ScanResult {
  source: "claude" | "pregenerated";
  model: string | null;
  notice: string | null;
  scannedAt: string;
  flags: AmbiguityFlagView[];
}

export interface DemoState {
  schema: 1;
  createdAt: string;
  meetings: DemoMeeting[];
  segments: DemoSegment[];
  items: DemoItem[];
  clarifications: DemoClarification[];
  goals: DemoGoal[];
  expectations: DemoExpectation[];
  notes: DemoNote[];
  events: DemoEvent[];
  scan: ScanResult | null;
  dismissedFlags: string[];
}
