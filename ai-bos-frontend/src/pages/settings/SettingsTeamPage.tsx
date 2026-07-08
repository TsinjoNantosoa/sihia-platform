import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useI18n } from '@/lib/i18n/store';
import { useState } from 'react';
import { Plus, Search, MoreHorizontal, UserPlus } from 'lucide-react';
import { initials } from '@/lib/utils';

const TEAM = [
  { id: '1', name: 'Jean Bernard', email: 'ceo@demo.aibos.io', role: 'owner', status: 'active' },
  { id: '2', name: 'Sophie Martin', email: 'sales@demo.aibos.io', role: 'sales_manager', status: 'active' },
  { id: '3', name: 'Pierre Dubois', email: 'finance@demo.aibos.io', role: 'finance_manager', status: 'active' },
  { id: '4', name: 'Marie Lefevre', email: 'hr@demo.aibos.io', role: 'hr_manager', status: 'active' },
  { id: '5', name: 'Lucas Thomas', email: 'staff@demo.aibos.io', role: 'staff', status: 'active' },
  { id: '6', name: 'Claire Martin', email: 'claire@acme.com', role: 'viewer', status: 'on_leave' },
  { id: '7', name: 'Thomas Petit', email: 'thomas@acme.com', role: 'project_manager', status: 'active' },
];

export function SettingsTeamPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const filtered = TEAM.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t('nav.settingsTeam')} description="Gérez les membres et rôles" actions={<Button onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" />Inviter</Button>} />
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Membre</TableHead><TableHead>Rôle</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary-100 text-xs text-primary-700">{initials(m.name)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="muted" className="capitalize">{m.role.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inviter un membre</DialogTitle><DialogDescription>Envoyez une invitation par email</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="collegue@entreprise.com" /></div>
            <div className="space-y-2"><Label>Rôle</Label><Select defaultValue="staff"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="sales_manager">Sales Manager</SelectItem><SelectItem value="finance_manager">Finance Manager</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setInviteOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => setInviteOpen(false)}>{t('common.send')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
