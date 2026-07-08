import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n/store'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { getFinanceOverview, getInvoices, getTransactions } from '@/lib/api/services'
import { useAuth } from '@/lib/auth/store'
import type { Invoice, Transaction } from '@/lib/api/types'

export function FinancePaymentsPage() {
  const { t } = useI18n()
  const { user } = useAuth()

  const [search, setSearch] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState<'all' | Invoice['status']>('all')

  const { data: finance, isLoading: financeLoading } = useQuery({
    queryKey: ['finance-overview'],
    queryFn: getFinanceOverview,
  })
  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices,
  })

  const filteredTransactions = useMemo(() => {
    if (!transactions) return { income: [] as Transaction[], expense: [] as Transaction[] }
    const q = search.trim().toLowerCase()
    const list = !q
      ? transactions
      : transactions.filter(
          (tx) =>
            tx.description.toLowerCase().includes(q) ||
            tx.category.toLowerCase().includes(q) ||
            tx.account.toLowerCase().includes(q),
        )

    return {
      income: list.filter((tx) => tx.type === 'income'),
      expense: list.filter((tx) => tx.type === 'expense'),
    }
  }, [transactions, search])

  const totals = useMemo(() => {
    const incomeTotal = filteredTransactions.income.reduce((s, tx) => s + tx.amount, 0)
    const expenseTotal = filteredTransactions.expense.reduce((s, tx) => s + tx.amount, 0)
    const net = incomeTotal - expenseTotal
    return { incomeTotal, expenseTotal, net }
  }, [filteredTransactions])

  const filteredInvoices = useMemo(() => {
    if (!invoices) return []
    const list = invoiceStatus === 'all' ? invoices : invoices.filter((i) => i.status === invoiceStatus)
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter((i) => i.clientName.toLowerCase().includes(q) || i.invoiceNumber.toLowerCase().includes(q))
  }, [invoices, invoiceStatus, search])

  const cashFlowData = useMemo(() => {
    return (finance?.monthlyRevenue || []).map((d) => ({
      month: d.month,
      income: d.revenue,
      expenses: d.expenses,
    }))
  }, [finance])

  // We keep the page light: payments + AR aging, while the big cash-flow chart remains on /finance.
  return (
    <div>
      <PageHeader
        title={t('nav.payments')}
        description={`Trésorerie, encaissements et recouvrement. Connexion : ${user?.firstName ?? ''}`}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Encaissements"
          value={formatCurrency(totals.incomeTotal)}
          change={1.8}
          icon={ArrowUpRight}
          trend="up"
          format="currency"
        />
        <KpiCard
          label="Décaissements"
          value={formatCurrency(totals.expenseTotal)}
          change={-0.9}
          icon={ArrowDownRight}
          trend="down"
          format="currency"
        />
        <KpiCard
          label="Solde net"
          value={formatCurrency(totals.net)}
          change={totals.net >= 0 ? 2.1 : -2.1}
          icon={ArrowUpRight}
          trend={totals.net >= 0 ? 'up' : 'down'}
          format="currency"
        />
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">A/R en retard</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-red-600">
                  {formatCurrency((finance?.agingReceivables || []).find((a) => a.bucket.includes('90'))?.amount || 0)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="danger" className="text-2xs">Priorité</Badge>
                  <span className="text-xs text-muted-foreground">Relance recommandée</span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Tabs */}
      <div className="mt-6 space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-full sm:w-52">
                <Select value={invoiceStatus} onValueChange={(v) => setInvoiceStatus(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Statut facture" />
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
              </div>
              <Button variant="outline" onClick={() => {}}>
                <Download className="h-4 w-4" />
                {t('common.export')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="income">
          <TabsList>
            <TabsTrigger value="income">Encaissements</TabsTrigger>
            <TabsTrigger value="expense">Décaissements</TabsTrigger>
            <TabsTrigger value="ar">A/R & relances</TabsTrigger>
          </TabsList>

          <TabsContent value="income">
            <TxTable
              title="Paiements reçus"
              items={filteredTransactions.income}
              variant="income"
            />
          </TabsContent>
          <TabsContent value="expense">
            <TxTable
              title="Paiements versés"
              items={filteredTransactions.expense}
              variant="expense"
            />
          </TabsContent>
          <TabsContent value="ar">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Factures — recouvrement</CardTitle>
                <div className="mt-2 text-sm text-muted-foreground">
                  {filteredInvoices.length} facture(s) — filtre statut + recherche.
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date émission</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filteredInvoices || []).map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.clientName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(filteredInvoices || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          Aucune facture ne correspond à vos critères.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="p-4 pt-5 border-t border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Aging receivables</p>
                      <p className="text-xs text-muted-foreground">Indicateur rapide pour prioriser les relances.</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {financeLoading ? 'Chargement…' : 'Basé sur les données de trésorerie'}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                    {(finance?.agingReceivables || []).map((bucket) => (
                      <div key={bucket.bucket} className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground">{bucket.bucket}</p>
                        <p className="mt-1 text-sm font-semibold">{formatCurrency(bucket.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function TxTable({
  title,
  items,
  variant,
}: {
  title: string
  items: Transaction[]
  variant: 'income' | 'expense'
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="mt-2 text-sm text-muted-foreground">
          {items.length} écriture(s) — triées par date (mock).
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-medium">{tx.description}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tx.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tx.account}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                <TableCell className={cn('text-right font-semibold', variant === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                  {variant === 'income' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Aucune écriture à afficher.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

