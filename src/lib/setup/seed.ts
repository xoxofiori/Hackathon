import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { resetData } from "./db";
import { DEMO_USERS, IDS, type DemoUserKey } from "./demo-ids";

type Uid = Record<DemoUserKey, string>;

export interface SeedOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  demoPassword: string;
  reset?: boolean;
}

export interface SeedReport {
  status: "seeded" | "already_seeded";
  users: number;
}

const DAY = 86_400_000;
/** Date `offset` days from today as YYYY-MM-DD. */
const d = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
/** Timestamp `offset` days from now at `hour` UTC. */
const ts = (offset: number, hour = 14, minute = 0) => {
  const t = new Date(Date.now() + offset * DAY);
  t.setUTCHours(hour, minute, 0, 0);
  return t.toISOString();
};

/** Create (or refresh) the demo auth users through the Supabase admin API. */
async function ensureUsers(opts: SeedOptions): Promise<Uid> {
  const admin = createClient(opts.supabaseUrl, opts.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = new Map<string, string>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list auth users: ${error.message}`);
    for (const u of data.users) if (u.email) existing.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
  }
  const out = {} as Uid;
  for (const [key, u] of Object.entries(DEMO_USERS) as [DemoUserKey, (typeof DEMO_USERS)[DemoUserKey]][]) {
    const found = existing.get(u.email);
    if (found) {
      await admin.auth.admin.updateUserById(found, { password: opts.demoPassword, email_confirm: true });
      out[key] = found;
      continue;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: opts.demoPassword,
      email_confirm: true,
      user_metadata: { full_name: u.name, demo: true },
    });
    if (error || !data.user) throw new Error(`Could not create ${u.email}: ${error?.message}`);
    out[key] = data.user.id;
  }
  return out;
}

export async function seedDemo(client: Client, opts: SeedOptions): Promise<SeedReport> {
  const uid = await ensureUsers(opts);
  const q = (sql: string, params: unknown[] = []) => client.query(sql, params);

  await q("begin");
  try {
    if (opts.reset) await resetData(client);
    const { rows } = await q("select 1 from partnerships where id = $1", [IDS.p1]);
    if (rows.length) {
      await q("rollback");
      return { status: "already_seeded", users: Object.keys(uid).length };
    }

    /** Act as `who` at time `when`: auth.uid(), audit actor and backdated clock. */
    const as = async (who: DemoUserKey | null, when: string) => {
      const sub = who ? uid[who] : "";
      await q(
        `select set_config('request.jwt.claims', $1, true), set_config('accord.actor', $2, true),
                set_config('accord.now', $3, true)`,
        [who ? JSON.stringify({ sub, role: "authenticated" }) : "", sub, when],
      );
    };

    // ---------------------------------------------------------------- profiles
    await as(null, ts(-90));
    for (const [key, u] of Object.entries(DEMO_USERS) as [DemoUserKey, (typeof DEMO_USERS)[DemoUserKey]][]) {
      await q(
        `insert into profiles (id, email, full_name, title, job_role, timezone, languages, preferred_language,
                               communication_notes, onboarded_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
         on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, title = excluded.title,
           job_role = excluded.job_role, timezone = excluded.timezone, languages = excluded.languages,
           preferred_language = excluded.preferred_language, communication_notes = excluded.communication_notes,
           onboarded_at = now()`,
        [uid[key], u.email, u.name, u.title, u.jobRole, u.timezone, u.languages, u.languages[0], u.notes],
      );
    }

    // ------------------------------------------------------ organizations/teams
    await q(
      `insert into organizations (id, name, color, created_by) values
         ($1, 'Wildframe Media', '#0f766e', $3), ($2, 'Aurel Watches', '#b45309', $4)`,
      [IDS.orgWildframe, IDS.orgAurel, uid.maya, uid.luca],
    );
    await q(
      `insert into teams (id, organization_id, name) values
         ($1, $4, 'Partnerships'), ($2, $4, 'Los Angeles'), ($3, $4, 'London Studio'),
         ($5, $6, 'Brand & Marketing')`,
      [IDS.teamPartnerships, IDS.teamLA, IDS.teamLondon, IDS.orgWildframe, IDS.teamBrand, IDS.orgAurel],
    );
    const orgRows: [string, DemoUserKey, string | null, boolean][] = [
      [IDS.orgWildframe, "maya", IDS.teamLA, true],
      [IDS.orgWildframe, "jordan", IDS.teamLA, false],
      [IDS.orgWildframe, "priya", IDS.teamLA, false],
      [IDS.orgWildframe, "sam", IDS.teamLA, false],
      [IDS.orgWildframe, "olivia", IDS.teamLondon, false],
      [IDS.orgWildframe, "tom", IDS.teamLondon, false],
      [IDS.orgAurel, "luca", IDS.teamBrand, true],
      [IDS.orgAurel, "sophie", IDS.teamBrand, false],
      [IDS.orgAurel, "hiroshi", null, false],
    ];
    for (const [org, who, team, admin] of orgRows) {
      await q(
        `insert into org_members (organization_id, user_id, team_id, is_admin, title) values ($1,$2,$3,$4,$5)`,
        [org, uid[who], team, admin, DEMO_USERS[who].title],
      );
    }

    // ============================================================ PARTNERSHIP 1
    await as("maya", ts(-70, 9));
    await q(
      `insert into partnerships (id, name, description, created_by) values ($1, $2, $3, $4)`,
      [
        IDS.p1,
        "Wildframe × Aurel — Season 3 sponsorship",
        "Aurel Watches is the presenting sponsor of Wild Horizons Season 3 (8 episodes, filmed in Patagonia). " +
          "Covers the sponsorship fee, branded vignettes, product-shot previews and a co-branded premiere in Geneva.",
        uid.maya,
      ],
    );
    await q(
      `insert into sides (id, partnership_id, position, label, organization_id, team_id, color, claimed_at, claimed_by)
       values ($1, $3, 0, 'Wildframe Media', $4, $5, '#0f766e', $7, $8),
              ($2, $3, 1, 'Aurel Watches', $6, $9, '#b45309', $10, $11)`,
      [IDS.p1A, IDS.p1B, IDS.p1, IDS.orgWildframe, IDS.teamPartnerships, IDS.orgAurel, ts(-70, 9), uid.maya,
        IDS.teamBrand, ts(-69, 8), uid.luca],
    );
    const members1: [string, DemoUserKey, string, boolean][] = [
      [IDS.p1A, "maya", "owner", true],
      [IDS.p1A, "jordan", "member", false],
      [IDS.p1A, "priya", "member", false],
      [IDS.p1A, "sam", "viewer", false],
      [IDS.p1B, "luca", "owner", true],
      [IDS.p1B, "sophie", "member", false],
      [IDS.p1B, "hiroshi", "member", true],
    ];
    for (const [side, who, role, sign] of members1) {
      await q(
        `insert into side_members (side_id, user_id, partnership_id, role, can_sign, added_by)
         values ($1,$2,$3,$4,$5,$6)`,
        [side, uid[who], IDS.p1, role, sign, side === IDS.p1A ? uid.maya : uid.luca],
      );
    }
    await q(
      `insert into invites (partnership_id, side_id, purpose, role, can_sign, max_uses, uses, created_by, expires_at)
       values ($1, $2, 'claim_side', 'owner', true, 1, 1, $3, $4),
              ($1, $5, 'join_side', 'member', false, 50, 2, $3, $6),
              ($1, $2, 'join_side', 'member', false, 50, 2, $7, $6)`,
      [IDS.p1, IDS.p1B, uid.maya, ts(-40), IDS.p1A, ts(60), uid.luca],
    );

    // ---------------------------------------------------------------- meetings
    const meetings1 = [
      { id: IDS.m1, title: "Kickoff: Season 3 sponsorship scope", at: -62, status: "done", host: "maya" as const },
      { id: IDS.m2, title: "Creative review: vignette concepts", at: -31, status: "done", host: "jordan" as const },
      { id: IDS.m3, title: "Budget & deliverables sign-off", at: -9, status: "review", host: "maya" as const },
      { id: IDS.m4, title: "Production schedule check-in", at: 5, status: "prep", host: "luca" as const },
    ];
    for (const m of meetings1) {
      await q(
        `insert into meetings (id, partnership_id, title, scheduled_at, duration_min, host_id, status, livekit_room,
                               started_at, ended_at, created_at)
         values ($1,$2,$3,$4,60,$5,$6,$7,$8,$9,$10)`,
        [m.id, IDS.p1, m.title, ts(m.at, 14), uid[m.host], m.status, `meeting-${m.id}`,
          m.at < 0 ? ts(m.at, 14, 2) : null, m.at < 0 ? ts(m.at, 14, 58) : null, ts(m.at - 7, 10)],
      );
    }
    const attend: [string, DemoUserKey[]][] = [
      [IDS.m1, ["maya", "jordan", "luca", "sophie", "hiroshi"]],
      [IDS.m2, ["maya", "jordan", "priya", "luca", "sophie", "hiroshi"]],
      [IDS.m3, ["maya", "jordan", "priya", "luca", "sophie", "hiroshi"]],
      [IDS.m4, ["maya", "jordan", "priya", "luca", "sophie", "hiroshi"]],
    ];
    for (const [meeting, people] of attend) {
      const m = meetings1.find((x) => x.id === meeting)!;
      for (const who of people) {
        const past = m.at < 0;
        await q(
          `insert into meeting_participants (meeting_id, user_id, partnership_id, side_id, joined_at, left_at,
                                             consented_at, consent_version)
           values ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [meeting, uid[who], IDS.p1, DEMO_USERS[who].side === "A" ? IDS.p1A : IDS.p1B,
            past ? ts(m.at, 14, 1) : null, past ? ts(m.at, 14, 58) : null, past ? ts(m.at, 14, 1) : null,
            past ? "2026-06" : null],
        );
      }
    }

    // -------------------------------------------------------------- transcripts
    const seg: Record<string, string[]> = {};
    const lines = async (meeting: string, at: number, rows: [DemoUserKey, string][]) => {
      seg[meeting] = [];
      let ms = 60_000;
      for (const [who, text] of rows) {
        const id = randomUUID();
        const dur = 2_000 + text.length * 55;
        await q(
          `insert into transcript_segments (id, meeting_id, partnership_id, speaker_user_id, speaker_label, side_id,
                                            start_ms, end_ms, spoken_at, text, language)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'en')`,
          [id, meeting, IDS.p1, uid[who], DEMO_USERS[who].name,
            DEMO_USERS[who].side === "A" ? IDS.p1A : IDS.p1B, ms, ms + dur,
            new Date(Date.parse(ts(at, 14, 2)) + ms).toISOString(), text],
        );
        seg[meeting].push(id);
        ms += dur + 4_000;
      }
    };
    await lines(IDS.m1, -62, [
      ["maya", "Thanks for making the time, Luca. Our goal today is to agree the overall shape of Aurel's Season 3 sponsorship of Wild Horizons."],
      ["luca", "Thank you, Maya. For us the series is a natural fit — expedition filmmaking, precision, endurance."],
      ["maya", "We're proposing a presenting sponsorship at 1.2 million Swiss francs, paid in two instalments."],
      ["luca", "That is within the range we discussed internally. We can agree to 1.2 million in two instalments — the first on signature, the second on delivery of episode four."],
      ["jordan", "In return we'd produce three sixty-second branded vignettes that run alongside episodes two, four and six."],
      ["sophie", "And the Aurel logo would be in the end credits of every episode?"],
      ["maya", "Yes — end credits on all eight episodes. That's standard for presenting partners."],
      ["hiroshi", "Our legal team will need to review the addendum. We usually take a few weeks."],
      ["luca", "One more thing. It would be important for us to have some say in how the watches appear on screen."],
      ["maya", "We can definitely show you cuts ahead of time. Final editorial control has to stay with us, though."],
      ["luca", "We understand. We will consider it."],
      ["jordan", "Great. So the fee, the vignettes and the credits — shall we write those up for signature?"],
      ["luca", "Yes, please send them. We sign those three."],
    ]);
    await lines(IDS.m2, -31, [
      ["priya", "We've shared three vignette concepts: Glacier, Night Sky and Base Camp."],
      ["sophie", "The team in Geneva loved Night Sky. Base Camp might be a bit rough for our audience."],
      ["jordan", "Understood. We could soften Base Camp, or swap it for a sunrise summit sequence."],
      ["luca", "Perhaps it would be good to see the summit version as well."],
      ["maya", "On product shots: we'll share every shot featuring a watch for comment, five working days before picture lock."],
      ["luca", "That works for us. Comments only — we understand the edit is yours."],
      ["priya", `We'll share the rough cut of episode one by ${d(-15)}.`],
      ["luca", "Good. And our social team will expect weekly posts from the set."],
      ["maya", "Let's move on to the premiere timeline."],
      ["sophie", "We are thinking of a premiere in Geneva, perhaps in the first quarter."],
      ["maya", "Q1 would work well for us — January is ideal for the launch."],
      ["hiroshi", "The addendum review is ongoing. We will come back to you soon."],
    ]);
    await lines(IDS.m3, -9, [
      ["maya", "Today we want to finalise the fourth vignette, the prototypes for filming, and the premiere."],
      ["luca", "Aurel would like to add a fourth vignette for episode eight. We can offer an additional 150,000 francs."],
      ["jordan", "That works. Four vignettes then — episodes two, four, six and eight."],
      ["sophie", `For filming in Patagonia we will send two watch prototypes to Buenos Aires by ${d(8)}.`],
      ["luca", "It would be nice to have the footage by spring."],
      ["priya", "Spring in Patagonia starts in September, so the shoot is timed for that."],
      ["luca", "Also — and I know this was discussed — we would still like final cut approval on the vignettes."],
      ["maya", "I'm sorry, we can't offer final cut. The product-shot preview process stays as agreed."],
      ["luca", "Understood. Then we accept the previews."],
      ["hiroshi", "We will handle the product placement approvals."],
      ["maya", "On the premiere — late January in Geneva, Aurel hosts and we provide the screening copy?"],
      ["luca", "Yes, late January. We host."],
      ["jordan", "One risk: the weather window in Patagonia could push the shoot back by two weeks."],
      ["maya", "We'll also send a behind-the-scenes photo package, about forty images."],
    ]);
    const s = (meeting: string, ...idx: number[]) => idx.map((i) => seg[meeting][i]);

    // ------------------------------------------------------------------- items
    interface ItemIn {
      meeting: string; kind: string; title: string; wording: string; owner?: DemoUserKey; ownerSide?: "A" | "B";
      due?: string | null; dueText?: string | null; strength?: string | null; amount?: number | null;
      currency?: string | null; segments: string[]; confidence: number; rationale: string; raisedBy: "A" | "B";
      interpretations?: unknown[]; flags?: unknown[];
    }
    const sideOf = (x: "A" | "B") => (x === "A" ? IDS.p1A : IDS.p1B);
    const item = async (i: ItemIn): Promise<{ id: string; v1: string }> => {
      const { rows } = await q(
        `select create_item($1,$2,$3::item_kind,$4,$5,$6,$7,$8::date,$9,$10::deadline_strength,$11,$12,null,$13::uuid[],$14,$15,'ai',$16) as id`,
        [IDS.p1, i.meeting, i.kind, i.title, i.wording, i.owner ? uid[i.owner] : null,
          i.ownerSide ? sideOf(i.ownerSide) : null, i.due ?? null, i.dueText ?? null, i.strength ?? null,
          i.amount ?? null, i.currency ?? null, i.segments, i.confidence, i.rationale, sideOf(i.raisedBy)],
      );
      const id = rows[0].id as string;
      if (i.interpretations || i.flags) {
        await q(`update items set interpretations = $2, cultural_flags = $3 where id = $1`, [
          id, JSON.stringify(i.interpretations ?? []), JSON.stringify(i.flags ?? []),
        ]);
      }
      const v = await q(`select id from item_versions where item_id = $1 and version = 1`, [id]);
      return { id, v1: v.rows[0].id };
    };
    const sign = (versionId: string) => q(`select sign_item_version($1)`, [versionId]);
    const clarify = async (itemId: string, c: {
      category: string; question: string; toSide: "A" | "B"; toUser?: DemoUserKey; meanings?: string[];
    }) => {
      const { rows } = await q(
        `insert into clarifications (item_id, partnership_id, category, question, asked_to_side_id, asked_to_user_id,
                                     possible_meanings, source)
         values ($1,$2,$3,$4,$5,$6,$7,'ai') returning id`,
        [itemId, IDS.p1, c.category, c.question, sideOf(c.toSide), c.toUser ? uid[c.toUser] : null,
          JSON.stringify(c.meanings ?? [])],
      );
      return rows[0].id as string;
    };
    const resolve = (clarId: string, who: DemoUserKey, answer: string) =>
      q(`update clarifications set status = 'resolved', answer = $2, answered_by = $3 where id = $1`,
        [clarId, answer, uid[who]]);

    // Meeting 1 ------------------------------------------------------------------
    await as("maya", ts(-62, 15));
    const fee = await item({
      meeting: IDS.m1, kind: "money", title: "Presenting sponsorship fee",
      wording: "Aurel Watches pays Wildframe Media CHF 1,200,000 for the Season 3 presenting sponsorship, in two instalments: 50% on signature and 50% on delivery of episode 4.",
      owner: "luca", ownerSide: "B", strength: "hard", amount: 1_200_000, currency: "CHF",
      segments: s(IDS.m1, 2, 3), confidence: 0.96, raisedBy: "A",
      rationale: "Luca explicitly agreed to the amount and the payment schedule (\"We can agree to 1.2 million in two instalments\").",
    });
    const vignettes = await item({
      meeting: IDS.m1, kind: "commitment", title: "Branded vignettes",
      wording: "Wildframe Media produces three 60-second branded vignettes featuring Aurel timepieces, released alongside episodes 2, 4 and 6.",
      owner: "jordan", ownerSide: "A", strength: "hard", segments: s(IDS.m1, 4, 11, 12), confidence: 0.93, raisedBy: "A",
      rationale: "Jordan offered three vignettes; Luca confirmed \"We sign those three\".",
    });
    const credits = await item({
      meeting: IDS.m1, kind: "commitment", title: "End-credit logo placement",
      wording: "The Aurel Watches logo appears in the end credits of all eight Season 3 episodes.",
      owner: "maya", ownerSide: "A", strength: "hard", segments: s(IDS.m1, 5, 6), confidence: 0.91, raisedBy: "B",
      rationale: "Sophie asked; Maya confirmed \"end credits on all eight episodes\".",
    });
    const onScreen = await item({
      meeting: IDS.m1, kind: "soft_ask", title: "Aurel's say in how watches appear on screen",
      wording: "Aurel has input on how its watches appear on screen.",
      ownerSide: "A", segments: s(IDS.m1, 8, 9, 10), confidence: 0.64, raisedBy: "B",
      rationale: "Phrased as \"it would be important for us to have some say\" — could mean approval rights or a preview. Maya's reply was conditional and Luca answered \"we will consider it\".",
      interpretations: [
        { meaning: "Approval rights over every product shot", likelihood: 0.35 },
        { meaning: "A preview of product shots with the right to comment", likelihood: 0.5 },
        { meaning: "General creative input on the vignettes", likelihood: 0.15 },
      ],
      flags: [
        { type: "soft_ask", note: "This may have been meant as a firm requirement rather than a preference. Worth confirming." },
        { type: "hedged_yes", note: "\"We will consider it\" may mean agreement, a pending internal decision, or a polite no." },
      ],
    });
    const c1 = await clarify(onScreen.id, {
      category: "soft_ask", toSide: "B", toUser: "luca",
      question: "Luca said Aurel would like \"some say in how the watches appear on screen\". Is this a request for approval rights over product shots, or for a preview with the chance to comment?",
      meanings: ["Approval rights over product shots", "Preview and comment only"],
    });
    await as("maya", ts(-60, 10));
    await sign(fee.v1);
    await sign(vignettes.v1);
    await sign(credits.v1);
    await as("luca", ts(-59, 8));
    await sign(fee.v1);
    await sign(vignettes.v1);
    await sign(credits.v1);

    // Meeting 2 ------------------------------------------------------------------
    await as("jordan", ts(-31, 15));
    await as("luca", ts(-31, 14, 20));
    await resolve(c1, "luca", "Preview and comment on product shots only — not editorial approval.");
    await as("jordan", ts(-31, 15));
    const previews = await item({
      meeting: IDS.m2, kind: "commitment", title: "Product-shot previews",
      wording: "Wildframe shares every shot featuring an Aurel timepiece for comment at least five working days before picture lock. Aurel's comments are advisory; editorial decisions stay with Wildframe.",
      owner: "priya", ownerSide: "A", strength: "hard", segments: s(IDS.m2, 4, 5), confidence: 0.94, raisedBy: "A",
      rationale: "Maya proposed the preview process and Luca accepted it (\"That works for us. Comments only\").",
    });
    const roughCut = await item({
      meeting: IDS.m2, kind: "deadline", title: "Episode 1 rough cut",
      wording: `Wildframe shares the episode 1 rough cut with Aurel by ${d(-15)}.`,
      owner: "priya", ownerSide: "A", due: d(-15), dueText: `by ${d(-15)}`, strength: "hard",
      segments: s(IDS.m2, 6), confidence: 0.9, raisedBy: "A",
      rationale: "A specific date was stated by the owner and acknowledged by Aurel.",
    });
    const social = await item({
      meeting: IDS.m2, kind: "one_sided", title: "Weekly social posts from set",
      wording: "Wildframe provides weekly social posts from the Patagonia set for Aurel's channels.",
      ownerSide: "A", segments: s(IDS.m2, 7, 8), confidence: 0.58, raisedBy: "B",
      rationale: "Stated by Aurel as an expectation; Wildframe changed topic without responding. Silence is not agreement.",
      flags: [{ type: "silence", note: "No response from Wildframe before the topic changed. This should not be treated as agreed." }],
    });
    await clarify(social.id, {
      category: "silence", toSide: "A", toUser: "maya",
      question: "Luca mentioned Aurel's social team \"will expect weekly posts from the set\". Wildframe didn't respond before the topic changed. Was this agreed, and who would produce the posts?",
      meanings: ["Agreed: Wildframe produces weekly posts", "Not agreed yet — needs scoping and budget", "Aurel's team produces posts from Wildframe's stills"],
    });
    const summit = await item({
      meeting: IDS.m2, kind: "soft_ask", title: "Alternative summit version of the Base Camp vignette",
      wording: "Wildframe cuts an alternative sunrise-summit version of the Base Camp vignette for Aurel to review.",
      owner: "jordan", ownerSide: "A", segments: s(IDS.m2, 2, 3), confidence: 0.72, raisedBy: "B",
      rationale: "\"Perhaps it would be good to see…\" is a polite request form; it may have been meant as a request rather than an idea.",
      flags: [{ type: "soft_ask", note: "This may have been meant as a request. Wildframe may want to confirm before scheduling the work." }],
    });
    void summit;
    await item({
      meeting: IDS.m2, kind: "positive_feedback", title: "Geneva team loved the Night Sky concept",
      wording: "Aurel's Geneva team responded very positively to the Night Sky vignette concept.",
      segments: s(IDS.m2, 1), confidence: 0.88, raisedBy: "B",
      rationale: "Direct positive statement from Sophie.",
    });
    const premiere = await item({
      meeting: IDS.m2, kind: "commitment", title: "Co-branded premiere in Geneva",
      wording: "Aurel Watches hosts a co-branded Season 3 premiere in Geneva in late January 2027; Wildframe provides the screening copy.",
      owner: "luca", ownerSide: "B", due: "2027-01-29", dueText: "late January (\"the first quarter\")", strength: "soft",
      segments: s(IDS.m2, 9, 10), confidence: 0.7, raisedBy: "B",
      rationale: "Both sides said \"Q1\" / \"first quarter\", which can map to different months depending on fiscal calendar.",
      flags: [{ type: "vague_time", note: "\"First quarter\" may refer to a fiscal quarter. Aurel's fiscal year starts in July." }],
    });
    const cQ1 = await clarify(premiere.id, {
      category: "vague_time", toSide: "B", toUser: "sophie",
      question: "Aurel said \"the first quarter\" and Wildframe said \"Q1 — January\". Aurel's fiscal year starts in July, so its Q1 may mean July–September. Which months do both sides mean?",
      meanings: ["Calendar Q1 2027 (January–March)", "Aurel fiscal Q1 (July–September 2027)"],
    });
    await as("maya", ts(-30, 9));
    await sign(previews.v1);
    await sign(roughCut.v1);
    await as("luca", ts(-29, 16));
    await sign(previews.v1);
    await sign(roughCut.v1);

    // Meeting 3 ------------------------------------------------------------------
    await as("luca", ts(-9, 14, 40));
    await resolve(cQ1, "luca", "Calendar Q1 — late January 2027, in Geneva. Aurel hosts.");
    await as("maya", ts(-9, 15));
    await q(`select revise_item($1,$2,$3,$4,null,null,'hard',$5,'CHF',null)`, [
      vignettes.id,
      "Wildframe Media produces four 60-second branded vignettes featuring Aurel timepieces, released alongside episodes 2, 4, 6 and 8. Aurel Watches pays an additional CHF 150,000 for the fourth vignette.",
      uid.jordan, IDS.p1A, 150_000,
    ]);
    await q(`update items set source_segment_ids = source_segment_ids || $2::uuid[] where id = $1`, [
      vignettes.id, s(IDS.m3, 1, 2),
    ]);
    const prototypes = await item({
      meeting: IDS.m3, kind: "commitment", title: "Watch prototypes for filming",
      wording: `Aurel Watches ships two watch prototypes to Wildframe's Buenos Aires production office by ${d(8)}.`,
      owner: "sophie", ownerSide: "B", due: d(8), dueText: `by ${d(8)}`, strength: "hard",
      segments: s(IDS.m3, 3), confidence: 0.92, raisedBy: "B",
      rationale: "Sophie stated a specific quantity, destination and date.",
    });
    const footage = await item({
      meeting: IDS.m3, kind: "ambiguous", title: "Footage \"by spring\"",
      wording: "Wildframe delivers finished vignette footage to Aurel by spring.",
      ownerSide: "A", dueText: "by spring", strength: "unclear", segments: s(IDS.m3, 4, 5), confidence: 0.55,
      raisedBy: "B",
      rationale: "\"It would be nice\" softens what may be a firm request, and \"spring\" means different months in Geneva and Patagonia.",
      interpretations: [
        { meaning: "Firm deadline: footage by 20 March 2027 (northern spring)", likelihood: 0.45 },
        { meaning: "Footage captured during the Patagonia spring shoot (Sep–Nov 2026)", likelihood: 0.35 },
        { meaning: "A preference with no fixed date", likelihood: 0.2 },
      ],
      flags: [
        { type: "soft_ask", note: "\"It would be nice\" may have been meant as a firm request. Please confirm." },
        { type: "vague_time", note: "\"Spring\" differs by hemisphere: March–May in Geneva, September–November in Patagonia." },
      ],
    });
    await clarify(footage.id, {
      category: "vague_time", toSide: "B", toUser: "luca",
      question: "Luca said \"it would be nice to have the footage by spring.\" Is this a firm request with a deadline, or a preference? And which spring — Geneva's (March–May 2027) or Patagonia's (September–November 2026)?",
      meanings: ["Firm: by 20 March 2027", "Firm: during the Patagonia shoot", "Preference only"],
    });
    const finalCut = await item({
      meeting: IDS.m3, kind: "request_firm", title: "Final cut approval for Aurel",
      wording: "Aurel Watches has final cut approval on all branded vignettes.",
      ownerSide: "A", segments: s(IDS.m3, 6, 7, 8), confidence: 0.89, raisedBy: "B",
      rationale: "Direct request from Luca; Wildframe declined and Aurel accepted the preview process instead.",
    });
    const placement = await item({
      meeting: IDS.m3, kind: "ambiguous", title: "Product placement approvals",
      wording: "Aurel Watches handles product placement approvals.",
      ownerSide: "B", segments: s(IDS.m3, 9), confidence: 0.6, raisedBy: "B",
      rationale: "\"We will handle\" names no person and no turnaround time.",
      flags: [{ type: "unclear_owner", note: "No named owner or turnaround — Wildframe can't plan the edit schedule around it yet." }],
    });
    await clarify(placement.id, {
      category: "unclear_owner", toSide: "B", toUser: "hiroshi",
      question: "Hiroshi said \"we will handle the product placement approvals.\" Who at Aurel will approve, and what turnaround should Wildframe plan for?",
    });
    await item({
      meeting: IDS.m3, kind: "concern_or_risk", title: "Patagonia weather window",
      wording: "The Patagonia weather window could delay principal photography by up to two weeks.",
      ownerSide: "A", segments: s(IDS.m3, 12), confidence: 0.86, raisedBy: "A",
      rationale: "Jordan flagged a schedule risk explicitly.",
    });
    const bts = await item({
      meeting: IDS.m3, kind: "commitment", title: "Behind-the-scenes photo package",
      wording: "Wildframe delivers a behind-the-scenes photo package of about 40 images to Aurel after the Patagonia shoot.",
      owner: "priya", ownerSide: "A", strength: "soft", segments: s(IDS.m3, 13), confidence: 0.8, raisedBy: "A",
      rationale: "Offered by Maya; no date yet, so it stays proposed until a delivery date is agreed.",
    });
    void bts;
    await as("maya", ts(-9, 15, 5));
    await q(`select decline_item($1, $2)`, [finalCut.id, "Editorial independence — replaced by the product-shot preview process."]);
    await as("maya", ts(-8, 9));
    const v2 = await q(`select id from item_versions where item_id = $1 and version = 2`, [vignettes.id]);
    await sign(v2.rows[0].id);
    await sign(prototypes.v1);

    // --------------------------------------------------------------------- tasks
    interface TaskIn {
      key?: string; title: string; who: DemoUserKey | null; side: "A" | "B" | null; due: number; start?: number;
      status: string; itemId?: string; meeting?: string; completed?: number; original?: number; slips?: number;
      milestone?: boolean; private?: boolean; description?: string; strength?: string; segment?: string;
    }
    const taskIds: Record<string, string> = {};
    const task = async (t: TaskIn) => {
      const id = randomUUID();
      if (t.key) taskIds[t.key] = id;
      const creator = t.side === "B" ? uid.luca : uid.maya;
      await q(
        `insert into tasks (id, partnership_id, item_id, meeting_id, source_segment_id, title, description, assignee_id,
                            side_id, visibility, start_date, due_date, original_due_date, deadline_strength, status,
                            slip_count, is_milestone, completed_at, created_by, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [id, IDS.p1, t.itemId ?? null, t.meeting ?? null, t.segment ?? null, t.title, t.description ?? null,
          t.who ? uid[t.who] : null, t.side ? sideOf(t.side) : null, t.private ? "private_to_side" : "shared",
          t.start !== undefined ? d(t.start) : null, d(t.due), d(t.original ?? t.due), t.strength ?? "hard", t.status,
          t.slips ?? 0, t.milestone ?? false, t.completed !== undefined ? ts(t.completed, 16) : null, creator,
          ts(Math.min(t.start ?? t.due - 20, -1), 10)],
      );
      return id;
    };
    await as("maya", ts(-59, 12));
    await task({ title: "Invoice instalment 1 (CHF 600,000)", who: "maya", side: "A", due: -55, start: -59, status: "done", completed: -56, itemId: fee.id, meeting: IDS.m1 });
    await task({ title: "Pay instalment 1 (CHF 600,000)", who: "sophie", side: "B", due: -40, start: -55, status: "done", completed: -37, itemId: fee.id, meeting: IDS.m1 });
    await task({ title: "Invoice instalment 2 on episode 4 delivery", who: "maya", side: "A", due: 75, start: 60, status: "todo", itemId: fee.id, meeting: IDS.m1 });
    await task({ key: "v1", title: "Vignette 1 — Night Sky (episode 2)", who: "jordan", side: "A", due: 10, start: -20, status: "in_progress", itemId: vignettes.id, meeting: IDS.m1 });
    await task({ key: "v2", title: "Vignette 2 — Glacier (episode 4)", who: "jordan", side: "A", due: 40, start: 11, status: "todo", itemId: vignettes.id, meeting: IDS.m1 });
    await task({ key: "v3", title: "Vignette 3 — Summit (episode 6)", who: "priya", side: "A", due: 70, start: 41, status: "todo", itemId: vignettes.id, meeting: IDS.m1 });
    await task({ key: "logo", title: "Send Aurel logo lockups for end credits", who: "sophie", side: "B", due: -6, start: -20, status: "todo", itemId: credits.id, meeting: IDS.m1, description: "Vector lockups (light and dark) plus usage guidelines." });
    await task({ key: "credits", title: "Place Aurel logo in end credits (all 8 episodes)", who: "priya", side: "A", due: 90, start: 60, status: "blocked", itemId: credits.id, meeting: IDS.m1, description: "Blocked until the logo lockups arrive." });
    await task({ title: "Set up product-shot review folder", who: "priya", side: "A", due: -25, start: -30, status: "done", completed: -26, itemId: previews.id, meeting: IDS.m2 });
    await task({ title: "Deliver episode 1 rough cut", who: "priya", side: "A", due: -12, original: -15, slips: 1, start: -28, status: "done", completed: -12, itemId: roughCut.id, meeting: IDS.m2, segment: s(IDS.m2, 6)[0] });
    await task({ title: "Legal review of the sponsorship addendum", who: "hiroshi", side: "B", due: -3, original: -17, slips: 2, start: -60, status: "in_progress", itemId: fee.id, meeting: IDS.m1, segment: s(IDS.m1, 7)[0] });
    await task({ title: "Book Patagonia crew travel", who: "priya", side: "A", due: 3, start: -5, status: "todo", meeting: IDS.m3 });
    await task({ title: "Share music cue sheet for episode 1", who: "jordan", side: "A", due: -2, original: -7, slips: 1, start: -14, status: "todo", meeting: IDS.m2 });
    await task({ key: "shoot", title: "Principal photography — Patagonia", who: "jordan", side: "A", due: 25, start: 18, status: "todo", milestone: true, meeting: IDS.m3 });
    await task({ title: "Season 3 premiere — Geneva", who: null, side: null, due: 124, status: "todo", milestone: true, itemId: premiere.id, meeting: IDS.m3, strength: "soft" });
    await task({ title: "Brief Aurel CEO on Season 3 ROI", who: "luca", side: "B", due: 4, start: -2, status: "todo", private: true, description: "Internal: views forecast vs. budget ahead of the amendment signature." });
    await task({ title: "Prepare fallback if prototypes arrive late", who: "maya", side: "A", due: 6, start: 0, status: "todo", private: true, description: "Internal: use retail models for B-roll if prototypes slip." });
    for (const [a, b] of [["v2", "v1"], ["v3", "v2"], ["credits", "logo"], ["v2", "shoot"]] as const) {
      await q(`insert into task_dependencies (task_id, depends_on_task_id, partnership_id) values ($1,$2,$3)`, [
        taskIds[a], taskIds[b], IDS.p1,
      ]);
    }

    // --------------------------------------------------------------------- goals
    interface GoalIn {
      title: string; side: "A" | "B" | null; private: boolean; criteria: string; target: number; progress: number;
      status: string; summary: string; evidence: [string, number, string, string | null][];
    }
    const goal = async (g: GoalIn) => {
      const id = randomUUID();
      await q(
        `insert into goals (id, partnership_id, side_id, visibility, title, success_criteria, target_date, progress,
                            status, summary, created_by, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id, IDS.p1, g.side ? sideOf(g.side) : null, g.private ? "private_to_side" : "shared", g.title, g.criteria,
          d(g.target), g.progress, g.status, g.summary, g.side === "B" ? uid.luca : uid.maya, ts(-66, 10)],
      );
      for (const [meeting, progress, finding, quoteSeg] of g.evidence) {
        const segText = quoteSeg
          ? (await q(`select text from transcript_segments where id = $1`, [quoteSeg])).rows[0].text
          : null;
        const m = meetings1.find((x) => x.id === meeting)!;
        await q(
          `insert into goal_evidence (goal_id, partnership_id, meeting_id, visibility, side_id, segment_ids, quote,
                                      finding, progress_after, confidence, created_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,0.8,$10)`,
          [id, IDS.p1, meeting, g.private ? "private_to_side" : "shared", g.side ? sideOf(g.side) : null,
            quoteSeg ? [quoteSeg] : [], segText, finding, progress, ts(m.at, 16)],
        );
      }
      return id;
    };
    const goalPremiere = await goal({
      title: "Launch Season 3 with a co-branded premiere in Geneva", side: null, private: false,
      criteria: "Premiere hosted by Aurel in late January 2027 with press and ambassadors; both brands on all launch materials.",
      target: 124, progress: 55, status: "on_track",
      summary: "Date and host are agreed (late January 2027, Aurel hosts in Geneva). The early \"Q1\" mismatch was caught and resolved. Guest list and press plan are still open.",
      evidence: [
        [IDS.m1, 20, "Sponsorship frame agreed; premiere not yet discussed.", null],
        [IDS.m2, 35, "Premiere raised, but \"Q1\" meant different months to each side — flagged for clarification.", s(IDS.m2, 9)[0]],
        [IDS.m3, 55, "Late January in Geneva confirmed; Aurel hosts and Wildframe supplies the screening copy.", s(IDS.m3, 11)[0]],
      ],
    });
    await goal({
      title: "Deliver all branded content on schedule", side: "A", private: false,
      criteria: "Every vignette and deliverable reaches Aurel on or before its signed date.",
      target: 90, progress: 45, status: "at_risk",
      summary: "The episode 1 rough cut arrived 3 days after its original date. Vignette 1 is in progress. The Patagonia weather window is a known schedule risk for vignettes 2–4.",
      evidence: [
        [IDS.m2, 30, "Rough-cut date set; product-shot preview process agreed.", s(IDS.m2, 6)[0]],
        [IDS.m3, 45, "Fourth vignette added; weather window flagged as a two-week risk.", s(IDS.m3, 12)[0]],
      ],
    });
    await goal({
      title: "Protect editorial independence", side: "A", private: true,
      criteria: "No approval rights for the sponsor over the edit; previews and comments only.",
      target: 124, progress: 90, status: "on_track",
      summary: "Aurel accepted the preview-and-comment process twice (meetings 2 and 3). Final cut request was declined without friction.",
      evidence: [
        [IDS.m1, 50, "Aurel asked for \"some say\" in product shots; left open.", s(IDS.m1, 8)[0]],
        [IDS.m2, 75, "Aurel agreed comments are advisory.", s(IDS.m2, 5)[0]],
        [IDS.m3, 90, "Final cut request declined; Aurel accepted previews.", s(IDS.m3, 8)[0]],
      ],
    });
    await goal({
      title: "Secure CHF 1.2M+ in Season 3 funding", side: "A", private: true,
      criteria: "Signed sponsorship of at least CHF 1.2M.", target: -30, progress: 100, status: "achieved",
      summary: "CHF 1.2M signed in the kickoff; a further CHF 150k is pending in the vignette amendment.",
      evidence: [[IDS.m1, 100, "Fee of CHF 1.2M agreed and signed by both sides.", s(IDS.m1, 3)[0]]],
    });
    await goal({
      title: "Reach 5M views of Aurel-branded content", side: "B", private: true,
      criteria: "5M combined views of vignettes and social content within 3 months of the premiere.",
      target: 215, progress: 30, status: "at_risk",
      summary: "Only three vignettes were originally planned and weekly social posts are not yet agreed. The fourth vignette helps if the amendment is signed.",
      evidence: [
        [IDS.m2, 20, "Weekly social posts raised but not confirmed by Wildframe.", s(IDS.m2, 7)[0]],
        [IDS.m3, 30, "Fourth vignette offered; social posts still open.", s(IDS.m3, 1)[0]],
      ],
    });
    await goal({
      title: "Position Aurel as the expedition-grade watch", side: "B", private: true,
      criteria: "Watches shown in real expedition conditions in at least 3 episodes.",
      target: 124, progress: 60, status: "on_track",
      summary: "Prototypes will be filmed in Patagonia; the Night Sky concept lands the positioning well.",
      evidence: [
        [IDS.m2, 45, "Night Sky concept strongly received in Geneva.", s(IDS.m2, 1)[0]],
        [IDS.m3, 60, "Prototypes committed for filming in Patagonia.", s(IDS.m3, 3)[0]],
      ],
    });

    // -------------------------------------------------------------- expectations
    const expect = async (meeting: string, side: "A" | "B", kind: string, text: string, status: string,
      evidence: string | null = null, segIds: string[] = [], goalId: string | null = null) => {
      await q(
        `insert into expectations (meeting_id, partnership_id, side_id, goal_id, kind, text, status, evidence,
                                   evidence_segment_ids, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [meeting, IDS.p1, sideOf(side), goalId, kind, text, status, evidence, segIds,
          side === "A" ? uid.maya : uid.luca],
      );
    };
    await as("maya", ts(-11, 10));
    await expect(IDS.m3, "A", "must_answer", "Will Aurel fund a fourth vignette?", "answered", "Yes — CHF 150,000 for episode 8.", s(IDS.m3, 1));
    await expect(IDS.m3, "A", "must_answer", "Is it clear that final cut stays with Wildframe?", "answered", "Aurel accepted the preview process instead.", s(IDS.m3, 8));
    await expect(IDS.m3, "A", "avoid_topic", "Don't negotiate the weekly social posts before we've costed them.", "answered");
    await as("luca", ts(-11, 11));
    await expect(IDS.m3, "B", "must_answer", "Can we get final cut approval on the vignettes?", "answered", "No — Wildframe keeps final cut; previews stay.", s(IDS.m3, 7));
    await expect(IDS.m3, "B", "must_answer", "When exactly will we receive the footage?", "partial", "Only \"spring\" was mentioned — still unclear which spring.", s(IDS.m3, 5));
    await expect(IDS.m3, "B", "desired_outcome", "Add a fourth vignette for episode 8.", "answered", "Wildframe agreed.", s(IDS.m3, 2));
    await as("maya", ts(-1, 10));
    await expect(IDS.m4, "A", "must_answer", "Who at Aurel approves product placements, and how fast?", "unanswered");
    await expect(IDS.m4, "A", "desired_outcome", "Luca signs the four-vignette amendment.", "unanswered");
    await expect(IDS.m4, "A", "avoid_topic", "Don't reopen final cut.", "unanswered");
    await expect(IDS.m4, "A", "must_answer", "Are the prototypes on track to reach Buenos Aires in time?", "unanswered", null, [], goalPremiere);
    await as("luca", ts(-1, 12));
    await expect(IDS.m4, "B", "must_answer", "Confirm the exact footage delivery date.", "unanswered");
    await expect(IDS.m4, "B", "must_answer", "Can Aurel ambassadors appear on camera in Patagonia?", "unanswered");
    await expect(IDS.m4, "B", "desired_outcome", "Weekly social posts from set confirmed.", "unanswered");

    // --------------------------------------------------------------------- agenda
    await as("luca", ts(-2, 9));
    const agenda = [
      ["Prototype shipping status", "A"], ["Footage delivery date (\"spring\")", "B"],
      ["Product placement approver and turnaround", "A"], ["Premiere guest list and press plan", "B"],
    ] as const;
    for (const [i, [title, side]] of agenda.entries()) {
      await q(
        `insert into agenda_items (meeting_id, partnership_id, position, title, owner_side_id, created_by)
         values ($1,$2,$3,$4,$5,$6)`,
        [IDS.m4, IDS.p1, i, title, sideOf(side), uid.luca],
      );
    }

    // ------------------------------------------------- side messages (private)
    const msg = (meeting: string, side: "A" | "B", who: DemoUserKey, text: string, at: string, kind = "chat") =>
      q(
        `insert into side_messages (meeting_id, partnership_id, side_id, user_id, kind, text, created_at)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [meeting, IDS.p1, sideOf(side), uid[who], kind, text, at],
      );
    await msg(IDS.m3, "A", "maya", "Let's hold firm on final cut — offer the extra vignette as the trade.", ts(-9, 14, 20));
    await msg(IDS.m3, "A", "jordan", "Agreed. The 150k covers the fourth vignette if we shoot it in the same window.", ts(-9, 14, 21));
    await msg(IDS.m3, "A", "priya", "Careful with 'spring' — they may mean March.", ts(-9, 14, 30), "note");
    await msg(IDS.m3, "B", "luca", "We can live without final cut if we get the fourth vignette.", ts(-9, 14, 22));
    await msg(IDS.m3, "B", "hiroshi", "The addendum still needs CEO sign-off before we countersign anything new.", ts(-9, 14, 25));
    await msg(IDS.m3, "B", "sophie", "Ask again about ambassadors on camera next time.", ts(-9, 14, 50), "note");

    // -------------------------------------------------------------- pulses
    const pulse = (meeting: string, side: "A" | "B", who: DemoUserKey, c: number, f: number, r: number, comment: string, at: number) =>
      q(
        `insert into pulses (meeting_id, partnership_id, side_id, user_id, clarity, follow_through, responsiveness,
                             comment, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [meeting, IDS.p1, sideOf(side), uid[who], c, f, r, comment, ts(at, 17)],
      );
    await pulse(IDS.m1, "A", "maya", 4, 5, 5, "Commercial terms landed fast.", -62);
    await pulse(IDS.m1, "A", "jordan", 4, 4, 4, "Good energy; editorial question left hanging.", -62);
    await pulse(IDS.m1, "B", "luca", 4, 4, 5, "Clear proposal, professional team.", -62);
    await pulse(IDS.m1, "B", "sophie", 3, 4, 4, "Would like written follow-up of what we agreed.", -62);
    await pulse(IDS.m2, "A", "maya", 3, 4, 3, "Legal review is slow on their side.", -31);
    await pulse(IDS.m2, "A", "priya", 4, 3, 4, "Concept feedback was useful.", -31);
    await pulse(IDS.m2, "B", "luca", 4, 4, 4, "Preview process is a good compromise.", -31);
    await pulse(IDS.m2, "B", "hiroshi", 3, 3, 4, "Addendum language still needs work.", -31);
    await pulse(IDS.m3, "A", "maya", 4, 3, 3, "Logo lockups and legal review are late on their side.", -9);
    await pulse(IDS.m3, "A", "jordan", 4, 4, 4, "Productive; weather risk is ours to manage.", -9);
    await pulse(IDS.m3, "B", "luca", 3, 3, 4, "Rough cut came late; 'spring' still unclear.", -9);
    await pulse(IDS.m3, "B", "sophie", 4, 3, 4, "Good meeting, need firmer dates.", -9);

    // ------------------------------------------------------------------- reviews
    const review = async (meeting: string, at: number, summary: object, side: "A" | "B" | null = null) =>
      q(
        `insert into reviews (partnership_id, meeting_id, side_id, visibility, summary, model, created_at)
         values ($1,$2,$3,$4,$5,'claude-opus-5-5',$6)`,
        [IDS.p1, meeting, side ? sideOf(side) : null, side ? "private_to_side" : "shared", JSON.stringify(summary), ts(at, 17)],
      );
    await review(IDS.m1, -62, {
      summary: "Both sides agreed the shape of Aurel's presenting sponsorship of Season 3: a CHF 1.2M fee in two instalments, three branded vignettes and end-credit placement on all eight episodes. Aurel asked for input on how watches appear on screen; this was left open for clarification.",
      decisions: ["Presenting sponsorship at CHF 1.2M, two instalments", "Three 60-second vignettes (episodes 2, 4, 6)", "Aurel logo in end credits of all 8 episodes"],
      commitments: ["Presenting sponsorship fee", "Branded vignettes", "End-credit logo placement"],
      open_questions: ["What does Aurel's \"some say\" over on-screen watches mean in practice?"],
      risks: ["Aurel legal review of the addendum may take several weeks"],
      next_steps: ["Wildframe sends written terms for signature", "Aurel legal reviews the addendum"],
      goal_findings: [{ goal: "Launch Season 3 with a co-branded premiere in Geneva", finding: "Not discussed yet.", progress: 20 }],
    });
    await review(IDS.m2, -31, {
      summary: "Aurel reviewed the three vignette concepts and preferred Night Sky. The product-shot preview process was agreed, which resolves the open question from the kickoff. A premiere in \"Q1\" was discussed, but the two sides may mean different months.",
      decisions: ["Product-shot previews: comments are advisory, edit stays with Wildframe"],
      commitments: ["Product-shot previews", "Episode 1 rough cut"],
      open_questions: ["Which months does \"Q1\" mean for the premiere?", "Were weekly social posts from set agreed?"],
      risks: ["Aurel's expectation of weekly social posts has no owner or budget"],
      next_steps: ["Wildframe cuts an alternative summit version", "Aurel confirms premiere months"],
      goal_findings: [{ goal: "Launch Season 3 with a co-branded premiere in Geneva", finding: "Premiere raised; timing ambiguous.", progress: 35 }],
    });
    await review(IDS.m3, -9, {
      summary: "Aurel added a fourth vignette for an extra CHF 150,000 (amendment awaiting Aurel's signature) and committed to ship two prototypes to Buenos Aires. Wildframe declined final cut approval; Aurel accepted the preview process. The premiere is confirmed for late January in Geneva. Two items still need clarification: the \"spring\" footage date and who approves product placements.",
      decisions: ["Final cut stays with Wildframe", "Premiere: late January 2027, Geneva, Aurel hosts"],
      commitments: ["Branded vignettes (amendment v2: four vignettes)", "Watch prototypes for filming"],
      open_questions: ["Which spring does \"footage by spring\" mean?", "Who at Aurel approves product placements?"],
      risks: ["Patagonia weather window could delay the shoot by two weeks"],
      next_steps: ["Luca signs the vignette amendment and prototype commitment", "Aurel answers the two open clarifications"],
      goal_findings: [{ goal: "Launch Season 3 with a co-branded premiere in Geneva", finding: "Date and host agreed.", progress: 55 }],
    });
    await review(IDS.m3, -9, {
      summary: "Internal notes (Wildframe only): Aurel traded final cut for the fourth vignette, as planned in the caucus. Aurel's side is running late on logo lockups and the legal review — raise gently with dates next meeting.",
      candid: ["Luca defers budget decisions to Geneva; expect ~2 weeks for the amendment signature."],
    }, "A");
    await review(IDS.m3, -9, {
      summary: "Internal notes (Aurel only): We got the fourth vignette in exchange for dropping final cut. Wildframe delivered the rough cut late; push for firm footage dates.",
      candid: ["CEO sign-off needed before countersigning the amendment."],
    }, "B");

    // -------------------------------------------------------------- health notes
    const health = (sentiment: string, category: string, title: string, body: string, side: "A" | "B" | null = null, meeting: string | null = IDS.m3) =>
      q(
        `insert into health_notes (partnership_id, meeting_id, side_id, visibility, sentiment, category, title, body, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [IDS.p1, meeting, side ? sideOf(side) : null, side ? "private_to_side" : "shared", sentiment, category, title, body, ts(-9, 18)],
      );
    await health("working", "decision_speed", "Commercial terms agreed quickly", "The fee, vignettes and credits were agreed in the first meeting and signed by both sides within two days.", null, IDS.m1);
    await health("working", "process", "Product-shot preview process is working", "The advisory preview process resolved the question of on-screen control and was reaffirmed when final cut came up again.");
    await health("not_working", "deadlines", "Two Aurel-side tasks are overdue", "The logo lockups (6 days overdue) and the addendum legal review (moved twice, now 3 days overdue) are the oldest open items.");
    await health("not_working", "deadlines", "One Wildframe-side date slipped", "The episode 1 rough cut arrived 3 days after its original date; the episode 1 music cue sheet is 2 days overdue.");
    await health("watch", "communication", "Time words mean different things to each side", "\"Q1\" and \"spring\" were each understood differently (fiscal calendar, hemisphere). Naming exact months has resolved this every time.");
    await health("watch", "communication", "Unanswered expectations tend to be raised by Aurel", "Two of Aurel's expectations (weekly social posts, footage date) have gone unanswered; both were phrased softly.");
    await health("working", "relationship", "Candid, low-friction negotiation", "Wildframe's decline of final cut was received well; both sides describe meetings as productive.", "A");
    await health("not_working", "communication", "Our follow-ups are informal", "Aurel's team prefers written confirmation after calls. We've relied on Slack-style messages — send a written recap instead.", "A");
    await health("watch", "relationship", "Wildframe moves fast and informally", "Decisions are made on the call. Confirm anything budget-related in writing before committing internally.", "B");

    // ---------------------------------------------------------- partner profiles
    await q(
      `insert into partner_profiles (partnership_id, about_side_id, side_id, visibility, communication_style, preferences, notes)
       values ($1,$2,null,'shared',$3,$4,null), ($1,$5,null,'shared',$6,$7,null), ($1,$2,$5,'private_to_side',null,'[]',$8),
              ($1,$5,$2,'private_to_side',null,'[]',$9)`,
      [
        IDS.p1, IDS.p1B,
        "Formal and consensus-driven. Budget decisions go to a committee in Geneva, so expect a short delay after anything with a cost. Requests are often phrased politely (\"it would be nice\", \"perhaps\") and are usually meant as real requests.",
        JSON.stringify(["Written recap after every call", "Meetings in English; documents also in French", "Name exact dates, not seasons or quarters", "Fiscal year starts in July"]),
        IDS.p1A,
        "Direct and fast-moving. Decisions are made on the call and follow-up is informal. Comfortable pushing back openly.",
        JSON.stringify(["Chat for quick questions", "Short meetings with a clear agenda", "Calendar quarters (January–March = Q1)"]),
        "When Luca says \"we will consider it\", it has twice meant \"not without CEO approval\" — allow about two weeks.",
        "Maya's \"Q1 is fine, we'll sort that\" style of agreement needs a follow-up email with exact dates before we plan around it.",
      ],
    );

    // ------------------------------------------------------------------ memory
    const memory = (kind: string, term: string | null, content: string, source: string, side: "A" | "B" | null = null, by: DemoUserKey = "maya") =>
      q(
        `insert into memory_entries (partnership_id, side_id, visibility, kind, term, content, source, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [IDS.p1, side ? sideOf(side) : null, side ? "private_to_side" : "shared", kind, term, content, source, uid[by]],
      );
    await memory("glossary", "Q1", "Wildframe means January–March. Aurel's fiscal Q1 is July–September. Always name the months.", "human", null, "luca");
    await memory("glossary", "Spring", "The Patagonia shoot happens in the southern spring (September–November 2026). In Geneva, spring means March–May.", "human", null, "priya");
    await memory("glossary", "Exclusivity", "Category exclusivity: no other watch brand sponsors Season 3. Jewellery brands are not excluded.", "human", null, "hiroshi");
    await memory("correction", null, "\"Aurel logo in end credits\" was a commitment by Wildframe, not a request by Aurel.", "human", null, "maya");
    await memory("pattern", null, "Requests from Aurel phrased as \"it would be nice\" or \"perhaps\" have turned out to be firm requests 2 out of 2 times.", "ai");
    await memory("preference", null, "Aurel prefers a written recap after every call, sent the same day.", "human", null, "sophie");
    await memory("preference", null, "When Aurel says \"we will consider it\", expect about two weeks and a committee decision.", "human", "A", "maya");
    await memory("pattern", null, "Wildframe tends to agree on the call and send details later — ask for written confirmation of dates.", "human", "B", "luca");

    // ----------------------------------------------------------- notifications
    await q(
      `insert into notifications (user_id, partnership_id, kind, title, body, link, created_at) values
       ($1,$4,'clarification','A clarification is addressed to you','"Footage by spring": which spring, and is it a firm date?', $5, $6),
       ($2,$4,'clarification','A clarification is addressed to you','Product placement approvals: who approves, and how fast?', $5, $6),
       ($3,$4,'overdue','Overdue: Send Aurel logo lockups for end credits','This task was due 6 days ago.', $7, $8),
       ($9,$4,'clarification','A clarification is addressed to you','Weekly social posts from set: was this agreed?', $5, $6),
       ($9,$4,'upcoming','Meeting in 5 days: Production schedule check-in','Add your side''s goals and must-get answers.', $10, $8)`,
      [uid.luca, uid.hiroshi, uid.sophie, IDS.p1, `/p/${IDS.p1}/commitments`, ts(-9, 18),
        `/p/${IDS.p1}/tasks`, ts(-1, 8), uid.maya, `/p/${IDS.p1}/meetings`],
    );

    // ============================================================ PARTNERSHIP 2
    await as("maya", ts(-40, 9));
    await q(
      `insert into partnerships (id, name, description, created_by, is_internal) values ($1,$2,$3,$4,true)`,
      [IDS.p2, "Wildframe LA × Wildframe London — Season 3 post-production",
        "Internal partnership between the LA production team and the London post-production studio for Season 3.",
        uid.maya],
    );
    await q(
      `insert into sides (id, partnership_id, position, label, organization_id, team_id, color, claimed_at, claimed_by)
       values ($1,$3,0,'Wildframe LA',$4,$5,'#0f766e',$7,$8), ($2,$3,1,'Wildframe London',$4,$6,'#7c3aed',$7,$9)`,
      [IDS.p2A, IDS.p2B, IDS.p2, IDS.orgWildframe, IDS.teamLA, IDS.teamLondon, ts(-40, 9), uid.maya, uid.olivia],
    );
    const members2: [string, DemoUserKey, string, boolean][] = [
      [IDS.p2A, "maya", "owner", true], [IDS.p2A, "jordan", "member", true], [IDS.p2A, "sam", "viewer", false],
      [IDS.p2B, "olivia", "owner", true], [IDS.p2B, "tom", "member", false],
    ];
    for (const [side, who, role, sign] of members2) {
      await q(
        `insert into side_members (side_id, user_id, partnership_id, role, can_sign, added_by) values ($1,$2,$3,$4,$5,$6)`,
        [side, uid[who], IDS.p2, role, sign, side === IDS.p2A ? uid.maya : uid.olivia],
      );
    }
    await q(
      `insert into meetings (id, partnership_id, title, scheduled_at, host_id, status, started_at, ended_at)
       values ($1,$3,'Season 3 post-production handoff',$4,$5,'done',$4,$6),
              ($2,$3,'Weekly post sync',$7,$8,'prep',null,null)`,
      [IDS.m5, IDS.m6, IDS.p2, ts(-14, 16), uid.olivia, ts(-14, 17), ts(2, 16), uid.maya],
    );
    const seg2: string[] = [];
    const internalLines: [DemoUserKey, string, string][] = [
      ["olivia", "London can take the colour grade for episodes one to four.", IDS.p2B],
      ["maya", `Great. Can you have those graded by ${d(20)}?`, IDS.p2A],
      ["olivia", "Yes, that's doable if the locked cuts arrive a week before.", IDS.p2B],
      ["jordan", `We'll send locked cuts for one to four by ${d(6)}.`, IDS.p2A],
      ["tom", "We'll need the music licensing budget confirmed in Q1.", IDS.p2B],
      ["maya", "Q1 is fine, we'll sort that.", IDS.p2A],
    ];
    for (const [i, [who, text, side]] of internalLines.entries()) {
      const id = randomUUID();
      seg2.push(id);
      await q(
        `insert into meeting_participants (meeting_id, user_id, partnership_id, side_id, joined_at, consented_at, consent_version)
         values ($1,$2,$3,$4,$5,$5,'2026-06') on conflict do nothing`,
        [IDS.m5, uid[who], IDS.p2, side, ts(-14, 16)],
      );
      await q(
        `insert into transcript_segments (id, meeting_id, partnership_id, speaker_user_id, speaker_label, side_id, start_ms,
                                          end_ms, spoken_at, text, language)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'en')`,
        [id, IDS.m5, IDS.p2, uid[who], DEMO_USERS[who].name, side, i * 9000, i * 9000 + 7000, ts(-14, 16, i), text],
      );
    }
    const item2 = async (kind: string, title: string, wording: string, owner: DemoUserKey, side: string, due: string | null,
      strength: string | null, segs: string[], confidence: number, rationale: string) => {
      const { rows } = await q(
        `select create_item($1,$2,$3::item_kind,$4,$5,$6,$7,$8::date,null,$9::deadline_strength,null,null,null,$10::uuid[],$11,$12,'ai',$7) as id`,
        [IDS.p2, IDS.m5, kind, title, wording, uid[owner], side, due, strength, segs, confidence, rationale],
      );
      const v = await q(`select id from item_versions where item_id = $1 and version = 1`, [rows[0].id]);
      return { id: rows[0].id as string, v1: v.rows[0].id as string };
    };
    await as("olivia", ts(-14, 17));
    const grade = await item2("commitment", "Colour grade for episodes 1–4",
      `Wildframe London delivers the colour grade for episodes 1–4 by ${d(20)}, provided locked cuts arrive by ${d(6)}.`,
      "olivia", IDS.p2B, d(20), "hard", [seg2[0], seg2[1], seg2[2]], 0.93, "Olivia agreed to the date with an explicit condition.");
    const locked = await item2("commitment", "Locked cuts for episodes 1–4",
      `Wildframe LA sends locked cuts for episodes 1–4 to London by ${d(6)}.`,
      "jordan", IDS.p2A, d(6), "hard", [seg2[3]], 0.94, "Jordan stated the deliverable and date.");
    const music = await item2("deadline", "Music licensing budget confirmed \"in Q1\"",
      "Wildframe LA confirms the music licensing budget in Q1.", "maya", IDS.p2A, null, "unclear", [seg2[4], seg2[5]], 0.6,
      "\"Q1\" differs between LA (calendar year) and London (UK financial year starting in April).");
    await q(
      `insert into clarifications (item_id, partnership_id, category, question, asked_to_side_id, asked_to_user_id, possible_meanings)
       values ($1,$2,'vague_time',$3,$4,$5,$6)`,
      [music.id, IDS.p2,
        "Tom asked for the budget \"in Q1\" and Maya agreed. London's financial year starts in April, so Q1 may mean April–June there, but January–March in LA. Which months do both teams mean?",
        IDS.p2A, uid.maya, JSON.stringify(["January–March 2027", "April–June 2027"])],
    );
    await as("olivia", ts(-13, 9));
    await q(`select sign_item_version($1)`, [grade.v1]);
    await q(`select sign_item_version($1)`, [locked.v1]);
    await as("maya", ts(-13, 15));
    await q(`select sign_item_version($1)`, [grade.v1]);
    const p2task = (title: string, who: DemoUserKey, side: string, due: number, status: string, itemId: string | null, completed?: number) =>
      q(
        `insert into tasks (partnership_id, item_id, meeting_id, title, assignee_id, side_id, start_date, due_date,
                            original_due_date, status, completed_at, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11)`,
        [IDS.p2, itemId, IDS.m5, title, uid[who], side, d(Math.min(due - 7, -1)), d(due), status,
          completed !== undefined ? ts(completed, 12) : null, uid.maya],
      );
    await p2task("Share LUT pack with London", "tom", IDS.p2B, -8, "done", grade.id, -9);
    await p2task("Lock cut — episode 2", "jordan", IDS.p2A, 6, "in_progress", locked.id);
    await p2task("Lock cut — episode 3", "jordan", IDS.p2A, 6, "todo", locked.id);
    await p2task("Colour grade — episode 1", "tom", IDS.p2B, 12, "in_progress", grade.id);
    await p2task("Colour grade — episodes 2–4", "tom", IDS.p2B, 20, "todo", grade.id);
    await q(
      `insert into goals (partnership_id, visibility, title, success_criteria, target_date, progress, status, summary, created_by)
       values ($1,'shared','Finish Season 3 post-production on budget',
               'All 8 episodes graded, mixed and delivered within the post budget.', $2, 40, 'on_track',
               'Grade for episodes 1–4 is committed; the music licensing budget timing still needs clarifying.', $3)`,
      [IDS.p2, d(100), uid.maya],
    );

    await q("commit");
    return { status: "seeded", users: Object.keys(uid).length };
  } catch (err) {
    await q("rollback").catch(() => undefined);
    throw err;
  }
}
