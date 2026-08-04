import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useT, useI18n } from "@/lib/i18n/store";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { PipelineAdminPanel } from "@/components/shared/PipelineAdminPanel";
import { ReminderChannelsBanner } from "@/components/shared/ReminderChannelsBanner";
import { requireRoutePermission } from "@/lib/auth/routeGuard";
import { useAuth } from "@/lib/auth/store";
import { Bell, CircleHelp, Globe, User, Building, LogOut, Shield, Database } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { appointmentsService, authService, notificationsService } from "@/lib/api/services";
import { toast } from "sonner";
import { requestOnboardingRestart } from "@/lib/onboarding/state";

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

  const reminderStatus = useQuery({
    queryKey: ["reminder-status"],
    queryFn: appointmentsService.reminderStatus,
    retry: false,
  });

  const notifPrefs = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: notificationsService.getPrefs,
  });

  const qc = useQueryClient();
  const updatePrefs = useMutation({
    mutationFn: notificationsService.updatePrefs,
    onSuccess: () => {
      toast.success(t("settings.notif.saved"));
      void qc.invalidateQueries({ queryKey: ["notification-prefs"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast.error(t("settings.notif.saveFail")),
  });

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
              {l.dir === "rtl" ? (
                <span className="text-[10px] text-muted-foreground">RTL</span>
              ) : null}
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
          {(
            [
              { key: "alertsEnabled" as const, label: t("settings.notif.alerts") },
              { key: "remindersEnabled" as const, label: t("settings.notif.reminders") },
              { key: "weeklyDigestEnabled" as const, label: t("settings.notif.weekly") },
            ] as const
          ).map((opt) => {
            const checked = notifPrefs.data?.[opt.key] ?? opt.key !== "weeklyDigestEnabled";
            return (
              <label
                key={opt.key}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <span className="text-sm">{opt.label}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={notifPrefs.isLoading || updatePrefs.isPending}
                  onChange={(e) => updatePrefs.mutate({ [opt.key]: e.target.checked })}
                  className="size-4 accent-primary"
                />
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <a href="/notifications" className="font-semibold text-primary hover:underline">
            {t("notif.center.openInbox")}
          </a>
        </p>
        <PermissionGuard permission="appointments:update">
          <div className="mt-4">
            {reminderStatus.data ? (
              <ReminderChannelsBanner status={reminderStatus.data} showMailhogLink />
            ) : null}
          </div>
        </PermissionGuard>
      </Section>

      <PermissionGuard permission="analytics:read">
        <Section icon={<Database className="size-4" />} title={t("pipeline.title")}>
          <p className="mb-4 text-xs text-muted-foreground">{t("pipeline.subtitle")}</p>
          <PipelineAdminPanel />
        </Section>
      </PermissionGuard>

      <Section icon={<CircleHelp className="size-4" />} title={t("settings.onboarding.title")}>
        <p className="mb-3 text-xs text-muted-foreground">{t("settings.onboarding.description")}</p>
        <button
          type="button"
          onClick={requestOnboardingRestart}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <CircleHelp className="size-4" />
          {t("settings.onboarding.restart")}
        </button>
      </Section>

      <Section icon={<Shield className="size-4" />} title={t("settings.security")}>
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

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary-soft text-primary">
          {icon}
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
