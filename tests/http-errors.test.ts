import { describe, expect, test } from "vitest";

import {
  ApiAuthError,
  getAuthRedirectPath,
  isApiAuthError,
  parseApiError,
} from "../src/lib/api/httpErrors";

describe("http error redirects", () => {
  test("redirects 401 to /login when not already there", () => {
    expect(getAuthRedirectPath(401, "/dashboard")).toBe("/login");
  });

  test("does not redirect 401 when already on /login", () => {
    expect(getAuthRedirectPath(401, "/login")).toBeNull();
  });

  test("redirects 403 to /403 when not already there", () => {
    expect(getAuthRedirectPath(403, "/patients")).toBe("/403");
  });

  test("does not redirect 403 when already on /403", () => {
    expect(getAuthRedirectPath(403, "/403")).toBeNull();
  });

  test("returns null for other status codes", () => {
    expect(getAuthRedirectPath(500, "/patients")).toBeNull();
  });
});

describe("parseApiError", () => {
  test("reads code and message from JSON body", async () => {
    const response = new Response(
      JSON.stringify({ code: "FORBIDDEN", message: "Permission requise : rbac.read" }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
    await expect(parseApiError(response)).resolves.toEqual({
      code: "FORBIDDEN",
      message: "Permission requise : rbac.read",
    });
  });
});

describe("ApiAuthError", () => {
  test("isApiAuthError identifies auth errors", () => {
    expect(isApiAuthError(new ApiAuthError(403))).toBe(true);
    expect(isApiAuthError(new Error("x"))).toBe(false);
  });
});
