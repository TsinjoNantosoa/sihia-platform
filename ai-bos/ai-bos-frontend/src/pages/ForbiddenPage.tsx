import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/store';

export function ForbiddenPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50">
        <ShieldX className="h-10 w-10 text-red-500" />
      </div>
      <h1 className="mt-6 text-3xl font-bold">{t('errors.403')}</h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">{t('errors.403Message')}</p>
      <Button onClick={() => navigate('/app/dashboard')} className="mt-6">
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Button>
    </div>
  );
}
