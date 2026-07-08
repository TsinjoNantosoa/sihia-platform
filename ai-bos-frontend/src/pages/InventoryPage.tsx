import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { getInventory } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatCurrency } from '@/lib/utils';

export function InventoryPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const { data: items } = useQuery({ queryKey: ['inventory'], queryFn: getInventory });

  const filtered = (items || []).filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
  const lowStock = (items || []).filter((i) => i.status === 'low_stock').length;
  const outOfStock = (items || []).filter((i) => i.status === 'out_of_stock').length;
  const totalValue = (items || []).reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div>
      <PageHeader title={t('nav.inventory')} description="Gérez vos stocks" actions={<Button><Plus className="h-4 w-4" />Nouvel article</Button>} />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">Articles</p></div><p className="mt-1 text-2xl font-bold">{items?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><p className="text-sm text-muted-foreground">Stock faible</p></div><p className="mt-1 text-2xl font-bold text-amber-600">{lowStock}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /><p className="text-sm text-muted-foreground">Rupture</p></div><p className="mt-1 text-2xl font-bold text-red-600">{outOfStock}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-emerald-500" /><p className="text-sm text-muted-foreground">Valeur stock</p></div><p className="mt-1 text-2xl font-bold">{formatCurrency(totalValue)}</p></CardContent></Card>
      </div>
      <Card className="mb-4"><CardContent className="p-4">
        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </CardContent></Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Article</TableHead><TableHead>Catégorie</TableHead><TableHead>Quantité</TableHead><TableHead>Seuil</TableHead><TableHead>Entrepôt</TableHead><TableHead>Prix unit.</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-sm">{i.sku}</TableCell>
                  <TableCell className="text-sm font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.category}</TableCell>
                  <TableCell className="text-sm font-semibold">{i.quantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.reorderLevel}</TableCell>
                  <TableCell className="text-sm">{i.warehouse}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(i.unitPrice)}</TableCell>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
