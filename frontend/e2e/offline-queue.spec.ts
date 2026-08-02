import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers";

test("une action RDV hors ligne est mise en file puis synchronisée", async ({ page, context }) => {
  await loginViaUi(page, "dr.benali@sihia.health", "demo1234");
  await page.locator('a[href="/appointments"]').first().click();
  await expect(page).toHaveURL(/\/appointments/);

  const confirmButton = page.getByRole("button", { name: /Confirmer|Confirm/i }).first();
  await expect(confirmButton).toBeVisible();

  await context.setOffline(true);
  const offlineStatus = page.getByRole("status").filter({ hasText: /hors ligne|offline/i });
  await expect(offlineStatus).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __SIHIA_NETWORK_ONLINE__?: boolean }).__SIHIA_NETWORK_ONLINE__,
      ),
    )
    .toBe(false);
  await confirmButton.click();
  await expect(offlineStatus).toContainText(/1 action/i);

  const pendingOffline = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sihia:offline-appointments:"))
      .flatMap((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[]),
  );
  expect(pendingOffline).toHaveLength(1);

  await context.setOffline(false);
  await expect(offlineStatus).toHaveCount(0, { timeout: 20_000 });

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            Object.keys(localStorage)
              .filter((key) => key.startsWith("sihia:offline-appointments:"))
              .flatMap((key) => JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[]).length,
        ),
      { timeout: 20_000 },
    )
    .toBe(0);
});
