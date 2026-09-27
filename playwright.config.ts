import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Use a preinstalled Chromium when one is provided (CI images, cloud sandboxes).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const use = { launchOptions: executablePath ? { executablePath } : {}, trace: "retain-on-failure" as const };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  projects: [
    // Demo mode (default): no Supabase, no env. Needs `npm run build` first.
    {
      name: "demo",
      testMatch: /(demo|meetings|groups|integrations)\.spec\.ts/,
      use: { ...use, baseURL: process.env.E2E_DEMO_URL ?? "http://localhost:3001" },
    },
    // Live mode: needs a seeded Supabase and `ACCORD_MODE=live npm run dev` on :3000.
    {
      name: "live",
      testMatch: /foundation\.spec\.ts/,
      use: { ...use, baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
    },
  ],
  webServer: process.env.E2E_DEMO_URL
    ? undefined
    : {
        command: "npm run start -- -p 3001",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        env: { ACCORD_MODE: "demo" },
      },
});
