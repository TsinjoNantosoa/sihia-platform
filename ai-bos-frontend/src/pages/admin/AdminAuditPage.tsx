import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldAlert, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getAuditLogs } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatRelativeTime } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'default', LOGOUT: 'muted', CREATE: 'success', UPDATE: 'warning', DELETE: 'danger', EXPORT: 'secondary', VIEW: 'muted',
};

export function AdminAuditPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const { data: logs } = useQuery({ queryKey: ['audit-logs'], queryFn: getAuditLogs });

  const filtered = (logs || []).filter((l) =>
    (!search || l.userName.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase())) &&
    (actionFilter === 'all' || l.action === actionFilter)
  );

  return (
    <div>
      <PageHeader title={t('nav.adminAudit')} description="Journal d'audit des actions" actions={<Button variant="outline"><Download className="h-4 w-4" />Exporter</Button>} />
      <Card className="mb-4">
        <CardContent className="flex gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="CREATE">Créer</SelectItem>
              <SelectItem value="UPDATE">Modifier</SelectItem>
              <SelectItem value="DELETE">Supprimer</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Horodatage</TableHead><TableHead>Utilisateur</TableHead><TableHead>Action</TableHead><TableHead>Ressource</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.slice(0, 20).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(log.timestamp)}</TableCell>
                  <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                  <TableCell><Badge variant={(ACTION_COLORS[log.action] as any) || 'muted'}>{log.action}</Badge></TableCell>
                  <TableCell className="text-sm">{log.resource}{log.resourceId && ` #${log.resourceId}`}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
