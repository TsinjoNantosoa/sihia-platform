/** UI slug (tenant_ui_config.tenant_id VARCHAR) → tenants.tenant_id BIGINT for API/DB */
export const UI_SLUG_TO_TENANT_ID: Record<string, string> = {
  sihia: '1',
  aaa: '1',
  victrix: '2',
  h4h: '3',
}

export function numericTenantIdForSlug(slug: string): string {
  const key = (slug || 'aaa').trim().toLowerCase()
  return import.meta.env.VITE_TENANT_ID?.trim() || UI_SLUG_TO_TENANT_ID[key] || '1'
}

export type ClientTheme = {
  botName: string        // ex. "ALAN.AI", "Victrix Bot"
  logoUrl: string        // URL absolue ou chemin asset local
  primaryColor: string   // couleur principale header + boutons, ex. "#132251"
  welcomeFr?: string     // message d'accueil en français
  welcomeEn?: string     // message d'accueil en anglais
}
