import { describe, expect, it } from "vitest";
import {
  answerClarification, askClarification, decline, DemoRuleError, dismissFlag, itemForFlag, proposeChanges, raiseFlag, sign,
} from "../../src/lib/demo/engine";
import { initialDemoState } from "../../src/lib/demo/sample-state";
import { PREGENERATED_FLAGS, toFlagViews, AmbiguityScanSchema } from "../../src/lib/demo/flags";
import { SAMPLE_TRANSCRIPTS } from "../../src/lib/sample/wildframe-aurel";
import type { DemoState } from "../../src/lib/demo/types";

const fresh = () => initialDemoState(new Date("2026-09-27T12:00:00Z"));
const item = (s: DemoState, id: string) => s.items.find((i) => i.id === id)!;

describe("sample state", () => {
  it("has items in every status, matching the database seed", () => {
    const statuses = new Set(fresh().items.map((i) => i.status));
    for (const st of ["proposed", "needs_clarification", "clarified", "partially_signed", "committed", "declined"]) {
      expect(statuses.has(st as never), st).toBe(true);
    }
    const s = fresh();
    expect(item(s, "vignettes").status).toBe("partially_signed");
    expect(item(s, "vignettes").versions.map((v) => v.status)).toEqual(["in_force", "draft"]);
    expect(item(s, "fee").status).toBe("committed");
    expect(item(s, "footage").status).toBe("needs_clarification");
    expect(item(s, "premiere").status).toBe("clarified");
  });
});

describe("sign-off rules", () => {
  it("cannot sign while a clarification is open", () => {
    expect(() => sign(fresh(), "luca", "footage")).toThrow(/clarification/);
  });

  it("answering the clarification unblocks signing; committed needs both sides", () => {
    let s = fresh();
    const clar = s.clarifications.find((c) => c.itemId === "footage" && c.status === "open")!;
    s = answerClarification(s, "luca", clar.id, "Firm: by 20 March 2027");
    expect(item(s, "footage").status).toBe("clarified");
    s = sign(s, "luca", "footage");
    expect(item(s, "footage").status).toBe("partially_signed");
    expect(() => sign(s, "luca", "footage")).toThrow(/already signed/);
    s = sign(s, "maya", "footage");
    expect(item(s, "footage").status).toBe("committed");
    const sigs = item(s, "footage").signatures;
    expect(new Set(sigs.map((x) => x.wordingHash)).size).toBe(1);
  });

  it("an amendment commits only when the other side signs; the original is superseded, not deleted", () => {
    const s = sign(fresh(), "luca", "vignettes");
    const v = item(s, "vignettes");
    expect(v.status).toBe("committed");
    expect(v.versions.map((x) => x.status)).toEqual(["superseded", "in_force"]);
    expect(v.versions[0].wording).toMatch(/three/);
  });

  it("pushback: proposing new wording voids earlier partial signatures", () => {
    let s = proposeChanges(fresh(), "luca", "prototypes", { wording: "Aurel ships three prototypes by the 20th." });
    const p = item(s, "prototypes");
    expect(p.currentVersion).toBe(2);
    expect(p.status).toBe("proposed");
    expect(p.versions[0].status).toBe("void");
    s = sign(s, "luca", "prototypes");
    expect(item(s, "prototypes").status).toBe("partially_signed");
  });

  it("pushback: proposing changes to a committed item creates an amendment and keeps v1 in force", () => {
    const s = proposeChanges(fresh(), "maya", "fee", { wording: "Aurel pays CHF 1,250,000 in two instalments." });
    const fee = item(s, "fee");
    expect(fee.versions.map((v) => v.status)).toEqual(["in_force", "draft"]);
    expect(fee.versions[1].amendsVersion).toBe(1);
    expect(fee.status).toBe("proposed");
  });

  it("pushback: asking a question blocks signing until it is answered", () => {
    let s = askClarification(fresh(), "luca", "prototypes", "Can we ship on the 12th instead?");
    expect(item(s, "prototypes").status).toBe("needs_clarification");
    expect(() => sign(s, "luca", "prototypes")).toThrow(DemoRuleError);
    const c = s.clarifications.at(-1)!;
    expect(c.toSide).toBe("A");
    s = answerClarification(s, "maya", c.id, "Yes, the 12th works.");
    expect(item(s, "prototypes").status).toBe("partially_signed");
  });

  it("decline: signers only, and never for committed items", () => {
    expect(() => decline(fresh(), "maya", "fee", "no")).toThrow(/amendment/);
    const s = decline(fresh(), "luca", "bts", "Not needed");
    expect(item(s, "bts").status).toBe("declined");
    expect(() => sign(s, "maya", "bts")).toThrow(/declined/);
  });

  it("detects tampering with signed content", () => {
    const s = fresh();
    const tampered = { ...s, items: s.items.map((i) => (i.id === "premiere" ? { ...i, versions: i.versions.map((v) => ({ ...v, wording: "changed" })) } : i)) };
    expect(() => sign(tampered, "luca", "premiere")).toThrow(/hash/);
  });
});

describe("ambiguity flags", () => {
  const lines = SAMPLE_TRANSCRIPTS.m3((n) => String(n));

  it("pre-generated flags validate against the schema and quote the transcript verbatim", () => {
    expect(AmbiguityScanSchema.safeParse(PREGENERATED_FLAGS).success).toBe(true);
    for (const f of PREGENERATED_FLAGS.flags) expect(lines[f.segment_index][1]).toContain(f.quote);
  });

  it("flags are phrased as questions, never as assumptions about people", () => {
    for (const f of PREGENERATED_FLAGS.flags) {
      expect(f.question.trim().endsWith("?")).toBe(true);
      expect(f.note + f.question).not.toMatch(/\b(Swiss|Americans?|Europeans?|culture|cultural)\b/i);
    }
  });

  it("paraphrased quotes fall back to the full line; out-of-range indexes are dropped", () => {
    const views = toFlagViews({ flags: [
      { ...PREGENERATED_FLAGS.flags[0], quote: "not in the transcript" },
      { ...PREGENERATED_FLAGS.flags[1], segment_index: 99 },
    ] }, lines);
    expect(views).toHaveLength(1);
    expect(views[0].quote).toBe(lines[1][1]);
  });

  it("raising a flag links it to the right item and blocks signing", () => {
    const flags = toFlagViews(PREGENERATED_FLAGS, lines);
    const money = flags.find((f) => f.segmentIndex === 1)!;
    let s = fresh();
    expect(itemForFlag(s, money)!.id).toBe("vignettes");
    s = raiseFlag(s, "maya", money);
    expect(item(s, "vignettes").status).toBe("needs_clarification");
    expect(() => sign(s, "luca", "vignettes")).toThrow(/clarification/);
    expect(() => raiseFlag(s, "maya", money)).toThrow(/already/);
    s = dismissFlag(s, "maya", flags[5].id);
    expect(s.dismissedFlags).toContain(flags[5].id);
  });
});
