import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/auth/usePermission", () => ({
  usePermission: vi.fn(),
}));

import { usePermission } from "@/lib/auth/usePermission";
import { PermissionGuard } from "@/components/shared/PermissionGuard";

describe("PermissionGuard", () => {
  test("renders children when permission is granted", () => {
    (usePermission as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const html = renderToStaticMarkup(
      <PermissionGuard permission="appointments:create">
        <span>Allowed</span>
      </PermissionGuard>,
    );
    expect(html).toContain("Allowed");
  });

  test("renders fallback when permission is denied", () => {
    (usePermission as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const html = renderToStaticMarkup(
      <PermissionGuard permission="appointments:create" fallback={<span>Denied</span>}>
        <span>Allowed</span>
      </PermissionGuard>,
    );
    expect(html).toContain("Denied");
    expect(html).not.toContain("Allowed");
  });
});