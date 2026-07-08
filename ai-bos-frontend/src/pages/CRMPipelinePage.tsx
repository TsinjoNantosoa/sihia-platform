import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Filter, Calendar, MoreHorizontal, GripVertical,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n/store';
import { getLeads } from '@/lib/api/services';
import type { Lead, LeadStage } from '@/lib/api/types';
import { cn, formatCurrency, initials } from '@/lib/utils';

const STAGES: { id: LeadStage; label: string; color: string; bg: string }[] = [
  { id: 'new', label: 'Nouveaux', color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'qualified', label: 'Qualifiés', color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: 'proposal', label: 'Proposition', color: 'text-violet-600', bg: 'bg-violet-100' },
  { id: 'negotiation', label: 'Négociation', color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: 'won', label: 'Gagnés', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { id: 'lost', label: 'Perdus', color: 'text-red-600', bg: 'bg-red-100' },
];

export function CRMPipelinePage() {
  const { t } = useI18n();
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[] | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: getLeads,
  });

  const displayLeads = localLeads || leads || [];
  const owners = Array.from(new Set(displayLeads.map((l) => l.ownerName)));

  const filteredLeads = displayLeads.filter((l) => ownerFilter === 'all' || l.ownerName === ownerFilter);

  const getLeadsByStage = (stage: LeadStage) => filteredLeads.filter((l) => l.stage === stage);
  const getStageValue = (stage: LeadStage) => getLeadsByStage(stage).reduce((sum, l) => sum + l.value, 0);

  const handleDrop = (stage: LeadStage) => {
    if (!draggedLead) return;
    setLocalLeads((prev) => {
      const base = prev || leads || [];
      return base.map((l) => l.id === draggedLead ? { ...l, stage } : l);
    });
    setDraggedLead(null);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.crmPipeline')}
        description="Suivez vos opportunités commerciales"
        actions={
          <>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button>
              <Plus className="h-4 w-4" />
              {t('common.create')}
            </Button>
          </>
        }
      />

      {/* Summary bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          {STAGES.map((stage) => {
            const count = getLeadsByStage(stage.id).length;
            const value = getStageValue(stage.id);
            return (
              <div key={stage.id} className="flex items-center gap-2">
                <div className={cn('h-2.5 w-2.5 rounded-full', stage.bg)} />
                <div>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                  <p className="text-sm font-semibold">{count} • {formatCurrency(value)}</p>
                </div>
              </div>
            );
          })}
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Total pipeline</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(filteredLeads.filter((l) => l.stage !== 'won' && l.stage !== 'lost').reduce((s, l) => s + l.value, 0))}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-4">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div
              key={stage.id}
              className="w-72 shrink-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2.5 w-2.5 rounded-full', stage.bg)} />
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                  <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatCurrency(getStageValue(stage.id))}
                </span>
              </div>

              {/* Column body */}
              <div
                className="min-h-[200px] space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-2 transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-primary/5'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('bg-primary/5')}
                onDrop={(e) => { e.currentTarget.classList.remove('bg-primary/5'); handleDrop(stage.id); }}
              >
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      draggable
                      onDragStart={() => setDraggedLead(lead.id)}
                      onDragEnd={() => setDraggedLead(null)}
                      className={cn(
                        'group cursor-grab rounded-lg border border-border bg-card p-3 shadow-soft transition-all hover:shadow-elevated active:cursor-grabbing',
                        draggedLead === lead.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lead.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">{formatCurrency(lead.value)}</span>
                        <Badge variant="muted" className="text-2xs">{lead.probability}%</Badge>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6" style={{ backgroundColor: `${lead.ownerAvatarColor}20` }}>
                            <AvatarFallback style={{ color: lead.ownerAvatarColor, backgroundColor: 'transparent' }} className="text-2xs">
                              {initials(lead.ownerName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{lead.ownerName.split(' ')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {lead.daysInStage}j
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}

                {stageLeads.length === 0 && !isLoading && (
                  <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                    Glissez les deals ici
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
