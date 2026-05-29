import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/store";

/** Évite le mismatch SSR : le serveur et le 1er rendu client utilisent la locale par défaut, puis localStorage. */
export function I18nHydrator({ children }: { children: React.ReactNode }) {
  const hasHydrated = useI18n((s) => s.hasHydrated);

  useEffect(() => {
    if (!useI18n.persist.hasHydrated()) {
      void useI18n.persist.rehydrate();
    }
  }, []);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background" aria-busy="true">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return <>{children}</>;
}
