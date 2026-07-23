import React from 'react'
import logoWebp from '../assets/OIP.webp'
import type { ClientTheme } from '../types/client'
import { resolveBotName, resolveLogoUrl } from '../lib/tenantBranding'

const defaultLogo = logoWebp

type Props = {
  open: boolean
  onToggle: () => void
  language: 'fr' | 'en'
  onLanguageChange: (lang: 'fr' | 'en') => void
  clientId: string
  theme?: ClientTheme
}

export default function ChatHeader({ open, onToggle, language, onLanguageChange, clientId, theme }: Props) {
  const logoSrc    = theme?.logoUrl      ?? defaultLogo
  const botName    = resolveBotName(clientId, theme?.botName)
  const colorStart = theme?.primaryColor ?? '#132251'
  const colorEnd   = theme?.primaryColor ?? '#0F1B42'

  const headerStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${colorStart} 0%, ${colorEnd} 100%)`,
  }

  const statusText   = language === 'fr' ? 'En ligne' : 'Online'
  const clearTooltip = language === 'fr' ? 'Réinitialiser' : 'Clear'
  const toggleTooltip = open
    ? (language === 'fr' ? 'Réduire' : 'Minimize')
    : (language === 'fr' ? 'Ouvrir' : 'Open')

  return (
    <div className="chat-header" style={headerStyle}>
      <svg className="header-curve" viewBox="0 0 400 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        <path d="M 0 20 Q 100 0, 200 20 T 400 20 L 400 0 L 0 0 Z" fill="url(#curveGradient)"/>
        <path d="M 0 20 Q 100 5, 200 20 T 400 20" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.15"/>
      </svg>
      
      <div className="chat-header-left">
        <div className="chat-avatar-square">
          <img
            src={logoSrc}
            srcSet={`${logoSrc} 1x`}
            sizes="64px"
            alt={`${botName} logo`}
            className="chat-avatar-img"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement
              const fallback = resolveLogoUrl(clientId)
              if (img.src === fallback || img.src.endsWith(fallback)) {
                img.onerror = null
                img.src = defaultLogo
                return
              }
              img.onerror = null
              img.src = fallback
            }}
          />
        </div>
        <div className="chat-header-info">
          <span className="chat-title">Chat with</span>
          <span className="chat-name">{botName}</span>
          <span className="chat-header-status">
            <span className="online-dot" />{statusText}
          </span>
        </div>
      </div>
      <div className="chat-header-right">
        <button
          className="chat-header-btn"
          aria-label="Change language"
          onClick={() => onLanguageChange(language === 'fr' ? 'en' : 'fr')}
        >
          {language.toUpperCase()}
          <span className="chat-tooltip" role="tooltip">
            {language === 'fr' ? 'Passer en anglais' : 'Switch to French'}
          </span>
        </button>

        <button
          className="chat-header-btn chat-header-btn-icon"
          aria-label={clearTooltip}
          onClick={() => handleAction('clear')}
        >
          <svg
            className="chat-header-refresh-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08a5.99 5.99 0 0 1-5.65 4c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
          <span className="chat-tooltip" role="tooltip">{clearTooltip}</span>
        </button>

        <button className="chat-header-btn" onClick={onToggle} aria-pressed={open}>
          {open ? '▾' : '▴'}
          <span className="chat-tooltip" role="tooltip">{toggleTooltip}</span>
        </button>
      </div>
    </div>
  )
}

function handleAction(type: string) {
  try {
    window.dispatchEvent(new CustomEvent('chat-header-action', { detail: { type } }))
  } catch {
    // ignore dispatch errors
  }
}
