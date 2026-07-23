import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

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
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: path.join(rootDir, "backend"),
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        JWT_SECRET: process.env.JWT_SECRET ?? "ci-test-secret-minimum-32-characters-long",
        CORS_ORIGINS: "http://localhost:8080,http://127.0.0.1:8080",
      },
    },
    {
      command: "npm run dev -- --host localhost --port 8080",
      url: "http://localhost:8080",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        VITE_API_URL: "http://127.0.0.1:8000",
        VITE_USE_MOCKS: "false",
      },
    },
  ],
});
