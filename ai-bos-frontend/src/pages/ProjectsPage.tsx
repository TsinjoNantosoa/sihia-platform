import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Users, CheckCircle2, Circle, DollarSign } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getProjects } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';

export function ProjectsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  return (
    <div>
      <PageHeader
        title={t('nav.projects')}
        description="Gérez vos projets et suivez leur avancement"
        actions={<Button><Plus className="h-4 w-4" />{t('common.create')}</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects || []).map((p) => (
          <Card key={p.id} className="group cursor-pointer transition-all hover:shadow-elevated" onClick={() => navigate(`/app/projects/${p.id}`)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.description}</p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">{p.progress}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, backgroundColor: p.color }} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {p.teamMembers.slice(0, 4).map((m, i) => (
                    <Avatar key={i} className="h-7 w-7 border-2 border-card" style={{ backgroundColor: `${m.avatarColor}20` }}>
                      <AvatarFallback style={{ color: m.avatarColor, backgroundColor: 'transparent' }} className="text-2xs">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {p.teamMembers.length > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-2xs font-medium">
                      +{p.teamMembers.length - 4}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {p.completedTasks}/{p.taskCount}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(p.endDate)}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(p.spent)} / {formatCurrency(p.budget)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {isLoading && [1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
