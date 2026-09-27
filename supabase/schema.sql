-- =============================================================================
-- Accord — unified schema, integrity rules and Row-Level Security.
--
-- Idempotent: safe to run repeatedly (used by /setup and `npm run db:setup`).
-- Manual option: paste this whole file into the Supabase SQL editor and run it.
--
-- Visibility model: every partnership-scoped row carries partnership_id and,
-- when it can be private, (visibility, side_id). A user reads a row when they
-- are a member of the partnership AND (the row is shared OR its side is theirs).
-- Business rules that must not be bypassed (signing, committing, amending,
-- accepting invites) live in SECURITY DEFINER functions below.
-- =============================================================================

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Clock: seeding may backdate events (only honoured outside API sessions).
-- ---------------------------------------------------------------------------
create or replace function accord_now() returns timestamptz
language plpgsql stable as $$
declare v text := current_setting('accord.now', true);
begin
  if v is not null and v <> '' and session_user not in ('authenticator', 'anon', 'authenticated') then
    return v::timestamptz;
  end if;
  return now();
end $$;

-- True when the current statement comes from an end user (API session),
-- false inside SECURITY DEFINER functions and service/admin connections.
create or replace function is_end_user() returns boolean
language sql stable as $$ select current_user in ('authenticated', 'anon') $$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type visibility as enum ('shared', 'private_to_side');
exception when duplicate_object then null; end $$;
do $$ begin
  create type side_role as enum ('owner', 'member', 'viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type partnership_status as enum ('active', 'paused', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type meeting_status as enum ('prep', 'live', 'review', 'done');
exception when duplicate_object then null; end $$;
do $$ begin
  create type capture_mode as enum ('builtin', 'bot', 'in_person');
exception when duplicate_object then null; end $$;
do $$ begin
  create type item_kind as enum (
    'commitment', 'request_firm', 'soft_ask', 'question', 'ambiguous', 'deadline',
    'decision', 'concern_or_risk', 'dependency', 'positive_feedback',
    'negative_feedback', 'open_issue', 'one_sided', 'money');
exception when duplicate_object then null; end $$;
do $$ begin
  create type item_status as enum (
    'proposed', 'needs_clarification', 'clarified', 'partially_signed', 'committed', 'declined');
exception when duplicate_object then null; end $$;
do $$ begin
  create type version_status as enum ('draft', 'in_force', 'superseded', 'void');
exception when duplicate_object then null; end $$;
do $$ begin
  create type deadline_strength as enum ('hard', 'soft', 'aspirational', 'unclear');
exception when duplicate_object then null; end $$;
do $$ begin
  create type clarification_category as enum (
    'soft_ask', 'hedged_yes', 'vague_time', 'unclear_owner', 'term_mismatch',
    'silence', 'mismatch', 'scope', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type clarification_status as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'blocked', 'done');
exception when duplicate_object then null; end $$;
do $$ begin
  create type goal_status as enum ('on_track', 'at_risk', 'off_track', 'achieved', 'dropped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type expectation_kind as enum ('must_answer', 'desired_outcome', 'avoid_topic');
exception when duplicate_object then null; end $$;
do $$ begin
  create type answer_status as enum ('unanswered', 'partial', 'answered');
exception when duplicate_object then null; end $$;
do $$ begin
  create type health_sentiment as enum ('working', 'not_working', 'watch');
exception when duplicate_object then null; end $$;
do $$ begin
  create type memory_kind as enum ('correction', 'glossary', 'preference', 'pattern');
exception when duplicate_object then null; end $$;
do $$ begin
  create type invite_purpose as enum ('claim_side', 'join_side');
exception when duplicate_object then null; end $$;
do $$ begin
  create type actor_source as enum ('ai', 'human');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- People and organizations
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  title text,
  job_role text,
  timezone text default 'UTC',
  languages text[] not null default '{}',
  preferred_language text default 'en',
  communication_notes text,
  avatar_url text,
  onboarded_at timestamptz,
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#4f46e5',
  logo_url text,
  sso_config jsonb,               -- reserved: per-org SAML/OIDC (later)
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  parent_team_id uuid references teams (id),
  name text not null,
  created_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

create table if not exists org_members (
  organization_id uuid not null references organizations (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid references teams (id),
  is_admin boolean not null default false,
  title text,
  created_at timestamptz not null default accord_now(),
  primary key (organization_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Partnerships, sides, memberships, invites
-- ---------------------------------------------------------------------------
create table if not exists partnerships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status partnership_status not null default 'active',
  is_internal boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

create table if not exists sides (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  position smallint not null default 0,
  label text not null,
  organization_id uuid references organizations (id),
  team_id uuid references teams (id),
  pending_org_name text,          -- name typed by the creator before Side B claims it
  color text not null default '#4f46e5',
  claimed_at timestamptz,
  claimed_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  archived_at timestamptz
);
create index if not exists sides_partnership_idx on sides (partnership_id);

create table if not exists side_members (
  side_id uuid not null references sides (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  partnership_id uuid not null references partnerships (id),
  role side_role not null default 'member',
  can_sign boolean not null default false,
  added_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  removed_at timestamptz,
  primary key (side_id, user_id)
);
create index if not exists side_members_user_idx on side_members (user_id, partnership_id);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  partnership_id uuid not null references partnerships (id),
  side_id uuid not null references sides (id),
  meeting_id uuid,                -- FK added after meetings exists
  purpose invite_purpose not null default 'join_side',
  role side_role not null default 'member',
  can_sign boolean not null default false,
  email text,
  max_uses int not null default 50,
  uses int not null default 0,
  expires_at timestamptz not null default accord_now() + interval '30 days',
  revoked_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now()
);

-- ---------------------------------------------------------------------------
-- Meetings
-- ---------------------------------------------------------------------------
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  title text not null,
  scheduled_at timestamptz,
  duration_min int not null default 60,
  host_id uuid references auth.users (id),
  status meeting_status not null default 'prep',
  capture_mode capture_mode not null default 'builtin',
  livekit_room text,
  recording_enabled boolean not null default false,
  recording_path text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);
create index if not exists meetings_partnership_idx on meetings (partnership_id, scheduled_at);

do $$ begin
  alter table invites add constraint invites_meeting_fk foreign key (meeting_id) references meetings (id);
exception when duplicate_object then null; end $$;

create table if not exists meeting_participants (
  meeting_id uuid not null references meetings (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  partnership_id uuid not null references partnerships (id),
  side_id uuid references sides (id),
  joined_at timestamptz,
  left_at timestamptz,
  consented_at timestamptz,        -- no consent, no capture
  consent_version text,
  consent_revoked_at timestamptz,
  primary key (meeting_id, user_id)
);

create table if not exists agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id),
  partnership_id uuid not null references partnerships (id),
  position int not null default 0,
  title text not null,
  notes text,
  owner_side_id uuid references sides (id),
  visibility visibility not null default 'shared',
  side_id uuid references sides (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

create table if not exists breakouts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id),
  partnership_id uuid not null references partnerships (id),
  side_id uuid not null references sides (id),
  visibility visibility not null default 'private_to_side' check (visibility = 'private_to_side'),
  livekit_room text,
  opened_by uuid references auth.users (id),
  opened_at timestamptz not null default accord_now(),
  closed_at timestamptz
);

create table if not exists transcript_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id),
  partnership_id uuid not null references partnerships (id),
  breakout_id uuid references breakouts (id),
  seq bigint generated always as identity,
  speaker_user_id uuid references auth.users (id),
  speaker_label text,
  side_id uuid references sides (id),
  visibility visibility not null default 'shared',
  start_ms int,
  end_ms int,
  spoken_at timestamptz not null default accord_now(),
  text text not null,
  language text,
  text_translated text,
  translated_to text,
  is_final boolean not null default true,
  created_at timestamptz not null default accord_now(),
  check (breakout_id is null or visibility = 'private_to_side')
);
create index if not exists segments_meeting_idx on transcript_segments (meeting_id, seq);

-- ---------------------------------------------------------------------------
-- Extracted items, versions, signatures, clarifications
-- ---------------------------------------------------------------------------
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  meeting_id uuid references meetings (id),
  kind item_kind not null,
  status item_status not null default 'proposed',
  title text not null,
  current_version int not null default 1,
  visibility visibility not null default 'shared' check (visibility = 'shared'),
  side_id uuid references sides (id),     -- side that raised it
  confidence numeric(4, 3),
  rationale text,                          -- why the AI classified it this way
  source_segment_ids uuid[] not null default '{}',
  interpretations jsonb not null default '[]',
  cultural_flags jsonb not null default '[]',
  source actor_source not null default 'human',
  corrected_by uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);
