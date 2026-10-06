import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // The E2E suite runs against the local MSW mock layer, exactly like CI does.
    // A developer's .env may point VITE_API_BASE_URL at a real backend, which
    // would open the login page in credentials mode (no "Continue as" shortcut)
    // and send /auth/* requests to NestJS, so pin it to the mock layer here.
    env: { ...(process.env as Record<string, string>), VITE_API_BASE_URL: "" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
