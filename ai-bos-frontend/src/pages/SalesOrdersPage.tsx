import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FileText, ArrowRight, Check } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getOrders } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatCurrency, formatDate } from '@/lib/utils';

export function SalesOrdersPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: getOrders });

  const filtered = (orders || []).filter((o) => !search || o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('nav.salesOrders')} description="Gérez vos devis et commandes" actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nouveau devis</Button>} />
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Client</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead className="hidden lg:table-cell">Commercial</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm font-medium">{o.orderNumber}</TableCell>
                  <TableCell className="text-sm">{o.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(o.date)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(o.amount)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{o.salesRepName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Créer un devis</DialogTitle><DialogDescription>Étape {wizardStep + 1} sur 3</DialogDescription></DialogHeader>
          <div className="flex items-center justify-between mb-4">
            {['Client', 'Produits', 'Confirmation'].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${i <= wizardStep ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  {i < wizardStep ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`mx-1 h-0.5 w-12 ${i < wizardStep ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
          {wizardStep === 0 && <div className="space-y-3"><Input placeholder="Nom du client" /><Input placeholder="Email" /></div>}
          {wizardStep === 1 && <div className="space-y-2"><div className="grid grid-cols-12 gap-2"><Input className="col-span-8" placeholder="Description" /><Input className="col-span-2" placeholder="Qté" /><Input className="col-span-2" placeholder="Prix" /></div><Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5" />Ajouter ligne</Button></div>}
          {wizardStep === 2 && <div className="space-y-2"><p className="text-sm font-medium">Récapitulatif</p><div className="rounded-lg border border-border p-3 space-y-1"><div className="flex justify-between text-sm"><span>Sous-total</span><span>10 000€</span></div><div className="flex justify-between text-sm"><span>TVA (20%)</span><span>2 000€</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>12 000€</span></div></div></div>}
          <DialogFooter>
            {wizardStep > 0 && <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>Retour</Button>}
            <Button onClick={() => wizardStep < 2 ? setWizardStep(wizardStep + 1) : setCreateOpen(false)}>
              {wizardStep < 2 ? <><span>Suivant</span><ArrowRight className="h-4 w-4" /></> : 'Créer le devis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
