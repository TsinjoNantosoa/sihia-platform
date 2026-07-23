import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, HeartPulse, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { authService } from "@/lib/api/services";
import { useT } from "@/lib/i18n/store";
import { z } from "zod";

const searchSchema = z.object({
  email: z.string().optional().catch(""),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Réinitialiser le mot de passe — SIH IA" }],
  }),
  component: ResetPasswordPage,
});

type Step = "code" | "password" | "done";

function ResetPasswordPage() {
  const t = useT();
  const { email: initialEmail = "" } = Route.useSearch();

  const [step, setStep] = useState<Step>("code");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.verifyResetCode(email.trim(), code.trim());
      setStep("password");
    } catch {
      setError(t("auth.invalidResetCode"));
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirmation) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.resetPassword(email.trim(), code.trim(), password);
      setStep("done");
    } catch {
      setError(t("auth.invalidResetCode"));
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

        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "code" ? t("auth.enterCodeSubtitle") : t("auth.resetSubtitle")}
        </p>

        {step === "done" ? (
          <div className="mt-8 space-y-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <p className="text-sm text-muted-foreground">{t("auth.resetSuccess")}</p>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("login.submit")}
            </Link>
          </div>
        ) : null}

        {step === "code" ? (
          <form onSubmit={onVerifyCode} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-email" className="text-xs font-medium">
                {t("login.email")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Mail className="size-4 text-muted-foreground" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  autoFocus={!initialEmail}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-code" className="text-xs font-medium">
                {t("auth.verificationCode")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <KeyRound className="size-4 text-muted-foreground" />
                <input
                  id="reset-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  required
                  minLength={4}
                  maxLength={16}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-transparent text-sm tracking-[0.3em] focus:outline-none"
                  autoFocus={Boolean(initialEmail)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">{t("auth.codeHint")}</p>
            </div>

            {error ? (
              <p className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("auth.verifyCode")}
            </button>
            <Link to="/forgot-password" className="text-center text-sm text-primary hover:underline">
              {t("auth.requestNewCode")}
            </Link>
          </form>
        ) : null}

        {step === "password" ? (
          <form onSubmit={onResetPassword} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-xs font-medium">
                {t("auth.newPassword")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Lock className="size-4 text-muted-foreground" />
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-xs font-medium">
                {t("auth.confirmPassword")}
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {error ? (
              <p className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("auth.resetPassword")}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
