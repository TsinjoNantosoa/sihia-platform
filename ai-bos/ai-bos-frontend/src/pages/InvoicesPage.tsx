import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Download, Send, MoreHorizontal, FileText, Eye, Bell,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getInvoices } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function InvoicesPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: invoices, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      const matchSearch = !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalPaid = filtered.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);
  const totalOverdue = filtered.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0);
  const totalOutstanding = filtered.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div>
      <PageHeader
        title={t('nav.invoices')}
        description="Gérez vos factures et relances"
        actions={
          <>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              {t('common.export')}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle facture
            </Button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Encaissé</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En retard</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyée</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={FileText} title={t('common.noResults')} description="Aucune facture ne correspond à vos critères." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Date émission</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{inv.clientName}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4" /> Voir</DropdownMenuItem>
                          <DropdownMenuItem><Download className="h-4 w-4" /> PDF</DropdownMenuItem>
                          {inv.status !== 'paid' && (
                            <DropdownMenuItem><Send className="h-4 w-4" /> Envoyer</DropdownMenuItem>
                          )}
                          {inv.status === 'overdue' && (
                            <DropdownMenuItem><Bell className="h-4 w-4" /> Relancer</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create invoice dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
            <DialogDescription>Créez une nouvelle facture pour un client</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input id="client" placeholder="TechSolutions SAS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Date d'émission</Label>
              <Input id="invoiceDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Date d'échéance</Label>
              <Input id="dueDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Taux de TVA</Label>
              <Input id="taxRate" type="number" defaultValue="20" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Lignes de facturation</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" placeholder="Description" />
                  <Input className="col-span-2" type="number" placeholder="Qté" />
                  <Input className="col-span-3" type="number" placeholder="Prix unit." />
                  <Button variant="outline" size="icon" className="col-span-1"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => setCreateOpen(false)}>
              <FileText className="h-4 w-4" />
              Créer la facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
