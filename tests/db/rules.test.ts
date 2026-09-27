/**
 * Database rule tests: RLS side isolation and the non-negotiable sign-off rules.
 * Runs against POSTGRES_URL (seeded with `npm run db:setup`). Every test runs in
 * a transaction that is rolled back, so the demo data is never changed.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { DEMO_USERS, IDS, type DemoUserKey } from "../../src/lib/setup/demo-ids";

const url = process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
let db: Client;
const uid = {} as Record<DemoUserKey, string>;

beforeAll(async () => {
  db = new Client({ connectionString: url });
  await db.connect();
  const { rows } = await db.query("select id, email from auth.users where email like '%@demo.accord.app'");
  for (const [key, u] of Object.entries(DEMO_USERS)) {
    const row = rows.find((r) => r.email === u.email);
    if (!row) throw new Error(`Demo user ${u.email} missing — run npm run db:setup first`);
    uid[key as DemoUserKey] = row.id;
  }
});
afterAll(async () => db?.end());

/** Run `fn` as `who` through RLS (role authenticated), then roll back. */
async function as<T>(who: DemoUserKey, fn: (q: Client["query"]) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: uid[who], role: "authenticated" }),
    ]);
    return await fn(db.query.bind(db) as Client["query"]);
  } finally {
    await db.query("rollback");
  }
}

/** Switch identity inside an open `as` transaction. */
const become = (q: Client["query"], who: DemoUserKey) =>
  q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid[who], role: "authenticated" })]);

const count = async (q: Client["query"], sql: string, params: unknown[] = []) =>
  Number((await q(sql, params)).rows[0].n);

describe("RLS: side-private data never crosses sides", () => {
  const privateTables = [
    "goals", "goal_evidence", "expectations", "tasks", "reviews", "health_notes",
    "partner_profiles", "memory_entries", "pulses", "side_messages", "activity_log",
  ];

  it.each(privateTables)("the seed has private %s on both sides (so the checks below are meaningful)", async (table) => {
    for (const side of [IDS.p1A, IDS.p1B]) {
      const n = await count(db.query.bind(db) as Client["query"],
        `select count(*) n from ${table} where visibility = 'private_to_side' and side_id = $1`, [side]);
      expect(n, `${table} private rows for ${side}`).toBeGreaterThan(0);
    }
  });

  it.each(privateTables)("Aurel (Side B) cannot read Wildframe's private %s", async (table) => {
    const n = await as("luca", (q) =>
      count(q, `select count(*) n from ${table} where visibility = 'private_to_side' and side_id = $1`, [IDS.p1A]));
    expect(n).toBe(0);
  });

  it.each(privateTables)("Wildframe (Side A) cannot read Aurel's private %s", async (table) => {
    const n = await as("maya", (q) =>
      count(q, `select count(*) n from ${table} where visibility = 'private_to_side' and side_id = $1`, [IDS.p1B]));
    expect(n).toBe(0);
  });

  it("each side does see its own private rows and all shared rows", async () => {
    const own = await as("maya", (q) =>
      count(q, `select count(*) n from goals where visibility = 'private_to_side' and side_id = $1`, [IDS.p1A]));
    expect(own).toBeGreaterThan(0);
    const shared = await as("luca", (q) => count(q, `select count(*) n from goals where visibility = 'shared'`));
    expect(shared).toBeGreaterThan(0);
  });

  it("a non-member sees nothing from the partnership", async () => {
    const n = await as("olivia", async (q) =>
      (await count(q, "select count(*) n from partnerships where id = $1", [IDS.p1])) +
      (await count(q, "select count(*) n from items where partnership_id = $1", [IDS.p1])) +
      (await count(q, "select count(*) n from transcript_segments where partnership_id = $1", [IDS.p1])));
    expect(n).toBe(0);
  });

  it("a side cannot write a private row for the other side", async () => {
    await expect(as("luca", (q) =>
      q(`insert into goals (partnership_id, side_id, visibility, title) values ($1, $2, 'private_to_side', 'x')`,
        [IDS.p1, IDS.p1A]))).rejects.toThrow(/row-level security/);
  });

  it("partnership_id cannot be forged on child rows", async () => {
    // Olivia is in partnership 2; she tries to attach a clarification to a partnership-1 item.
    const itemId = (await db.query("select id from items where partnership_id = $1 limit 1", [IDS.p1])).rows[0].id;
    await expect(as("olivia", (q) =>
      q(`insert into clarifications (item_id, partnership_id, question) values ($1, $2, 'x')`, [itemId, IDS.p2])))
      .rejects.toThrow(/row-level security/);
  });
});

