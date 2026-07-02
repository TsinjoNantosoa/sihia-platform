import React from 'react'
import { motion } from 'framer-motion'
import { resolveBotName } from '../lib/tenantBranding'

type Props = {
  language: 'fr' | 'en'
  clientId: string
  /** From tenant_ui_config.bot_name (API /ui-config) */
  botName?: string
}

export default function TypingIndicator({ language, clientId, botName }: Props) {
  const name = resolveBotName(clientId, botName)
  const typingText =
    language === 'fr'
      ? `${name} est en train d'écrire`
      : `${name} is typing`

  return (
    <div className="message-row bot typing-row">
      <div className="bot-avatar-mini">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="white"/>
        </svg>
      </div>
      <div className="typing-indicator">
        <span className="typing-text">{typingText}</span>
        <div className="typing-dots">
          <motion.span
            className="dot"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="dot"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="dot"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  )
}
