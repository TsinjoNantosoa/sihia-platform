import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { useI18n } from '@/lib/i18n/store';

const CHANNELS = ['Email', 'SMS', 'Push', 'Slack'];
const CATEGORIES = [
  { name: 'Factures et paiements', icon: '💳' },
  { name: 'Nouveaux leads', icon: '🎯' },
  { name: 'Tâches assignées', icon: '✅' },
  { name: 'Réunions', icon: '📅' },
  { name: 'Alertes système', icon: '⚠️' },
  { name: 'Rapports hebdo', icon: '📊' },
  { name: 'Mentions', icon: '💬' },
  { name: 'Contrats', icon: '📄' },
];

export function SettingsNotificationsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t('nav.settingsNotifications')} description="Configurez vos préférences de notification" />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left text-sm font-medium">Type de notification</th>
                  {CHANNELS.map((c) => <th key={c} className="p-4 text-center text-sm font-medium">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => (
                  <tr key={cat.name} className="border-b border-border">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                    </td>
                    {CHANNELS.map((c) => (
                      <td key={c} className="p-4 text-center">
                        <Switch defaultChecked={Math.random() > 0.3} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
