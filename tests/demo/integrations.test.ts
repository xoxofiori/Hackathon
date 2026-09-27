import { describe, expect, it } from "vitest";
import { DemoRuleError, sendToLinear, setIntegration } from "../../src/lib/demo/engine";
import { initialDemoState, migrateDemoState } from "../../src/lib/demo/sample-state";

const fresh = () => initialDemoState(new Date("2026-09-27T12:00:00Z"));

describe("integrations (demo only)", () => {
  it("starts disconnected; connecting and disconnecting just flips the flag", () => {
    let s = fresh();
    expect(Object.values(s.integrations).every((i) => !i.connected)).toBe(true);
    s = setIntegration(s, "maya", "notion", true);
    expect(s.integrations.notion.connected).toBe(true);
    expect(s.integrations.notion.connectedAt).not.toBeNull();
    s = setIntegration(s, "maya", "notion", false);
    expect(s.integrations.notion).toEqual({ connected: false, connectedAt: null });
  });

  it("sends only approved commitments to Linear, once each, after Linear is connected", () => {
    let s = fresh();
    expect(() => sendToLinear(s, "maya", "fee")).toThrow(/Connect Linear/);
    s = setIntegration(s, "maya", "linear", true);
    expect(() => sendToLinear(s, "maya", "prototypes")).toThrow(DemoRuleError); // not approved yet
    s = sendToLinear(s, "maya", "fee");
    s = sendToLinear(s, "maya", "credits");
    expect(s.linearIssues.fee).toMatchObject({ key: "ACC-101", createdBy: "Maya Chen" });
    expect(s.linearIssues.credits.key).toBe("ACC-102");
    expect(sendToLinear(s, "maya", "fee")).toBe(s); // no duplicates
  });

  it("older saves gain integrations without losing anything", () => {
    const v4 = { ...fresh(), schema: 4, integrations: undefined, linearIssues: undefined };
    const out = migrateDemoState(v4)!;
    expect(out.schema).toBe(5);
    expect(out.integrations.linear.connected).toBe(false);
    expect(out.linearIssues).toEqual({});
    expect(out.library).toHaveLength(6);
  });
});
