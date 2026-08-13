import { describe, expect, test } from "vitest";

import { getPermissionsForRole } from "../src/lib/auth/rbac";

describe("Voice AI RBAC", () => {
  test("admin and staff can operate the Voice console", () => {
    expect(getPermissionsForRole("admin")).toContain("voice:read");
    expect(getPermissionsForRole("admin")).toContain("voice:update");
    expect(getPermissionsForRole("staff")).toContain("voice:read");
    expect(getPermissionsForRole("staff")).toContain("voice:update");
  });

  test("doctors can inspect calls but not mutate settings", () => {
    expect(getPermissionsForRole("doctor")).toContain("voice:read");
    expect(getPermissionsForRole("doctor")).not.toContain("voice:update");
  });
});
