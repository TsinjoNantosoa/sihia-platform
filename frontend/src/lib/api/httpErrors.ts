import { toast } from "sonner";

import { resolveT } from "@/lib/i18n/resolveT";
import { useAuth } from "@/lib/auth/store";

export class ApiAuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message?: string) {
    super(message ?? (status === 401 ? "UNAUTHORIZED" : "FORBIDDEN"));
    this.name = "ApiAuthError";
    this.status = status;
  }
}

export const isApiAuthError = (error: unknown): error is ApiAuthError =>
  error instanceof ApiAuthError;

export const getAuthRedirectPath = (status: number, currentPath: string): string | null => {
  if (status === 401 && currentPath !== "/login") {
    return "/login";
  }
  if (status === 403 && currentPath !== "/403") {
    return "/403";
  }
  return null;
};

export type ParsedApiError = {
  code?: string;
  message?: string;
};

export async function parseApiError(response: Response): Promise<ParsedApiError> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    return { message: text || undefined };
  }
  const data = await response.json().catch(() => ({}));
  if (typeof data !== "object" || data === null) {
    return {};
  }
  const record = data as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message:
      typeof record.message === "string"
        ? record.message
        : typeof record.detail === "string"
          ? record.detail
          : undefined,
  };
};

const currentPath = () =>
  typeof window !== "undefined" ? window.location.pathname : "/";

/** Toast + redirection cohérents pour 401/403 (évite double traitement en aval). */
export function handleAuthHttpError(
  status: 401 | 403,
  parsed?: ParsedApiError,
  pathname: string = currentPath(),
): never {
  if (status === 401) {
    const target = getAuthRedirectPath(401, pathname);
    useAuth.getState().logout();
    toast.error(resolveT("errors.sessionExpiredTitle"), {
      id: "auth-401",
      description: parsed?.message ?? resolveT("errors.sessionExpiredDesc"),
    });
    if (target) {
      window.location.replace(target);
    }
    throw new ApiAuthError(401, parsed?.code ?? parsed?.message);
  }

  toast.error(resolveT("errors.forbiddenTitle"), {
    id: "auth-403",
    description: parsed?.message ?? resolveT("errors.forbiddenDesc"),
  });
  // Pas de redirection : le staff peut utiliser le dashboard sans analytics/ML.
  // Les pages interdites restent bloquées par requireRoutePermission → /403.
  throw new ApiAuthError(403, parsed?.code ?? parsed?.message);
}

export function notifyServerError(message: string) {
  toast.error(resolveT("errors.serverTitle"), {
    id: "api-5xx",
    description: message,
  });
}

export function notifyNetworkError() {
  toast.error(resolveT("errors.networkTitle"), {
    id: "network-error",
    description: resolveT("errors.networkDesc"),
  });
}
