import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/store';

export function NotFoundPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { from?: { pathname: string } } | null;
  const fromPathname = state?.from?.pathname;

  const goBack = () => {
    if (fromPathname) navigate(fromPathname, { replace: true });
    else navigate(-1);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50">
        <Compass className="h-10 w-10 text-primary" />
      </div>
      <h1 className="mt-6 text-6xl font-bold text-primary">404</h1>
      <p className="mt-2 text-lg font-medium">{t('errors.404')}</p>
      <p className="mt-1 max-w-md text-center text-muted-foreground">{t('errors.404Message')}</p>
      <Button onClick={goBack} className="mt-6">
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Button>
    </div>
  );
}
