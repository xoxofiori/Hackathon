import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /setup reads supabase/schema.sql at runtime; make sure it ships with the server bundle.
  outputFileTracingIncludes: { "/setup": ["./supabase/schema.sql"] },
  serverExternalPackages: ["pg"],
};

export default nextConfig;