create index if not exists items_partnership_idx on items (partnership_id, status);
create index if not exists items_meeting_idx on items (meeting_id);

create table if not exists item_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id),
  partnership_id uuid not null references partnerships (id),
  version int not null,
  wording text not null,
  deliverable text,
  owner_user_id uuid references auth.users (id),
  owner_side_id uuid references sides (id),
  due_date date,
  due_text text,                  -- the original words ("by spring")
  deadline_strength deadline_strength,
  amount numeric(14, 2),
  currency text,
  content_hash text not null,
  status version_status not null default 'draft',
  amends_version int,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  unique (item_id, version)
);

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  item_version_id uuid not null references item_versions (id),
  item_id uuid not null references items (id),
  partnership_id uuid not null references partnerships (id),
  side_id uuid not null references sides (id),
  user_id uuid not null references auth.users (id),
  wording text not null,          -- exact wording signed
  wording_hash text not null,     -- = item_versions.content_hash at signing time
  signature_hash text not null,
  signed_at timestamptz not null default accord_now(),
  unique (item_version_id, side_id)
);

create table if not exists clarifications (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id),
  partnership_id uuid not null references partnerships (id),
  category clarification_category not null default 'other',
  question text not null,
  possible_meanings jsonb not null default '[]',
  asked_to_side_id uuid references sides (id),
  asked_to_user_id uuid references auth.users (id),
  status clarification_status not null default 'open',
  answer text,
  answered_by uuid references auth.users (id),
  answered_at timestamptz,
  source actor_source not null default 'ai',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now()
);
create index if not exists clarifications_item_idx on clarifications (item_id, status);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  item_id uuid references items (id),
  item_version_id uuid references item_versions (id),
  parent_task_id uuid references tasks (id),
  meeting_id uuid references meetings (id),
  source_segment_id uuid references transcript_segments (id),
  title text not null,
  description text,
  assignee_id uuid references auth.users (id),
  side_id uuid references sides (id),
  visibility visibility not null default 'shared',
  start_date date,
  due_date date,
  original_due_date date,
  deadline_strength deadline_strength not null default 'soft',
  status task_status not null default 'todo',
  slip_count int not null default 0,
  is_milestone boolean not null default false,
  completed_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);
create index if not exists tasks_partnership_idx on tasks (partnership_id, status, due_date);
create index if not exists tasks_assignee_idx on tasks (assignee_id, status);

create table if not exists task_dependencies (
  task_id uuid not null references tasks (id),
  depends_on_task_id uuid not null references tasks (id),
  partnership_id uuid not null references partnerships (id),
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

-- ---------------------------------------------------------------------------
-- Goals, expectations
-- ---------------------------------------------------------------------------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  meeting_id uuid references meetings (id),     -- set for meeting-specific goals
  side_id uuid references sides (id),           -- null = joint goal
  visibility visibility not null default 'shared',
  title text not null,
  success_criteria text,
  target_date date,
  progress int not null default 0 check (progress between 0 and 100),
  status goal_status not null default 'on_track',
  summary text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

create table if not exists goal_evidence (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals (id),
  partnership_id uuid not null references partnerships (id),
  meeting_id uuid references meetings (id),
  visibility visibility not null default 'shared',
  side_id uuid references sides (id),
  segment_ids uuid[] not null default '{}',
  quote text,
  finding text not null,
  progress_after int check (progress_after between 0 and 100),
  confidence numeric(4, 3),
  source actor_source not null default 'ai',
  created_at timestamptz not null default accord_now()
);

create table if not exists expectations (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id),
  partnership_id uuid not null references partnerships (id),
  side_id uuid not null references sides (id),
  goal_id uuid references goals (id),
  visibility visibility not null default 'private_to_side',
  kind expectation_kind not null default 'must_answer',
  text text not null,
  status answer_status not null default 'unanswered',
  evidence text,
  evidence_segment_ids uuid[] not null default '{}',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Side chat/notes, pulses, reviews, health, partner profiles, memory
-- ---------------------------------------------------------------------------
create table if not exists side_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings (id),
  breakout_id uuid references breakouts (id),
  partnership_id uuid not null references partnerships (id),
  side_id uuid not null references sides (id),
  visibility visibility not null default 'private_to_side' check (visibility = 'private_to_side'),
  user_id uuid references auth.users (id),
  kind text not null default 'chat' check (kind in ('chat', 'note', 'assistant')),
  text text not null,
  created_at timestamptz not null default accord_now()
);

