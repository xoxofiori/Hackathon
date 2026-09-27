/**
 * Apply supabase/schema.sql and seed demo data.
 *   npm run db:setup            apply schema + seed (skips seed if already present)
 *   npm run db:setup -- --reset wipe app data first (dev only; keeps auth users)
 *   npm run db:setup -- --schema-only
 */
import { applySchema, connect } from "../src/lib/setup/db";
import { seedDemo } from "../src/lib/setup/seed";

async function main() {
  const args = new Set(process.argv.slice(2));
  const client = await connect(process.env.POSTGRES_URL ?? "");
  try {
    await applySchema(client);
    console.log("✓ schema applied");
    if (args.has("--schema-only")) return;
    const report = await seedDemo(client, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      demoPassword: process.env.DEMO_PASSWORD || "accord-demo-2026",
      reset: args.has("--reset"),
    });
    console.log(`✓ demo data: ${report.status} (${report.users} demo users)`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
