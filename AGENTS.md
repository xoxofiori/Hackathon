<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Accord — project notes

- `supabase/schema.sql` is the single source of truth for the database and must stay idempotent
  (`create … if not exists`, `create or replace`, policies dropped/recreated via `_policy`).
- User-facing reads go through `src/lib/supabase/server.ts` (the user's session) so RLS applies. The admin
  client is only for setup, seeding and background jobs.
- Business rules (signing, amending, invites) live in SECURITY DEFINER SQL functions; call them via `rpc`.
- After schema changes: `npm run db:reset && npm test`. Run `npm run lint && npm run typecheck` before committing.
