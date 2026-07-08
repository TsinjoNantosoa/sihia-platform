import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Truck,
  Package,
  Building,
  Plus,
  Eye,
  Download,
  Boxes,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getPurchaseOrders, getSuppliers } from '@/lib/api/services'
import type { PurchaseOrder, Supplier } from '@/lib/api/types'

export function ProcurementPage() {
  const { t } = useI18n()

  const { data: purchaseOrders = [] } = useQuery({ queryKey: ['purchase-orders'], queryFn: getPurchaseOrders })
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | PurchaseOrder['status']>('all')
  const [selected, setSelected] = useState<PurchaseOrder | null>(null)
  const [supplierSelected, setSupplierSelected] = useState<Supplier | null>(null)

  const filteredPOs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return purchaseOrders.filter((po) => {
      const matchStatus = status === 'all' ? true : po.status === status
      const matchQ = !q ? true : `${po.poNumber} ${po.supplierName} ${po.ownerName}`.toLowerCase().includes(q)
      return matchStatus && matchQ
    })
  }, [purchaseOrders, search, status])

  const stats = useMemo(() => {
    const committed = purchaseOrders.reduce((s, po) => s + po.totalAmount, 0)
    const openCount = purchaseOrders.filter((po) => po.status !== 'received' && po.status !== 'cancelled').length
    const lowRatingSuppliers = suppliers.filter((s) => s.rating < 3.5).length
    return { committed, openCount, lowRatingSuppliers }
  }, [purchaseOrders, suppliers])

  return (
    <div>
      <PageHeader
        title={t('nav.procurement')}
        description="Achats & fournisseurs : commandes, statuts et suivi (mock)."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Engagé</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.committed)}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              Total commandes (toutes phases)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Ouvertes</p>
            <p className="mt-2 text-2xl font-bold">{stats.openCount}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Draft / Submitted / Approved
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Fournisseurs à risque</p>
            <p className="mt-2 text-2xl font-bold">{stats.lowRatingSuppliers}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Boxes className="h-3.5 w-3.5" />
              Rating &lt; 3.5
            </div>
          </CardContent>
        </Card>
        <Card className="hidden lg:block">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Action</p>
            <Button className="mt-3 w-full" onClick={() => {}}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle demande
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pos">
        <TabsList>
          <TabsTrigger value="pos">Commandes</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <div className="mt-5 space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rechercher PO / fournisseur / owner..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="w-full sm:w-56">
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => {}}>
                  <Download className="h-4 w-4" />
                  {t('common.export')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Purchase Orders</CardTitle>
                <div className="mt-2 text-sm text-muted-foreground">
                  {filteredPOs.length} commande(s) — mock.
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Prévu</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="text-right">Articles</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono text-sm">{po.poNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
                              <Building className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{po.supplierName}</p>
                              <p className="text-xs text-muted-foreground">{po.ownerName}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={po.status} /></TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(po.expectedAt)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(po.totalAmount, 'EUR', 'fr-FR')}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{po.itemCount}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelected(po)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredPOs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                          Aucun résultat.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card className="mt-5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Annuaire fournisseurs</CardTitle>
              <div className="mt-2 text-sm text-muted-foreground">{suppliers.length} fournisseur(s) — mock.</div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Pays</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
                            <Building className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        <Badge variant={s.rating < 3.5 ? 'danger' : 'success'} className="text-2xs">
                          {s.rating.toFixed(1)} / 5
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.country}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSupplierSelected(s)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Détails
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PO details */}
      <Dialog open={!!selected} onOpenChange={(o) => setSelected(o ? selected : null)}>
        {selected && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected.poNumber} — {selected.supplierName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge status={selected.status} />
                <Badge variant="muted">{selected.currency}</Badge>
                <Badge variant="outline">{selected.itemCount} articles</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Montant</p>
                    <p className="mt-1 text-xl font-bold">{formatCurrency(selected.totalAmount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Prévu & owner</p>
                    <p className="mt-1 text-sm font-medium">{formatDate(selected.expectedAt)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selected.ownerName}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-sm text-muted-foreground">
                Cette page est prête à être branchée au backend procurement (API + data model). Pour l’instant : UI + mocks.
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Supplier details */}
      <Dialog open={!!supplierSelected} onOpenChange={(o) => setSupplierSelected(o ? supplierSelected : null)}>
        {supplierSelected && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fournisseur — {supplierSelected.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge status={supplierSelected.status} />
                <Badge variant="muted">{supplierSelected.rating.toFixed(1)} / 5</Badge>
                <Badge variant="outline">{supplierSelected.country}</Badge>
              </div>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium">Contact</p>
                  <p className="mt-1 text-sm text-muted-foreground">{supplierSelected.email}</p>
                  {supplierSelected.phone && <p className="mt-1 text-sm text-muted-foreground">{supplierSelected.phone}</p>}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

