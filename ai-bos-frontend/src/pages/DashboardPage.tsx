import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Wallet, TrendingUp, Users, LifeBuoy, DollarSign, UserCircle,
  Sparkles, FileText, KanbanSquare, CheckSquare,
  ArrowRight, Phone, Mail, Calendar, FileCheck, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/store';
import { getFinanceOverview, getLeads, getActivities, getTickets, getEmployees } from '@/lib/api/services';
import { formatCurrency, formatNumber, formatRelativeTime, cn } from '@/lib/utils';

export function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: finance } = useQuery({ queryKey: ['finance-overview'], queryFn: getFinanceOverview });
  const { data: leads } = useQuery({ queryKey: ['leads'], queryFn: getLeads });
  const { data: activities } = useQuery({ queryKey: ['activities'], queryFn: getActivities });
  const { data: tickets } = useQuery({ queryKey: ['tickets'], queryFn: getTickets });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  const pipelineValue = (leads || []).reduce((sum, l) => l.stage !== 'lost' && l.stage !== 'won' ? sum + l.value : sum, 0);
  const openTickets = (tickets || []).filter((t) => t.status === 'open' || t.status === 'pending').length;
  const activeEmployees = (employees || []).filter((e) => e.status === 'active').length;

  const revenueData = (finance?.monthlyRevenue || []).map((d) => ({
    month: d.month,
    revenue: d.revenue,
    expenses: d.expenses,
  }));

  const funnelData = [
    { name: 'Nouveaux', value: 12, fill: '#4f46e5' },
    { name: 'Qualifiés', value: 8, fill: '#6366f1' },
    { name: 'Proposition', value: 5, fill: '#818cf8' },
    { name: 'Négociation', value: 3, fill: '#a5b4fc' },
    { name: 'Gagnés', value: 2, fill: '#0d9488' },
  ];

  const quickActions = [
    { label: t('dashboard.newInvoice'), icon: FileText, path: '/app/finance/invoices', color: 'bg-primary' },
    { label: t('dashboard.newLead'), icon: KanbanSquare, path: '/app/crm/pipeline', color: 'bg-secondary' },
    { label: t('dashboard.newTask'), icon: CheckSquare, path: '/app/tasks', color: 'bg-amber-500' },
    { label: t('dashboard.askAI'), icon: Sparkles, path: '/app/copilot', color: 'bg-violet-500' },
  ];

  const activityIcons: Record<string, React.ElementType> = {
    call: Phone, email: Mail, meeting: Calendar, note: FileCheck, task: CheckSquare,
  };

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description="Vue d'ensemble de votre activité"
        actions={
          <Button onClick={() => navigate('/app/copilot')}>
            <Sparkles className="h-4 w-4" />
            {t('dashboard.askAI')}
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={t('dashboard.revenueMtd')} value={formatCurrency(284500)} change={12.5} icon={DollarSign} trend="up" />
        <KpiCard label={t('dashboard.pipelineValue')} value={formatCurrency(pipelineValue)} change={8.3} icon={TrendingUp} trend="up" />
        <KpiCard label={t('dashboard.activeCustomers')} value={formatNumber(342)} change={5.2} icon={Users} trend="up" />
        <KpiCard label={t('dashboard.openTickets')} value={formatNumber(openTickets)} change={-15} icon={LifeBuoy} trend="down" />
        <KpiCard label={t('dashboard.cashPosition')} value={formatCurrency(finance?.cashBalance || 0)} change={3.1} icon={Wallet} trend="up" />
        <KpiCard label={t('dashboard.teamHeadcount')} value={formatNumber(activeEmployees)} change={2} icon={UserCircle} trend="up" />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.revenueChart')}</CardTitle>
            <Badge variant="success" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              +12.5%
            </Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revGrad)" />
                <Area type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.pipelineFunnel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                  formatter={(v) => [`${v} deals`, 'Pipeline']}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insight + Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* AI Insight */}
        <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-primary-50/50 to-violet-50/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-ai">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{t('dashboard.aiInsight')}</p>
                  <Badge variant="default" className="text-2xs">IA</Badge>
                </div>
                <p className="mt-1.5 text-sm text-foreground">
                  3 clients n'ont pas payé leurs factures depuis plus de 30 jours, totalisant{' '}
                  <span className="font-semibold">45 200 €</span>. Je recommande de relancer ces clients en priorité.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="default" onClick={() => navigate('/app/finance/invoices')}>
                    Voir les factures
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/app/copilot')}>
                    Analyser avec l'IA
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-soft"
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-110', action.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Activity feed + Upcoming */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.recentActivity')}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">Voir tout</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {(activities || []).slice(0, 8).map((act, i) => {
                const Icon = activityIcons[act.type] || FileCheck;
                return (
                  <div key={act.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      act.type === 'call' && 'bg-blue-50 text-blue-600',
                      act.type === 'email' && 'bg-violet-50 text-violet-600',
                      act.type === 'meeting' && 'bg-amber-50 text-amber-600',
                      act.type === 'note' && 'bg-slate-50 text-slate-600',
                      act.type === 'task' && 'bg-emerald-50 text-emerald-600',
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{act.description}</p>
                      <p className="text-xs text-muted-foreground">{act.userName} • {formatRelativeTime(act.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming tasks & meetings */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.upcomingTasks')}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/app/tasks')}>Voir tout</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { title: 'Préparer présentation Q4', due: 'Aujourd\'hui', priority: 'high', assignee: 'Sophie Martin' },
                { title: 'Réviser contrat TechSolutions', due: 'Demain', priority: 'urgent', assignee: 'Pierre Dubois' },
                { title: 'Formation équipe CRM', due: 'Dans 3 jours', priority: 'medium', assignee: 'Marie Lefevre' },
                { title: 'Audit sécurité mensuel', due: 'Dans 5 jours', priority: 'low', assignee: 'Lucas Thomas' },
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                  <div className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    task.priority === 'urgent' && 'bg-red-500',
                    task.priority === 'high' && 'bg-amber-500',
                    task.priority === 'medium' && 'bg-blue-500',
                    task.priority === 'low' && 'bg-slate-400',
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.assignee}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {task.due}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
