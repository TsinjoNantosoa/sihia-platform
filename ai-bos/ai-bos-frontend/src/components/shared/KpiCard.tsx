import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  trend = 'up',
  format = 'number',
}: {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'currency' | 'percent';
}) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-elevated">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                    isPositive && 'bg-emerald-100 text-emerald-700',
                    isNegative && 'bg-red-100 text-red-700',
                    trend === 'neutral' && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isPositive && <ArrowUpRight className="h-3 w-3" />}
                  {isNegative && <ArrowDownRight className="h-3 w-3" />}
                  {change > 0 ? '+' : ''}{change}%
                </span>
                <span className="text-xs text-muted-foreground">vs mois dernier</span>
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
