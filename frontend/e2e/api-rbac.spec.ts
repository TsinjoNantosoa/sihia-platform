import { test, expect } from "@playwright/test";

import { apiLogin } from "./helpers";

const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8000";

test.describe("RBAC API par rôle", () => {
  test("admin peut lister les utilisateurs RBAC", async ({ request }) => {
    const { access_token } = await apiLogin(request, "admin@sihia.health", "admin123");
    const res = await request.get(`${API_URL}/api/rbac/users`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(res.ok()).toBeTruthy();
    const users = await res.json();
    expect(Array.isArray(users)).toBeTruthy();
    expect(users.length).toBeGreaterThan(0);
  });

  test("staff interdit sur analytics et RBAC", async ({ request }) => {
    const { access_token } = await apiLogin(request, "staff@sihia.health", "staff123");
    const headers = { Authorization: `Bearer ${access_token}` };

    const analytics = await request.get(`${API_URL}/api/analytics/kpis`, { headers });
    expect(analytics.status()).toBe(403);

    const rbac = await request.get(`${API_URL}/api/rbac/users`, { headers });
    expect(rbac.status()).toBe(403);
  });

  test("médecin peut lire patients mais pas RBAC", async ({ request }) => {
    const { access_token } = await apiLogin(request, "dr.benali@sihia.health", "demo1234");
    const headers = { Authorization: `Bearer ${access_token}` };

    const patients = await request.get(`${API_URL}/api/patients`, { headers });
    expect(patients.ok()).toBeTruthy();

    const rbac = await request.get(`${API_URL}/api/rbac/users`, { headers });
    expect(rbac.status()).toBe(403);
  });

  test("prédiction ML refuse staff", async ({ request }) => {
    const { access_token } = await apiLogin(request, "staff@sihia.health", "staff123");
    const res = await request.get(`${API_URL}/api/ml/predict-7d`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(res.status()).toBe(403);
  });
});
