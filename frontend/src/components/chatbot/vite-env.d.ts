/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly VITE_BASE_PATH?: string;
  /** Durée max d’inactivité (ms) avant purge localStorage ; défaut 86400000 (24h) */
  readonly VITE_CHAT_SESSION_MAX_AGE_MS?: string;
  /** Dev only: log token length (not the secret) */
  readonly VITE_DEBUG_AUTH?: string;
  readonly VITE_BOT_NAME?: string;
  readonly VITE_LOGO_URL?: string;
  readonly VITE_PRIMARY_COLOR?: string;
  readonly VITE_WELCOME_FR?: string;
  readonly VITE_WELCOME_EN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
