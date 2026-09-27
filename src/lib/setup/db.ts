import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

export async function connect(postgresUrl: string): Promise<Client> {
  if (!postgresUrl) throw new Error("POSTGRES_URL is not set");
  const local = /localhost|127\.0\.0\.1/.test(postgresUrl);
  const client = new Client({
    connectionString: postgresUrl,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

export async function readSchema(): Promise<string> {
  return readFile(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");
}

/** Apply supabase/schema.sql. The file is idempotent, so this is safe to repeat. */
export async function applySchema(client: Client): Promise<void> {
  await client.query(await readSchema());
}

/** Tables wiped by a reset (auth users and profiles are kept). */
export const APP_TABLES = [
  "activity_log", "notifications", "share_links", "deletion_requests", "memory_entries", "partner_profiles",
  "health_notes", "reviews", "pulses", "side_messages", "expectations", "goal_evidence", "goals",
  "task_dependencies", "tasks", "clarifications", "signatures", "item_versions", "items",
  "transcript_segments", "breakouts", "agenda_items", "meeting_participants", "invites", "meetings",
  "side_members", "sides", "partnerships", "org_members", "teams", "organizations",
];

export async function resetData(client: Client): Promise<void> {
  // TRUNCATE does not fire row-level triggers, so append-only guards don't block a dev reset.
  await client.query(`truncate ${APP_TABLES.join(", ")} restart identity cascade`);
}
