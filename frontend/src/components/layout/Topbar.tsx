import { useState } from "react";
import { Search, LogOut, Menu, ChevronDown } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarBrand } from "@/components/brand/SidebarBrand";
import { useT, useI18n } from "@/lib/i18n/store";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { useAuth } from "@/lib/auth/store";
import { authService } from "@/lib/api/services";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch, useGlobalSearchHotkey } from "@/components/shared/GlobalSearch";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useSearchShortcutLabel } from "@/hooks/use-search-shortcut-label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ onMenu, menuOpen = false }: { onMenu?: () => void; menuOpen?: boolean }) {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchShortcut = useSearchShortcutLabel();
  useGlobalSearchHotkey(() => setSearchOpen(true));

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      navigate({ to: "/login" });
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/90 px-3 backdrop-blur-md sm:gap-3 sm:px-4 xl:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          id="mobile-menu-trigger"
          data-onboarding="navigation"
          onClick={onMenu}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 lg:hidden"
          aria-label={t("a11y.openMenu")}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="lg:hidden">
          <SidebarBrand />
        </div>
        <button
          type="button"
          data-onboarding="search"
          onClick={() => setSearchOpen(true)}
          className="group flex size-10 min-w-0 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-muted/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 min-[480px]:h-9 min-[480px]:w-full min-[480px]:max-w-sm min-[480px]:justify-start min-[480px]:px-3"
          aria-label={t("search.aria")}
        >
          <Search
            className="size-4 text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground"
            aria-hidden
          />
          <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground min-[480px]:block">
            {t("common.searchPlaceholder")}
          </span>
          <kbd
            aria-hidden
            className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground lg:block"
          >
            {searchShortcut}
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("a11y.languageMenu")}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-muted"
          >
            {locale}
            <ChevronDown className="size-3" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {LOCALES.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLocale(l.code as Locale)}
                className={cn(
                  "flex items-center justify-between",
                  locale === l.code && "bg-primary-soft text-primary",
                )}
              >
                <span>{l.label}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{l.code}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle variant="compact" />

        <div data-onboarding="notifications">
          <NotificationBell />
        </div>

        {/* Profile */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("a11y.userMenu").replace("{name}", user.name)}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-2 py-1 hover:bg-muted"
            >
              <div
                className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground"
                aria-hidden
              >
                {user.name.charAt(0)}
              </div>
              <div className="hidden max-w-28 text-start leading-tight xl:block">
                <div className="text-xs font-semibold">{user.name}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{user.role}</div>
              </div>
              <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="size-4" />
                <span>{t("nav.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
