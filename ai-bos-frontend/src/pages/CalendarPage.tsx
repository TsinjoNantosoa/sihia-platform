import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEvents } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function CalendarPage() {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: getEvents });

  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const daysArray: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) daysArray.push(null);
    for (let i = 1; i <= totalDays; i++) daysArray.push(new Date(year, month, i));
    while (daysArray.length % 7 !== 0) daysArray.push(null);
    return daysArray;
  }, [currentDate]);

  const getEventsForDay = (date: Date) => {
    if (!events) return [];
    return events.filter((e) => {
      const eventDate = new Date(e.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const today = new Date();

  return (
    <div>
      <PageHeader
        title={t('nav.calendar')}
        description="Planifiez vos événements et réunions"
        actions={
          <>
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              {(['month', 'week', 'day'] as const).map((v) => (
                <Button key={v} variant={view === v ? 'default' : 'ghost'} size="sm" onClick={() => setView(v)}>
                  {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
                </Button>
              ))}
            </div>
            <Button><Plus className="h-4 w-4" />Nouvel événement</Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Aujourd'hui</Button>
              <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {days.map((date, i) => {
              if (!date) return <div key={i} className="min-h-[80px] rounded-lg" />;
              const dayEvents = getEventsForDay(date);
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[80px] rounded-lg border p-1.5 transition-colors hover:bg-muted/30',
                    isToday ? 'border-primary bg-primary-50/30' : 'border-border'
                  )}
                >
                  <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-2xs font-medium truncate"
                        style={{ backgroundColor: `${e.color}15`, color: e.color }}
                      >
                        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-2xs text-muted-foreground pl-1">+{dayEvents.length - 3} autres</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
