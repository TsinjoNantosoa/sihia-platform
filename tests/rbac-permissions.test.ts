import { describe, expect, test } from "vitest";

import {
  getPermissionsForRole,
  hasExplicitPermission,
  resolvePermissions,
} from "../src/lib/auth/rbac";

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
  test("resolvePermissions falls back to role when JWT list is empty", () => {
    expect(resolvePermissions(adminState)).toEqual(getPermissionsForRole("admin"));
  });

  test("hasExplicitPermission allows dashboard for admin without JWT permissions", () => {
    expect(hasExplicitPermission(adminState, "dashboard:read")).toBe(true);
  });

  test("hasExplicitPermission uses explicit JWT permissions when present", () => {
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
