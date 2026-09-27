export interface ActivityRow {
  id: number;
  action: "insert" | "update" | "delete";
  entity: string;
  entity_id: string | null;
  data: Record<string, unknown>;
  at: string;
  side_id: string | null;
  visibility: "shared" | "private_to_side";
  actor: { full_name: string } | null;
}

/** Entities worth showing in feeds (everything is still kept in the audit log). */
const NOUN: Record<string, string> = { goals: "a goal", health_notes: "a health note", memory_entries: "a memory entry" };

const change = (a: ActivityRow, key: string): [unknown, unknown] | null => {
  const v = a.data?.[key];
  return Array.isArray(v) && v.length === 2 ? [v[0], v[1]] : null;
};

/** A short human sentence for an audit event, or null for noise we don't show in feeds. */
export function describeActivity(a: ActivityRow, titles: Map<string, string>): string | null {
  const title = (id: unknown) => (typeof id === "string" && titles.get(id) ? `“${titles.get(id)}”` : null);
  const d = a.data ?? {};
  switch (a.entity) {
    case "signatures":
      return `signed ${title(d.item_id) ?? "a commitment"}`;
    case "items": {
      if (a.action === "insert") return `raised ${title(a.entity_id) ?? `“${d.title}”`}`;
      const st = change(a, "status");
      if (st?.[1] === "committed") return `— ${title(a.entity_id)} is now committed by all sides`;
      if (st?.[1] === "declined") return `declined ${title(a.entity_id)}`;
      if (change(a, "current_version")) return `proposed new wording for ${title(a.entity_id)}`;
      return null;
    }
    case "clarifications": {
      if (a.action === "insert") return `asked for clarification on ${title(d.item_id) ?? "an item"}`;
      const st = change(a, "status");
      return st?.[1] === "resolved" ? "resolved a clarification" : null;
    }
    case "tasks": {
      if (a.action === "insert") return `added task ${title(a.entity_id) ?? `“${d.title}”`}`;
      const st = change(a, "status");
      if (st) return `moved ${title(a.entity_id) ?? "a task"} to ${String(st[1]).replace("_", " ")}`;
      if (change(a, "due_date")) return `changed the due date of ${title(a.entity_id) ?? "a task"}`;
      if (change(a, "assignee_id")) return `reassigned ${title(a.entity_id) ?? "a task"}`;
      return null;
    }
    case "meetings":
      return a.action === "insert" ? `scheduled ${title(a.entity_id) ?? `“${d.title}”`}` : null;
    case "side_members":
      return a.action === "insert" ? "added a member" : change(a, "role") || change(a, "can_sign") ? "changed a member's role" : null;
    case "partnerships":
      return a.action === "insert" ? "created the partnership" : null;
    case "sides":
      return change(a, "claimed_at") ? "claimed their side" : null;
    case "meeting_participants":
    case "transcript_segments":
    case "item_versions":
    case "goal_evidence":
    case "invites":
      return null;
    default:
      return a.action === "insert" && NOUN[a.entity] ? `added ${NOUN[a.entity]}` : null;
  }
}

/** Who to credit: AI extractions are attributed to the assistant, not to whoever was in the session. */
export function activityActor(a: ActivityRow): string {
  if (a.action === "insert" && (a.entity === "items" || a.entity === "clarifications") && a.data?.source === "ai") {
    return "Accord AI";
  }
  return a.actor?.full_name ?? "Accord";
}
