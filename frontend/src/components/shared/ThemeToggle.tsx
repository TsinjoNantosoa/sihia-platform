import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, useResolvedTheme, type ThemeMode } from "@/lib/theme/store";
import { useT } from "@/lib/i18n/store";
import { cn } from "@/lib/utils";

type Props = {
  /** compact = bouton topbar ; full = sélecteur Paramètres */
  variant?: "compact" | "full";
};

export function ThemeToggle({ variant = "compact" }: Props) {
  const t = useT();
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const toggle = useTheme((s) => s.toggleLightDark);
  const resolved = useResolvedTheme();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={resolved === "dark" ? t("settings.theme.toLight") : t("settings.theme.toDark")}
        title={resolved === "dark" ? t("settings.theme.toLight") : t("settings.theme.toDark")}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {resolved === "dark" ? (
          <Sun className="size-4" aria-hidden />
        ) : (
          <Moon className="size-4" aria-hidden />
        )}
      </button>
    );
  }

  const options: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
    { id: "light", label: t("settings.theme.light"), icon: Sun },
    { id: "dark", label: t("settings.theme.dark"), icon: Moon },
    { id: "system", label: t("settings.theme.system"), icon: Monitor },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("settings.theme")}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(opt.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
              active
                ? "border-primary bg-primary-soft text-primary"
                : "border-border hover:bg-muted",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
