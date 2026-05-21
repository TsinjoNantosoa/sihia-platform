import { describe, expect, test } from "vitest";

import { hasExplicitPermission, resolvePermissions } from "../src/lib/auth/rbac";

const adminState = {
  user: {
    id: "u-1",
    name: "Admin",
    email: "admin@sihia.health",
    role: "admin" as const,
    facility: "Hôpital Central",
    avatarColor: "var(--color-primary)",
  },
  permissions: [],
};

describe("RBAC permission helpers", () => {
  test("resolvePermissions returns only explicit JWT permissions", () => {
    expect(resolvePermissions(adminState)).toEqual([]);
  });

  test("hasExplicitPermission denies access when the permission is missing", () => {
    expect(hasExplicitPermission(adminState, "patients:delete")).toBe(false);
  });

  test("hasExplicitPermission allows access when the permission is present", () => {
    expect(
      hasExplicitPermission(
        {
          ...adminState,
          permissions: ["patients:read", "patients:delete"],
        },
        "patients:delete",
      ),
    ).toBe(true);
  });

  test("hasExplicitPermission denies access without an authenticated user", () => {
    expect(
      hasExplicitPermission(
        {
          user: null,
          permissions: ["patients:delete"],
        },
        "patients:delete",
      ),
    ).toBe(false);
  });
});
