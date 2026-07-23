import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, HeartPulse, Loader2, Mail } from "lucide-react";
import { authService } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Mot de passe oublié — SIH IA" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const t = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      navigate({
        to: "/reset-password",
        search: { email: email.trim() },
      });
    } catch {
      setError(t("auth.requestError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <div className="text-base font-semibold">{t("app.name")}</div>
            <div className="text-xs text-muted-foreground">{t("app.tagline")}</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.forgotTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.forgotSubtitle")}</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="forgot-email" className="text-xs font-medium">
              {t("login.email")}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
              <Mail className="size-4 text-muted-foreground" />
              <input
                id="forgot-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none"
                placeholder="nom@etablissement.com"
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("auth.sendResetCode")}
          </button>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("auth.backToLogin")}
          </Link>
        </form>
      </div>
    </div>
  );
}
