import { normalizeClientSlug } from './tenantBranding'

export type StoredChatMessage = {
  id: string
  role: 'user' | 'bot'
  html: string
  sources?: string[]
  is_refusal?: boolean
  has_contact_link?: boolean
}

export type ChatStorageKeys = {
  history: string
  session: string
  lastActive: string
}

const DEFAULT_SESSION_MAX_AGE_MS = 5 * 60 * 1000

const initialStateCache = new Map<string, { messages: StoredChatMessage[]; sessionId: string }>()

export function chatStorageKeys(clientId: string): ChatStorageKeys {
  const slug = normalizeClientSlug(clientId)
  return {
    history: `chat_history:${slug}`,
    session: `chat_session_id:${slug}`,
    lastActive: `chat_last_active:${slug}`,
  }
}

export function createSessionId(): string {
  return 'session-' + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
}

export function sessionMaxAgeMs(): number {
  const raw = import.meta.env.VITE_CHAT_SESSION_MAX_AGE_MS
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SESSION_MAX_AGE_MS
}

// --- AES-GCM encryption ---
// Key lives in sessionStorage (cleared on tab close); encrypted blob in localStorage.
// DevTools shows unreadable ciphertext in localStorage; key is gone after tab close.

function encKeyName(slug: string): string {
  return `chat_enc_key:${slug}`
}

async function getOrCreateEncKey(slug: string): Promise<CryptoKey> {
  try {
    const stored = window.sessionStorage.getItem(encKeyName(slug))
    if (stored) {
      const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
      return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
    }
  } catch {
    // fall through to generate a fresh key
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const exported = await crypto.subtle.exportKey('raw', key)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)))
  window.sessionStorage.setItem(encKeyName(slug), b64)
  return key
}

async function encrypt(key: CryptoKey, messages: StoredChatMessage[]): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(messages))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)
  const combined = new Uint8Array(12 + cipher.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(cipher), 12)
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(key: CryptoKey, b64: string): Promise<StoredChatMessage[]> {
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, key, combined.slice(12))
  return JSON.parse(new TextDecoder().decode(plain))
}

// --- Public API ---

export function purgeLocalChatStorage(clientId: string): void {
  const keys = chatStorageKeys(clientId)
  const slug = normalizeClientSlug(clientId)
  try {
    window.localStorage.removeItem(keys.history)
    window.localStorage.removeItem(keys.session)
    window.localStorage.removeItem(keys.lastActive)
    window.sessionStorage.removeItem(encKeyName(slug))
  } catch {
    // ignore
  }
  initialStateCache.delete(slug)
}

export function getInitialChatState(clientId: string): { messages: StoredChatMessage[]; sessionId: string } {
  const slug = normalizeClientSlug(clientId)

  if (typeof window === 'undefined') {
    return { messages: [], sessionId: createSessionId() }
  }

  const cached = initialStateCache.get(slug)
  if (cached) return cached

  const keys = chatStorageKeys(clientId)
  const maxAge = sessionMaxAgeMs()
  const now = Date.now()

  try {
    const lastActive = parseInt(window.localStorage.getItem(keys.lastActive) || '0', 10)

    if (lastActive > 0 && now - lastActive > maxAge) {
      purgeLocalChatStorage(clientId)
      const id = createSessionId()
      window.localStorage.setItem(keys.session, id)
      window.localStorage.setItem(keys.lastActive, String(now))
      const fresh = { messages: [], sessionId: id }
      initialStateCache.set(slug, fresh)
      return fresh
    }

    let sessionId = window.localStorage.getItem(keys.session) || ''
    if (!sessionId) {
      sessionId = createSessionId()
      window.localStorage.setItem(keys.session, sessionId)
    }
    if (!window.localStorage.getItem(keys.lastActive)) {
      window.localStorage.setItem(keys.lastActive, String(now))
    }

    // Messages are encrypted — ChatWidget loads them async via loadEncryptedHistory
    const state = { messages: [] as StoredChatMessage[], sessionId }
    initialStateCache.set(slug, state)
    return state
  } catch {
    const fallback = { messages: [], sessionId: createSessionId() }
    initialStateCache.set(slug, fallback)
    return fallback
  }
}

/** Async: decrypts chat history from localStorage using the per-session AES key. */
export async function loadEncryptedHistory(clientId: string): Promise<StoredChatMessage[]> {
  if (typeof window === 'undefined') return []
  const slug = normalizeClientSlug(clientId)
  const keys = chatStorageKeys(clientId)
  const raw = window.localStorage.getItem(keys.history)
  if (!raw) return []
  try {
    const key = await getOrCreateEncKey(slug)
    return await decrypt(key, raw)
  } catch {
    // Blob unreadable (wrong key or legacy plain JSON) — discard
    window.localStorage.removeItem(keys.history)
    return []
  }
}

/** Async: encrypts messages and writes the ciphertext to localStorage. */
export async function persistChatMessages(clientId: string, messages: StoredChatMessage[]): Promise<void> {
  if (typeof window === 'undefined') return
  const slug = normalizeClientSlug(clientId)
  const keys = chatStorageKeys(clientId)
  try {
    const key = await getOrCreateEncKey(slug)
    const ciphertext = await encrypt(key, messages)
    window.localStorage.setItem(keys.history, ciphertext)
    window.localStorage.setItem(keys.lastActive, String(Date.now()))
  } catch {
    // ignore
  }
}

export function readLastActiveMs(clientId: string): number {
  const keys = chatStorageKeys(clientId)
  return parseInt(window.localStorage.getItem(keys.lastActive) || '0', 10)
}

export function writeSessionId(clientId: string, sessionId: string, lastActiveMs = Date.now()): void {
  const keys = chatStorageKeys(clientId)
  try {
    window.localStorage.setItem(keys.session, sessionId)
    window.localStorage.setItem(keys.lastActive, String(lastActiveMs))
  } catch {
    // ignore
  }
}

export function clearChatHistory(clientId: string): void {
  const keys = chatStorageKeys(clientId)
  try {
    window.localStorage.removeItem(keys.history)
    window.localStorage.removeItem(keys.lastActive)
  } catch {
    // ignore
  }
}
