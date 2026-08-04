import { useEffect } from "react";
import { applyThemeToDocument, useTheme } from "@/lib/theme/store";

/** Réhydrate le thème persisté et applique la classe `.dark` sur <html>. */
export function ThemeHydrator({ children }: { children: React.ReactNode }) {
  const hasHydrated = useTheme((s) => s.hasHydrated);
  const mode = useTheme((s) => s.mode);

  useEffect(() => {
    if (!useTheme.persist.hasHydrated()) {
      void useTheme.persist.rehydrate();
    }
  }, []);

  useEffect(() => {
    if (hasHydrated) applyThemeToDocument(mode);
  }, [hasHydrated, mode]);

  return <>{children}</>;
}
