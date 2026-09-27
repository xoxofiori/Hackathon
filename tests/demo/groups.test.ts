import { describe, expect, it } from "vitest";
import { initialDemoState } from "../../src/lib/demo/sample-state";
import { assignGroup, createGroup, deleteGroup, groupSummary, recolorGroup, renameGroup, suggestGroupByRules } from "../../src/lib/meetings/groups";
import { parseTranscript } from "../../src/lib/meetings/parse";
import { sampleLines } from "../../src/lib/meetings/sample";

const NOW = new Date("2026-09-27T12:00:00Z");
const fresh = () => initialDemoState(NOW);
const d = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString().slice(0, 10);

describe("sample groups", () => {
  it("has 6 sample meetings across 3 groups", () => {
    const s = fresh();
    expect(s.library).toHaveLength(6);
    expect(s.groups.map((g) => g.name)).toEqual(["Aurel sponsorship", "Season 3 post-production", "Streaming & distribution"]);
    const count = (id: string) => s.library.filter((m) => m.groupId === id).length;
    expect([count("g-aurel"), count("g-post"), count("g-dist")]).toEqual([3, 2, 1]);
  });
});

describe("rule-based suggestions (no API key)", () => {
  const groups = fresh().groups;
  it.each([["m3", "g-aurel"], ["m1", "g-aurel"], ["p1", "g-post"], ["p2", "g-post"], ["d1", "g-dist"]] as const)(
    "sample %s is matched to %s from its transcript",
    (key, group) => {
      const s = suggestGroupByRules("", sampleLines(key, d), groups);
      expect(s.groupId).toBe(group);
      expect(s.reason).toMatch(/Mentions/);
    },
  );

  it("suggests a new group named after the partner when nothing fits", () => {
    const lines = parseTranscript([
      "Ana Costa: Kestrel Films wants to co-produce a nature special for next year.",
      "Ben Okoye: Kestrel Films has a strong team in Cape Town.",
      "Ana Costa: Let's ask Kestrel Films for a proposal by Friday.",
    ].join("\n"));
    const s = suggestGroupByRules("Co-production call", lines, groups);
    expect(s.groupId).toBeNull();
    expect(s.newName).toBe("Kestrel Films");
    expect(s.terms).toContain("Kestrel Films");
  });
});

describe("group actions", () => {
  it("create, assign (group learns the meeting's terms), rename, recolor, delete", () => {
    let s = fresh();
    const r = createGroup(s, "Kestrel Films");
    s = r.state;
    expect(createGroup(s, "kestrel films").group.id).toBe(r.group.id); // no duplicates
    s = { ...s, library: s.library.map((m) => (m.id === "d1" ? { ...m, groupSuggestion: { groupId: null, newName: "x", reason: "", confidence: 1, source: "rules", terms: ["Cape Town"] } } : m)) };
    s = assignGroup(s, "d1", r.group.id);
    expect(s.library.find((m) => m.id === "d1")!.groupId).toBe(r.group.id);
    expect(s.library.find((m) => m.id === "d1")!.groupSuggestion).toBeNull();
    expect(s.groups.find((g) => g.id === r.group.id)!.keywords).toContain("cape town");
    s = renameGroup(recolorGroup(s, r.group.id, "#be123c"), r.group.id, "Kestrel co-production");
    expect(s.groups.find((g) => g.id === r.group.id)).toMatchObject({ name: "Kestrel co-production", color: "#be123c" });
    s = deleteGroup(s, r.group.id);
    expect(s.groups.some((g) => g.id === r.group.id)).toBe(false);
    expect(s.library.find((m) => m.id === "d1")!.groupId).toBeNull(); // meeting kept, now unsorted
    expect(s.library).toHaveLength(6);
  });
});

describe("group summary", () => {
  it("lists open commitments and upcoming deadlines, soonest first", () => {
    const s = fresh();
    const aurel = groupSummary(s, "g-aurel", d(0));
    expect(aurel.meetings.map((m) => m.id)).toEqual(["m3", "m2", "m1"]);
    expect(aurel.openCommitments.map((c) => c.title)).toContain("Watch prototypes for filming");
    expect(aurel.openCommitments.some((c) => c.title === "Presenting sponsorship fee")).toBe(false); // approved
    const post = groupSummary(s, "g-post", d(0));
    expect(post.openCommitments.map((c) => c.title)).toContain("Colour grade episodes 1–4");
    const dates = post.upcoming.map((u) => u.due!);
    expect(dates.length).toBeGreaterThan(2);
    expect(dates).toEqual([...dates].sort());
    expect(dates.every((x) => x >= d(0))).toBe(true);
  });
});

describe("migrating older saved demos", () => {
  it("keeps sign-offs and created meetings, adds groups and the new sample meetings", async () => {
    const { migrateDemoState } = await import("../../src/lib/demo/sample-state");
    const { sign } = await import("../../src/lib/demo/engine");
    const signed = sign(fresh(), "luca", "prototypes");
    const v3 = {
      ...signed, schema: 3,
      library: [
        ...signed.library.filter((m) => ["m1", "m2", "m3"].includes(m.id)).map((m) => ({ ...m, groupId: undefined, groupSuggestion: undefined })),
        { ...signed.library[0], id: "mtg-mine", title: "My own meeting", groupId: undefined, groupSuggestion: undefined },
      ],
      groups: undefined,
    };
    const out = migrateDemoState(v3, NOW)!;
    expect(out.schema).toBe(4);
    expect(out.items.find((i) => i.id === "prototypes")!.status).toBe("committed");
    expect(out.groups).toHaveLength(3);
    expect(out.library.find((m) => m.id === "m3")!.groupId).toBe("g-aurel");
    expect(out.library.find((m) => m.id === "mtg-mine")!.groupId).toBeNull();
    expect(out.library.map((m) => m.id)).toEqual(expect.arrayContaining(["p1", "p2", "d1", "mtg-mine"]));
    expect(migrateDemoState({ schema: 99 })).toBeNull();
  });
});
