import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Sparkles, TrendingUp, Brain, Clock, Target } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getForecast } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils';

const HORIZONS = [
  { id: '7d' as const, label: '7 jours' },
  { id: '30d' as const, label: '30 jours' },
  { id: '90d' as const, label: '90 jours' },
];

export function ForecastsPage() {
  const { t } = useI18n();
  const [horizon, setHorizon] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: forecast } = useQuery({ queryKey: ['forecast', horizon], queryFn: () => getForecast(horizon) });

  const chartData = (forecast?.data || []).map((d) => ({
    date: d.date,
    actual: d.actual,
    forecast: d.forecast,
    lower: d.lower,
    upper: d.upper,
  }));

  return (
    <div>
      <PageHeader
        title={t('nav.forecasts')}
        description="Prévisions par machine learning"
        actions={
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            {HORIZONS.map((h) => (
              <Button key={h.id} variant={horizon === h.id ? 'default' : 'ghost'} size="sm" onClick={() => setHorizon(h.id)}>
                {h.label}
              </Button>
            ))}
          </div>
        }
      />

      {/* Forecast chart */}
      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Prévision du revenu — {horizon}</CardTitle>
          <Badge variant="success" className="gap-1"><TrendingUp className="h-3 w-3" />Confiance {forecast?.model.confidence}%</Badge>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGrad)" name="Limite sup." />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" name="Limite inf." />
              <Area type="monotone" dataKey="forecast" stroke="#4f46e5" strokeWidth={2.5} fill="url(#forecastGrad)" name="Prévision" />
              <Area type="monotone" dataKey="actual" stroke="#0d9488" strokeWidth={2.5} fill="none" name="Réel" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Model metadata */}
        {forecast && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Métadonnées du modèle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Modèle</p>
                  <p className="text-sm font-semibold">{forecast.model.name}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-sm font-semibold">{forecast.model.version}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">MAE</p>
                  <p className="text-sm font-semibold">{forecast.model.mae}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Confiance</p>
                  <p className="text-sm font-semibold text-emerald-600">{forecast.model.confidence}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-3">
                <Clock className="h-4 w-4" />
                Dernier entraînement: {formatRelativeTime(forecast.model.lastTrained)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {forecast && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary-50/50 to-violet-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-ai">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                Recommandations IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecast.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <p className="text-sm text-foreground">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
