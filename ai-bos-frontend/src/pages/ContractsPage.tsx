import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ScrollText, AlertTriangle, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { getContracts } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

export function ContractsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const { data: contracts } = useQuery({ queryKey: ['contracts'], queryFn: getContracts });

  const filtered = (contracts || []).filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.counterparty.toLowerCase().includes(search.toLowerCase()));
  const expiring = (contracts || []).filter((c) => c.status === 'expiring').length;

  return (
    <div>
      <PageHeader title={t('nav.contracts')} description="Gérez vos contrats et accords" actions={<Button><Plus className="h-4 w-4" />Nouveau contrat</Button>} />
      {expiring > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50/30">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm">{expiring} contrat(s) arrivent à échéance dans les 30 prochains jours</p>
            <Button variant="outline" size="sm" className="ml-auto">Voir</Button>
          </CardContent>
        </Card>
      )}
      <Card className="mb-4"><CardContent className="p-4">
        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Contrepartie</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead>Valeur</TableHead><TableHead>Échéance</TableHead><TableHead>Statut</TableHead><TableHead className="hidden lg:table-cell">Responsable</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm font-medium">{c.title}</TableCell>
                  <TableCell className="text-sm">{c.counterparty}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="muted" className="capitalize">{c.type}</Badge></TableCell>
                  <TableCell className="font-semibold">{formatCurrency(c.value)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.endDate)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{c.owner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
