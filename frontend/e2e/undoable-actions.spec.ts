import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers";

test("une suppression critique peut être annulée avant son exécution", async ({ page }) => {
  let patientDeleteRequests = 0;
  let userDeleteRequests = 0;

  await page.route("**/api/patients/*", async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.continue();
      return;
    }
    patientDeleteRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route("**/api/rbac/users/*", async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.continue();
      return;
    }
    userDeleteRequests += 1;
    await route.fulfill({ status: 204, body: "" });
  });

  await loginViaUi(page, "admin@sihia.health", "admin123");
  await page.locator('a[href="/patients"]').first().click();
  await expect(page.getByTestId("patients-table")).toBeVisible();

  const firstPatientRow = page.getByTestId("patients-table").locator("tbody tr").first();
  await firstPatientRow.getByRole("button", { name: /Supprimer|Delete/i }).click();
  const patientDialog = page.getByRole("dialog");
  await expect(patientDialog).toContainText(/6 secondes|6 seconds/i);
  await patientDialog.getByRole("button", { name: /Supprimer|Delete/i }).click();

  await expect(page.getByText(/Suppression programmée|Deletion scheduled/i)).toBeVisible();
  expect(patientDeleteRequests).toBe(0);
  await page.getByRole("button", { name: /Annuler la suppression|Undo deletion/i }).click();
  await expect(page.getByText(/Suppression annulée|Deletion cancelled/i)).toBeVisible();
  await page.waitForTimeout(500);
  expect(patientDeleteRequests).toBe(0);

  await firstPatientRow.getByRole("button", { name: /Supprimer|Delete/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Supprimer|Delete/i })
    .click();
  await expect.poll(() => patientDeleteRequests, { timeout: 8_000 }).toBe(1);
  await expect(page.getByText(/Patient supprimé|Patient deleted/i)).toBeVisible();

  await page.locator('a[href="/rbac"]').first().click();
  const usersTable = page.getByTestId("rbac-users-table");
  await expect(usersTable).toBeVisible();
  await usersTable
    .getByRole("button", { name: /Supprimer|Delete/i })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Supprimer|Delete/i })
    .click();
  await page.getByRole("button", { name: /Annuler la suppression|Undo deletion/i }).click();
  await page.waitForTimeout(500);
  expect(userDeleteRequests).toBe(0);
});