describe("Sign-off rules", () => {
  const versionOf = async (title: string) =>
    (await db.query(
      `select v.id, i.id item_id from items i join item_versions v on v.item_id = i.id and v.version = i.current_version
       where i.title = $1`, [title])).rows[0] as { id: string; item_id: string };

  it("a commitment cannot be signed while a clarification is open", async () => {
    const v = await versionOf("Weekly social posts from set");
    await expect(as("maya", (q) => q("select sign_item_version($1)", [v.id]))).rejects.toThrow(/clarification/);
  });

  it("resolving the clarification makes it signable; Committed needs every side", async () => {
    const v = await versionOf("Weekly social posts from set");
    await as("maya", async (q) => {
      await q("update clarifications set status = 'resolved', answer = 'Yes, weekly from set' where item_id = $1", [v.item_id]);
      expect((await q("select status from items where id = $1", [v.item_id])).rows[0].status).toBe("clarified");
      expect((await q("select sign_item_version($1) s", [v.id])).rows[0].s).toBe("partially_signed");
      await become(q, "luca");
      expect((await q("select sign_item_version($1) s", [v.id])).rows[0].s).toBe("committed");
      const sigs = (await q("select wording, wording_hash from signatures where item_version_id = $1", [v.id])).rows;
      expect(sigs).toHaveLength(2);
      expect(new Set(sigs.map((s) => s.wording_hash)).size).toBe(1);
    });
  });

  it("a side cannot sign twice, and non-signers cannot sign", async () => {
    const v = await versionOf("Watch prototypes for filming"); // already signed by Wildframe
    await expect(as("maya", (q) => q("select sign_item_version($1)", [v.id]))).rejects.toThrow(/already signed/);
    await expect(as("sophie", (q) => q("select sign_item_version($1)", [v.id]))).rejects.toThrow(/authorized signer/);
    await expect(as("sam", (q) => q("select sign_item_version($1)", [v.id]))).rejects.toThrow(/authorized signer/);
  });

  it("an amendment commits only when all sides sign the new wording; the original is kept", async () => {
    const v = await versionOf("Branded vignettes"); // v2 signed by Wildframe only
    await as("luca", async (q) => {
      expect((await q("select sign_item_version($1) s", [v.id])).rows[0].s).toBe("committed");
      const versions = (await q("select version, status from item_versions where item_id = $1 order by version", [v.item_id])).rows;
      expect(versions).toEqual([{ version: 1, status: "superseded" }, { version: 2, status: "in_force" }]);
    });
  });

  it("revising before commitment voids earlier partial signatures", async () => {
    const v = await versionOf("Watch prototypes for filming");
    await as("maya", async (q) => {
      await q(`select revise_item($1, 'Aurel ships three prototypes', null, $2, null, null, 'hard', null, null)`, [v.item_id, IDS.p1B]);
      const it = (await q("select status, current_version from items where id = $1", [v.item_id])).rows[0];
      expect(it).toEqual({ status: "proposed", current_version: 2 });
      await expect(q("select sign_item_version($1)", [v.id])).rejects.toThrow(/current, unsigned version/);
    });
  });

  it("users cannot set item status directly", async () => {
    const v = await versionOf("Footage \"by spring\"");
    await expect(as("maya", (q) => q("update items set status = 'committed' where id = $1", [v.item_id])))
      .rejects.toThrow(/only through/);
  });
});