create table if not exists pulses (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id),
  partnership_id uuid not null references partnerships (id),
  side_id uuid not null references sides (id),
  visibility visibility not null default 'private_to_side',
  user_id uuid references auth.users (id),
  clarity smallint check (clarity between 1 and 5),
  follow_through smallint check (follow_through between 1 and 5),
  responsiveness smallint check (responsiveness between 1 and 5),
  comment text,
  created_at timestamptz not null default accord_now(),
  unique (meeting_id, user_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  meeting_id uuid references meetings (id),
  side_id uuid references sides (id),
  visibility visibility not null default 'shared',
  summary jsonb not null default '{}',
  model text,
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now()
);

create table if not exists health_notes (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  meeting_id uuid references meetings (id),
  side_id uuid references sides (id),
  visibility visibility not null default 'shared',
  sentiment health_sentiment not null,
  category text,
  title text not null,
  body text not null,
  evidence jsonb not null default '[]',
  source actor_source not null default 'ai',
  created_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

create table if not exists partner_profiles (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  about_side_id uuid not null references sides (id),
  side_id uuid references sides (id),           -- author side (for private notes)
  visibility visibility not null default 'shared',
  communication_style text,
  preferences jsonb not null default '[]',
  notes text,
  updated_at timestamptz not null default accord_now()
);

create table if not exists memory_entries (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid references partnerships (id),
  organization_id uuid references organizations (id),
  side_id uuid references sides (id),
  visibility visibility not null default 'shared',
  kind memory_kind not null,
  term text,
  content text not null,
  source actor_source not null default 'human',
  source_ref jsonb,
  embedding extensions.vector(1024),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now(),
  updated_at timestamptz not null default accord_now(),
  archived_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Notifications, sharing, deletion requests, activity log
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  partnership_id uuid references partnerships (id),
  kind text not null,
  ref_id uuid,                    -- the item/task/clarification this is about
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default accord_now()
);

create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  scope text not null default 'hub',
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default accord_now()
);

create table if not exists deletion_requests (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships (id),
  side_id uuid not null references sides (id),
  requested_by uuid references auth.users (id),
  approved_at timestamptz not null default accord_now(),
  execute_after timestamptz not null default accord_now() + interval '30 days',
  cancelled_at timestamptz,
  unique (partnership_id, side_id)
);

create table if not exists activity_log (
  id bigint generated always as identity primary key,
  partnership_id uuid references partnerships (id),
  actor_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id text,
  visibility visibility not null default 'shared',
  side_id uuid references sides (id),
  data jsonb not null default '{}',
  at timestamptz not null default accord_now()
);
create index if not exists activity_partnership_idx on activity_log (partnership_id, at desc);

