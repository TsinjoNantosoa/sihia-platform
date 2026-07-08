import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Play, Zap, Mail, Webhook, Database, Bot, CheckSquare,
  GitBranch, Clock, Activity, Settings, Power,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getWorkflows } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatRelativeTime } from '@/lib/utils';

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  'Lead créé': Zap, 'Facture en retard': Mail, 'Employé ajouté': CheckSquare,
  'Planification hebdo': Clock, 'Stock bas': Activity, 'Webhook': Webhook, 'Record created': Database,
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  'Envoyer email': Mail, 'Créer tâche': CheckSquare, 'Notifier Slack': Zap,
  'Mettre à jour CRM': Database, 'Run AI agent': Bot, 'Call API': Webhook,
};

export function WorkflowsPage() {
  const { t } = useI18n();
  const { data: workflows } = useQuery({ queryKey: ['workflows'], queryFn: getWorkflows });

  return (
    <div>
      <PageHeader
        title={t('nav.workflows')}
        description="Automatisez vos processus métier"
        actions={<Button><Plus className="h-4 w-4" />Nouveau workflow</Button>}
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Workflows</TabsTrigger>
          <TabsTrigger value="builder">Constructeur visuel</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {/* Workflow list */}
        <TabsContent value="list">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(workflows || []).map((wf) => (
              <Card key={wf.id} className="transition-all hover:shadow-elevated">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{wf.name}</h3>
                      <p className="text-xs text-muted-foreground">{wf.description}</p>
                    </div>
                    <StatusBadge status={wf.status} />
                  </div>

                  {/* Flow visualization */}
                  <div className="mt-4 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 shrink-0">
                      <Zap className="h-3.5 w-3.5" />
                      {wf.trigger}
                    </div>
                    <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
                    {wf.actions.map((action, i) => {
                      const Icon = ACTION_ICONS[action] || CheckSquare;
                      return (
                        <div key={i} className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                          {action}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{wf.runCount} exécutions</span>
                      <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{wf.successRate}% succès</span>
                      {wf.lastRun && <span>{formatRelativeTime(wf.lastRun)}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm"><Settings className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm"><Power className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm"><Play className="h-3.5 w-3.5" />Exécuter</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Visual builder */}
        <TabsContent value="builder">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Constructeur de workflow</h3>
                <Button size="sm"><Play className="h-4 w-4" />Tester</Button>
              </div>
              {/* Canvas */}
              <div className="relative min-h-[400px] rounded-xl border-2 border-dashed border-border bg-muted/20 p-8">
                <div className="flex items-center justify-center gap-8">
                  {/* Trigger node */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-soft">
                      <Zap className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-medium">Déclencheur</span>
                    <span className="text-2xs text-muted-foreground">Lead créé</span>
                  </div>

                  {/* Connection line */}
                  <div className="h-0.5 w-16 bg-border" />

                  {/* Condition node */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-soft">
                      <GitBranch className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-medium">Condition</span>
                    <span className="text-2xs text-muted-foreground">Valeur &gt; 10k€</span>
                  </div>

                  <div className="h-0.5 w-16 bg-border" />

                  {/* Action node */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary shadow-soft">
                      <Mail className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-medium">Action</span>
                    <span className="text-2xs text-muted-foreground">Envoyer email</span>
                  </div>

                  <div className="h-0.5 w-16 bg-border" />

                  {/* AI node */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-ai text-white shadow-soft">
                      <Bot className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-medium">Agent IA</span>
                    <span className="text-2xs text-muted-foreground">Sales Agent</span>
                  </div>
                </div>

                {/* Node palette */}
                <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-4">
                  <span className="text-xs font-medium text-muted-foreground mr-2">Ajouter un nœud:</span>
                  {[
                    { icon: Zap, label: 'Déclencheur', color: 'bg-amber-50 text-amber-600' },
                    { icon: GitBranch, label: 'Condition', color: 'bg-violet-50 text-violet-600' },
                    { icon: Mail, label: 'Email', color: 'bg-primary-50 text-primary' },
                    { icon: Bot, label: 'Agent IA', color: 'bg-emerald-50 text-emerald-600' },
                    { icon: CheckSquare, label: 'Tâche', color: 'bg-blue-50 text-blue-600' },
                    { icon: Webhook, label: 'API', color: 'bg-pink-50 text-pink-600' },
                  ].map((node) => (
                    <button key={node.label} className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:shadow-soft', node.color)}>
                      <node.icon className="h-3.5 w-3.5" />
                      {node.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution history */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Résultat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(workflows || []).flatMap((wf) =>
                    Array.from({ length: 3 }, (_, i) => ({ wf, i }))
                  ).slice(0, 12).map(({ wf, i }, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{wf.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(new Date(Date.now() - idx * 3600000).toISOString())}</TableCell>
                      <TableCell><StatusBadge status={i === 0 ? 'done' : i === 1 ? 'done' : 'error'} /></TableCell>
                      <TableCell className="text-sm">{(i + 1) * 1.2}s</TableCell>
                      <TableCell className="text-sm">{i === 2 ? 'Échec: API timeout' : 'Succès'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