describe("Immutability and no hard deletes", () => {
  it("signed versions cannot be edited — even by the database owner", async () => {
    const v = (await db.query("select id from item_versions where status = 'in_force' limit 1")).rows[0];
    await db.query("begin");
    try {
      await expect(db.query("update item_versions set wording = 'changed' where id = $1", [v.id])).rejects.toThrow(/immutable/);
    } finally {
      await db.query("rollback");
    }
  });

  it("signatures and the audit log are append-only", async () => {
    await db.query("begin");
    try {
      await expect(db.query("delete from signatures")).rejects.toThrow(/append-only/);
    } finally {
      await db.query("rollback");
    }
    await db.query("begin");
    try {
      await expect(db.query("update activity_log set action = 'x'")).rejects.toThrow(/append-only/);
    } finally {
      await db.query("rollback");
    }
  });

  it("users cannot hard-delete business records", async () => {
    await expect(as("maya", (q) => q("delete from tasks where partnership_id = $1", [IDS.p1]))).rejects.toThrow(/permission denied/);
    await expect(as("maya", (q) => q("delete from meetings where partnership_id = $1", [IDS.p1]))).rejects.toThrow(/permission denied/);
  });

  it("stored hashes match the signed content", async () => {
    const { rows } = await db.query(
      `select v.content_hash = version_hash(v) ok, bool_and(s.wording_hash = v.content_hash) sig_ok
       from item_versions v join signatures s on s.item_version_id = v.id group by v.id, v.content_hash, v.*`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.ok && r.sig_ok)).toBe(true);
  });
});

describe("Consent and task permissions", () => {
  it("no transcript text is accepted from a participant who hasn't consented", async () => {
    // Meeting 4 is upcoming; nobody has consented yet.
    await expect(as("maya", (q) =>
      q(`insert into transcript_segments (meeting_id, partnership_id, speaker_user_id, side_id, text)
         values ($1, $2, $3, $4, 'hello')`, [IDS.m4, IDS.p1, uid.maya, IDS.p1A]))).rejects.toThrow(/row-level security/);
    await as("maya", async (q) => {
      await q("update meeting_participants set consented_at = now() where meeting_id = $1 and user_id = $2", [IDS.m4, uid.maya]);
      await q(`insert into transcript_segments (meeting_id, partnership_id, speaker_user_id, side_id, text)
               values ($1, $2, $3, $4, 'hello')`, [IDS.m4, IDS.p1, uid.maya, IDS.p1A]);
    });
  });

  it("people check off their own tasks; only side owners reassign, within their side", async () => {
    const t = (await db.query("select id from tasks where title = 'Book Patagonia crew travel'")).rows[0];
    await as("priya", async (q) => {
      await q("update tasks set status = 'in_progress' where id = $1", [t.id]);
      await expect(q("update tasks set assignee_id = $2 where id = $1", [t.id, uid.jordan])).rejects.toThrow(/side owner/);
    });
    await as("maya", async (q) => {
      await q("update tasks set assignee_id = $2 where id = $1", [t.id, uid.jordan]);
      await expect(q("update tasks set assignee_id = $2 where id = $1", [t.id, uid.luca])).rejects.toThrow(/member of the task/);
    });
    await expect(as("luca", (q) => q("update tasks set status = 'done' where id = $1 returning id", [t.id]).then((r) => r.rowCount)))
      .resolves.toBe(0);
  });

  it("moving a due date later counts as a slip", async () => {
    const t = (await db.query("select id, slip_count from tasks where title = 'Book Patagonia crew travel'")).rows[0];
    await as("maya", async (q) => {
      await q("update tasks set due_date = due_date + 7 where id = $1", [t.id]);
      expect((await q("select slip_count from tasks where id = $1", [t.id])).rows[0].slip_count).toBe(t.slip_count + 1);
    });
  });
});