-- =============================================================================
-- Membership helpers (SECURITY DEFINER so RLS policies can call them without
-- recursing into side_members' own policies).
-- =============================================================================
create or replace function my_side_ids(p_partnership uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select sm.side_id from side_members sm
  where sm.partnership_id = p_partnership and sm.user_id = auth.uid() and sm.removed_at is null
$$;

create or replace function my_writable_side_ids(p_partnership uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select sm.side_id from side_members sm
  where sm.partnership_id = p_partnership and sm.user_id = auth.uid()
    and sm.removed_at is null and sm.role <> 'viewer'
$$;

create or replace function is_partnership_member(p_partnership uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from my_side_ids(p_partnership))
$$;

create or replace function is_side_member(p_side uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from side_members
    where side_id = p_side and user_id = auth.uid() and removed_at is null)
$$;

create or replace function is_side_owner(p_side uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from side_members
    where side_id = p_side and user_id = auth.uid() and removed_at is null and role = 'owner')
$$;

create or replace function is_partnership_owner(p_partnership uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from side_members
    where partnership_id = p_partnership and user_id = auth.uid()
      and removed_at is null and role = 'owner')
$$;

create or replace function can_read(p_partnership uuid, p_vis visibility, p_side uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_partnership_member(p_partnership)
    and (p_vis = 'shared' or p_side in (select my_side_ids(p_partnership)))
$$;

create or replace function can_write(p_partnership uuid, p_vis visibility, p_side uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from my_writable_side_ids(p_partnership))
    and (p_vis = 'shared' or p_side in (select my_writable_side_ids(p_partnership)))
$$;

create or replace function shares_partnership_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from side_members a join side_members b on a.partnership_id = b.partnership_id
    where a.user_id = auth.uid() and b.user_id = p_user
      and a.removed_at is null and b.removed_at is null)
$$;

create or replace function is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where organization_id = p_org and user_id = auth.uid())
$$;

create or replace function org_visible(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_org_member(p_org) or exists (
    select 1 from sides s where s.organization_id = p_org
      and s.partnership_id in (select partnership_id from side_members
                               where user_id = auth.uid() and removed_at is null))
$$;

-- =============================================================================
-- Generic triggers
-- =============================================================================
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- Fill partnership_id from the parent row so it can never be forged, and make
-- sure every side reference belongs to the same partnership.
create or replace function fill_scope() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid; j jsonb; k text;
begin
  case tg_table_name
    when 'side_members'         then select partnership_id into pid from sides where id = new.side_id;
    when 'meeting_participants' then select partnership_id into pid from meetings where id = new.meeting_id;
    when 'agenda_items'         then select partnership_id into pid from meetings where id = new.meeting_id;
    when 'breakouts'            then select partnership_id into pid from meetings where id = new.meeting_id;
    when 'transcript_segments'  then select partnership_id into pid from meetings where id = new.meeting_id;
    when 'expectations'         then select partnership_id into pid from meetings where id = new.meeting_id;
    when 'pulses'               then select partnership_id into pid from meetings where id = new.meeting_id;
    when 'item_versions'        then select partnership_id into pid from items where id = new.item_id;
    when 'clarifications'       then select partnership_id into pid from items where id = new.item_id;
    when 'goal_evidence'        then select partnership_id into pid from goals where id = new.goal_id;
    when 'task_dependencies'    then select partnership_id into pid from tasks where id = new.task_id;
    when 'invites'              then select partnership_id into pid from sides where id = new.side_id;
    else pid := null;
  end case;
  if pid is not null then new.partnership_id := pid; end if;

  -- a meeting_id on a directly-scoped table must be in the same partnership
  j := to_jsonb(new);
  if j ? 'meeting_id' and j->>'meeting_id' is not null and tg_table_name not in
     ('meeting_participants','agenda_items','breakouts','transcript_segments','expectations','pulses') then
    if not exists (select 1 from meetings where id = (j->>'meeting_id')::uuid
                   and partnership_id = new.partnership_id) then
      raise exception 'meeting does not belong to this partnership';
    end if;
  end if;
  foreach k in array array['side_id','owner_side_id','asked_to_side_id','about_side_id'] loop
    if j ? k and j->>k is not null then
      if not exists (select 1 from sides where id = (j->>k)::uuid and partnership_id = new.partnership_id) then
        raise exception '% does not belong to this partnership', k;
      end if;
    end if;
  end loop;
  return new;
end $$;

-- Append-only audit log for every business table.
create or replace function log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  prev jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  changes jsonb := '{}';
  k text;
  actor uuid := coalesce(auth.uid(), nullif(current_setting('accord.actor', true), '')::uuid);
  pid uuid := coalesce((rec->>'partnership_id')::uuid, case when tg_table_name = 'partnerships' then (rec->>'id')::uuid end);
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(rec) loop
      if k not in ('updated_at') and (rec->k) is distinct from (prev->k) then
        changes := changes || jsonb_build_object(k, jsonb_build_array(prev->k, rec->k));
      end if;
    end loop;
    if changes = '{}' then return new; end if;
  else
    changes := rec - 'embedding';
  end if;
  insert into activity_log (partnership_id, actor_id, action, entity, entity_id, visibility, side_id, data, at)
  values (pid, actor, lower(tg_op), tg_table_name,
          coalesce(rec->>'id', (rec->>'side_id') || ':' || (rec->>'user_id'), (rec->>'meeting_id') || ':' || (rec->>'user_id'), (rec->>'task_id') || ':' || (rec->>'depends_on_task_id')),
          coalesce((rec->>'visibility')::visibility, 'shared'),
          case when rec ? 'visibility' then (rec->>'side_id')::uuid end,
          changes, accord_now());
  return coalesce(new, old);
end $$;

create or replace function forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% rows are append-only', tg_table_name using errcode = 'check_violation';
end $$;

-- =============================================================================
-- Hashing
-- =============================================================================
create or replace function hex_sha256(t text) returns text
language sql immutable as $$ select encode(sha256(convert_to(t, 'UTF8')), 'hex') $$;

create or replace function version_hash(v item_versions) returns text
language sql immutable as $$
  select hex_sha256(jsonb_build_object(
    'item_id', v.item_id, 'version', v.version, 'wording', v.wording,
    'deliverable', v.deliverable, 'owner_user_id', v.owner_user_id,
    'owner_side_id', v.owner_side_id, 'due_date', v.due_date,
    'deadline_strength', v.deadline_strength, 'amount', v.amount, 'currency', v.currency)::text)
$$;

create or replace function item_versions_before() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.content_hash := version_hash(new);
    return new;
  end if;
  -- UPDATE: content is immutable for everyone; only status may move, and only
  -- through the signing functions.
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'item versions are immutable; create a new version instead' using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status and is_end_user() then
    raise exception 'version status changes only through signing' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

-- Items: status and version pointer are owned by the rule functions.
create or replace function items_guard() returns trigger
language plpgsql as $$
begin
  if is_end_user() and (new.status is distinct from old.status
      or new.current_version is distinct from old.current_version
      or new.partnership_id is distinct from old.partnership_id) then
    raise exception 'item status changes only through clarifications and signing' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

-- Recompute an item's status from its clarifications and signatures.
create or replace function recompute_item_status(p_item uuid) returns item_status
language plpgsql security definer set search_path = public as $$
declare
  it items; v item_versions; open_n int; sig_n int; clar_n int; st item_status;
begin
  select * into it from items where id = p_item for update;
  if it.status = 'declined' then return it.status; end if;
  select * into v from item_versions where item_id = p_item and version = it.current_version;
  if v.status = 'in_force' then st := 'committed';
  else
    select count(*) filter (where status = 'open'), count(*) into open_n, clar_n
      from clarifications where item_id = p_item;
    select count(*) into sig_n from signatures where item_version_id = v.id;
    st := case when open_n > 0 then 'needs_clarification'
               when sig_n > 0 then 'partially_signed'
               when clar_n > 0 then 'clarified'
               else 'proposed' end;
  end if;
  if st is distinct from it.status then
    update items set status = st where id = p_item;
  end if;
  return st;
end $$;

create or replace function clarifications_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_item_status(new.item_id);
  return new;
end $$;

create or replace function clarifications_before() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status <> 'open' and old.status = 'open' then
    new.answered_at := coalesce(new.answered_at, accord_now());
    new.answered_by := coalesce(new.answered_by, auth.uid());
  end if;
  if tg_op = 'UPDATE' and old.status <> 'open' and new.status = 'open' then
    new.answered_at := null;
  end if;
  return new;
end $$;

-- Tasks: slip tracking, completion time, and "reassign within your side only".
create or replace function tasks_before() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.original_due_date := coalesce(new.original_due_date, new.due_date);
  else
    if new.due_date is distinct from old.due_date and old.due_date is not null then
      new.slip_count := old.slip_count + case when new.due_date > old.due_date then 1 else 0 end;
    end if;
    if new.assignee_id is distinct from old.assignee_id and is_end_user()
       and not (old.side_id is not null and is_side_owner(old.side_id))
       and old.created_by is distinct from auth.uid() then
      raise exception 'only the side owner can reassign this task' using errcode = 'insufficient_privilege';
    end if;
    if new.side_id is distinct from old.side_id and is_end_user() and old.side_id is not null
       and not is_side_owner(old.side_id) then
      raise exception 'only the side owner can move a task to another side' using errcode = 'insufficient_privilege';
    end if;
  end if;
  if new.assignee_id is not null and new.side_id is not null and not exists (
      select 1 from side_members where side_id = new.side_id and user_id = new.assignee_id and removed_at is null) then
    raise exception 'assignee must be a member of the task''s side';
  end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, accord_now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

-- New auth user → profile row.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Wire triggers ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','organizations','partnerships','meetings','items','tasks',
                           'goals','expectations','reviews','memory_entries'] loop
    execute format('drop trigger if exists %1$s_updated on %1$I', t);
    execute format('create trigger %1$s_updated before update on %1$I for each row execute function set_updated_at()', t);
  end loop;

  foreach t in array array['side_members','meeting_participants','agenda_items','breakouts','transcript_segments',
                           'expectations','pulses','item_versions','clarifications','goal_evidence',
                           'task_dependencies','invites','items','tasks','goals','reviews','health_notes',
                           'partner_profiles','memory_entries','side_messages','signatures','share_links',
                           'deletion_requests'] loop
    execute format('drop trigger if exists %1$s_scope on %1$I', t);
    execute format('create trigger %1$s_scope before insert or update on %1$I for each row execute function fill_scope()', t);
  end loop;

  foreach t in array array['partnerships','sides','side_members','invites','meetings','meeting_participants',
                           'agenda_items','breakouts','items','item_versions','signatures','clarifications',
                           'tasks','task_dependencies','goals','goal_evidence','expectations','pulses','reviews',
                           'health_notes','partner_profiles','memory_entries','share_links','deletion_requests'] loop
    execute format('drop trigger if exists %1$s_audit on %1$I', t);
    execute format('create trigger %1$s_audit after insert or update or delete on %1$I for each row execute function log_activity()', t);
  end loop;
end $$;

drop trigger if exists item_versions_rules on item_versions;
create trigger item_versions_rules before insert or update on item_versions
  for each row execute function item_versions_before();
drop trigger if exists item_versions_nodelete on item_versions;
create trigger item_versions_nodelete before delete on item_versions
  for each row execute function forbid_change();

drop trigger if exists signatures_immutable on signatures;
create trigger signatures_immutable before update or delete on signatures
  for each row execute function forbid_change();

drop trigger if exists activity_immutable on activity_log;
create trigger activity_immutable before update or delete on activity_log
  for each row execute function forbid_change();

drop trigger if exists items_rules on items;
create trigger items_rules before update on items for each row execute function items_guard();

drop trigger if exists clarifications_rules on clarifications;
create trigger clarifications_rules before update on clarifications
  for each row execute function clarifications_before();
drop trigger if exists clarifications_status on clarifications;
create trigger clarifications_status after insert or update of status on clarifications
  for each row execute function clarifications_after();

drop trigger if exists tasks_rules on tasks;
create trigger tasks_rules before insert or update on tasks for each row execute function tasks_before();

-- =============================================================================
-- Rule functions (the only way to create partnerships, accept invites, create
-- and revise items, sign, decline)
-- =============================================================================

-- Profile setup: saves profile and ensures an org (and optional team) membership.
create or replace function setup_profile(
  p_full_name text, p_title text, p_job_role text, p_languages text[], p_timezone text,
  p_org_name text, p_team_name text default null, p_communication_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); org uuid; team uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  update profiles set full_name = p_full_name, title = p_title, job_role = p_job_role,
    languages = coalesce(p_languages, '{}'), timezone = coalesce(p_timezone, timezone),
    communication_notes = p_communication_notes, onboarded_at = coalesce(onboarded_at, now())
  where id = uid;

  select om.organization_id into org from org_members om join organizations o on o.id = om.organization_id
   where om.user_id = uid and lower(o.name) = lower(trim(p_org_name)) limit 1;
  if org is null and coalesce(trim(p_org_name), '') <> '' then
    insert into organizations (name, created_by) values (trim(p_org_name), uid) returning id into org;
    insert into org_members (organization_id, user_id, is_admin, title) values (org, uid, true, p_title);
  end if;
  if org is not null and coalesce(trim(p_team_name), '') <> '' then
    select id into team from teams where organization_id = org and lower(name) = lower(trim(p_team_name));
    if team is null then
      insert into teams (organization_id, name) values (org, trim(p_team_name)) returning id into team;
    end if;
    update org_members set team_id = team, title = p_title where organization_id = org and user_id = uid;
  end if;
  return org;
end $$;

-- Create a partnership with two sides. The creator owns and can sign for side A.
-- Side B is either another team of an org the creator belongs to (internal) or
-- a named external org that its lead claims through the returned invite.
create or replace function create_partnership(
  p_name text, p_description text,
  p_my_label text, p_my_org uuid, p_my_team_name text,
  p_other_label text, p_other_org_name text, p_other_team_name text default null,
  p_internal boolean default false, p_my_color text default '#0f766e', p_other_color text default '#b45309'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pid uuid; side_a uuid; side_b uuid; team_a uuid; team_b uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from org_members where organization_id = p_my_org and user_id = uid) then
    raise exception 'you are not a member of that organization';
  end if;
  insert into partnerships (name, description, created_by, is_internal)
  values (p_name, p_description, uid, p_internal) returning id into pid;

  if coalesce(trim(p_my_team_name), '') <> '' then
    select id into team_a from teams where organization_id = p_my_org and lower(name) = lower(trim(p_my_team_name));
    if team_a is null then
      insert into teams (organization_id, name) values (p_my_org, trim(p_my_team_name)) returning id into team_a;
    end if;
  end if;
  insert into sides (partnership_id, position, label, organization_id, team_id, color, claimed_at, claimed_by)
  values (pid, 0, p_my_label, p_my_org, team_a, p_my_color, now(), uid) returning id into side_a;
  insert into side_members (side_id, user_id, partnership_id, role, can_sign, added_by)
  values (side_a, uid, pid, 'owner', true, uid);

  if p_internal then
    if coalesce(trim(p_other_team_name), '') <> '' then
      select id into team_b from teams where organization_id = p_my_org and lower(name) = lower(trim(p_other_team_name));
      if team_b is null then
        insert into teams (organization_id, name) values (p_my_org, trim(p_other_team_name)) returning id into team_b;
      end if;
    end if;
    insert into sides (partnership_id, position, label, organization_id, team_id, color)
    values (pid, 1, p_other_label, p_my_org, team_b, p_other_color) returning id into side_b;
  else
    insert into sides (partnership_id, position, label, pending_org_name, color)
    values (pid, 1, p_other_label, coalesce(nullif(trim(p_other_org_name), ''), p_other_label), p_other_color)
    returning id into side_b;
  end if;

  insert into invites (partnership_id, side_id, purpose, role, can_sign, created_by, max_uses)
  values (pid, side_b, 'claim_side', 'owner', true, uid, 1);
  return pid;
end $$;

-- Minimal public preview of an invite (for the invite landing page).
create or replace function invite_preview(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'partnership', p.name, 'side', s.label, 'side_color', s.color, 'purpose', i.purpose,
    'role', i.role, 'meeting', m.title, 'claimed', s.claimed_at is not null,
    'org', coalesce(o.name, s.pending_org_name),
    'valid', i.revoked_at is null and i.expires_at > now() and i.uses < i.max_uses,
    'invited_by', pr.full_name)
  from invites i join sides s on s.id = i.side_id join partnerships p on p.id = i.partnership_id
  left join organizations o on o.id = s.organization_id
  left join meetings m on m.id = i.meeting_id
  left join profiles pr on pr.id = i.created_by
  where i.token = p_token
$$;

create or replace function accept_invite(p_token text, p_org uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv invites; s sides; org uuid; other_side uuid;
begin
  if uid is null then raise exception 'sign in to accept this invite'; end if;
  select * into inv from invites where token = p_token for update;
  if inv.id is null then raise exception 'invite not found'; end if;
  if inv.revoked_at is not null or inv.expires_at < now() or inv.uses >= inv.max_uses then
    -- already a member of this side: just send them through
    if exists (select 1 from side_members where side_id = inv.side_id and user_id = uid and removed_at is null) then
      return jsonb_build_object('partnership_id', inv.partnership_id, 'side_id', inv.side_id, 'meeting_id', inv.meeting_id);
    end if;
    raise exception 'this invite has expired or been used';
  end if;
  select * into s from sides where id = inv.side_id for update;

  select side_id into other_side from side_members
   where partnership_id = inv.partnership_id and user_id = uid and removed_at is null and side_id <> inv.side_id limit 1;
  if other_side is not null then
    raise exception 'you are already on the other side of this partnership';
  end if;

  if inv.purpose = 'claim_side' then
    if s.claimed_at is not null then raise exception 'this side has already been claimed'; end if;
    org := s.organization_id;
    if org is null then
      if p_org is not null then
        if not exists (select 1 from org_members where organization_id = p_org and user_id = uid) then
          raise exception 'you are not a member of that organization';
        end if;
        org := p_org;
      else
        insert into organizations (name, created_by) values (coalesce(s.pending_org_name, s.label), uid) returning id into org;
        insert into org_members (organization_id, user_id, is_admin) values (org, uid, true);
      end if;
    end if;
    update sides set claimed_at = now(), claimed_by = uid, organization_id = org where id = s.id;
  elsif s.claimed_at is null then
    raise exception 'this side has not been claimed yet';
  end if;

  insert into side_members (side_id, user_id, partnership_id, role, can_sign, added_by)
  values (inv.side_id, uid, inv.partnership_id, inv.role, inv.can_sign, inv.created_by)
  on conflict (side_id, user_id) do update set removed_at = null,
    role = case when side_members.role = 'owner' then 'owner' else excluded.role end,
    can_sign = side_members.can_sign or excluded.can_sign;

  org := coalesce(org, s.organization_id);
  if org is not null then
    insert into org_members (organization_id, user_id, team_id) values (org, uid, s.team_id)
    on conflict (organization_id, user_id) do nothing;
  end if;
  if inv.meeting_id is not null then
    insert into meeting_participants (meeting_id, user_id, partnership_id, side_id)
    values (inv.meeting_id, uid, inv.partnership_id, inv.side_id) on conflict do nothing;
  end if;
  update invites set uses = uses + 1 where id = inv.id;
  return jsonb_build_object('partnership_id', inv.partnership_id, 'side_id', inv.side_id, 'meeting_id', inv.meeting_id);
end $$;

-- Create an item with its first version.
create or replace function create_item(
  p_partnership uuid, p_meeting uuid, p_kind item_kind, p_title text, p_wording text,
  p_owner_user uuid default null, p_owner_side uuid default null, p_due_date date default null,
  p_due_text text default null, p_strength deadline_strength default null,
  p_amount numeric default null, p_currency text default null, p_deliverable text default null,
  p_source_segments uuid[] default '{}', p_confidence numeric default null, p_rationale text default null,
  p_source actor_source default 'human', p_side uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare iid uuid; uid uuid := auth.uid();
begin
  if is_end_user() and not can_write(p_partnership, 'shared', null) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  insert into items (partnership_id, meeting_id, kind, title, side_id, confidence, rationale,
                     source_segment_ids, source, created_by)
  values (p_partnership, p_meeting, p_kind, p_title, p_side, p_confidence, p_rationale,
          coalesce(p_source_segments, '{}'), p_source, uid)
  returning id into iid;
  insert into item_versions (item_id, partnership_id, version, wording, deliverable, owner_user_id, owner_side_id,
                             due_date, due_text, deadline_strength, amount, currency, created_by, content_hash)
  values (iid, p_partnership, 1, p_wording, p_deliverable, p_owner_user, p_owner_side, p_due_date, p_due_text,
          p_strength, p_amount, p_currency, uid, '');
  return iid;
end $$;

-- Revise wording/terms. Before commitment: replaces the draft (prior partial
-- signatures stay on the old, now void, version). After commitment: this is an
-- amendment — the committed version stays in force until every side signs the new one.
create or replace function revise_item(
  p_item uuid, p_wording text, p_owner_user uuid, p_owner_side uuid, p_due_date date,
  p_due_text text, p_strength deadline_strength, p_amount numeric, p_currency text,
  p_deliverable text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare it items; cur item_versions; nv int; uid uuid := auth.uid();
begin
  select * into it from items where id = p_item for update;
  if it.id is null then raise exception 'item not found'; end if;
  if is_end_user() and not can_write(it.partnership_id, 'shared', null) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  if it.status = 'declined' then raise exception 'declined items cannot be revised'; end if;
  select * into cur from item_versions where item_id = p_item and version = it.current_version;
  nv := it.current_version + 1;
  if cur.status = 'draft' then
    update item_versions set status = 'void' where id = cur.id;
  end if;
  insert into item_versions (item_id, partnership_id, version, wording, deliverable, owner_user_id, owner_side_id,
                             due_date, due_text, deadline_strength, amount, currency, created_by, amends_version, content_hash)
  values (p_item, it.partnership_id, nv, p_wording, coalesce(p_deliverable, cur.deliverable), p_owner_user, p_owner_side,
          p_due_date, p_due_text, p_strength, p_amount, p_currency, uid,
          case when cur.status = 'in_force' then cur.version end, '');
  update items set current_version = nv where id = p_item;
  perform recompute_item_status(p_item);
  return nv;
end $$;

-- Sign the current version for the caller's side.
create or replace function sign_item_version(p_version uuid, p_side uuid default null) returns item_status
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); v item_versions; it items; side uuid; open_n int;
  signed_n int; side_n int; st item_status; at timestamptz := accord_now(); h text;
begin
  if uid is null then raise exception 'sign in to sign' using errcode = 'insufficient_privilege'; end if;
  select * into v from item_versions where id = p_version;
  if v.id is null then raise exception 'version not found'; end if;
  select * into it from items where id = v.item_id for update;
  if it.current_version <> v.version or v.status <> 'draft' then
    raise exception 'only the current, unsigned version can be signed' using errcode = 'check_violation';
  end if;
  if it.status = 'declined' then raise exception 'this item was declined' using errcode = 'check_violation'; end if;

  select count(*) into open_n from clarifications where item_id = it.id and status = 'open';
  if open_n > 0 then
    raise exception 'cannot sign while % clarification(s) are open', open_n using errcode = 'check_violation';
  end if;

  select sm.side_id into side from side_members sm
   where sm.partnership_id = it.partnership_id and sm.user_id = uid and sm.removed_at is null
     and sm.can_sign and sm.role <> 'viewer' and (p_side is null or sm.side_id = p_side)
   limit 1;
  if side is null then
    raise exception 'you are not an authorized signer for this partnership' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from signatures where item_version_id = v.id and side_id = side) then
    raise exception 'your side has already signed this version' using errcode = 'unique_violation';
  end if;

  h := version_hash(v);
  if h <> v.content_hash then
    raise exception 'content hash mismatch: this version has been tampered with' using errcode = 'data_corrupted';
  end if;

  insert into signatures (item_version_id, item_id, partnership_id, side_id, user_id, wording, wording_hash,
                          signature_hash, signed_at)
  values (v.id, it.id, it.partnership_id, side, uid, v.wording, h,
          hex_sha256(h || '|' || side || '|' || uid || '|' || at::text), at);

  select count(distinct s.side_id) into signed_n from signatures s where s.item_version_id = v.id;
  select count(*) into side_n from sides where partnership_id = it.partnership_id and archived_at is null;
  if signed_n >= side_n then
    update item_versions set status = 'superseded'
     where item_id = it.id and status = 'in_force';
    update item_versions set status = 'in_force' where id = v.id;
    update notifications set read_at = coalesce(read_at, at)
     where ref_id = it.id and kind = 'awaiting_signature';
  end if;
  st := recompute_item_status(it.id);

  -- notify the other sides' signers that a signature awaits them
  if st = 'partially_signed' then
    insert into notifications (user_id, partnership_id, kind, ref_id, title, link)
    select sm.user_id, it.partnership_id, 'awaiting_signature', it.id, 'Awaiting your signature: ' || it.title,
           '/p/' || it.partnership_id || '/commitments'
      from side_members sm
     where sm.partnership_id = it.partnership_id and sm.can_sign and sm.removed_at is null
       and sm.side_id not in (select side_id from signatures where item_version_id = v.id);
  end if;
  return st;
end $$;

create or replace function decline_item(p_item uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare it items;
begin
  select * into it from items where id = p_item for update;
  if not exists (select 1 from side_members where partnership_id = it.partnership_id and user_id = auth.uid()
                 and can_sign and removed_at is null) then
    raise exception 'only signers can decline' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from item_versions where item_id = p_item and status = 'in_force') then
    raise exception 'committed items cannot be declined; amend them instead';
  end if;
  update items set status = 'declined', rationale = coalesce(rationale, '') ||
    case when p_reason is not null then E'\nDeclined: ' || p_reason else '' end
  where id = p_item;
end $$;

-- Side owners manage roles/signers within their side.
create or replace function set_member_role(p_side uuid, p_user uuid, p_role side_role, p_can_sign boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_side_owner(p_side) then
    raise exception 'only the side owner can change roles' using errcode = 'insufficient_privilege';
  end if;
  if p_user = auth.uid() and p_role <> 'owner' and (select count(*) from side_members
      where side_id = p_side and role = 'owner' and removed_at is null) = 1 then
    raise exception 'a side needs at least one owner';
  end if;
  update side_members set role = p_role, can_sign = p_can_sign and p_role <> 'viewer'
   where side_id = p_side and user_id = p_user;
end $$;

-- Deleting a partnership: every side's owner must request it; executes after 30 days.
create or replace function request_partnership_deletion(p_partnership uuid, p_side uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_side_owner(p_side) then raise exception 'only side owners can request deletion'; end if;
  insert into deletion_requests (partnership_id, side_id, requested_by)
  values (p_partnership, p_side, auth.uid())
  on conflict (partnership_id, side_id) do update set cancelled_at = null, approved_at = now(),
    execute_after = now() + interval '30 days';
  select count(*) into n from deletion_requests where partnership_id = p_partnership and cancelled_at is null;
  return n;
end $$;

-- =============================================================================
-- Row-Level Security
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','organizations','teams','org_members','partnerships','sides','side_members',
    'invites','meetings','meeting_participants','agenda_items','breakouts','transcript_segments','items',
    'item_versions','signatures','clarifications','tasks','task_dependencies','goals','goal_evidence',
    'expectations','side_messages','pulses','reviews','health_notes','partner_profiles','memory_entries',
    'notifications','share_links','deletion_requests','activity_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    -- no hard deletes for end users anywhere
    execute format('revoke delete, truncate on %I from anon, authenticated', t);
  end loop;
end $$;

-- helper to (re)create a policy idempotently
create or replace function _policy(p_table text, p_name text, p_cmd text, p_using text, p_check text default null)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on %I', p_name, p_table);
  execute format('create policy %I on %I for %s to authenticated %s %s', p_name, p_table, p_cmd,
    case when p_using is not null then 'using (' || p_using || ')' else '' end,
    case when p_check is not null then 'with check (' || p_check || ')' else '' end);
end $$;

-- profiles
select _policy('profiles', 'profiles_read', 'select', 'id = auth.uid() or shares_partnership_with(id) or exists (select 1 from org_members a join org_members b on a.organization_id = b.organization_id where a.user_id = auth.uid() and b.user_id = profiles.id)');
select _policy('profiles', 'profiles_update', 'update', 'id = auth.uid()', 'id = auth.uid()');

-- organizations / teams / org_members
select _policy('organizations', 'orgs_read', 'select', 'org_visible(id) or created_by = auth.uid()');
select _policy('organizations', 'orgs_insert', 'insert', null, 'created_by = auth.uid()');
select _policy('organizations', 'orgs_update', 'update', 'exists (select 1 from org_members m where m.organization_id = organizations.id and m.user_id = auth.uid() and m.is_admin)');
select _policy('teams', 'teams_read', 'select', 'org_visible(organization_id)');
select _policy('teams', 'teams_insert', 'insert', null, 'is_org_member(organization_id)');
select _policy('org_members', 'org_members_read', 'select', 'user_id = auth.uid() or is_org_member(organization_id)');
select _policy('org_members', 'org_members_insert', 'insert', null,
  'user_id = auth.uid() and exists (select 1 from organizations o where o.id = organization_id and o.created_by = auth.uid())');
select _policy('org_members', 'org_members_update', 'update', 'user_id = auth.uid()', 'user_id = auth.uid()');

-- partnerships / sides / members / invites
select _policy('partnerships', 'partnerships_read', 'select', 'is_partnership_member(id)');
select _policy('partnerships', 'partnerships_update', 'update', 'is_partnership_owner(id)', 'is_partnership_owner(id)');
select _policy('sides', 'sides_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('sides', 'sides_update', 'update', 'is_side_owner(id)', 'is_side_owner(id)');
select _policy('side_members', 'side_members_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('side_members', 'side_members_update', 'update', 'is_side_owner(side_id)', 'is_side_owner(side_id)');
select _policy('invites', 'invites_read', 'select', 'is_side_owner(side_id) or (purpose = ''claim_side'' and is_partnership_owner(partnership_id))');
select _policy('invites', 'invites_insert', 'insert', null,
  'created_by = auth.uid() and (is_side_owner(side_id) or (purpose = ''claim_side'' and is_partnership_owner(partnership_id)))');
select _policy('invites', 'invites_update', 'update', 'is_side_owner(side_id) or is_partnership_owner(partnership_id)');

-- meetings and meeting-scoped rows
select _policy('meetings', 'meetings_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('meetings', 'meetings_insert', 'insert', null, 'can_write(partnership_id, ''shared'', null)');
select _policy('meetings', 'meetings_update', 'update', 'can_write(partnership_id, ''shared'', null)');
select _policy('meeting_participants', 'participants_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('meeting_participants', 'participants_insert', 'insert', null,
  'user_id = auth.uid() and side_id in (select my_side_ids(partnership_id))');
select _policy('meeting_participants', 'participants_update', 'update', 'user_id = auth.uid()', 'user_id = auth.uid()');
select _policy('breakouts', 'breakouts_read', 'select', 'can_read(partnership_id, visibility, side_id)');
select _policy('breakouts', 'breakouts_insert', 'insert', null, 'can_write(partnership_id, visibility, side_id)');
select _policy('breakouts', 'breakouts_update', 'update', 'can_write(partnership_id, visibility, side_id)');
-- a person may only add transcript text they spoke, and only after consenting
select _policy('transcript_segments', 'segments_read', 'select', 'can_read(partnership_id, visibility, side_id)');
select _policy('transcript_segments', 'segments_insert', 'insert', null,
  'speaker_user_id = auth.uid() and can_write(partnership_id, visibility, side_id)
   and exists (select 1 from meeting_participants mp where mp.meeting_id = transcript_segments.meeting_id
               and mp.user_id = auth.uid() and mp.consented_at is not null and mp.consent_revoked_at is null)');

-- generic visibility-aware tables
do $$
declare t text;
begin
  foreach t in array array['agenda_items','goals','goal_evidence','expectations','pulses','reviews','health_notes',
                           'partner_profiles','memory_entries','tasks','side_messages'] loop
    perform _policy(t, t || '_read', 'select', 'can_read(partnership_id, visibility, side_id)');
    perform _policy(t, t || '_insert', 'insert', null, 'can_write(partnership_id, visibility, side_id)');
    perform _policy(t, t || '_update', 'update', 'can_write(partnership_id, visibility, side_id)',
                    'can_write(partnership_id, visibility, side_id)');
  end loop;
end $$;
-- tasks: people update their own; side owners (and creators) manage the rest
select _policy('tasks', 'tasks_update', 'update',
  'can_read(partnership_id, visibility, side_id) and (assignee_id = auth.uid() or created_by = auth.uid() or (side_id is not null and is_side_owner(side_id)) or (side_id is null and can_write(partnership_id, ''shared'', null)))',
  'can_write(partnership_id, visibility, side_id) or assignee_id = auth.uid()');
select _policy('side_messages', 'side_messages_insert', 'insert', null,
  'user_id = auth.uid() and side_id in (select my_side_ids(partnership_id))');
select _policy('side_messages', 'side_messages_update', 'update', 'false');
select _policy('pulses', 'pulses_insert', 'insert', null,
  'user_id = auth.uid() and can_write(partnership_id, visibility, side_id) and side_id in (select my_side_ids(partnership_id))');
select _policy('task_dependencies', 'task_deps_read', 'select',
  'exists (select 1 from tasks t where t.id = task_id and can_read(t.partnership_id, t.visibility, t.side_id))');
select _policy('task_dependencies', 'task_deps_insert', 'insert', null, 'can_write(partnership_id, ''shared'', null)');

-- items: always shared; created/revised/signed through functions, but humans may
-- correct classification (kind, title, rationale) directly.
select _policy('items', 'items_read', 'select', 'can_read(partnership_id, visibility, side_id)');
select _policy('items', 'items_update', 'update', 'can_write(partnership_id, ''shared'', null)', 'can_write(partnership_id, ''shared'', null)');
select _policy('item_versions', 'item_versions_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('signatures', 'signatures_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('clarifications', 'clarifications_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('clarifications', 'clarifications_insert', 'insert', null, 'can_write(partnership_id, ''shared'', null)');
select _policy('clarifications', 'clarifications_update', 'update', 'can_write(partnership_id, ''shared'', null)', 'can_write(partnership_id, ''shared'', null)');

-- notifications, sharing, deletion, audit
select _policy('notifications', 'notifications_read', 'select', 'user_id = auth.uid()');
select _policy('notifications', 'notifications_update', 'update', 'user_id = auth.uid()', 'user_id = auth.uid()');
select _policy('share_links', 'share_links_read', 'select', 'is_partnership_owner(partnership_id)');
select _policy('share_links', 'share_links_insert', 'insert', null, 'is_partnership_owner(partnership_id) and created_by = auth.uid()');
select _policy('share_links', 'share_links_update', 'update', 'is_partnership_owner(partnership_id)');
select _policy('deletion_requests', 'deletion_read', 'select', 'is_partnership_member(partnership_id)');
select _policy('deletion_requests', 'deletion_update', 'update', 'is_side_owner(side_id)');
select _policy('activity_log', 'activity_read', 'select', 'can_read(partnership_id, visibility, side_id)');

drop function _policy(text, text, text, text, text);

-- Function execution: rule functions are for signed-in users; preview is public.
revoke execute on function recompute_item_status(uuid) from public, anon, authenticated;
grant execute on function invite_preview(text) to anon, authenticated;

-- Realtime: stream live-meeting and hub tables to subscribed clients (RLS applies).
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['transcript_segments','items','clarifications','signatures','tasks','expectations',
                             'side_messages','meeting_participants','breakouts','meetings','notifications'] loop
      begin
        execute format('alter publication supabase_realtime add table %I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;
