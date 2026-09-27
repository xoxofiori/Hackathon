/**
 * The simplified approval view: every signable item is Pending, Approved or
 * Pushed back, and each side gets a short to-do list sorted by deadline.
 */
import { currentVersion, inForceVersion, openClarifications, personOf } from "./engine";
import { SIDES } from "./people";
import type { DemoClarification, DemoItem, DemoState, PersonaKey, SideKey } from "./types";

export type ApprovalStatus = "pending" | "approved" | "pushed_back";

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  pushed_back: "Pushed back",
};

/** Items that are agreements to approve (not risks, feedback or superseded asks). */
const APPROVABLE = new Set(["commitment", "money", "deadline", "request_firm", "one_sided", "ambiguous", "soft_ask"]);
const HIDDEN = new Set(["onscreen", "summit"]); // early asks that were resolved into other commitments

export function approvableItems(state: DemoState): DemoItem[] {
  return state.items.filter((i) => APPROVABLE.has(i.kind) && !HIDDEN.has(i.id));
}

/** Items on the Analysis page ("meeting": the sample meeting plus anything still open) or Commitments ("all"). */
export function boardItems(state: DemoState, scope: "meeting" | "all"): DemoItem[] {
  return approvableItems(state).filter((i) => scope === "all" || i.meeting === "m3" || !["committed", "declined"].includes(i.status));
}

export function approvalStatus(state: DemoState, item: DemoItem): ApprovalStatus {
  if (item.status === "committed") return "approved";
  if (item.status === "declined" || openClarifications(state, item.id).length > 0) return "pushed_back";
  return "pending";
}

export const approvedBy = (item: DemoItem): SideKey[] => {
  const v = currentVersion(item);
  return item.signatures.filter((s) => s.version === v.version).map((s) => s.side);
};

export interface Owner {
  name: string | null;
  side: SideKey | null;
}
export const ownerOf = (item: DemoItem): Owner => {
  const v = currentVersion(item);
  return { name: v.ownerName, side: v.ownerSide };
};

/** When it's due: an ISO date if there is one, otherwise the words used ("by spring"). */
export const whenOf = (item: DemoItem): { date: string | null; text: string | null } => {
  const v = currentVersion(item);
  return { date: v.due, text: v.due ? null : v.dueText };
};

export type Group = "needs_you" | "waiting" | "closed";

/** Which section a card belongs in, from the viewer's point of view. */
export function groupFor(state: DemoState, item: DemoItem, persona: PersonaKey): Group {
  const me = personOf(persona);
  const status = approvalStatus(state, item);
  if (status === "approved" || item.status === "declined") return "closed";
  const open = openClarifications(state, item.id);
  if (open.length) return open.some((c) => c.toSide === me.side) ? "needs_you" : "waiting";
  return approvedBy(item).includes(me.side) ? "waiting" : "needs_you";
}

/** One short sentence on where this item stands, for the card. */
export function standing(state: DemoState, item: DemoItem, persona: PersonaKey): string {
  const me = personOf(persona);
  const other = SIDES[me.side === "A" ? "B" : "A"].label;
  if (item.status === "declined") return `Declined${item.declinedReason ? ` — ${item.declinedReason}` : ""}`;
  if (item.status === "committed") return "Approved by both sides.";
  const open = openClarifications(state, item.id);
  if (open.length) {
    const forMe = open.some((c) => c.toSide === me.side);
    return forMe ? "Your side needs to answer before anyone can approve." : `Waiting for ${other} to answer.`;
  }
  const by = approvedBy(item);
  if (by.includes(me.side)) return `You approved · waiting for ${other}.`;
  if (by.length) return `${SIDES[by[0]].label} approved · waiting for you.`;
  return "Needs approval from both sides.";
}

export const openQuestions = (state: DemoState, item: DemoItem): DemoClarification[] => openClarifications(state, item.id);

export const isAmendment = (item: DemoItem) => !!inForceVersion(item) && currentVersion(item).status === "draft";

// ---------------------------------------------------------------- to-dos

export interface Todo {
  id: string;
  kind: "task" | "approve" | "answer";
  title: string;
  owner: string | null;
  due: string | null;
  done: boolean;
  /** Card to scroll to on the page, if any. */
  itemId: string | null;
  taskId: string | null;
}

/**
 * The viewer's company to-dos: its own tasks, approvals it owes and questions
 * it has to answer. Blocking items (answers) first, then by deadline.
 */
export function todosFor(state: DemoState, persona: PersonaKey): Todo[] {
  const me = personOf(persona);
  const todos: Todo[] = [];
  for (const c of state.clarifications) {
    if (c.status !== "open" || c.toSide !== me.side) continue;
    const item = state.items.find((i) => i.id === c.itemId);
    if (!item || HIDDEN.has(item.id)) continue;
    todos.push({ id: `answer-${c.id}`, kind: "answer", title: `Answer: ${item.title}`, owner: c.toName, due: null, done: false, itemId: item.id, taskId: null });
  }
  for (const item of approvableItems(state)) {
    if (groupFor(state, item, persona) !== "needs_you" || openClarifications(state, item.id).length) continue;
    todos.push({ id: `approve-${item.id}`, kind: "approve", title: `Approve or push back: ${item.title}`, owner: me.canSign ? me.name : null, due: currentVersion(item).due, done: false, itemId: item.id, taskId: null });
  }
  for (const t of state.tasks) {
    if (t.side !== me.side) continue;
    todos.push({ id: t.id, kind: "task", title: t.title, owner: t.owner, due: t.due, done: t.done, itemId: t.itemId, taskId: t.id });
  }
  const rank = (t: Todo) => (t.done ? 3 : t.kind === "answer" ? 0 : t.due ? 1 : 2);
  return todos.sort((a, b) => rank(a) - rank(b) || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}
