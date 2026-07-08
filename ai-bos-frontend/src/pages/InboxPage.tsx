import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNotifications } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatRelativeTime } from '@/lib/utils';

const ICONS: Record<string, React.ElementType> = {
  success: CheckCircle2, warning: AlertTriangle, error: AlertCircle, info: Info,
};
const COLORS: Record<string, string> = {
  success: 'text-emerald-500', warning: 'text-amber-500', error: 'text-red-500', info: 'text-blue-500',
};

export function InboxPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });

  const filtered = (notifications || []).filter((n) => filter === 'all' || !n.read);
  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader title={t('nav.inbox')} description={`${unreadCount} notifications non lues`} actions={<Button variant="outline"><Check className="h-4 w-4" />Tout marquer comme lu</Button>} />
      <div className="mb-4 flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Toutes</Button>
        <Button variant={filter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('unread')}>Non lues ({unreadCount})</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <div key={n.id} className={cn('flex items-start gap-3 p-4 transition-colors hover:bg-muted/30', !n.read && 'bg-primary-50/20')}>
                  <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', COLORS[n.type])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {n.link && <Button variant="ghost" size="sm">Voir</Button>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
