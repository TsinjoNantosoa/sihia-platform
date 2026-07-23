import React from 'react'
import ChatWidget from './components/ChatWidget'
import type { ClientTheme } from './types/client'
import { numericTenantIdForSlug } from './types/client'
import defaultLogo from './assets/OIP.webp'

function readRuntimeVar(key: string): string {
  if (typeof window === 'undefined') return ''
  return (((window as unknown) as Record<string, unknown>)[key] as string ?? '').trim()
}

export default function App() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()          || 'http://localhost:2000'
  const clientId   = import.meta.env.VITE_CLIENT_ID?.trim()             || readRuntimeVar('__CHATBOT_CLIENT_ID__')    || 'aaa'
  const apiToken   = import.meta.env.VITE_CHATBOT_API_TOKEN?.trim()     || readRuntimeVar('__CHATBOT_API_TOKEN__')    || ''
  const jwtToken   = import.meta.env.VITE_CHATBOT_JWT?.trim()           || ''

  const theme: ClientTheme = {
    botName:      import.meta.env.VITE_BOT_NAME      || readRuntimeVar('__CHATBOT_BOT_NAME__')      || 'ALAN.AI',
    logoUrl:      import.meta.env.VITE_LOGO_URL       || readRuntimeVar('__CHATBOT_LOGO_URL__')       || defaultLogo,
    primaryColor: import.meta.env.VITE_PRIMARY_COLOR  || readRuntimeVar('__CHATBOT_PRIMARY_COLOR__')  || '#132251',
    welcomeFr:    import.meta.env.VITE_WELCOME_FR     || '',
    welcomeEn:    import.meta.env.VITE_WELCOME_EN     || '',
  }

  const cssVars = {
    '--brand-blue-left': theme.primaryColor,
    '--brand-blue':      theme.primaryColor,
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
