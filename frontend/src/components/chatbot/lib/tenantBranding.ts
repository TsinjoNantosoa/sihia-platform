/** SIHIA branding used until the API configuration is available. */
export const BOT_NAME_BY_CLIENT: Record<string, string> = { sihia: "SIH IA Assistant" };
export const PRIMARY_COLOR_BY_CLIENT: Record<string, string> = { sihia: "#0d6e6e" };
export const LOGO_STATIC_PATH_BY_CLIENT: Record<string, string> = {
  sihia: "/static/logos/sihia-bot.svg",
};

function readRuntimeVar(key: string): string {
  if (typeof window === "undefined") return "";
  return String((window as unknown as Record<string, unknown>)[key] ?? "").trim();
}

export function resolveApiBaseUrl(): string {
  const runtime = readRuntimeVar("__CHATBOT_API_BASE_URL__");
  if (runtime) return runtime.replace(/\/$/, "");
  const configured =
    import.meta.env.VITE_API_URL?.trim() || import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return import.meta.env.DEV ? "http://127.0.0.1:8001" : "";
}

export function resolveLogoUrl(
  clientId?: string,
  apiBaseUrl?: string,
  logoFromApi?: string | null,
): string {
  const api = (apiBaseUrl || resolveApiBaseUrl()).replace(/\/$/, "");
  const fromApi = (logoFromApi || "").trim();
  if (fromApi) {
    if (/^https?:\/\//i.test(fromApi)) return fromApi;
    if (fromApi.startsWith("/")) return `${api}${fromApi}`;
    return `${api}/static/logos/${fromApi}`;
  }
  const path =
    LOGO_STATIC_PATH_BY_CLIENT[normalizeClientSlug(clientId)] || LOGO_STATIC_PATH_BY_CLIENT.sihia;
  return `${api}${path}`;
}

export function normalizeClientSlug(slug?: string): string {
  return (slug || "sihia").trim().toLowerCase() || "sihia";
}

export function resolveBotName(clientId?: string, themeBotName?: string): string {
  const fromTheme = (themeBotName || "").trim();
  if (fromTheme) return fromTheme;
  return BOT_NAME_BY_CLIENT[normalizeClientSlug(clientId)] || BOT_NAME_BY_CLIENT.sihia;
}

export function resolvePrimaryColor(clientId?: string, themeColor?: string): string {
  const fromTheme = (themeColor || "").trim();
  if (fromTheme) return fromTheme;
  return PRIMARY_COLOR_BY_CLIENT[normalizeClientSlug(clientId)] || PRIMARY_COLOR_BY_CLIENT.sihia;
}

export function resolveSessionAccessToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("sih-ia-auth");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return String(parsed?.state?.token ?? "").trim();
  } catch {
    return "";
  }
}

/** Resolve a session JWT or a server-injected runtime token; never a build-time secret. */
export function resolveApiToken(): string {
  return resolveSessionAccessToken() || readRuntimeVar("__CHATBOT_API_TOKEN__");
}

export function chatbotAuthHeaders(
  clientId: string,
  tenantId: string,
  apiToken?: string,
): Record<string, string> {
  const headers: Record<string, string> = { "X-Client-ID": clientId, "X-Tenant-ID": tenantId };
  const token = (apiToken || resolveApiToken()).trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
