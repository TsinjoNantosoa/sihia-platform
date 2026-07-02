/**
 * Branding fallbacks aligned with PostgreSQL tenant_ui_config (used until /ui-config returns).
 * DB remains source of truth; these values avoid showing ALAN.AI on victrix/h4h when API is slow.
 */
export const BOT_NAME_BY_CLIENT: Record<string, string> = {
  sihia: 'SIH IA Assistant',
  aaa: 'ALAN.AI',
  victrix: 'Victrix Assistant',
  h4h: 'H4H Assistant',
}

export const PRIMARY_COLOR_BY_CLIENT: Record<string, string> = {
  sihia: '#0d6e6e',
  aaa: '#132251',
  victrix: '#143a56',
  h4h: '#E87722',
}

/** Paths served by the API StaticFiles mount (`/static/logos/...`). */
export const LOGO_STATIC_PATH_BY_CLIENT: Record<string, string> = {
  sihia: '/static/logos/sihia-bot.svg',
  aaa: '/static/logos/aaa-logo-official.webp',
  victrix: '/static/logos/victrix-square.webp',
  h4h: '/static/logos/h4h-logo.svg',
}

/**
 * Absolute Cloudinary URLs — mirror of db/03-seed_tenant_ui_config.sql.
 * Used as hard fallback when /ui-config is unreachable (502/404/timeout).
 * These are public CDN URLs that never depend on the API host.
 */
export const LOGO_CLOUDINARY_BY_CLIENT: Record<string, string> = {
  aaa:     'https://res.cloudinary.com/dyboocrfp/image/upload/v1/aaa-logo-official_sglghz',
  victrix: 'https://res.cloudinary.com/dyboocrfp/image/upload/v1/victrix-square_zs7xi2',
  h4h:     'https://res.cloudinary.com/dyboocrfp/image/upload/v1/h4h-logo_h6lti5',
}

function readRuntimeVar(key: string): string {
  if (typeof window === 'undefined') return ''
  return String(((window as unknown) as Record<string, unknown>)[key] ?? '').trim()
}

export function resolveApiBaseUrl(): string {
  const runtime = readRuntimeVar('__CHATBOT_API_BASE_URL__')
  if (runtime) return runtime.replace(/\/$/, '')
  const fromSihia = import.meta.env.VITE_API_URL?.trim()
  if (fromSihia) return fromSihia.replace(/\/$/, '')
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://127.0.0.1:8000'
  return 'https://dev.victrix.fr'
}

export function resolveLogoUrl(
  clientId?: string,
  apiBaseUrl?: string,
  logoFromApi?: string | null,
): string {
  const api = (apiBaseUrl || resolveApiBaseUrl()).replace(/\/$/, '')
  const fromApi = (logoFromApi || '').trim()
  if (fromApi) {
    if (/^https?:\/\//i.test(fromApi)) return fromApi
    if (fromApi.startsWith('/')) return `${api}${fromApi}`
    return `${api}/static/logos/${fromApi}`
  }
  const slug = normalizeClientSlug(clientId)
  const cloudinary = LOGO_CLOUDINARY_BY_CLIENT[slug]
  if (cloudinary) return cloudinary
  const path = LOGO_STATIC_PATH_BY_CLIENT[slug] || LOGO_STATIC_PATH_BY_CLIENT.sihia
  return `${api}${path}`
}

export function normalizeClientSlug(slug?: string): string {
  return (slug || 'sihia').trim().toLowerCase() || 'sihia'
}

export function resolveBotName(clientId?: string, themeBotName?: string): string {
  const fromTheme = (themeBotName || '').trim()
  if (fromTheme) return fromTheme
  const slug = normalizeClientSlug(clientId)
  return BOT_NAME_BY_CLIENT[slug] || 'Assistant'
}

export function resolvePrimaryColor(clientId?: string, themeColor?: string): string {
  const fromTheme = (themeColor || '').trim()
  if (fromTheme) return fromTheme
  return PRIMARY_COLOR_BY_CLIENT[normalizeClientSlug(clientId)] || '#0d6e6e'
}

export function resolveApiToken(): string {
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('token')?.trim()
    if (fromUrl) return fromUrl
  }
  const fromRuntime = readRuntimeVar('__CHATBOT_API_TOKEN__')
  if (fromRuntime) return fromRuntime
  return import.meta.env.VITE_CHATBOT_API_TOKEN?.trim() || ''
}

export function chatbotAuthHeaders(clientId: string, tenantId: string, apiToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Client-ID': clientId,
    'X-Tenant-ID': tenantId,
  }
  const token = (apiToken || resolveApiToken()).trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
    headers['x-api-key'] = token
  }
  return headers
}
