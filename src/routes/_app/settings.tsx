import { createFileRoute } from "@tanstack/react-router";
import { useT, useI18n } from "@/lib/i18n/store";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { useAuth } from "@/lib/auth/store";
import { Bell, Globe, User, Building, LogOut, Shield } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { authService } from "@/lib/api/services";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  beforeLoad: requireRoutePermission("view_settings"),
  head: () => ({ meta: [{ title: "Paramètres — SIH IA" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutCurrent = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      navigate({ to: "/login" });
    }
  };

  const handleLogoutAll = async () => {
    const confirmed = window.confirm(
      "Cette action va déconnecter tous vos appareils. Voulez-vous continuer ?",
    );
    if (!confirmed) return;

    try {
      await authService.logoutAll();
      toast.success("Toutes les sessions ont été révoquées");
    } catch {
      toast.error("Impossible de révoquer toutes les sessions");
    } finally {
      logout();
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Section icon={<Globe className="size-4" />} title={t("settings.language")}>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code as Locale)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                locale === l.code
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="font-mono text-[10px] uppercase">{l.code}</span>
              <span>{l.label}</span>
              {l.dir === "rtl" ? <span className="text-[10px] text-muted-foreground">RTL</span> : null}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<User className="size-4" />} title={t("settings.profile")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom" value={user?.name ?? "—"} />
          <Field label="Email" value={user?.email ?? "—"} />
          <Field label="Rôle" value={user?.role ?? "—"} />
          <Field label="Établissement" value={user?.facility ?? "—"} />
        </div>
      </Section>

      <Section icon={<Building className="size-4" />} title={t("settings.facility")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom" value="Hôpital Central" />
          <Field label="Capacité" value="320 lits" />
          <Field label="Services" value="12" />
          <Field label="Personnel" value="284" />
        </div>
      </Section>

      <Section icon={<Bell className="size-4" />} title={t("settings.notifications")}>
        <div className="flex flex-col gap-3">
          {[
            { label: "Alertes critiques IA", on: true },
            { label: "Rappels de RDV (email)", on: true },
            { label: "Rapport hebdomadaire", on: false },
          ].map((opt) => (
            <label key={opt.label} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span className="text-sm">{opt.label}</span>
              <input type="checkbox" defaultChecked={opt.on} className="size-4 accent-primary" />
            </label>
          ))}
        </div>
      </Section>

      <Section icon={<Shield className="size-4" />} title="Sécurité de session">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleLogoutCurrent}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <LogOut className="size-4" />
            Déconnecter cet appareil
          </button>
          <button
            onClick={handleLogoutAll}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
          >
            <Shield className="size-4" />
            Déconnecter tous les appareils
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary-soft text-primary">{icon}</div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
