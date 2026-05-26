import { test, expect } from "@playwright/test";

import { loginViaUi } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("RBAC par rôle (E2E UI)", () => {
  test("admin accède à la page RBAC", async ({ page }) => {
    await loginViaUi(page, "admin@sihia.health", "admin123");
    await page.getByRole("link", { name: /Contrôle d'accès|Access Control/i }).click();
    await expect(page).toHaveURL(/\/rbac/);
    await expect(page.getByRole("button", { name: /Ajouter un utilisateur|Add user/i })).toBeVisible();
  });

  test("staff : analytics et RBAC masqués dans le menu", async ({ page }) => {
    await loginViaUi(page, "staff@sihia.health", "staff123");
    await expect(page.locator('a[href="/analytics"]')).toHaveCount(0);
    await expect(page.locator('a[href="/rbac"]')).toHaveCount(0);
  });

  test("médecin ne voit pas RBAC dans le menu", async ({ page }) => {
    await loginViaUi(page, "dr.benali@sihia.health", "demo1234");
    await expect(page.locator('a[href="/rbac"]')).toHaveCount(0);
  });

  test("manager voit analytics mais pas RBAC", async ({ page }) => {
    await loginViaUi(page, "manager@sihia.health", "manager123");
    await expect(page.locator('a[href="/analytics"]')).toBeVisible();
    await expect(page.locator('a[href="/rbac"]')).toHaveCount(0);
  });
});
