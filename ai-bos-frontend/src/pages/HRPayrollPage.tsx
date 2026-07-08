import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useI18n } from '@/lib/i18n/store'
import { formatCurrency } from '@/lib/utils'
import { getEmployees } from '@/lib/api/services'
import type { Employee } from '@/lib/api/types'

const NET_MULTIPLIER = 0.78

export function HRPayrollPage() {
  const { t } = useI18n()

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: getEmployees })

  const departments = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((e) => set.add(e.department))
    return ['all', ...Array.from(set)]
  }, [employees])

  const [department, setDepartment] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Employee | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees.filter((e) => {
      const matchDept = department === 'all' ? true : e.department === department
      const matchQ = !q ? true : `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(q)
      return matchDept && matchQ
    })
  }, [employees, department, query])

  const summary = useMemo(() => {
    const gross = filtered.reduce((s, e) => s + (e.salary || 0), 0)
    const active = filtered.filter((e) => e.status === 'active')
    const avg = filtered.length ? gross / Math.max(1, filtered.length) : 0
    return { gross, activeCount: active.length, avg }
  }, [filtered])

  const byDepartment = useMemo(() => {
    const map = new Map<string, number>()
    employees.forEach((e) => {
      const cur = map.get(e.department) || 0
      map.set(e.department, cur + (e.salary || 0))
    })
    return Array.from(map.entries()).map(([dept, amount]) => ({ dept, amount })).sort((a, b) => b.amount - a.amount)
  }, [employees])

  const payslipFor = (e: Employee) => {
    const gross = e.salary || 0
    const net = Math.round(gross * NET_MULTIPLIER)
    const taxes = gross - net
    return { gross, net, taxes }
  }

  return (
    <div>
      <PageHeader
        title={t('nav.payroll')}
        description="Paie, synthèse et bulletins (mock)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {}}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Masse salariale (brut)</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(summary.gross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Employés actifs</p>
            <p className="mt-2 text-2xl font-bold">{summary.activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Salaire moyen</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(summary.avg)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Top départements</p>
            <div className="mt-3 flex flex-col gap-2">
              {byDepartment.slice(0, 2).map((d) => (
                <div key={d.dept} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.dept}</span>
                  <span className="font-semibold">{formatCurrency(d.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher employé…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="w-full sm:w-56">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d === 'all' ? 'Tous' : d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Employés — bulletins</CardTitle>
            <div className="mt-2 text-sm text-muted-foreground">
              {filtered.length} personne(s) — données mock.
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Salaire brut</TableHead>
                  <TableHead className="text-right">Salaire net</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const { gross, net } = payslipFor(e)
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.firstName} {e.lastName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.department}</TableCell>
                      <TableCell><StatusBadge status={e.status} /></TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(gross)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(net)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(e)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Aucun employé pour ce filtre.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => setSelected(o ? selected : null)}>
        {selected && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulletin — {selected.firstName} {selected.lastName}</DialogTitle>
            </DialogHeader>

            {(() => {
              const { gross, net, taxes } = payslipFor(selected)
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="muted">{selected.department}</Badge>
                    <StatusBadge status={selected.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Brut</p>
                        <p className="mt-1 text-lg font-bold">{formatCurrency(gross)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Charges (estimées)</p>
                        <p className="mt-1 text-lg font-bold text-amber-700">{formatCurrency(taxes)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Net</p>
                        <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(net)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Dans AI BOS, les bulletins sont générés via le backend HR/Payroll et stockés dans le module Documents.
                    Ici, c’est un rendu UI + mocks.
                  </div>
                </div>
              )
            })()}
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

