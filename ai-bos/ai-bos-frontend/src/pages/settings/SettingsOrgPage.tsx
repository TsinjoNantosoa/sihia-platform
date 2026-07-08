import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { useI18n } from '@/lib/i18n/store';

export function SettingsOrgPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t('nav.settingsOrg')} description="Configurez votre organisation" />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl gradient-ai">
                <span className="text-xl font-bold text-white">A</span>
              </div>
              <Button variant="outline">Changer le logo</Button>
            </div>
            <div className="space-y-2"><Label>Nom de l'organisation</Label><Input defaultValue="Acme Corp" /></div>
            <div className="space-y-2"><Label>Adresse</Label><Input placeholder="123 rue de la Paix" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Devise</Label><Select defaultValue="EUR"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Fuseau horaire</Label><Select defaultValue="Europe/Paris"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Europe/Paris">Europe/Paris</SelectItem><SelectItem value="America/New_York">America/New_York</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Langue</Label><Select defaultValue="fr"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="ar">العربية</SelectItem></SelectContent></Select></div>
            </div>
            <Button>{t('common.save')}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
