import {
  Outlet,
  Link,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nHydrator } from "@/components/I18nHydrator";
import { ThemeHydrator } from "@/components/ThemeHydrator";
import { Toaster } from "@/components/ui/sonner";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/store";

import appCss from "../styles.css?url";
import type { RouterAppContext } from "../router";

import { SihiaLogo } from "@/components/brand/SihiaLogo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Link to="/" aria-label="SIHIA — Accueil">
            <SihiaLogo variant="compact" decorative />
          </Link>
        </div>
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SIHIA — Smart Hospital Intelligence Platform" },
      {
        name: "description",
        content:
          "Intelligent hospital management platform combining healthcare operations, AI assistance, predictive analytics, RAG and Voice AI.",
      },
      { name: "author", content: "SIHIA" },
      { property: "og:title", content: "SIHIA — Smart Hospital Intelligence Platform" },
      {
        property: "og:description",
        content:
          "Hospital operations, AI assistance, predictive analytics, RAG and Voice AI in one HealthTech platform.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand/sihia-logo-primary.png" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#0F2A5A" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeHydrator>
        <I18nHydrator>
          <Outlet />
        </I18nHydrator>
      </ThemeHydrator>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
