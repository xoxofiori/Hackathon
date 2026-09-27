# Accord — merge plan, unified schema, build phases

## 0. MVP review outcome

The build prompt asks to merge three existing MVPs (live call listener, task/timeline tracker,
goals/feedback tracker). None of them exist in this repository (it contained only a README), and
the product owner asked to build everything here from scratch. So there is **no code to port**;
every module below is new. The two specification blocks in the prompt (sections 1–10 and the
appended "DATA MODEL / AUTH & JOINING" block) are merged into one design. Where they conflict, the
appended block wins because it is more specific:

| Topic | Sections 1–10 | Appended block | Decision |
|---|---|---|---|
| Auth | Magic link + Google + Microsoft | Email + password | Email + password **and** magic link now (password is what makes one-click demo accounts possible). Google/Microsoft are Supabase providers: the buttons exist, they work once the provider keys are set. SSO later per org. |
| Demo data | "National Geographic × Rolex", "Sales EMEA × Product US" | "Wildframe × Aurel", "Wildframe LA × Wildframe London" | Fictional Wildframe/Aurel seed (also avoids putting real brands in demo data). |
| Item taxonomy | 13 kinds (commitment, request_firm, soft_ask, …) | 7 types (agreed, needs_clarification, soft_ask, deadline, one_sided, money, open_question) | One `item_kind` enum = union. `agreed` ≡ `commitment`, `open_question` ≡ `question`. "Needs clarification" is a **status**, not a kind (an ambiguous item has kind `ambiguous` or any kind + open clarifications). `money` and `one_sided` kept. |
| Sign-off states | Proposed → Clarified → Signed A → Signed B → Committed | proposed / needs_clarification / signed_one_side / countersigned / declined | `proposed · needs_clarification · clarified · partially_signed · committed · declined` (+ `superseded` for amended versions). "Countersigned" = `committed`; "signed_one_side" = `partially_signed` (works for 3+ sides). |
| Task status | todo / in_progress / blocked / done | not_started / in_progress / done / blocked | `todo · in_progress · blocked · done` (UI label for `todo` is "Not started"). |
| Goal status | progress over time | on_track / at_risk / achieved | `on_track · at_risk · off_track · achieved · dropped` + `progress` 0–100 + per-meeting evidence rows (progress over time). |
| Roles | owner / signer / member / viewer | memberships | `side_members.role ∈ owner · member · viewer` + `can_sign` flag set by the side owner (an owner can also be a signer). |

## 1. Architecture

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**, server components + server actions. PWA manifest.
- **Supabase**: Postgres 17 + RLS + Auth + Realtime + Storage, **pgvector** for memory retrieval.
- **Every read by a user goes through the user's Supabase session**, so RLS is the enforcement
  point. The service-role key is used only for: seeding, `/setup`, background jobs, and AI jobs —
  and AI jobs are always built with an explicit *audience* (`shared` or one `side_id`) so
  side-private rows can never leak into a shared summary (rule 4).
- **Writes that carry business rules** (signing, committing, amending, claiming a side, accepting
  an invite) are `security definer` Postgres functions. The UI cannot bypass them because the
  underlying tables have no direct insert/update policy for those columns.
- **LiveKit** (built-in call, one room per meeting + one per side breakout), **Deepgram** streaming
  STT per participant track, **Claude** (`claude-sonnet-5` live extraction, `claude-opus-5-5`
  post-meeting synthesis) with Zod-validated JSON, **Inngest** for jobs, **Voyage** embeddings
  (falls back to Postgres full-text search when no key).
- **Demo mode**: the app runs without any AI/LiveKit/Deepgram keys. Seeded AI outputs make every
  screen meaningful; live features show what key is missing instead of breaking.

## 2. Unified data schema (`supabase/schema.sql`)

Every partnership-scoped table carries `partnership_id`; every table that can be private carries
`visibility ('shared' | 'private_to_side')` + `side_id`. One RLS predicate is reused everywhere:

```
can_read(partnership_id, visibility, side_id) :=
  is_partnership_member(partnership_id)
  AND (visibility = 'shared' OR side_id IN my_side_ids(partnership_id))
```

