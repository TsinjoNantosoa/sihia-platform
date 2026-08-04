// @lovable.dev/vite-tanstack-config — ne pas dupliquer les plugins listés dans leur doc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

/** Vercel injecte VERCEL=1 ; permet aussi un build local ciblé. */
const deployToVercel =
  process.env.VERCEL === "1" || process.env.NITRO_PRESET === "vercel";

export default defineConfig({
  // Cloudflare (défaut Lovable) et Nitro/Vercel sont mutuellement exclusifs au build.
  cloudflare: deployToVercel ? false : undefined,
  vite: {
    plugins: deployToVercel ? [nitro({ preset: "vercel" })] : [],
  },
});
