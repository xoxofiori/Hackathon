import { describe, expect, it } from "vitest";
import { approvableItems, approvalStatus, groupFor, todosFor } from "../../src/lib/demo/approvals";
import { answerClarification, askClarification, DemoRuleError, sign, toggleTask } from "../../src/lib/demo/engine";
import { initialDemoState } from "../../src/lib/demo/sample-state";
import type { DemoState } from "../../src/lib/demo/types";

const fresh = () => initialDemoState(new Date("2026-09-27T12:00:00Z"));
const item = (s: DemoState, id: string) => s.items.find((i) => i.id === id)!;

describe("simplified approval statuses", () => {
  it("maps every item to Pending, Approved or Pushed back", () => {
    const s = fresh();
    expect(approvalStatus(s, item(s, "fee"))).toBe("approved");
    expect(approvalStatus(s, item(s, "prototypes"))).toBe("pending");
    expect(approvalStatus(s, item(s, "footage"))).toBe("pushed_back"); // open question
    expect(approvalStatus(s, item(s, "finalcut"))).toBe("pushed_back"); // declined
    expect(approvableItems(s).some((i) => i.kind === "concern_or_risk" || i.kind === "positive_feedback")).toBe(false);
  });

  it("groups by what the viewer has to do", () => {
    const s = fresh();
    expect(groupFor(s, item(s, "prototypes"), "luca")).toBe("needs_you"); // Wildframe approved, Aurel hasn't
    expect(groupFor(s, item(s, "prototypes"), "maya")).toBe("waiting");
    expect(groupFor(s, item(s, "footage"), "luca")).toBe("needs_you"); // question addressed to Aurel
    expect(groupFor(s, item(s, "footage"), "maya")).toBe("waiting");
    expect(groupFor(s, item(s, "fee"), "maya")).toBe("closed");
  });

  it("push back → answer → approve by both moves a card from Pushed back to Approved", () => {
    let s = askClarification(fresh(), "luca", "bts", "Is it at least 40 images?");
    expect(approvalStatus(s, item(s, "bts"))).toBe("pushed_back");
    expect(groupFor(s, item(s, "bts"), "maya")).toBe("needs_you");
    s = answerClarification(s, "maya", s.clarifications.at(-1)!.id, "Yes, at least 40.");
    s = sign(sign(s, "maya", "bts"), "luca", "bts");
    expect(approvalStatus(s, item(s, "bts"))).toBe("approved");
  });
});

describe("to-dos", () => {
  it("only contain the viewer's company, blocking answers first, then soonest deadline", () => {
    const s = fresh();
    const aurel = todosFor(s, "luca");
    const wildframe = todosFor(s, "maya");
    const aurelTasks = aurel.filter((t) => t.kind === "task").map((t) => t.taskId);
    expect(aurelTasks).toContain("t-logo");
    expect(aurelTasks).not.toContain("t-cue"); // Wildframe's task
    expect(wildframe.filter((t) => t.kind === "task").map((t) => t.taskId)).not.toContain("t-logo");
    expect(aurel[0].kind).toBe("answer");
    const dated = aurel.filter((t) => t.kind !== "answer" && !t.done && t.due).map((t) => t.due!);
    expect(dated).toEqual([...dated].sort());
    expect(aurel.at(-1)!.done).toBe(true);
  });

  it("people check off their own side's tasks only", () => {
    const s = toggleTask(fresh(), "luca", "t-logo");
    expect(s.tasks.find((t) => t.id === "t-logo")!.done).toBe(true);
    expect(() => toggleTask(fresh(), "maya", "t-logo")).toThrow(DemoRuleError);
  });
});
