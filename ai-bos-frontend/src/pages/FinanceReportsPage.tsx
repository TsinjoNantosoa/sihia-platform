import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  FileText,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  Clock,
  Play,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n/store'
import { cn, formatRelativeTime, formatDate } from '@/lib/utils'
import { getBIReports } from '@/lib/api/services'
import type { BIReport } from '@/lib/api/types'

const CHART_ICONS: Record<string, React.ElementType> = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: AreaChart,
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportReportsCSV(reports: BIReport[]) {
  const header = ['id', 'name', 'category', 'chartType', 'lastRun', 'schedule']
  const lines = reports.map((r) => [
    r.id,
    r.name.replace(/"/g, '""'),
    r.category,
    r.chartType,
    r.lastRun,
    r.schedule || '',
  ])
  const csv = [header.join(','), ...lines.map((cells) => cells.map((c) => `"${c}"`).join(','))].join('\n')
  downloadTextFile('finance-reports.csv', csv, 'text/csv')
}

export function FinanceReportsPage() {
  const { t } = useI18n()
  const { data: reports } = useQuery({ queryKey: ['bi-reports'], queryFn: getBIReports })

  const allReports = reports || []
  const categories = useMemo(() => {
    const set = new Set<string>()
    allReports.forEach((r) => set.add(r.category))
    return ['all', ...Array.from(set)]
  }, [allReports])

  const [category, setCategory] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<BIReport | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allReports.filter((r) => {
      const matchCat = category === 'all' ? true : r.category === category
      const matchQ = !q ? true : (r.name + ' ' + r.description).toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [allReports, category, query])

  return (
    <div>
      <PageHeader
        title={t('nav.reports')}
        description="Galerie de rapports finance + exports (mock)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => exportReportsCSV(filtered)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => {
              downloadTextFile(
                'finance-reports.pdf',
                filtered.map((r) => `- ${r.name} (${r.category}) — ${r.chartType}`).join('\n'),
                'application/pdf',
              )
            }}>
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un rapport..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === 'all' ? 'Toutes' : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((report) => {
          const Icon = CHART_ICONS[report.chartType] || BarChart3
          return (
            <Card key={report.id} className="group cursor-pointer transition-all hover:shadow-elevated" onClick={() => setSelected(report)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      exportReportsCSV([report])
                    }}
                    title="Exporter"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="mt-3 text-sm font-semibold">{report.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{report.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Badge variant="muted" className="text-2xs">{report.category}</Badge>
                  <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Dernier run: {formatRelativeTime(report.lastRun)}
                  </span>
                  {report.schedule && (
                    <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                      <Play className="h-3 w-3" />
                      Planifié: {report.schedule}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Aucun rapport ne correspond au filtre.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => setSelected(o ? selected : null)}>
        {selected && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="muted">{selected.category}</Badge>
                <Badge variant="outline">{selected.chartType}</Badge>
                <Badge variant="success">Dernier run {formatRelativeTime(selected.lastRun)}</Badge>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Métadonnées</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Champ</TableHead>
                        <TableHead>Valeur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ['ID', selected.id],
                        ['Catégorie', selected.category],
                        ['Type de chart', selected.chartType],
                        ['Dernier run', selected.lastRun],
                        ['Schedule', selected.schedule || '—'],
                      ].map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell className="font-medium">{k}</TableCell>
                          <TableCell>{v}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="text-sm text-muted-foreground">
                Dans une version connectée au backend, ce panneau afficherait la visualisation et les exports générés côté serveur.
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