| Table | Purpose / key columns | Visibility |
|---|---|---|
| `profiles` | id → auth.users; full_name, title, job_role, timezone, languages[], preferred_language, communication_notes, avatar_url | readable by people who share a partnership |
| `organizations` | name, slug, color, logo_url, sso_config (later) | members + partners |
| `teams` | org_id, parent_team_id, name (branch/department) | same as org |
| `org_members` | user ↔ org (↔ team), title | same as org |
| `partnerships` | name, description, status (active/paused/closed), created_by, deletion_requested_at | members |
| `sides` | partnership_id, organization_id, team_id?, label, color, claimed_at, position | members |
| `side_members` | side ↔ user, role (owner/member/viewer), can_sign | members |
| `invites` | partnership_id, side_id, meeting_id?, role, token (random), expires_at, max_uses, uses, purpose (claim_side/join_side) | side owners |
| `meetings` | partnership_id, title, scheduled_at, duration_min, host_id, status (prep/live/review/done), capture_mode (builtin/bot/in_person), livekit_room, recording_enabled, recording_path, started_at, ended_at | shared |
| `meeting_participants` | meeting ↔ user ↔ side, joined_at, left_at, **consented_at**, consent_version, consent_revoked_at | shared |
| `agenda_items` | meeting_id, position, title, notes, owner_side_id | shared (joint agenda) |
| `breakouts` | meeting_id, side_id, livekit_room, opened_by, opened_at, closed_at | private_to_side |
| `transcript_segments` | meeting_id, breakout_id?, seq, speaker_user_id, speaker_label, side_id, start_ms, end_ms, text, language, text_translated, translated_to, is_final | shared, or private when in a breakout |
| `goals` | partnership_id, meeting_id? (meeting-specific), side_id? (null = joint), visibility, title, success_criteria, target_date, progress, status, summary | shared or private |
| `goal_evidence` | goal_id, meeting_id, segment_ids[], quote, finding, progress_after, source (ai/human), confidence | inherits goal |
| `expectations` | meeting_id, side_id, goal_id?, kind (must_answer/desired_outcome/avoid_topic), text, status (unanswered/partial/answered), evidence, evidence_segment_ids[] | private by default |
| `items` | meeting_id, partnership_id, kind, status, current_version, confidence, rationale, source_segment_ids[], interpretations jsonb, cultural_flags jsonb, raised_by_side_id, created_by (ai/user) | shared (live items) |
| `item_versions` | item_id, version, wording, deliverable, owner_user_id, owner_side_id, due_date, due_text (original words), deadline_strength (hard/soft/aspirational/unclear), amount, currency, **content_hash**, status (draft/in_force/superseded), amends_version | shared |
| `signatures` | item_version_id, side_id, user_id, signed_at, wording_hash, **signature_hash** | shared, insert-only via `sign_item_version()` |
| `clarifications` | item_id, category (soft_ask/hedged_yes/vague_time/unclear_owner/term_mismatch/silence/mismatch/other), question, asked_to_side_id, asked_to_user_id, status (open/resolved/dismissed), answer, answered_by, answered_at | shared |
| `tasks` | partnership_id, item_id?, item_version_id?, parent_task_id?, title, description, assignee_id, side_id, due_date, deadline_strength, status, slip_count, original_due_date, source_segment_id, completed_at, archived_at, visibility | shared or private |
| `task_dependencies` | task_id → depends_on_task_id | inherits |
| `side_messages` | meeting_id, breakout_id?, side_id, user_id, text, kind (note/chat/assistant) | **always private** |
| `pulses` | meeting_id, side_id, user_id, clarity, follow_through, responsiveness (1–5), comment, visibility | private by default |
| `reviews` | partnership_id, meeting_id, side_id?, visibility, summary jsonb (notes, decisions, open questions, risks, next steps, goal findings), model | shared (joint notes) or private (side notes) |
| `health_notes` | partnership_id, meeting_id?, side_id?, visibility, sentiment (working/not_working/watch), category, title, body, evidence | shared or private |
| `partner_profiles` | partnership_id, about_side_id, written_by_side_id?, visibility, communication_style, preferences, do/don't notes | shared or private |
| `memory_entries` | partnership_id?, organization_id?, side_id?, visibility, kind (correction/glossary/preference/pattern), term, content, source, source_ref, embedding vector(1024), archived_at | shared or private |
| `notifications` | user_id, kind, ref_id, title, body, link, read_at, emailed_at | own rows only |
| `share_links` | partnership_id, token, scope (shared data only), expires_at, revoked_at | owners |
| `deletion_requests` | partnership_id, side_id, requested_by, approved_at, execute_after | owners |
| `activity_log` | partnership_id, actor_id, action, entity, entity_id, side_id?, visibility, data jsonb, at — **append-only** (UPDATE/DELETE blocked by trigger) | follows visibility |

Integrity rules enforced in the database (and tested):

1. `sign_item_version()` refuses if any clarification on the item is open, if the caller isn't a
   signer of that side, if the version isn't the current one, or if the side already signed.
2. It recomputes the wording hash and records it on the signature; the item flips to `committed`
   only when **every side** of the partnership has a signature on the **same version**.
3. `item_versions` and `signatures` rows are immutable once a signature exists (trigger); items in
   `committed` can only change via `amend_item()` → new version, all sides sign again; the old
   version stays `in_force` until the amendment is committed, then becomes `superseded`.
4. No hard deletes on business tables: DELETE is revoked from `authenticated`; soft delete is
   `archived_at`.
5. `activity_log` is written by triggers on every business table.

## 3. Phases (from the brief) and status

| # | Phase | Status |
|---|---|---|
| 1 | Foundation: schema, RLS, auth, profiles, orgs, sides, partnerships, invites, roles, seed, `/setup` | **done** — 50 DB rule tests + e2e invite flow |
| 1b | Demo mode (default): no Supabase/env, built-in sample meeting, browser storage, Maya ⇄ Luca toggle, sign-off + pushback, Claude ambiguity scan with pre-generated fallback | **done** — engine unit tests + e2e |
| 2 | Partnership Hub skeleton (Commitments, Tasks, Timeline, Goals, Health, Meetings, Export) | next |
| 3 | Meeting Prep + AI prep suggestions | |
| 4 | Live Meeting Room (LiveKit, consent, transcript, live extraction, clarifications, sign-off) | |
| 5 | Breakouts + QR + caucus assistant | |
| 6 | Post-meeting pipeline + notifications | |
| 7 | Memory & learning | |
| 8 | Polish, exports, PWA, tests | |
| later | Bot capture (Recall.ai), in-person mode, SSO, calendar sync | designed-for (capture_mode, sso_config columns) |
