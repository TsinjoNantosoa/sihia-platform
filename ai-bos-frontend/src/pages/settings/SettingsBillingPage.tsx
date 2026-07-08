import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { useI18n } from '@/lib/i18n/store';
import { Check, Zap, Database, Users, Download } from 'lucide-react';

export function SettingsBillingPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t('nav.settingsBilling')} description="Gérez votre abonnement et facturation" />
      <div className="space-y-6 max-w-4xl">
        {/* Current plan */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary-50/50 to-violet-50/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Plan Enterprise</Badge>
                  <span className="text-sm text-muted-foreground">Renouvellement le 15 Jan 2025</span>
                </div>
                <p className="mt-2 text-3xl font-bold">1 200€<span className="text-base font-normal text-muted-foreground">/mois</span></p>
              </div>
              <Button variant="outline">Changer de plan</Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage meters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: 'Sièges', used: 25, total: 50, color: 'bg-primary' },
            { icon: Zap, label: 'Tokens IA', used: 850000, total: 2000000, color: 'bg-violet-500' },
            { icon: Database, label: 'Stockage', used: 45, total: 100, color: 'bg-emerald-500' },
          ].map((u) => (
            <Card key={u.label}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${u.color} text-white`}><u.icon className="h-4 w-4" /></div>
                  <span className="text-sm font-medium">{u.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold">{u.used.toLocaleString()}</span>
                  <span className="text-muted-foreground">{u.total.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${u.color}`} style={{ width: `${(u.used / u.total) * 100}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoice history */}
        <Card>
          <CardHeader><CardTitle className="text-base">Historique des factures</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Date</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {['INV-2024-012', 'INV-2024-011', 'INV-2024-010', 'INV-2024-009'].map((inv, i) => (
                  <TableRow key={inv}>
                    <TableCell className="font-mono text-sm">{inv}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{['15 Déc', '15 Nov', '15 Oct', '15 Sep'][i]} 2024</TableCell>
                    <TableCell className="font-semibold">1 200€</TableCell>
                    <TableCell><Badge variant="success" className="gap-1"><Check className="h-3 w-3" />Payée</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm"><Download className="h-3.5 w-3.5" />PDF</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
