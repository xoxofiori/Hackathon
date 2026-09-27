/**
 * Browser-side sign-off engine for demo mode. It mirrors the rules that the
 * database enforces in live mode (supabase/schema.sql):
 *  - no signing while a clarification on the item is open
 *  - Committed only when every side has signed the same version
 *  - versions are immutable; changes create a new version (an amendment once committed)
 *  - only authorized signers sign or decline; side-private data stays with its side
 * Every action returns a new state or throws DemoRuleError with a readable message.
 */
import { DEMO_PEOPLE, SIDES } from "./people";
import { hashVersion } from "./hash";

export { hashVersion };
import type {
  AmbiguityFlagView, DeadlineStrength, DemoClarification, DemoItem, DemoState, DemoVersion, ItemStatus,
  PersonaKey, SideKey,
} from "./types";

export class DemoRuleError extends Error {}

const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

export const otherSide = (s: SideKey): SideKey => (s === "A" ? "B" : "A");
export const personOf = (persona: PersonaKey) => DEMO_PEOPLE[persona];
export const currentVersion = (item: DemoItem) => item.versions.find((v) => v.version === item.currentVersion)!;
export const inForceVersion = (item: DemoItem) => item.versions.find((v) => v.status === "in_force") ?? null;
export const openClarifications = (state: DemoState, itemId: string) =>
  state.clarifications.filter((c) => c.itemId === itemId && c.status === "open");

/** Same derivation as recompute_item_status() in the database. */
export function deriveStatus(state: DemoState, item: DemoItem): ItemStatus {
  if (item.status === "declined") return "declined";
  const v = currentVersion(item);
  if (v.status === "in_force") return "committed";
  const clars = state.clarifications.filter((c) => c.itemId === item.id);
  if (clars.some((c) => c.status === "open")) return "needs_clarification";
  if (item.signatures.some((s) => s.version === v.version)) return "partially_signed";
  if (clars.length > 0) return "clarified";
  return "proposed";
}

function withItem(state: DemoState, itemId: string, fn: (item: DemoItem) => DemoItem): DemoState {
  const items = state.items.map((i) => (i.id === itemId ? fn(i) : i));
  const next = { ...state, items };
  return { ...next, items: next.items.map((i) => (i.id === itemId ? { ...i, status: deriveStatus(next, i) } : i)) };
}

function log(state: DemoState, persona: PersonaKey | "ai", text: string, opts: { private?: boolean } = {}): DemoState {
  const person = persona === "ai" ? null : personOf(persona);
  return {
    ...state,
    events: [
      { id: newId("ev"), at: new Date().toISOString(), actor: person?.name ?? "Accord AI", side: person?.side ?? null, private: !!opts.private, text },
      ...state.events,
    ],
  };
}

function getItem(state: DemoState, itemId: string): DemoItem {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) throw new DemoRuleError("That item no longer exists.");
  return item;
}

/** Why the persona can't sign right now, or null if they can. */
export function signBlocker(state: DemoState, persona: PersonaKey, item: DemoItem): string | null {
  const me = personOf(persona);
  const v = currentVersion(item);
  if (item.status === "declined") return "This item was declined.";
  if (v.status !== "draft") return "This version is already in force.";
  if (!me.canSign) return "You're not an authorized signer for your side.";
  const open = openClarifications(state, item.id).length;
  if (open > 0) return `Resolve ${open} open clarification${open > 1 ? "s" : ""} before signing.`;
  if (item.signatures.some((s) => s.version === v.version && s.side === me.side)) return "Your side has already signed this version.";
  return null;
}

export function sign(state: DemoState, persona: PersonaKey, itemId: string): DemoState {
  const item = getItem(state, itemId);
  const blocker = signBlocker(state, persona, item);
  if (blocker) throw new DemoRuleError(blocker);
  const me = personOf(persona);
  const v = currentVersion(item);
  if (hashVersion(item.id, v) !== v.hash) throw new DemoRuleError("This version's content hash doesn't match — it may have been tampered with.");
  const at = new Date().toISOString();
  let next = withItem(state, itemId, (i) => {
    const signatures = [...i.signatures, { version: v.version, side: me.side, by: me.key, byName: me.name, at, wordingHash: v.hash }];
    const everySide = (Object.keys(SIDES) as SideKey[]).every((s) => signatures.some((sig) => sig.version === v.version && sig.side === s));
    const versions = everySide
      ? i.versions.map((x) => (x.version === v.version ? { ...x, status: "in_force" as const } : x.status === "in_force" ? { ...x, status: "superseded" as const } : x))
      : i.versions;
    return { ...i, signatures, versions };
  });
  const committed = next.items.find((i) => i.id === itemId)!.status === "committed";
  next = log(next, persona, committed
    ? `signed “${item.title}” — now committed by both sides${v.amendsVersion ? ` (amendment v${v.version} replaces v${v.amendsVersion})` : ""}`
    : `signed “${item.title}” (v${v.version}) for ${SIDES[me.side].label}`);
  return next;
}

