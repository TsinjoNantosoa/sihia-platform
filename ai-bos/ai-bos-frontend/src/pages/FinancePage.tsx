import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Wallet, TrendingDown, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KpiCard } from '@/components/shared/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/store';
import { getFinanceOverview } from '@/lib/api/services';
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils';

export function FinancePage() {
  const { t } = useI18n();
  const { data: finance, isLoading } = useQuery({ queryKey: ['finance-overview'], queryFn: getFinanceOverview });

  const cashFlowData = (finance?.monthlyRevenue || []).map((d) => ({
    month: d.month,
    income: d.revenue,
    expense: d.expenses,
  }));

  const agingData = finance?.agingReceivables || [];
  const AGING_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

  return (
    <div>
      <PageHeader
        title={t('nav.financeOverview')}
        description="Vue d'ensemble financière de votre entreprise"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Trésorerie" value={formatCurrency(finance?.cashBalance || 0)} change={3.1} icon={Wallet} trend="up" />
        <KpiCard label="Créances (AR)" value={formatCurrency(finance?.arOutstanding || 0)} change={-5.2} icon={TrendingUp} trend="down" />
        <KpiCard label="Dettes (AP)" value={formatCurrency(finance?.apOutstanding || 0)} change={2.8} icon={TrendingDown} trend="up" />
        <KpiCard label="Burn rate" value={formatCurrency(finance?.burnRate || 0)} change={-1.5} icon={AlertTriangle} trend="down" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Cash flow */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Flux de trésorerie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenus" />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Aging receivables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Créances par âge</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={agingData} dataKey="amount" nameKey="bucket" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {agingData.map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {agingData.map((item, i) => (
                <div key={item.bucket} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AGING_COLORS[i] }} />
                    <span className="text-muted-foreground">{item.bucket}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Alert */}
      <Card className="mt-6 border-amber-200 bg-amber-50/30">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Alerte IA — Dépense inhabituelle</p>
              <Badge variant="warning" className="text-2xs">Anomalie</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Une dépense de <span className="font-semibold text-foreground">3 450 €</span> a été détectée dans la catégorie
              "Marketing ads", soit <span className="font-semibold text-foreground">+280%</span> vs la moyenne mensuelle.
            </p>
          </div>
          <Button variant="outline" size="sm">Analyser</Button>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Transactions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {(finance?.recentTransactions || []).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  )}>
                    {tx.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.category} • {tx.account}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-semibold', tx.type === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
