import { expect, type APIRequestContext, type Page } from "@playwright/test";

const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8000";

export async function apiLogin(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{ access_token: string; refresh_token?: string }>;
}

/** Connexion via le formulaire (garde la session en mémoire SPA, sans rechargement). */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes("/api/auth/login") && res.status() === 200,
    { timeout: 20_000 },
  );
  await page.getByTestId("login-submit").click();
  await loginResponse;

  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
  await expect(page.getByRole("link", { name: /Tableau de bord|Dashboard/i })).toBeVisible({
    timeout: 15_000,
  });
}
