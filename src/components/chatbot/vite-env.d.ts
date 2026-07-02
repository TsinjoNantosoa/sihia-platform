/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_CHATBOT_API_TOKEN?: string
  readonly VITE_CHATBOT_JWT?: string
  readonly VITE_BASE_PATH?: string
  /** Durée max d’inactivité (ms) avant purge localStorage ; défaut 86400000 (24h) */
  readonly VITE_CHAT_SESSION_MAX_AGE_MS?: string
  /** Dev only: log apiToken length (not the secret) */
  readonly VITE_DEBUG_AUTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}
