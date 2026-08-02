import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { loginViaUi } from "./helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoWcagViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "unknown"}): ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")}`,
    )
    .join("\n");

  expect(results.violations, summary).toEqual([]);
}

test("les pages de connexion et du tableau de bord respectent WCAG 2.1 AA", async ({ page }) => {
  await page.goto("/login");
  await expectNoWcagViolations(page);

  await loginViaUi(page, "dr.benali@sihia.health", "demo1234");
  await expectNoWcagViolations(page);
});

test("les écrans métier principaux respectent WCAG 2.1 AA", async ({ page }) => {
  await loginViaUi(page, "dr.benali@sihia.health", "demo1234");

  for (const path of ["/patients", "/appointments", "/prediction", "/settings"]) {
    await page.locator(`a[href="${path}"]`).first().click();
    await page.waitForURL((url) => url.pathname === path);
    await expect(page.locator("#main-content")).toBeVisible();
    await expectNoWcagViolations(page);
  }
});

test("le contenu principal et le menu mobile sont entièrement utilisables au clavier", async ({
  page,
}) => {
  await loginViaUi(page, "dr.benali@sihia.health", "demo1234");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: /Aller au contenu|Skip to content/i });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const menuButton = page.getByRole("button", { name: /Ouvrir le menu|Open menu/i });
  await menuButton.focus();
  await page.keyboard.press("Enter");
  const menuDialog = page.getByRole("dialog", {
    name: /Navigation principale|Primary navigation/i,
  });
  await expect(menuDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuDialog).toHaveCount(0);
  await expect(menuButton).toBeFocused();
});

test("la visite guidée conserve le focus dans son dialogue", async ({ page }) => {
  await loginViaUi(page, "dr.benali@sihia.health", "demo1234", { skipOnboarding: false });

  const tour = page.getByRole("dialog", { name: /Naviguez dans le SIH|Navigate the hospital/i });
  await expect(tour).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  const nextButton = page.getByRole("button", { name: /Suivant|Next/i });
  await expect(nextButton).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Passer la visite|Skip tour/i })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(tour).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeFocused();
});
