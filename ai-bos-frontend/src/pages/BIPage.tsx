import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, LineChart, PieChart, AreaChart, Sparkles, Send, Clock, Play,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getBIReports } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatRelativeTime } from '@/lib/utils';

const CHART_ICONS: Record<string, React.ElementType> = {
  bar: BarChart3, line: LineChart, pie: PieChart, area: AreaChart,
};

export function BIPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: (string | number)[][] } | null>(null);
  const [querying, setQuerying] = useState(false);
  const { data: reports } = useQuery({ queryKey: ['bi-reports'], queryFn: getBIReports });

  const handleQuery = () => {
    if (!query.trim()) return;
    setQuerying(true);
    setTimeout(() => {
      setQueryResult({
        columns: ['Mois', 'Revenu', 'Croissance', 'Clients'],
        rows: [
          ['Jan', 180000, '+12%', 245],
          ['Fév', 195000, '+8%', 268],
          ['Mar', 212000, '+9%', 291],
          ['Avr', 228000, '+7%', 312],
          ['Mai', 241000, '+6%', 328],
        ],
      });
      setQuerying(false);
    }, 1500);
  };

  return (
    <div>
      <PageHeader title={t('nav.bi')} description="Business Intelligence et rapports" />

      {/* NL Query */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary-50/50 to-violet-50/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-ai">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold">Posez une question en langage naturel</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Quel est le revenu par mois pour 2024 ?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            />
            <Button onClick={handleQuery} disabled={querying}>
              {querying ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Interroger
            </Button>
          </div>
          {queryResult && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Résultats pour "{query}"</p>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {queryResult.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        {row.map((cell, j) => <td key={j} className="px-3 py-2">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report gallery */}
      <h3 className="mb-3 text-sm font-semibold">Rapports pré-construits</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(reports || []).map((report) => {
          const Icon = CHART_ICONS[report.chartType] || BarChart3;
          return (
            <Card key={report.id} className="group cursor-pointer transition-all hover:shadow-elevated">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="icon-sm"><Play className="h-4 w-4" /></Button>
                </div>
                <h4 className="mt-3 text-sm font-semibold">{report.name}</h4>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{report.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <Badge variant="muted" className="text-2xs">{report.category}</Badge>
                  <span className="text-2xs text-muted-foreground">Dernier run: {formatRelativeTime(report.lastRun)}</span>
                </div>
                {report.schedule && (
                  <div className="mt-2 flex items-center gap-1 text-2xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Planifié: {report.schedule}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
