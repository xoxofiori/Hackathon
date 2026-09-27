"use server";

import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { applySchema, connect } from "@/lib/setup/db";
import { seedDemo } from "@/lib/setup/seed";
import type { FormState } from "@/app/auth/actions";

function secretMatches(given: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(env.setupSecret);
  return env.setupSecret.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export async function runSetup(_: FormState, form: FormData): Promise<FormState> {
  if (!env.setupSecret) return { error: "Setup is disabled: set SETUP_SECRET to enable it." };
  if (!secretMatches(String(form.get("secret") ?? ""))) return { error: "That setup secret is not correct." };
  if (!env.postgresUrl) return { error: "POSTGRES_URL is not set." };
  if (!env.serviceRoleKey || !env.supabaseUrl) return { error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to create demo accounts." };
  const client = await connect(env.postgresUrl);
  try {
    await applySchema(client);
    if (form.get("schema_only") === "on") return { message: "Schema applied." };
    const report = await seedDemo(client, {
      supabaseUrl: env.supabaseUrl,
      serviceRoleKey: env.serviceRoleKey,
      demoPassword: env.demoPassword,
      reset: form.get("reset") === "on",
    });
    return {
      message: report.status === "seeded"
        ? `Schema applied and demo data seeded (${report.users} demo accounts).`
        : "Schema applied. Demo data was already present — tick “reset” to re-seed.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Setup failed." };
  } finally {
    await client.end();
  }
}
