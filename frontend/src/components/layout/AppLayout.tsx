import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SihiaChatbot } from "@/components/chatbot/SihiaChatbot";
import { OfflineQueueBanner } from "@/components/shared/OfflineQueueBanner";
import { OnboardingTour } from "@/components/shared/OnboardingTour";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n, useT } from "@/lib/i18n/store";

export function AppLayout({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useI18n((state) => state.locale);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname]);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-[110] rounded-md bg-background px-4 py-2 font-semibold text-foreground shadow-lg focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t("a11y.skipToContent")}
      </a>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          id="mobile-navigation"
          side={locale === "ar" ? "right" : "left"}
          closeLabel={t("common.close")}
          className="w-72 max-w-[85%] p-0 lg:hidden"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() =>
              document.getElementById("mobile-menu-trigger")?.focus(),
            );
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t("a11y.primaryNavigation")}</SheetTitle>
            <SheetDescription>{t("a11y.navigationDescription")}</SheetDescription>
          </SheetHeader>
          <div className="h-full">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} menuOpen={mobileOpen} />
        <OfflineQueueBanner />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          data-onboarding="workspace"
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
      <OnboardingTour />
      <SihiaChatbot />
    </div>
  );
}
