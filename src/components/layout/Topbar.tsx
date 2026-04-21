import { useState } from "react";
import { Bell, Search, LogOut, Menu, ChevronDown } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useT, useI18n } from "@/lib/i18n/store";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { useAuth } from "@/lib/auth/store";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:block">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-muted">
            {locale}
            <ChevronDown className="size-3" />
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

        {/* Notifications */}
        <button
          className="relative inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive ring-2 ring-card" />
        </button>

        {/* Profile */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-2 py-1 hover:bg-muted">
              <div
                className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground"
                aria-hidden
              >
                {user.name.charAt(0)}
              </div>
              <div className="hidden text-start leading-tight sm:block">
                <div className="text-xs font-semibold">{user.name}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{user.role}</div>
              </div>
              <ChevronDown className="size-3 text-muted-foreground" />
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
    </header>
  );
}
