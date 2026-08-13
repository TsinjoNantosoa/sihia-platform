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
  test("an explicit empty JWT permission list remains restrictive", () => {
    expect(resolvePermissions(adminState)).toEqual([]);
  });

  test("an authenticated admin is denied when its JWT grants no permission", () => {
    expect(hasExplicitPermission(adminState, "dashboard:read")).toBe(false);
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

  test("role matrices stay least-privilege oriented", () => {
    expect(getPermissionsForRole("admin")).toContain("users:delete");
    expect(getPermissionsForRole("manager")).not.toContain("users:delete");
    expect(getPermissionsForRole("doctor")).toContain("patients:update");
    expect(getPermissionsForRole("staff")).not.toContain("patients:update");
    expect(getPermissionsForRole("admin")).toContain("voice:read");
  });
});
