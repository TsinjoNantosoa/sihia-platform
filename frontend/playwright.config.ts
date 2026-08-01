import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5174";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL as "chrome" | "msedge" | undefined,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "python -m uvicorn app.main:app --host 127.0.0.1 --port 8001",
      cwd: path.join(rootDir, "backend"),
      url: "http://127.0.0.1:8001/health",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        JWT_SECRET: process.env.JWT_SECRET ?? "ci-test-secret-minimum-32-characters-long",
        CORS_ORIGINS: "http://localhost:5174,http://127.0.0.1:5174",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        VITE_API_URL: "http://127.0.0.1:8001",
        VITE_USE_MOCKS: "false",
      },
    },
  ],
});
