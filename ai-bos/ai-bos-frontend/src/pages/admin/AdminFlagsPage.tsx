import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { useI18n } from '@/lib/i18n/store';
import { Flag } from 'lucide-react';

const FLAGS = [
  { name: 'AI Copilot', desc: 'Activer le copilote IA', enabled: true, env: 'production' },
  { name: 'ML Forecasts', desc: 'Prévisions machine learning', enabled: true, env: 'beta' },
  { name: 'Workflow Builder', desc: 'Constructeur de workflows visuel', enabled: true, env: 'production' },
  { name: 'Real-time Sync', desc: 'Synchronisation temps réel', enabled: false, env: 'alpha' },
  { name: 'Advanced Analytics', desc: 'Analytics avancées avec cohortes', enabled: true, env: 'beta' },
  { name: 'Multi-currency', desc: 'Support multi-devises', enabled: false, env: 'planned' },
  { name: 'Custom Agents', desc: 'Création d\'agents IA personnalisés', enabled: false, env: 'alpha' },
  { name: 'API v2', desc: 'Nouvelle API REST v2', enabled: true, env: 'beta' },
];

const ENV_COLORS: Record<string, string> = {
  production: 'success', beta: 'warning', alpha: 'danger', planned: 'muted',
};

export function AdminFlagsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t('nav.adminFlags')} description="Activez ou désactivez les fonctionnalités" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FLAGS.map((flag) => (
          <Card key={flag.name}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary"><Flag className="h-4 w-4" /></div>
                  <div>
                    <h3 className="text-sm font-semibold">{flag.name}</h3>
                    <p className="text-xs text-muted-foreground">{flag.desc}</p>
                  </div>
                </div>
                <Switch defaultChecked={flag.enabled} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <Badge variant={(ENV_COLORS[flag.env] as any) || 'muted'} className="capitalize">{flag.env}</Badge>
                <span className="text-xs text-muted-foreground">{flag.enabled ? 'Activé' : 'Désactivé'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
