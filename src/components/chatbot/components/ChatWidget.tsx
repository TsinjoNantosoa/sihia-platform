import React, { useEffect, useState, useRef } from 'react'

import axios from 'axios'

import { sanitizeBot, sanitizeUser } from '../lib/sanitize'
import { fetchBotSpeech, playBotSpeechBlob, stopBotSpeech } from '../lib/voiceSpeech'

import { motion, AnimatePresence } from 'framer-motion'

import Composer from './Composer'

import MessageBubble from './MessageBubble'

import ChatHeader from './ChatHeader'

import QuickReplies from './QuickReplies'

import Rating from './Rating'

import TypingIndicator from './TypingIndicator'

import DynamicSuggestions from './DynamicSuggestions'

import chatbotMascot from '../assets/chat.png'

//import chatbotMascot from '../assets/chathead.png'

// Logo is handled in ChatHeader — no separate import needed here



type Message = {

  id: string

  role: 'user' | 'bot'

  html: string

  sources?: string[]

  is_refusal?: boolean

  has_contact_link?: boolean

}



type Reply = { icon: string; label: string }



const MOBILE_BREAKPOINT_PX = 600

function isMobileViewport() {

  if (typeof window === 'undefined') return false

  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches

}



import type { ClientTheme } from '../types/client'
import { resolveBotName } from '../lib/tenantBranding'
import {
  clearChatHistory,
  createSessionId,
  getInitialChatState,
  persistChatMessages,
  purgeLocalChatStorage,
  readLastActiveMs,
  sessionMaxAgeMs,
  writeSessionId,
} from '../lib/chatStorage'



type ChatWidgetProps = {

  apiBaseUrl: string

  /** UI slug for branding / tenant_ui_config (e.g. "aaa") */
  clientId: string

  /** Numeric tenants.tenant_id for PostgreSQL (e.g. "1") — team best practice */
  tenantId: string

  apiToken?: string

  jwtToken?: string

  theme?: ClientTheme

}



