import React, { useEffect, useMemo, useState } from 'react'
import ChatWidget from './components/ChatWidget'
import type { ClientTheme } from './types/client'
import { numericTenantIdForSlug } from './types/client'
import {
  resolveApiBaseUrl,
  resolveBotName,
  resolveLogoUrl,
  resolvePrimaryColor,
  resolveApiToken,
  chatbotAuthHeaders,
} from './lib/tenantBranding'

function readRuntimeVar(key: string): string {
  if (typeof window === 'undefined') return ''
  return (((window as unknown) as Record<string, unknown>)[key] as string ?? '').trim()
}

/** Tenant slug: ?client_id=victrix in URL overrides .env (one build, all tenants). */
function resolveClientId(): string {
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('client_id')?.trim().toLowerCase()
    if (fromUrl) return fromUrl
  }
  return (
    import.meta.env.VITE_CLIENT_ID?.trim() ||
    readRuntimeVar('__CHATBOT_CLIENT_ID__') ||
    'sihia'
  )
}

function buildInitialTheme(slug: string, apiBase: string): ClientTheme {
  return {
    botName: resolveBotName(slug, import.meta.env.VITE_BOT_NAME),
    logoUrl: resolveLogoUrl(slug, apiBase, import.meta.env.VITE_LOGO_URL),
    primaryColor: resolvePrimaryColor(slug, import.meta.env.VITE_PRIMARY_COLOR),
    welcomeFr: import.meta.env.VITE_WELCOME_FR || '',
    welcomeEn: import.meta.env.VITE_WELCOME_EN || '',
  }
}

export default function App() {
  const clientId = useMemo(() => resolveClientId(), [])
  const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), [])
  const apiToken = useMemo(() => resolveApiToken(), [])
  const jwtToken = import.meta.env.VITE_CHATBOT_JWT?.trim() || ''
  const [theme, setTheme] = useState<ClientTheme>(() => buildInitialTheme(clientId, apiBaseUrl))

  useEffect(() => {
    const tenantId = numericTenantIdForSlug(clientId)
    fetch(`${apiBaseUrl}/ui-config?client_id=${encodeURIComponent(clientId)}`, {
      headers: chatbotAuthHeaders(clientId, tenantId, apiToken),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setTheme((prev) => ({
          ...prev,
          botName: resolveBotName(clientId, data.bot_name),
          logoUrl: resolveLogoUrl(clientId, apiBaseUrl, data.logo_url),
          primaryColor: resolvePrimaryColor(clientId, data.primary_color),
          welcomeFr: data.welcome_fr || prev.welcomeFr,
          welcomeEn: data.welcome_en || prev.welcomeEn,
        }))
      })
      .catch(() => { /* keep slug-based fallback from buildInitialTheme */ })
  }, [apiBaseUrl, clientId, apiToken])

  const cssVars = {
    '--brand-blue-left': theme.primaryColor,
    '--brand-blue': theme.primaryColor,
  } as React.CSSProperties

  return (
    <div className="aaa-chat-root" style={cssVars}>
      <ChatWidget
        apiBaseUrl={apiBaseUrl}
        clientId={clientId}
        tenantId={numericTenantIdForSlug(clientId)}
        apiToken={apiToken}
        jwtToken={jwtToken}
        theme={theme}
      />
    </div>
  )
}
