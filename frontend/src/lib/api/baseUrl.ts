import { DEFAULT_API_URL } from "./mockPolicy";

export function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  return import.meta.env.DEV ? "http://127.0.0.1:8000" : DEFAULT_API_URL;
}
