import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { useI18n } from '@/lib/i18n/store';
import { Check, Plug } from 'lucide-react';

const INTEGRATIONS = [
  { name: 'Slack', desc: 'Notifications et messages', connected: true, color: 'bg-violet-500', icon: '💬' },
  { name: 'Google Workspace', desc: 'Email, Calendar, Drive', connected: true, color: 'bg-blue-500', icon: '📧' },
  { name: 'Stripe', desc: 'Paiements et facturation', connected: true, color: 'bg-indigo-500', icon: '💳' },
  { name: 'Zapier', desc: 'Automatisations', connected: false, color: 'bg-orange-500', icon: '⚡' },
  { name: 'Microsoft Teams', desc: 'Chat et réunions', connected: false, color: 'bg-blue-600', icon: '👥' },
  { name: 'HubSpot', desc: 'CRM sync', connected: false, color: 'bg-orange-600', icon: '📊' },
  { name: 'GitHub', desc: 'Code et déploiements', connected: true, color: 'bg-slate-800', icon: '🐙' },
  { name: 'Notion', desc: 'Documentation', connected: false, color: 'bg-slate-700', icon: '📝' },
];

export function SettingsIntegrationsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t('nav.settingsIntegrations')} description="Connectez vos outils préférés" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((int) => (
          <Card key={int.name}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${int.color} text-lg`}>{int.icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold">{int.name}</h3>
                    <p className="text-xs text-muted-foreground">{int.desc}</p>
                  </div>
                </div>
                {int.connected && <Badge variant="success" className="gap-1"><Check className="h-3 w-3" />Connecté</Badge>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <Switch defaultChecked={int.connected} />
                <Button variant={int.connected ? 'outline' : 'default'} size="sm">
                  {int.connected ? 'Configurer' : <><Plug className="h-3.5 w-3.5" />Connecter</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
