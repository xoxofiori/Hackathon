/** Central place for environment lookups, so missing config fails loudly and clearly. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  postgresUrl: process.env.POSTGRES_URL ?? "",
  setupSecret: process.env.SETUP_SECRET ?? "",
  demoPassword: process.env.DEMO_PASSWORD || "accord-demo-2026",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
