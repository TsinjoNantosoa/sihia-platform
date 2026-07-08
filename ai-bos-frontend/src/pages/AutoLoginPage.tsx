import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/lib/auth/store';

export function AutoLoginPage() {
  const navigate = useNavigate();
  const { user, token, login } = useAuth();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const autoLoginEnabled = import.meta.env.VITE_AUTO_DEMO_LOGIN !== 'false';

    if (!autoLoginEnabled) {
      navigate('/login', { replace: true });
      return;
    }

    if (user && token) {
      navigate('/app/dashboard', { replace: true });
      return;
    }

    // Demo credentials for local development.
    void login('ceo@demo.aibos.io', 'demo1234')
      .then(() => navigate('/app/dashboard', { replace: true }))
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate, token, user, login]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <div className="text-lg font-semibold">Connexion en cours...</div>
        <div className="mt-2 text-sm text-muted-foreground">Patientez quelques secondes.</div>
      </div>
    </div>
  );
}

