import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { HeartPulse, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { useT, useI18n } from "@/lib/i18n/store";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — SIH IA" },
      { name: "description", content: "Connectez-vous à la plateforme SIH IA." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("dr.benali@sihia.health");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t("login.error"));
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t("login.submit"));
      navigate({ to: "/" });
    } catch {
      setError(t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] w-full lg:grid-cols-2">
      {/* Form */}
      <div className="flex items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[var(--shadow-card)]">
              <HeartPulse className="size-5" />
            </div>
            <div>
              <div className="text-base font-semibold">{t("app.name")}</div>
              <div className="text-xs text-muted-foreground">{t("app.tagline")}</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-foreground">
                {t("login.email")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Mail className="size-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="nom@etablissement.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-foreground">
                {t("login.password")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Lock className="size-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("login.submit")}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button 
                type="button" 
                onClick={() => toast.info("Fonctionnalité à venir")}
                className="text-primary hover:underline"
              >
                {t("login.forgot")}
              </button>
              <div className="flex gap-1.5 text-muted-foreground">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLocale(l.code as Locale)}
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                      locale === l.code ? "bg-primary-soft font-bold text-primary" : "hover:text-foreground"
                    }`}
                  >
                    {l.code}
                  </button>
                ))}
              </div>
            </div>

            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
              {t("login.demoHint")}
            </p>
          </form>
        </div>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-accent lg:block">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 0, transparent 30%), radial-gradient(circle at 80% 70%, white 0, transparent 30%)",
        }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <span className="size-2 animate-pulse rounded-full bg-white" />
            Plateforme certifiée HL7 FHIR · RGPD
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold leading-tight">
              L'intelligence opérationnelle au service du soin.
            </h2>
            <p className="max-w-md text-base opacity-90">
              KPIs temps réel, prédiction du flux patients par LSTM et chatbot médical multilingue —
              tout dans une seule plateforme moderne.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { v: "99.5%", l: "Uptime SLA" },
                { v: "<200ms", l: "Latence API" },
                { v: "10k", l: "Patients simul." },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <div className="text-xl font-semibold">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-80">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs opacity-70">© 2025 SIH IA — Tous droits réservés</div>
        </div>
      </div>
    </div>
  );
}
