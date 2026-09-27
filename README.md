# Accord

**Partnership meeting intelligence.** Accord listens to calls between two companies, branches or teams, flags what
might be misunderstood before it is agreed, turns agreements into commitments that every side signs, and tracks
what each side owes — permanently.

> Status: **Phase 1 (Foundation) complete**, plus a zero-setup **demo mode** (the default). Schema, RLS, sign-off rules, auth, profiles, organizations, sides,
> partnerships, invites, roles and demo data. See [`docs/PLAN.md`](docs/PLAN.md) for the merge plan, unified
> schema and the phase roadmap.

## Quick start — demo mode (default, no setup)

```bash
npm install
npm run dev          # http://localhost:3000 — no Supabase, no env variables
```

Demo mode is the default. It runs entirely in the browser with the built-in Wildframe × Aurel sample meeting:

- **Switch between Maya Chen (Wildframe) and Luca Brunner (Aurel)** with the toggle in the header — same window.
  Each side sees its own private goals, must-get answers and notes, never the other side's.
- **Sign-offs and pushbacks work**: sign for your side, answer clarifications, ask the other side a question, propose
  new wording (or an amendment to a committed item), or decline. The same rules as the database apply — no signing
  while a clarification is open, Committed only when both sides signed the same version, signed versions never change.
- **Ambiguity flags**: the transcript is scanned for soft asks, vague timing, unclear owners and loose scope. With
  `ANTHROPIC_API_KEY` set, the scan runs live on Claude (`claude-sonnet-5`); without it, pre-generated flags for the
  sample transcript are used. Any flag can be raised as a clarification.
- Changes are saved in this browser (`localStorage`) and survive reloads. The reset button restores the sample.
  This browser storage is for the demo only — live mode keeps everything server-side.

Set `ACCORD_MODE=live` to use the real backend with accounts, invites and Row-Level Security (below).

## Live mode — the seeded demo accounts

After live setup (below), open the app and click **Enter demo as Maya Chen** (Partnerships Lead, Wildframe Media) or
**Enter demo as Luca Brunner** (Brand Director, Aurel Watches). Open both in different browsers to see that each
side sees the shared record but never the other side's private goals, notes, pulses or tasks.

Seeded data:

- **Wildframe × Aurel — Season 3 sponsorship**: 3 past meetings + 1 upcoming, transcripts, items in every status
  (proposed, needs clarification, clarified, partially signed, committed, declined, plus a committed item with a
  pending amendment), clarifications, tasks (done, in progress, blocked, overdue, slipped, milestones, private),
  goals with evidence over time, expectations, pulses, reviews, health notes, partner profiles and memory.
- **Wildframe LA × Wildframe London** — an internal partnership between two branches of one company.

All demo accounts (`*@demo.accord.app`) use the password in `DEMO_PASSWORD` (default `accord-demo-2026`).

## Live mode setup

Requirements: Node 20+, a Supabase project (or the Supabase CLI + Docker for local development), and
`ACCORD_MODE=live` in the environment.

### Local (Supabase CLI)

```bash
npm install
npx supabase start                         # local Postgres, Auth, Realtime, Storage
cp .env.example .env.local                 # set ACCORD_MODE=live and paste the keys from `npx supabase status`
npm run db:setup                           # apply supabase/schema.sql and seed demo data
npm run dev                                # http://localhost:3000
```

### Hosted Supabase + Vercel

1. Create a Supabase project. Copy the project URL, anon key, service-role key and the Postgres connection string
   into your environment (see `.env.example`).
2. Apply the schema, either:
   - **Option A — `/setup` route:** set `SETUP_SECRET`, deploy, open `/setup`, enter the secret and run it. This
     applies `supabase/schema.sql` via `POSTGRES_URL` and seeds the demo.
   - **Option B — manual:** paste `supabase/schema.sql` into the Supabase SQL editor and run it. Then run
     `npm run db:setup` from your machine (with the same env vars) to create the demo accounts and data.
3. In Supabase → Authentication → URL configuration, add `https://<your-domain>/auth/callback` as a redirect URL.
   To enable Google / Microsoft sign-in, turn on those providers in Supabase Auth (the buttons are already there).
4. Deploy to Vercel with the same env vars (including `ACCORD_MODE=live`). Unset `SETUP_SECRET` afterwards to disable `/setup`.

`supabase/schema.sql` is idempotent, so re-running it is safe. `npm run db:reset` wipes partnership data (keeping
auth users) and re-seeds — for development only.

## How the rules are enforced

The database is the enforcement point, not the UI:

| Rule | Where |
|---|---|
| Side-private data is never visible to the other side | RLS on every table via `can_read(partnership, visibility, side)` |
| No signing while a clarification is open | `sign_item_version()` |
| Committed only when every side's signer signed the same wording | `sign_item_version()` compares per-version signatures across all sides |
| Signed versions are never edited; changes are amendments | `item_versions` trigger (immutable content), `revise_item()` |
| Tamper evidence | `content_hash` per version, `signature_hash` per signature (SHA-256) |
| No hard deletes; append-only audit log | `DELETE` revoked for users; triggers on `signatures` and `activity_log` |
| No transcript from anyone who hasn't consented | `transcript_segments` insert policy checks `meeting_participants.consented_at` |
| People update their own tasks; owners reassign within their side | `tasks` policy + `tasks_before()` trigger |

## Tests

```bash
npm test               # demo engine rules + database rule tests (RLS, sign-off, immutability, consent) — DB tests need a seeded DB
npm run build && npm run test:e2e   # Playwright, demo mode: sign-offs, pushbacks, persona toggle, privacy, persistence
npm run test:e2e:live  # Playwright, live mode: demo sign-in and create → invite → claim (needs ACCORD_MODE=live npm run dev)
npm run lint && npm run typecheck
```

## Project structure

```
supabase/schema.sql          Unified schema, triggers, rule functions and RLS (single source of truth)
src/lib/setup/               Schema apply + demo seed (used by /setup and `npm run db:setup`)
src/lib/sample/              The Wildframe × Aurel transcripts, shared by the seed and demo mode
src/lib/demo/                Demo mode: sample state, sign-off engine (mirrors the SQL rules), pre-generated flags
src/lib/ai/                  Claude calls (ambiguity scan, Zod-validated structured output)
src/components/demo/         Demo UI: persona toggle, transcript + flags, clarification queue, sign-off cards
src/lib/supabase/            Server (user session), browser and admin (service-role) clients
src/lib/data/                Server-side data access (always through the user's session → RLS)
src/proxy.ts                 Session refresh + auth gate (Next.js 16 "proxy", formerly middleware)
src/app/                     Routes: landing, auth, onboarding, partnerships, /p/[id]/…, /invite/[token], /setup
tests/db, tests/e2e          Vitest DB rule tests, Playwright end-to-end tests
docs/PLAN.md                 Merge plan, unified schema, phases
```

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style components on Radix · Supabase (Postgres, RLS,
Auth, Realtime, pgvector) · Zod · Anthropic Claude API (phases 3+) · LiveKit + Deepgram (phase 4) · Inngest (phase 6).
