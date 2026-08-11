/** UI slug (tenant_ui_config.tenant_id VARCHAR) → tenants.tenant_id BIGINT for API/DB */
export const UI_SLUG_TO_TENANT_ID: Record<string, string> = {
  sihia: "1",
};

export function numericTenantIdForSlug(slug: string): string {
  const key = (slug || "sihia").trim().toLowerCase();
  return import.meta.env.VITE_TENANT_ID?.trim() || UI_SLUG_TO_TENANT_ID[key] || "1";
}

export type ClientTheme = {
  botName: string;
  logoUrl: string; // URL absolue ou chemin asset local
  primaryColor: string; // couleur principale du header et des boutons
  welcomeFr?: string; // message d'accueil en français
  welcomeEn?: string; // message d'accueil en anglais
};
