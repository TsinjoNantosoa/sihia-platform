import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { useI18n } from '@/lib/i18n/store';
import { Plus, Copy, Trash2, KeyRound } from 'lucide-react';

const KEYS = [
  { id: 'key-1', name: 'Production API', key: 'sk_live_••••••••••••••••4f2a', created: '12 Jan 2024', lastUsed: 'Il y a 2 min' },
  { id: 'key-2', name: 'Webhook Integration', key: 'sk_live_••••••••••••••••8b3c', created: '5 Fév 2024', lastUsed: 'Il y a 1 heure' },
  { id: 'key-3', name: 'Development', key: 'sk_test_••••••••••••••••1d9e', created: '20 Mar 2024', lastUsed: 'Il y a 3 jours' },
];

export function SettingsApiKeysPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t('nav.settingsApiKeys')} description="Gérez vos clés API" actions={<Button><Plus className="h-4 w-4" />Nouvelle clé</Button>} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Clé</TableHead><TableHead>Créée le</TableHead><TableHead>Dernière utilisation</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {KEYS.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" />{k.name}</div></TableCell>
                  <TableCell><code className="rounded bg-muted px-2 py-1 text-xs">{k.key}</code></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{k.created}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{k.lastUsed}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
