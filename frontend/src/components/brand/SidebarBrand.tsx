import { Link } from "@tanstack/react-router";
import { SihiaLogo } from "@/components/brand/SihiaLogo";
import { cn } from "@/lib/utils";

type SidebarBrandProps = {
  onNavigate?: () => void;
  className?: string;
};

/** Symbole officiel + wordmark intégré au thème sidebar (sans carte blanche). */
export function SidebarBrand({ onNavigate, className }: SidebarBrandProps) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      aria-label="SIHIA — Accueil"
      className={cn("flex min-w-0 items-center gap-2.5", className)}
    >
      <SihiaLogo variant="icon" decorative className="size-8 shrink-0" />
      <span className="truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">
        SIHIA
      </span>
    </Link>
  );
}
