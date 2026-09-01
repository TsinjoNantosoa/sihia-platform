import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers";

test("Voice AI dashboard shows seeded call, transcript and tools", async ({ page }) => {
  await loginViaUi(page, "admin@sihia.health", "admin123");
  await page.locator('a[href="/voice-ai"]').first().click();
  await page.waitForURL((url) => url.pathname === "/voice-ai" || url.pathname === "/voice-ai/");
  await expect(page.getByText(/synthetic patient data/i)).toBeVisible();

  const table = page.getByTestId("voice-calls-table");
  await expect(table).toBeVisible();
  await page
    .getByRole("link", { name: /Jean Martin/i })
    .first()
    .click();
  await expect(page.getByTestId("voice-transcript")).toBeVisible();
  await expect(page.getByTestId("voice-tools")).toBeVisible();
});
