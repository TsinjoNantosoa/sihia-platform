// @lovable.dev/vite-tanstack-config — ne pas dupliquer les plugins listés dans leur doc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/** Vercel injecte VERCEL=1 ; NITRO_PRESET=vercel pour build local de vérif. */
const deployToVercel = process.env.VERCEL === "1" || process.env.NITRO_PRESET === "vercel";

export default defineConfig({
  // Nitro intégré au wrapper Lovable (≥1.x avec option `nitro`).
  // Sur Vercel : preset officiel. Sinon : désactivé (build Vite local / CI).
  nitro: deployToVercel ? { preset: "vercel" } : false,
});
