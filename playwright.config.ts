import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Use a preinstalled Chromium when one is provided (CI images, cloud sandboxes).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    launchOptions: executablePath ? { executablePath } : {},
    trace: "retain-on-failure",
  },
});
