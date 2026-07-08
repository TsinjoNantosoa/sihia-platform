import { useQuery } from '@tanstack/react-query';
import {
  Crown, TrendingUp, Wallet, Megaphone, Scale, Users, BarChart3,
  KanbanSquare, LifeBuoy, Video, ShieldCheck, Plus, Activity, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getAgents } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatRelativeTime } from '@/lib/utils';

const AGENT_ICONS: Record<string, React.ElementType> = {
  Crown, TrendingUp, Wallet, Megaphone, Scale, Users, BarChart3,
  KanbanSquare, LifeBuoy, Video, ShieldCheck,
};

const AGENT_COLORS: Record<string, string> = {
  Executive: 'from-indigo-500 to-violet-500',
  Sales: 'from-emerald-500 to-teal-500',
  Finance: 'from-amber-500 to-orange-500',
  Marketing: 'from-pink-500 to-rose-500',
  Legal: 'from-slate-600 to-slate-800',
  HR: 'from-blue-500 to-cyan-500',
  Analytics: 'from-violet-500 to-purple-500',
  Projects: 'from-teal-500 to-cyan-500',
  Support: 'from-red-500 to-orange-500',
  Meetings: 'from-purple-500 to-pink-500',
  Compliance: 'from-green-500 to-emerald-500',
};

export function AgentsPage() {
  const { t } = useI18n();
  const { data: agents } = useQuery({ queryKey: ['agents'], queryFn: getAgents });

  return (
    <div>
      <PageHeader
        title={t('nav.agents')}
        description="Galerie d'agents IA pour automatiser vos tâches"
        actions={<Button><Plus className="h-4 w-4" />Créer un agent</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(agents || []).map((agent) => {
          const Icon = AGENT_ICONS[agent.icon] || Bot;
          const gradient = AGENT_COLORS[agent.category] || 'from-primary to-violet-500';
          return (
            <Card key={agent.id} className="group cursor-pointer transition-all hover:shadow-elevated">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white', gradient)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <StatusBadge status={agent.status} />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{agent.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{agent.toolsCount} outils</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{agent.lastUsed ? formatRelativeTime(agent.lastUsed) : 'Jamais'}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="muted" className="text-2xs">{agent.conversations} conversations</Badge>
                  <Button variant="outline" size="sm" className="text-xs">Configurer</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { Bot } from 'lucide-react';
