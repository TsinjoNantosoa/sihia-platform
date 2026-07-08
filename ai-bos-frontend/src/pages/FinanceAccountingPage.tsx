import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ArrowUpRight, ArrowDownRight, ListFilter } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getTransactions } from '@/lib/api/services'
import type { Transaction } from '@/lib/api/types'

type TxType = 'all' | Transaction['type']

export function FinanceAccountingPage() {
  const { t } = useI18n()

  const [query, setQuery] = useState('')
  const [type, setType] = useState<TxType>('all')
  const [category, setCategory] = useState('all')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })

  const categories = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((tx) => set.add(tx.category))
    return ['all', ...Array.from(set)]
  }, [transactions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const startD = start ? new Date(start) : null
    const endD = end ? new Date(end) : null

    return transactions
      .filter((tx) => (type === 'all' ? true : tx.type === type))
      .filter((tx) => (category === 'all' ? true : tx.category === category))
      .filter((tx) => (!q ? true : `${tx.description} ${tx.account} ${tx.category}`.toLowerCase().includes(q)))
      .filter((tx) => {
        const d = new Date(tx.date)
        if (startD && d < startD) return false
        if (endD && d > endD) return false
        return true
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [transactions, query, type, category, start, end])

  const totals = useMemo(() => {
    const income = filtered.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
    const expense = filtered.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
    return { income, expense, net: income - expense }
  }, [filtered])

  // Running balance in the *filtered* view (simple cumulative net).
  const ledgerRows = useMemo(() => {
    let balance = 0
    return filtered
      .slice()
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .map((tx) => {
        balance += tx.type === 'income' ? tx.amount : -tx.amount
        return { tx, balance }
      })
  }, [filtered])

  return (
    <div>
      <PageHeader
        title={t('nav.accounting')}
        description="Grand livre : écritures, filtres et soldes cumulés (mock)."
        actions={
          <Button variant="outline" onClick={() => {}}>
            <ListFilter className="mr-2 h-4 w-4" />
            {t('common.filter')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total revenus" value={formatCurrency(totals.income)} change={2.4} icon={ArrowUpRight} trend="up" />
        <KpiCard label="Total dépenses" value={formatCurrency(totals.expense)} change={-1.1} icon={ArrowDownRight} trend="down" />
        <KpiCard
          label="Solde net"
          value={formatCurrency(totals.net)}
          change={totals.net >= 0 ? 1.7 : -1.7}
          icon={ArrowUpRight}
          trend={totals.net >= 0 ? 'up' : 'down'}
        />
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Écritures</p>
                <p className="mt-2 text-2xl font-bold">{filtered.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isLoading ? 'Chargement…' : 'Vue filtrée'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                <Badge variant="outline">GL</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        <Card>
          <CardContent className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher (description, compte, catégorie)"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Select value={type} onValueChange={(v) => setType(v as TxType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="income">Revenus</SelectItem>
                  <SelectItem value="expense">Dépenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c === 'all' ? 'Toutes' : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Écritures</CardTitle>
            <div className="mt-2 text-sm text-muted-foreground">
              Débit/Crédit et solde cumulé (calculé côté client).
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead className="text-right">Débit</TableHead>
                  <TableHead className="text-right">Crédit</TableHead>
                  <TableHead className="text-right">Solde cumulé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerRows.map(({ tx, balance }) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.account}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {tx.type === 'income' ? formatCurrency(tx.amount) : formatCurrency(0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {tx.type === 'expense' ? formatCurrency(tx.amount) : formatCurrency(0)}
                    </TableCell>
                    <TableCell className={balance >= 0 ? 'text-right font-semibold text-emerald-700' : 'text-right font-semibold text-red-700'}>
                      {formatCurrency(balance)}
                    </TableCell>
                  </TableRow>
                ))}
                {ledgerRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Aucune écriture ne correspond aux filtres.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

