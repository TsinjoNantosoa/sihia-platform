import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

import { loginViaUi } from "./helpers";

test("tri, colonnes, densité et export CSV restent cohérents et persistants", async ({ page }) => {
  await loginViaUi(page, "admin@sihia.health", "admin123");
  await page.locator('a[href="/patients"]').first().click();
  await page.waitForURL((url) => url.pathname === "/patients");

  const table = page.getByTestId("patients-table");
  await expect(table).toBeVisible();

  const nameHeader = page.getByRole("columnheader", { name: /Nom|Name/i });
  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  const ascendingNames = await table.locator("tbody tr td:nth-child(2)").allTextContents();
  expect(ascendingNames.length).toBeGreaterThan(1);
  const patientSortKeys = (names: string[]) =>
    names.map((name) => {
      const parts = name.trim().split(/\s+/);
      const lastName = parts.pop() ?? "";
      return `${lastName} ${parts.join(" ")}`;
    });
  const ascendingKeys = patientSortKeys(ascendingNames);
  expect(ascendingKeys).toEqual(
    [...ascendingKeys].sort((left, right) =>
      left.localeCompare(right, "fr", { sensitivity: "base" }),
    ),
  );

  await nameHeader.getByRole("button").click();
  await expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  const descendingNames = await table.locator("tbody tr td:nth-child(2)").allTextContents();
  const descendingKeys = patientSortKeys(descendingNames);
  expect(descendingKeys).toEqual(
    [...descendingKeys].sort((left, right) =>
      right.localeCompare(left, "fr", { sensitivity: "base" }),
    ),
  );

  await page.getByRole("button", { name: /Colonnes|Columns/i }).click();
  await page.getByRole("menuitemcheckbox", { name: /Téléphone|Phone/i }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("columnheader", { name: /Téléphone|Phone/i })).toHaveCount(0);

  const densityButton = page.getByRole("button", { name: /Compact/i });
  await expect(densityButton).toHaveAttribute("aria-pressed", "true");
  await densityButton.click();
  await expect(table).toHaveAttribute("data-density", "comfortable");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exporter CSV|Export CSV/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^patients-\d{4}-\d{2}-\d{2}\.csv$/);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const csv = await readFile(downloadPath!, "utf8");
  expect(csv).toContain("Nom");
  expect(csv).not.toContain("Téléphone");

  await page.locator('a[href="/appointments"]').first().click();
  await expect(page.getByTestId("appointments-table")).toBeVisible();
  await expect(page.getByRole("button", { name: /Exporter CSV|Export CSV/i })).toBeVisible();

  await page.locator('a[href="/patients"]').first().click();
  await expect(page.getByTestId("patients-table")).toHaveAttribute("data-density", "comfortable");
  await expect(page.getByRole("columnheader", { name: /Téléphone|Phone/i })).toHaveCount(0);

  await page.locator('a[href="/rbac"]').first().click();
  await expect(page.getByTestId("rbac-users-table")).toBeVisible();
  await expect(page.getByRole("button", { name: /Exporter CSV|Export CSV/i })).toBeVisible();
});
