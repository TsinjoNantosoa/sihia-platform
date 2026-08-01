import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers";

test("la visite apparaît une fois et peut être relancée depuis les paramètres", async ({
  page,
}) => {
  await loginViaUi(page, "dr.benali@sihia.health", "demo1234", { skipOnboarding: false });

  const tour = page.getByRole("dialog", { name: /Naviguez dans le SIH|Navigate the hospital/i });
  await expect(tour).toBeVisible();
  await expect(tour).toContainText(/Étape 1 sur 4|Step 1 of 4/i);
  await page.getByRole("button", { name: /Passer la visite|Skip tour/i }).click();
  await expect(tour).toHaveCount(0);

  const completed = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sihia:onboarding:"))
      .map((key) => JSON.parse(localStorage.getItem(key) ?? "null") as { completed?: boolean })
      .some((state) => state?.completed === true),
  );
  expect(completed).toBe(true);

  await page.locator('a[href="/appointments"]').first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.locator('a[href="/settings"]').first().click();
  await page
    .getByRole("button", { name: /Relancer la visite guidée|Restart guided tour/i })
    .click();
  await expect(
    page.getByRole("dialog", { name: /Naviguez dans le SIH|Navigate the hospital/i }),
  ).toBeVisible();
});
