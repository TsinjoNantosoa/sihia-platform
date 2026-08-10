import { expect, test } from "@playwright/test";

test.describe("responsive shell", () => {
  test.use({ viewport: { width: 704, height: 816 } });

  test("le header et la visite guidée restent dans le viewport tablette", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("dr.benali@sihia.health");
    await page.getByTestId("login-password").fill("demo1234");
    const loginResponse = page.waitForResponse(
      (response) => response.url().includes("/api/auth/login") && response.status() === 200,
    );
    await page.getByTestId("login-submit").click();
    await loginResponse;
    await page.waitForURL((url) => !url.pathname.includes("/login"));
    await expect(page.getByRole("button", { name: /navigation|menu/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /Suivant|Next/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(704);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(816);

    const nextBox = await page.getByRole("button", { name: /Suivant|Next/i }).boundingBox();
    expect(nextBox).not.toBeNull();
    expect(nextBox!.x + nextBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width);

    await expect(page.locator(".chat-callout")).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
});