export default function ChatWidget({ apiBaseUrl, clientId, tenantId, apiToken = '', jwtToken = '', theme }: ChatWidgetProps) {

  const [open, setOpen] = useState(() => isMobileViewport())

  const [showCallout, setShowCallout] = useState(() => !isMobileViewport())

  

  const [messages, setMessages] = useState<Message[]>(() => getInitialChatState(clientId).messages)

  const [sessionId, setSessionId] = useState(() => getInitialChatState(clientId).sessionId)

  const listRef = useRef<HTMLDivElement | null>(null)



  // Language state

  const [language, setLanguage] = useState<'fr' | 'en'>('fr')

  const languageRef = useRef<'fr' | 'en'>(language)



  useEffect(() => {

    languageRef.current = language

  }, [language])



  // Dynamic quick replies based on language

  const quickRepliesFr: Reply[] = [

    { icon: '💼', label: 'Nos expertises' },

    { icon: '🚀', label: "Offres d'emploi" },

    { icon: '📈', label: 'Chiffres clés' },

    { icon: '🏢', label: 'Nos pôles / cabinets' },

  ]

  const quickRepliesEn: Reply[] = [

    { icon: '💼', label: 'Our expertise' },

    { icon: '🚀', label: 'Job offers' },

    { icon: '📈', label: 'Key figures' },

    { icon: '🏢', label: 'Our poles / firms' },

  ]

  const quickReplies = language === 'fr' ? quickRepliesFr : quickRepliesEn



  const [quickRepliesVisible, setQuickRepliesVisible] = useState(true)

  const [isTyping, setIsTyping] = useState(false)

  const [dynamicSuggestions, setDynamicSuggestions] = useState<Reply[]>([])

  const [showSuggestions, setShowSuggestions] = useState(false)

  const [languageSwitchNotice, setLanguageSwitchNotice] = useState<string | null>(null)



  // Helper function to get initial greeting based on language

  function authHeaders(): Record<string, string> {

    const h: Record<string, string> = {}

    if (tenantId) h['X-Tenant-ID'] = tenantId
    if (clientId) h['X-Client-ID'] = clientId

    if (apiToken) {

      h['x-api-key'] = apiToken

      h.Authorization = `Bearer ${apiToken}`

    } else if (jwtToken) {

      h.Authorization = `Bearer ${jwtToken}`

    }

    return h

  }



  const getInitialGreeting = (lang: 'fr' | 'en') => {

    const name = resolveBotName(clientId, theme?.botName)

    if (theme?.welcomeFr && lang === 'fr') return theme.welcomeFr

    if (theme?.welcomeEn && lang === 'en') return theme.welcomeEn

    if (lang === 'en') return `Hello! I'm ${name}, your AI companion. 😊 How can I help you?`

    return `Bonjour ! Je suis ${name}, votre compagnon IA. 😊 Comment puis-je vous aider ?`

  }



  function shouldShowQuickReplies(initialMessages: Message[]): boolean {

    if (initialMessages.length === 0) return true



    const hasUserMessages = initialMessages.some((m) => m.role === 'user')

    const hasBotReplyBeyondGreeting = initialMessages.some(

      (m) => m.role === 'bot' && m.id !== 'b-init'

    )



    return !hasUserMessages && !hasBotReplyBeyondGreeting

  }



  function resetFrontendSession(): string {

    const nextSessionId = createSessionId()

    const now = Date.now()



    purgeLocalChatStorage(clientId)

    writeSessionId(clientId, nextSessionId, now)



    const initMsg: Message = {

      id: 'b-init',

      role: 'bot',

      html: sanitizeBot(getInitialGreeting(languageRef.current))

    }

    setMessages([initMsg])

    setQuickRepliesVisible(true)

    setDynamicSuggestions([])

    setShowSuggestions(false)

    setLanguageSwitchNotice(null)

    setSessionId(nextSessionId)



    return nextSessionId

  }



  function resolveActiveSessionId(): string {

    if (typeof window === 'undefined') return sessionId



    const maxAge = sessionMaxAgeMs()

    const lastActive = readLastActiveMs(clientId)

    if (lastActive > 0 && Date.now() - lastActive > maxAge) {

      return resetFrontendSession()

    }



    if (!sessionId) {

      const nextSessionId = createSessionId()

      setSessionId(nextSessionId)

      writeSessionId(clientId, nextSessionId)

      return nextSessionId

    }



    return sessionId

  }



  useEffect(() => {

    if (messages.length > 0) {

      setQuickRepliesVisible(shouldShowQuickReplies(messages))

      return

    }



    // load history if available, otherwise inject initial bot greeting

    axios

      .get(`${apiBaseUrl}/history`, {

        params: { session_id: sessionId },

        headers: authHeaders()

      })

      .then((r) => {

        if (r.data?.messages && r.data.messages.length > 0) {

          const loadedMessages = r.data.messages as Message[]

          setMessages(loadedMessages)

          setQuickRepliesVisible(shouldShowQuickReplies(loadedMessages))

        } else {

          const initMsg: Message = {

            id: 'b-init',

            role: 'bot',

            html: sanitizeBot(getInitialGreeting(languageRef.current))

          }

          setMessages([initMsg])

          setQuickRepliesVisible(true)

        }

      })

      .catch(() => {

        const initMsg: Message = {

          id: 'b-init',

          role: 'bot',

          html: sanitizeBot(getInitialGreeting(languageRef.current))

        }

        setMessages([initMsg])

        setQuickRepliesVisible(true)

      })

  }, [apiBaseUrl, sessionId, clientId, tenantId])



  useEffect(() => {

    if (typeof window === 'undefined') return

    persistChatMessages(clientId, messages)

  }, [messages, clientId])



  useEffect(() => {

    const state = getInitialChatState(clientId)

    setSessionId(state.sessionId)

    if (state.messages.length > 0) {

      setMessages(state.messages)

      setQuickRepliesVisible(shouldShowQuickReplies(state.messages))

      return

    }



    setMessages([])

    setQuickRepliesVisible(true)

  }, [clientId])



  useEffect(() => {

    if (typeof window === 'undefined') return



    const checkExpiration = () => {

      resolveActiveSessionId()

    }



    const timer = window.setInterval(checkExpiration, 30 * 1000)

    window.addEventListener('focus', checkExpiration)



    return () => {

      window.clearInterval(timer)

      window.removeEventListener('focus', checkExpiration)

    }

  }, [sessionId, clientId])



  // Handle header menu actions dispatched from ChatHeader

  useEffect(() => {

    function onHeaderAction(e: Event) {

      const ev = e as CustomEvent<{ type: string }>

      const type = ev.detail?.type



      if (type === 'clear') clearConversation()

    }



    window.addEventListener('chat-header-action', onHeaderAction as EventListener)

    return () => window.removeEventListener('chat-header-action', onHeaderAction as EventListener)

  }, [])



  // Scroll to bottom when messages update OR when widget opens

  useEffect(() => {

    if (!open) return

    const el = listRef.current

    if (!el) return

    

    const raf = requestAnimationFrame(() => {

      try {

        if (messages.length === 1 && messages[0]?.id === 'b-init') {

          el.scrollTo({ top: 0, behavior: 'smooth' })

        } else {

          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })

        }

      } catch (e) {

        if (messages.length === 1 && messages[0]?.id === 'b-init') el.scrollTop = 0

        else el.scrollTop = el.scrollHeight

      }

    })

    return () => cancelAnimationFrame(raf)

  }, [messages, open])

  useEffect(() => () => stopBotSpeech(), [])

  async function speakBotReply(html: string) {
    const blob = await fetchBotSpeech(apiBaseUrl, html, language, authHeaders)
    await playBotSpeechBlob(blob)
  }

  async function sendText(text: string, options?: { speakReply?: boolean }) {

    const activeSessionId = resolveActiveSessionId()

    setLanguageSwitchNotice(null)

    const userMsg: Message = { id: 'u-' + Date.now(), role: 'user', html: sanitizeUser(text) }

    setMessages((m) => [...m, userMsg])

    setIsTyping(true)



    const botMsgId = 'b-' + Date.now()



    try {

      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() }

      const body = JSON.stringify({ query: text, lang: language, user_id: activeSessionId, session_id: activeSessionId })



      const res = await fetch(`${apiBaseUrl}/query-stream`, { method: 'POST', headers, body })



      if (!res.ok) throw new Error(`HTTP ${res.status}`)



      const reader = res.body!.getReader()

      const decoder = new TextDecoder()

      let accumulated = ''

      let firstToken = true



      while (true) {

        const { done, value } = await reader.read()

        if (done) break



        const chunk = decoder.decode(value, { stream: true })

        const lines = chunk.split('\n')



        for (const line of lines) {

          if (!line.startsWith('data: ')) continue

          const payload = line.slice(6).trim()

          if (payload === '[DONE]') break



          try {

            const parsed = JSON.parse(payload)

            const token: string = parsed.token ?? ''
            const replace: boolean = Boolean(parsed.replace)

            if (!token) continue

            if (replace) {
              // Backend sometimes sends a final sanitized full answer with { replace: true }.
              // In that case we must replace the stream buffer, not append to avoid duplicates.
              accumulated = token
            } else {
              accumulated += token
            }



            if (firstToken) {

              firstToken = false

              setIsTyping(false)

              setMessages((m) => [

                ...m,

                { id: botMsgId, role: 'bot', html: sanitizeBot(accumulated) },

              ])

            } else {

              setMessages((m) =>

                m.map((msg) =>

                  msg.id === botMsgId

                    ? { ...msg, html: sanitizeBot(accumulated) }

                    : msg

                )

              )

            }

          } catch {

            // ignore malformed SSE lines

          }

        }

      }



      // Fallback si aucun token reçu

      if (firstToken) {

        setIsTyping(false)

        const fallback = language === 'fr' ? '<p>Pas de réponse.</p>' : '<p>No response.</p>'

        setMessages((m) => [...m, { id: botMsgId, role: 'bot', html: fallback }])

      }



      const contextualSuggestions = generateContextualSuggestions(text, accumulated, language)

      if (contextualSuggestions.length > 0) {

        setDynamicSuggestions(contextualSuggestions)

        setShowSuggestions(false)

      }

      if (options?.speakReply && accumulated.trim()) {
        try {
          await speakBotReply(accumulated)
        } catch {
          // La synthèse vocale est optionnelle
        }
      }

    } catch (err) {

      setIsTyping(false)

      const errorText = language === 'fr'

        ? '<p>❌ Erreur serveur. Veuillez réessayer dans un instant.</p>'

        : '<p>❌ Server error. Please try again in a moment.</p>'

      setMessages((m) => [...m, { id: 'e-' + Date.now(), role: 'bot', html: errorText }])

    }

  }



  // Clear conversation: reset to initial greeting

  function clearConversation() {

    const initMsg: Message = {

      id: 'b-init',

      role: 'bot',

      html: sanitizeBot(getInitialGreeting(language))

    }

    setMessages([initMsg])

    setQuickRepliesVisible(true)

    setDynamicSuggestions([])

    setShowSuggestions(false)

    setLanguageSwitchNotice(null)

    clearChatHistory(clientId)

  }



  function handleLanguageChange(nextLang: 'fr' | 'en') {

    if (nextLang === language) return



    setLanguage(nextLang)

    setLanguageSwitchNotice(

      nextLang === 'en'

        ? '--- You are now switched to English ---'

        : '--- Vous êtes maintenant passé en français ---'

    )

  }



  useEffect(() => {

    setMessages((prev) => {

      if (prev.length === 0) return prev

      return prev.map((msg) => {

        if (msg.id !== 'b-init') return msg

        return {

          ...msg,

          html: sanitizeBot(getInitialGreeting(language)),

        }

      })

    })

  }, [language])



  // (Export and logs functions removed — header only dispatches 'clear')



  function generateContextualSuggestions(userQuery: string, botResponse: string, lang: 'fr' | 'en'): Reply[] {

    const query = userQuery.toLowerCase()

    const response = botResponse.toLowerCase()

    

    if (query.includes('expertise') || response.includes('expertise')) {

      return lang === 'fr' 

        ? [

            { icon: '📊', label: 'Voir toutes les expertises' },

            { icon: '🎯', label: 'Services spécialisés' },

            { icon: '👥', label: 'Nos équipes' },

          ]

        : [

            { icon: '📊', label: 'View all expertise' },

            { icon: '🎯', label: 'Specialized services' },

            { icon: '👥', label: 'Our teams' },

          ]

    }

    

    if (query.includes('emploi') || query.includes('carrière') || query.includes('recrutement') ||

        query.includes('job') || query.includes('career') || query.includes('recruitment')) {

      return lang === 'fr'

        ? [

            { icon: '💼', label: 'Postes ouverts' },

            { icon: '🎓', label: 'Parcours de formation' },

            { icon: '🏆', label: 'Avantages salariés' },

          ]

        : [

            { icon: '💼', label: 'Open positions' },

            { icon: '🎓', label: 'Training programs' },

            { icon: '🏆', label: 'Employee benefits' },

          ]

    }

    

    if (query.includes('chiffre') || query.includes('entreprise') || query.includes('groupe') ||

        query.includes('figure') || query.includes('company') || query.includes('group')) {

      return lang === 'fr'

        ? [

            { icon: 'ðŸŒ', label: 'Implantations internationales' },

            { icon: '📈', label: 'Croissance du groupe' },

            { icon: 'ðŸ¤', label: 'Nos partenaires' },

          ]

        : [

            { icon: 'ðŸŒ', label: 'International locations' },

            { icon: '📈', label: 'Group growth' },

            { icon: 'ðŸ¤', label: 'Our partners' },

          ]

    }

    

    return lang === 'fr'

      ? [

          { icon: '❓', label: 'En savoir plus' },

          { icon: '📞', label: 'Nous contacter' },

        ]

      : [

          { icon: '❓', label: 'Learn more' },

          { icon: '📞', label: 'Contact us' },

        ]

  }



  return (

    <AnimatePresence mode="wait">

      {open ? (

        <motion.div 

          key="widget"

          className="chat-widget open"

          initial={{ opacity: 0, y: 50, scale: 0.95 }}

          animate={{ opacity: 1, y: 0, scale: 1 }}

          exit={{ opacity: 0, y: 50, scale: 0.95 }}

          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}

        >

          <ChatHeader 

            open={open} 

            onToggle={() => { setOpen(false); setShowCallout(false) }} 

            language={language}

            onLanguageChange={handleLanguageChange}

            clientId={clientId}

            theme={theme}

          />



          <div className="chat-body">

            <div className="message-list" ref={listRef}>

              {(() => {

                const nodes: React.ReactNode[] = []

                const greetingIndex = messages.findIndex((mm) => mm.id === 'b-init')

                const insertAfter = greetingIndex >= 0 ? greetingIndex : -1



                messages.forEach((m, i) => {

                  const isLastMessage = i === messages.length - 1

                  const isPinned = isLastMessage && m.role === 'user' && isTyping

                  nodes.push(
                    <MessageBubble
                      key={m.id}
                      message={m}
                      index={i}
                      isPinned={isPinned}
                      onSpeak={m.role === 'bot' && m.id !== 'b-init' ? speakBotReply : undefined}
                    />
                  )

                  if (i === insertAfter && quickRepliesVisible) {

                    nodes.push(

                      <div key="quick-choice" className="quick-choice">

                        <div className="quick-choice-title">Faites votre choix :</div>

                        <QuickReplies

                          replies={quickReplies}

                          onSelect={(text) => {

                            setQuickRepliesVisible(false)

                            sendText(text)

                          }}

                          layout="pills"

                        />

                      </div>

                    )

                  }

                })



                return nodes

              })()}

              

              {isTyping && (
                <TypingIndicator
                  language={language}
                  clientId={clientId}
                  botName={theme?.botName}
                />
              )}

              {languageSwitchNotice && (

                <div className="language-switch-notice">{languageSwitchNotice}</div>

              )}

            </div>



            <div className="composer-row">

              <Composer

                onSend={(txt, meta) => {

                  if (txt.trim().length === 0) return

                  setQuickRepliesVisible(false)

                  setDynamicSuggestions([])

                  sendText(txt, { speakReply: meta?.fromVoice })

                }}

                placeholder={language === 'fr' ? 'Ecrivez votre message...' : 'Type your message...'}

                language={language}

                apiBaseUrl={apiBaseUrl}

                getAuthHeaders={authHeaders}

                voiceEnabled

              />

            </div>



            {dynamicSuggestions.length > 0 && (

              <div className="suggestions-section">

                  <button

                    className="suggestions-toggle"

                    onClick={() => setShowSuggestions((s) => !s)}

                    aria-expanded={showSuggestions}

                  >

                    {showSuggestions 

                      ? (language === 'fr' ? 'Masquer les suggestions' : 'Hide suggestions')

                      : (language === 'fr' ? 'Voir les suggestions' : 'View suggestions')

                    }

                  </button>

                {showSuggestions && (

                  <DynamicSuggestions

                    suggestions={dynamicSuggestions}

                    onSelect={(label) => {

                      setDynamicSuggestions([])

                      setShowSuggestions(false)

                      sendText(label)

                    }}

                  />

                )}

              </div>

            )}



            <Rating onRate={() => {}} />

          </div>

        </motion.div>

      ) : (

        <motion.div

          key="fab"

          className="chat-fab-wrapper"

          initial={{ opacity: 0, scale: 0.8 }}

          animate={{ opacity: 1, scale: 1 }}

          exit={{ opacity: 0, scale: 0.8 }}

          transition={{ duration: 0.3 }}

        >

          <AnimatePresence>

            {showCallout && (

              <motion.div 

                className="chat-callout"

                initial={{ opacity: 0, y: 10, x: 0 }}

                animate={{ opacity: 1, y: 0, x: 0 }}

                exit={{ opacity: 0, y: 10 }}

                onClick={() => { setShowCallout(false); setOpen(true) }}

              >

                <div className="chat-callout-text">

                  {language === 'fr'

                    ? (<>{theme?.welcomeFr || 'Bonjour 👋 Bienvenue dans l\'écosystème Alan Allman Associates. Comment puis-je vous orienter aujourd\'hui ?'}<br/><strong>{theme?.botName ?? 'ALAN.AI'} est là pour vous.</strong></>)

                    : (<>{theme?.welcomeEn || 'Hello 👋 Welcome to the Alan Allman Associates ecosystem. How can I assist you today?'}<br/><strong>{theme?.botName ?? 'ALAN.AI'} is here for you.</strong></>)

                  }

                </div>

                <button 

                  className="chat-callout-close"

                  onClick={(e) => {

                    e.stopPropagation();

                    setShowCallout(false);

                  }}

                  aria-label="Fermer"

                >

                  &times;

                </button>

              </motion.div>

            )}

          </AnimatePresence>



          <button 

            className="chat-fab"

            onClick={() => { setShowCallout(false); setOpen(true) }}

            aria-label="Ouvrir le chat"

          >

            <div className="chat-fab-pulse"></div>

            {/* Contenu du bouton central */}

            <div className="chat-fab-content">

              <img src={chatbotMascot} alt="Chatbot Mascot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />

            </div>

            <div className="chat-fab-badge">1</div>

          </button>

        </motion.div>

      )}

    </AnimatePresence>

  )

}

