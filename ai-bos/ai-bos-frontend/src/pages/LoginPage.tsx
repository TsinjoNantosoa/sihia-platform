import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/store';
import { useI18n } from '@/lib/i18n/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/layout/Logo';

const DEMO_ACCOUNTS = [
  { email: 'ceo@demo.aibos.io', role: 'CEO / Owner', color: 'bg-primary-100 text-primary-700' },
  { email: 'sales@demo.aibos.io', role: 'Sales Director', color: 'bg-emerald-100 text-emerald-700' },
  { email: 'finance@demo.aibos.io', role: 'CFO', color: 'bg-amber-100 text-amber-700' },
  { email: 'hr@demo.aibos.io', role: 'HR Manager', color: 'bg-pink-100 text-pink-700' },
  { email: 'staff@demo.aibos.io', role: 'Staff', color: 'bg-slate-100 text-slate-700' },
];

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // error is in store
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo1234');
    try {
      await login(demoEmail, 'demo1234');
      navigate(from, { replace: true });
    } catch {
      // error is in store
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary-600 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600 blur-3xl" />
        </div>
        <div className="relative z-10">
          <Logo />
        </div>
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold leading-tight text-white">
              The Intelligent<br />Operating System<br />for Business
            </h1>
            <p className="mt-4 max-w-md text-base text-slate-400">
              Unify your CRM, Finance, HR, Projects, and Analytics in one AI-powered platform.
              Make smarter decisions, faster.
            </p>
          </motion.div>
          <div className="flex gap-6">
            {[
              { icon: Sparkles, label: 'AI Copilot' },
              { icon: ArrowRight, label: '50+ Modules' },
              { icon: ArrowRight, label: 'Real-time Analytics' },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-2 text-sm text-slate-300"
              >
                <f.icon className="h-4 w-4 text-primary-400" />
                {f.label}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-2xs text-slate-500">
          © 2024 AI BOS. All rights reserved.
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-bold tracking-tight">{t('auth.welcomeBack')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
          </motion.div>

          <Card className="mt-6">
            <form onSubmit={handleSubmit}>
              <CardHeader className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@entreprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <button type="button" className="text-xs text-primary hover:underline">
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {t('auth.invalidCredentials')}
                  </div>
                )}
              </CardHeader>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.signIn')}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Demo accounts */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">{t('auth.demoAccounts')}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleDemoLogin(acc.email)}
                  disabled={isLoading}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-all hover:border-primary/30 hover:shadow-soft disabled:opacity-50"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${acc.color}`}>
                    {acc.role[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{acc.role}</p>
                    <p className="truncate text-2xs text-muted-foreground">{acc.email}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-2xs text-muted-foreground">
              Mot de passe pour tous les comptes: <span className="font-mono font-medium">demo1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
