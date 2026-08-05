// @lovable.dev/vite-tanstack-config — ne pas dupliquer les plugins listés dans leur doc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

/**
 * TanStack Start sur Vercel = Nitro obligatoire.
 * Sans Nitro, le build “réussit” mais chaque route renvoie 404 NOT_FOUND
 * (Vercel sert du statique au lieu des serverless functions).
 *
 * @see https://vercel.com/docs/frameworks/full-stack/tanstack-start
 */
export default defineConfig({
  vite: {
    plugins: [
      nitro({
        // Sur Vercel (VERCEL=1), Nitro écrit le Build Output API dans .vercel/output
        preset: process.env.VERCEL === "1" || process.env.NITRO_PRESET === "vercel" ? "vercel" : undefined,
      }),
    ],
  },
});
