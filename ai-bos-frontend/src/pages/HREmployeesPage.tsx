import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Mail, Phone, MapPin, Briefcase, Network } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getEmployees } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, initials, formatDate } from '@/lib/utils';

export function HREmployeesPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  const filtered = (employees || []).filter((e) =>
    !search || `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title={t('nav.employees')}
        description="Annuaire des employés et organigramme"
        actions={<Button><Plus className="h-4 w-4" />Nouvel employé</Button>}
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Annuaire</TabsTrigger>
          <TabsTrigger value="orgchart">Organigramme</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <div className="mb-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher un employé..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((emp) => (
              <Card key={emp.id} className="transition-all hover:shadow-elevated">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12" style={{ backgroundColor: `${emp.avatarColor}20` }}>
                      <AvatarFallback style={{ color: emp.avatarColor, backgroundColor: 'transparent' }} className="text-sm font-medium">
                        {initials(`${emp.firstName} ${emp.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />{emp.department}</div>
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{emp.email}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{emp.location}</div>
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{emp.phone}</div>
                  </div>
                  <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                    Entré le {formatDate(emp.startDate)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orgchart">
          <Card>
            <CardContent className="p-6">
              <OrgChart employees={employees || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrgChart({ employees }: { employees: any[] }) {
  const ceo = employees.find((e) => !e.managerId);
  if (!ceo) return <p className="text-sm text-muted-foreground">Aucune donnée d'organigramme</p>;

  const getReports = (managerId: string) => employees.filter((e) => e.managerId === managerId);

  const renderNode = (emp: any, level: number = 0) => {
    const reports = getReports(emp.id);
    return (
      <div key={emp.id} className="flex flex-col items-center">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-soft">
          <Avatar className="h-9 w-9" style={{ backgroundColor: `${emp.avatarColor}20` }}>
            <AvatarFallback style={{ color: emp.avatarColor, backgroundColor: 'transparent' }} className="text-2xs">
              {initials(`${emp.firstName} ${emp.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
            <p className="text-xs text-muted-foreground">{emp.position}</p>
          </div>
        </div>
        {reports.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {reports.map((r) => renderNode(r, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="flex justify-center overflow-x-auto scrollbar-thin">{renderNode(ceo)}</div>;
}
