import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n/store'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { getEmployees } from '@/lib/api/services'
import type { Employee } from '@/lib/api/types'
import { formatCurrency, formatDate, initials } from '@/lib/utils'

export function HROrgChartPage() {
  const { t } = useI18n()
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: getEmployees })

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Employee | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    )
  }, [employees, query])

  const roots = useMemo(() => {
    const list = filtered.length ? filtered : employees
    return list.filter((e) => !e.managerId)
  }, [filtered, employees])

  const childrenByManager = useMemo(() => {
    const list = filtered.length ? filtered : employees
    const map = new Map<string, Employee[]>()
    for (const e of list) {
      if (e.managerId) {
        const cur = map.get(e.managerId) || []
        cur.push(e)
        map.set(e.managerId, cur)
      }
    }
    return map
  }, [filtered, employees])

  const renderNode = (emp: Employee) => {
    const children = childrenByManager.get(emp.id) || []
    const isSelected = selected?.id === emp.id
    return (
      <div key={emp.id} className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setSelected(emp)}
          className="w-[280px] max-w-full rounded-xl border border-border bg-card p-4 text-left shadow-soft hover:shadow-elevated transition-all"
          style={{
            outline: isSelected ? '2px solid rgba(79,70,229,0.5)' : 'none',
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10" style={{ backgroundColor: `${emp.avatarColor}20` }}>
              <AvatarFallback style={{ color: emp.avatarColor, backgroundColor: 'transparent' }} className="text-sm">
                {initials(`${emp.firstName} ${emp.lastName}`)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{emp.firstName} {emp.lastName}</p>
                <Badge variant={emp.status === 'active' ? 'success' : emp.status === 'on_leave' ? 'warning' : 'danger'} className="text-2xs">
                  {emp.status === 'on_leave' ? 'congé' : emp.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
              <p className="text-xs text-muted-foreground">{emp.department}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
            <span>Entrée : {formatDate(emp.startDate)}</span>
            {emp.location && <span>• {emp.location}</span>}
          </div>
        </button>

        {children.length > 0 && (
          <div className="mt-1 flex flex-wrap justify-center gap-4 px-2">
            {children.map((c) => renderNode(c))}
          </div>
        )}
      </div>
    )
  }

  const top = roots[0] || null

  return (
    <div>
      <PageHeader
        title={t('nav.orgChart')}
        description="Organigramme dynamique basé sur managerId (mock)."
        actions={
          <Button variant="outline" onClick={() => setSelected(null)}>
            Réinitialiser
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="Rechercher employé / département / poste…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filtered.length} résultat(s) — navigation hiérarchique simplifiée.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vue hiérarchique</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {top ? (
              <div className="flex justify-center overflow-x-auto scrollbar-thin">
                <div className="min-w-[420px]">{renderNode(top)}</div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Aucun organisigramme à afficher.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Détails</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              Cliquez sur un nœud.
            </div>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12" style={{ backgroundColor: `${selected.avatarColor}20` }}>
                    <AvatarFallback style={{ color: selected.avatarColor, backgroundColor: 'transparent' }} className="text-sm">
                      {initials(`${selected.firstName} ${selected.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{selected.firstName} {selected.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selected.position}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <Badge variant="muted">{selected.department}</Badge>
                </div>

                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{selected.email}</p>
                </div>

                {selected.phone && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{selected.phone}</p>
                  </div>
                )}

                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Salaire annuel (brut)</p>
                  <p className="font-medium">{selected.salary ? formatCurrency(selected.salary) : '—'}</p>
                </div>

                <div className="pt-2 text-xs text-muted-foreground">
                  Prochain pas : connecter au backend HR (employés, organigramme, mutations).
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun employé sélectionné.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

