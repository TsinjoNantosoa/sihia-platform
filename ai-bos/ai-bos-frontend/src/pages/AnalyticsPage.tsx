import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAnalytics } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils';

const PERIODS = [
  { id: '3m', label: '3 mois' },
  { id: '6m', label: '6 mois' },
  { id: '12m', label: '12 mois' },
  { id: 'custom', label: 'Personnalisé' },
];

const PIE_COLORS = ['#4f46e5', '#0d9488', '#f59e0b', '#ec4899', '#3b82f6'];

export function AnalyticsPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState('12m');
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: getAnalytics });

  const kpis = analytics?.kpis || [];
  const revenue = analytics?.revenue || [];
  const users = analytics?.users || [];
  const conversion = analytics?.conversion || [];
  const churn = analytics?.churn || [];

  return (
    <div>
      <PageHeader
        title={t('nav.analytics')}
        description="Analysez vos métriques et performances"
        actions={
          <>
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              {PERIODS.map((p) => (
                <Button key={p.id} variant={period === p.id ? 'default' : 'ghost'} size="sm" onClick={() => setPeriod(p.id)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <Button variant="outline"><Download className="h-4 w-4" />CSV</Button>
            <Button variant="outline"><FileText className="h-4 w-4" />PDF</Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, i) => (
          <KpiCard
            key={i}
            label={kpi.label}
            value={kpi.unit === '€' ? formatCurrency(kpi.value) : kpi.unit === '%' ? formatPercent(kpi.value) : formatNumber(kpi.value)}
            change={kpi.change}
            icon={kpi.change >= 0 ? TrendingUp : TrendingDown}
            trend={kpi.change >= 0 ? 'up' : 'down'}
          />
        ))}
      </div>

      {/* Revenue chart */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Revenu vs Objectif</CardTitle>
          <Badge variant="success" className="gap-1"><TrendingUp className="h-3 w-3" />+12.5%</Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#rev)" name="Revenu" />
              <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Objectif" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Users + Conversion */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Utilisateurs</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={users}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar dataKey="active" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Actifs" />
                <Bar dataKey="new" fill="#0d9488" radius={[4, 4, 0, 0]} name="Nouveaux" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tunnel de conversion</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={conversion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {conversion.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Churn */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Taux de churn</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={churn}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
