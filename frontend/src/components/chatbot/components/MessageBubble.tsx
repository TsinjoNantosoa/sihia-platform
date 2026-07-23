import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { sanitizeBot } from '../lib/sanitize'

type Message = {
  id: string
  role: 'user' | 'bot'
  html: string
  sources?: string[]
  is_refusal?: boolean
  has_contact_link?: boolean
}

function getTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function forceLinksToOpenInNewTab(html: string): string {
  if (!html || typeof window === 'undefined') return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const anchors = doc.querySelectorAll('a[href]')

    anchors.forEach((anchor) => {
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer')
    })

    // Re-sanitize après le round-trip DOMParser pour neutraliser tout mXSS
    return sanitizeBot(doc.body.innerHTML)
  } catch {
    return sanitizeBot(html)
  }
}

export default function MessageBubble({
  message,
  index = 0,
  onSpeak,
}: {
  message: Message
  index?: number
  isPinned?: boolean
  onSpeak?: (html: string) => Promise<void>
}) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showDislikeModal, setShowDislikeModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [details, setDetails] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const dislikeReasons = [
    'Incorrect ou incomplet',
    'Ne correspond pas à ma demande',
    'Lenteur ou bugs',
    'Style ou ton',
    'Problème de sécurité ou juridique',
    'Autre'
  ]

  const messageHtml = useMemo(() => forceLinksToOpenInNewTab(message.html), [message.html])

  function handleMessageLinksOpenInNewTab(e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window === 'undefined') return

    const target = e.target as HTMLElement | null
    if (!target) return

    const anchor = target.closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return

    const href = anchor.getAttribute('href') || ''
    if (!href || href.startsWith('#')) return // keep in-page anchors as-is

    e.preventDefault()
    try {
      // Use fully resolved href so relative links work too.
      window.open(anchor.href, '_blank', 'noopener,noreferrer')
    } catch {
      // Fallback in case popup is blocked.
      window.location.href = anchor.href
    }
  }

  function handleLike() {
    if (feedback === 'like') {
      setFeedback(null)
      setFeedbackSubmitted(false)
      return
    }
    setFeedback('like')
    setShowDislikeModal(false)
    setFeedbackSubmitted(true)
  }

  function handleDislike() {
    if (feedback === 'dislike') {
      setFeedback(null)
      setFeedbackSubmitted(false)
      setShowDislikeModal(false)
      return
    }
    setFeedback('dislike')
    setShowDislikeModal(true)
  }

  function submitDislikeFeedback() {
    setFeedbackSubmitted(true)
    setShowDislikeModal(false)
  }

  async function handleSpeak() {
    if (!onSpeak || isSpeaking) return
    setIsSpeaking(true)
    try {
      await onSpeak(message.html)
    } catch {
      // ignore playback errors
    } finally {
      setIsSpeaking(false)
    }
  }

  return (
    <motion.div 
      className={`message-row ${message.role}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      {message.role === 'bot' && (
        <div className="bot-avatar-mini">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="white"/>
          </svg>
        </div>
      )}
      <div className={`message-bubble ${message.role}`}>
        <div dangerouslySetInnerHTML={{ __html: messageHtml }} onClick={handleMessageLinksOpenInNewTab} />
        <span className="msg-time">{getTime()}</span>
        {message.sources && message.sources.length > 0 && (
          <div className="message-sources">
            <small>Sources :</small>
            <ul>
              {message.sources.map((s, i) => (
                <li key={i}><a href={s} target="_blank" rel="noreferrer">{s}</a></li>
              ))}
            </ul>
          </div>
        )}
        {message.role === 'bot' && message.id !== 'b-init' && (
          <div className="message-feedback" aria-label="Feedback sur la réponse">
            {onSpeak && (
              <button
                type="button"
                className={`feedback-btn ${isSpeaking ? 'active' : ''}`}
                onClick={() => void handleSpeak()}
                disabled={isSpeaking}
                title="Écouter la réponse"
                aria-label="Écouter la réponse"
              >
                🔊
              </button>
            )}
            {feedback !== 'dislike' && (
              <button
                type="button"
                className={`feedback-btn ${feedback === 'like' ? 'active like' : ''}`}
                onClick={handleLike}
                aria-pressed={feedback === 'like'}
                title="Réponse utile"
              >
                👍
              </button>
            )}
            {feedback !== 'like' && (
              <button
                type="button"
                className={`feedback-btn ${feedback === 'dislike' ? 'active dislike' : ''}`}
                onClick={handleDislike}
                aria-pressed={feedback === 'dislike'}
                title="Réponse non utile"
              >
                👎
              </button>
            )}

            {feedbackSubmitted && (
              <div className="feedback-thanks" aria-live="polite">Merci pour votre retour</div>
            )}
          </div>
        )}

        {showDislikeModal && (
          <div className="feedback-modal-overlay" role="dialog" aria-modal="true" aria-label="Partager le feedback">
            <div className="feedback-modal">
              <div className="feedback-modal-header">
                <h3>Partager le feedback</h3>
                <button
                  type="button"
                  className="feedback-modal-close"
                  onClick={() => setShowDislikeModal(false)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>

              <div className="feedback-reasons">
                {dislikeReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className={`feedback-reason-chip ${selectedReason === reason ? 'active' : ''}`}
                    onClick={() => setSelectedReason(reason)}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                className="feedback-textarea"
                rows={3}
                placeholder="Partager des informations (facultatif)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />

              <div className="feedback-modal-actions">
                <button
                  type="button"
                  className="feedback-send-btn"
                  onClick={submitDislikeFeedback}
                  disabled={selectedReason.trim().length === 0 && details.trim().length === 0}
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