export function answerClarification(state: DemoState, persona: PersonaKey, clarId: string, answer: string): DemoState {
  const me = personOf(persona);
  const c = state.clarifications.find((x) => x.id === clarId);
  if (!c) throw new DemoRuleError("That clarification no longer exists.");
  if (c.status !== "open") throw new DemoRuleError("That clarification is already resolved.");
  if (!answer.trim()) throw new DemoRuleError("Write an answer first.");
  const clarifications = state.clarifications.map((x) =>
    x.id === clarId ? { ...x, status: "resolved" as const, answer: answer.trim(), answeredBy: me.name, answeredAt: new Date().toISOString() } : x);
  const next = withItem({ ...state, clarifications }, c.itemId, (i) => i);
  return log(next, persona, `answered a clarification on “${getItem(state, c.itemId).title}”: “${answer.trim()}”`);
}

/** Push back by asking the other side a question. Blocks signing until answered. */
export function askClarification(state: DemoState, persona: PersonaKey, itemId: string, question: string, flag?: AmbiguityFlagView): DemoState {
  const me = personOf(persona);
  const item = getItem(state, itemId);
  if (!question.trim()) throw new DemoRuleError("Write your question first.");
  if (item.status === "declined") throw new DemoRuleError("This item was declined.");
  if (inForceVersion(item) && currentVersion(item).status === "in_force") {
    throw new DemoRuleError("This item is committed. Propose an amendment to change it.");
  }
  const toSide = flag?.askSide ?? otherSide(me.side);
  const clar: DemoClarification = {
    id: newId("cl"), itemId, category: flag?.category ?? "other", question: question.trim(), meanings: flag?.mayMean ?? [],
    toSide, toName: flag?.askPerson ?? null, status: "open", answer: null, answeredBy: null, answeredAt: null,
    raisedBy: me.name, createdAt: new Date().toISOString(), flagId: flag?.id ?? null,
  };
  const next = withItem({ ...state, clarifications: [...state.clarifications, clar] }, itemId, (i) => i);
  return log(next, persona, `asked ${SIDES[toSide].label} to clarify “${item.title}”`);
}

/** Push back by proposing new terms. Creates a new version; earlier unsigned drafts are voided. */
export function proposeChanges(state: DemoState, persona: PersonaKey, itemId: string, patch: {
  wording: string; due?: string | null; dueText?: string | null; strength?: DeadlineStrength | null;
}): DemoState {
  const me = personOf(persona);
  const item = getItem(state, itemId);
  if (me.side === undefined) throw new DemoRuleError("Unknown side.");
  if (item.status === "declined") throw new DemoRuleError("Declined items can't be revised.");
  const cur = currentVersion(item);
  const wording = patch.wording.trim();
  if (!wording) throw new DemoRuleError("The new wording can't be empty.");
  if (wording === cur.wording && (patch.due ?? cur.due) === cur.due) throw new DemoRuleError("Nothing changed — edit the wording or the date.");
  const draft: Omit<DemoVersion, "hash"> = {
    version: item.currentVersion + 1, wording, ownerSide: cur.ownerSide, ownerName: cur.ownerName,
    due: patch.due !== undefined ? patch.due : cur.due, dueText: patch.dueText !== undefined ? patch.dueText : cur.dueText,
    strength: patch.strength !== undefined ? patch.strength : cur.strength, amount: cur.amount, currency: cur.currency,
    status: "draft", amendsVersion: cur.status === "in_force" ? cur.version : null, createdBy: me.name, createdAt: new Date().toISOString(),
  };
  const version: DemoVersion = { ...draft, hash: hashVersion(item.id, draft) };
  const next = withItem(state, itemId, (i) => ({
    ...i,
    currentVersion: version.version,
    versions: [...i.versions.map((x) => (x.version === cur.version && x.status === "draft" ? { ...x, status: "void" as const } : x)), version],
  }));
  return log(next, persona, cur.status === "in_force"
    ? `proposed amendment v${version.version} to “${item.title}” — v${cur.version} stays in force until both sides sign`
    : `proposed new wording (v${version.version}) for “${item.title}” — earlier signatures no longer apply`);
}

