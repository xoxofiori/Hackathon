import type { ClarificationCategory, ItemKind, ItemStatus } from "./types";

export const STATUS_LABEL: Record<ItemStatus, string> = {
  proposed: "Proposed",
  needs_clarification: "Needs clarification",
  clarified: "Clarified",
  partially_signed: "Signed by one side",
  committed: "Committed",
  declined: "Declined",
};

export const STATUS_VARIANT: Record<ItemStatus, "muted" | "warning" | "secondary" | "success" | "destructive" | "outline"> = {
  proposed: "muted",
  needs_clarification: "warning",
  clarified: "secondary",
  partially_signed: "outline",
  committed: "success",
  declined: "destructive",
};

export const KIND_LABEL: Record<ItemKind, string> = {
  commitment: "Commitment", request_firm: "Request", soft_ask: "Soft ask", question: "Question", ambiguous: "Ambiguous",
  deadline: "Deadline", decision: "Decision", concern_or_risk: "Risk", dependency: "Dependency",
  positive_feedback: "Positive feedback", negative_feedback: "Negative feedback", open_issue: "Open issue",
  one_sided: "One-sided", money: "Money",
};

export const CATEGORY_LABEL: Record<ClarificationCategory, string> = {
  soft_ask: "Soft ask", hedged_yes: "Hedged yes", vague_time: "Vague timing", unclear_owner: "Unclear owner",
  term_mismatch: "Term mismatch", silence: "Silence ≠ agreement", mismatch: "Mismatch", scope: "Scope unclear", other: "Worth checking",
};

/** Understanding panel groups (section 4A of the brief). */
export const UNDERSTANDING_GROUPS: { label: string; kinds: ItemKind[] }[] = [
  { label: "Agreed", kinds: ["commitment", "decision", "money"] },
  { label: "Soft asks", kinds: ["soft_ask", "one_sided"] },
  { label: "Requests", kinds: ["request_firm"] },
  { label: "Questions", kinds: ["question", "open_issue"] },
  { label: "Ambiguous", kinds: ["ambiguous"] },
  { label: "Deadlines", kinds: ["deadline"] },
  { label: "Risks", kinds: ["concern_or_risk", "dependency", "negative_feedback"] },
  { label: "Feedback", kinds: ["positive_feedback"] },
];

/** Kinds that can become signed commitments. */
export const SIGNABLE_KINDS: ItemKind[] = ["commitment", "money", "deadline", "request_firm", "one_sided", "ambiguous", "soft_ask", "decision"];
