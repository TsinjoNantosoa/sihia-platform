import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, MapPin, Clock, CheckCircle2, Circle, Sparkles, Mic } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getMeetings } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatDate, initials } from '@/lib/utils';

export function MeetingsPage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: meetings } = useQuery({ queryKey: ['meetings'], queryFn: getMeetings });

  const selected = (meetings || []).find((m) => m.id === selectedId) || (meetings || [])[0];

  return (
    <div>
      <PageHeader
        title={t('nav.meetings')}
        description="Vos réunions passées et à venir"
        actions={<Button><Video className="h-4 w-4" />Nouvelle réunion</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Meeting list */}
        <div className="space-y-2">
          {(meetings || []).map((m) => (
            <Card
              key={m.id}
              className={cn('cursor-pointer transition-all hover:shadow-elevated', selected?.id === m.id && 'border-primary')}
              onClick={() => setSelectedId(m.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {m.attendees.slice(0, 3).map((a, i) => (
                      <Avatar key={i} className="h-6 w-6 border-2 border-card" style={{ backgroundColor: `${a.avatarColor}20` }}>
                        <AvatarFallback style={{ color: a.avatarColor, backgroundColor: 'transparent' }} className="text-2xs">
                          {initials(a.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{m.attendees.length} participants</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Meeting detail */}
        <div className="lg:col-span-2">
          {selected && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selected.title}</CardTitle>
                    <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{selected.duration} min</span>
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{selected.location}</span>
                      <span>{formatDate(selected.date)}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm"><Mic className="h-4 w-4" />Enregistrer</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Attendees */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Participants</h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.attendees.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2">
                        <Avatar className="h-7 w-7" style={{ backgroundColor: `${a.avatarColor}20` }}>
                          <AvatarFallback style={{ color: a.avatarColor, backgroundColor: 'transparent' }} className="text-2xs">
                            {initials(a.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agenda */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Ordre du jour</h4>
                  <ul className="space-y-1.5">
                    {selected.agenda.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AI Summary */}
                {selected.summary && (
                  <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary-50/50 to-violet-50/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-ai">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h4 className="text-sm font-semibold">Résumé IA</h4>
                      <Badge variant="default" className="text-2xs">Auto-généré</Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{selected.summary}</p>
                  </div>
                )}

                {/* Action items */}
                {selected.actionItems.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Actions à suivre</h4>
                    <div className="space-y-2">
                      {selected.actionItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                          {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                          <span className={cn('text-sm flex-1', item.done && 'line-through text-muted-foreground')}>{item.text}</span>
                          <Badge variant="muted" className="text-2xs">{item.assignee}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