export function decline(state: DemoState, persona: PersonaKey, itemId: string, reason: string): DemoState {
  const me = personOf(persona);
  const item = getItem(state, itemId);
  if (!me.canSign) throw new DemoRuleError("Only authorized signers can decline.");
  if (inForceVersion(item)) throw new DemoRuleError("Committed items can't be declined — propose an amendment instead.");
  if (item.status === "declined") throw new DemoRuleError("Already declined.");
  const items = state.items.map((i) => (i.id === itemId ? { ...i, status: "declined" as const, declinedReason: reason.trim() || null } : i));
  return log({ ...state, items }, persona, `declined “${item.title}”${reason.trim() ? `: ${reason.trim()}` : ""}`);
}

export function addNote(state: DemoState, persona: PersonaKey, text: string): DemoState {
  const me = personOf(persona);
  if (!text.trim()) throw new DemoRuleError("Write a note first.");
  const note = { id: newId("note"), side: me.side, by: me.name, text: text.trim(), at: new Date().toISOString() };
  return log({ ...state, notes: [...state.notes, note] }, persona, "added a private note", { private: true });
}

export function setExpectation(state: DemoState, persona: PersonaKey, id: string, status: "unanswered" | "partial" | "answered"): DemoState {
  const me = personOf(persona);
  const e = state.expectations.find((x) => x.id === id);
  if (!e || e.side !== me.side) throw new DemoRuleError("You can only update your own side's expectations.");
  return { ...state, expectations: state.expectations.map((x) => (x.id === id ? { ...x, status } : x)) };
}

/** Item a scan flag is about: the item whose source segments include the flagged line. */
export function itemForFlag(state: DemoState, flag: AmbiguityFlagView): DemoItem | null {
  const seg = state.segments.find((s) => s.meeting === "m3" && s.index === flag.segmentIndex);
  if (!seg) return null;
  const candidates = state.items.filter((i) => i.segmentIds.includes(seg.id));
  return candidates.find((i) => i.status !== "committed" && i.status !== "declined") ?? candidates[0] ?? null;
}

/** Turn a scan flag into a clarification (creating an item for it if nothing covers that line). */
export function raiseFlag(state: DemoState, persona: PersonaKey, flag: AmbiguityFlagView): DemoState {
  let next = state;
  let item = itemForFlag(state, flag);
  if (!item) {
    const seg = state.segments.find((s) => s.meeting === "m3" && s.index === flag.segmentIndex);
    const draft = {
      version: 1, wording: flag.quote, ownerSide: flag.askSide, ownerName: null, due: null, dueText: null,
      strength: null, amount: null, currency: null, status: "draft" as const, amendsVersion: null,
      createdBy: "Accord AI", createdAt: new Date().toISOString(),
    };
    const id = newId("item");
    item = {
      id, meeting: "m3", kind: "ambiguous", title: flag.quote.length > 60 ? `${flag.quote.slice(0, 57)}…` : flag.quote,
      status: "proposed", currentVersion: 1, versions: [{ ...draft, hash: hashVersion(id, draft) }], signatures: [],
      segmentIds: seg ? [seg.id] : [], confidence: flag.confidence, rationale: flag.note,
      flags: [{ type: flag.category, note: flag.note }], interpretations: flag.mayMean.map((m) => ({ meaning: m, likelihood: 0 })),
      raisedBySide: seg?.side ?? "A", declinedReason: null,
    };
    next = { ...next, items: [...next.items, item] };
  }
  if (next.clarifications.some((c) => c.flagId === flag.id)) throw new DemoRuleError("This flag has already been raised.");
  if (item.status === "committed" || item.status === "declined") {
    throw new DemoRuleError(`“${item.title}” is ${item.status}; there's nothing left to clarify.`);
  }
  return askClarification(next, persona, item.id, flag.question, flag);
}

export function dismissFlag(state: DemoState, persona: PersonaKey, flagId: string): DemoState {
  if (state.dismissedFlags.includes(flagId)) return state;
  return log({ ...state, dismissedFlags: [...state.dismissedFlags, flagId] }, persona, "marked an ambiguity flag as not an issue");
}
