import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Users, MapPin, Calendar, Award } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { getJobOpenings, getCandidates } from '@/lib/api/services';
import type { Candidate } from '@/lib/api/types';
import { useI18n } from '@/lib/i18n/store';
import { cn, initials, formatDate } from '@/lib/utils';

const STAGES: { id: Candidate['stage']; label: string; bg: string }[] = [
  { id: 'applied', label: 'Candidatures', bg: 'bg-slate-100' },
  { id: 'screening', label: 'Pré-sélection', bg: 'bg-blue-100' },
  { id: 'interview', label: 'Entretien', bg: 'bg-amber-100' },
  { id: 'offer', label: 'Offre', bg: 'bg-violet-100' },
  { id: 'hired', label: 'Recruté', bg: 'bg-emerald-100' },
];

export function RecruitmentPage() {
  const { t } = useI18n();
  const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: getJobOpenings });
  const { data: candidates } = useQuery({ queryKey: ['candidates'], queryFn: getCandidates });

  return (
    <div>
      <PageHeader
        title={t('nav.recruitment')}
        description="Gérez vos offres d'emploi et candidats"
        actions={<Button><Plus className="h-4 w-4" />Nouvelle offre</Button>}
      />

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Offres d'emploi</TabsTrigger>
          <TabsTrigger value="pipeline">Candidats</TabsTrigger>
        </TabsList>

        {/* Job openings */}
        <TabsContent value="jobs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(jobs || []).map((job) => (
              <Card key={job.id} className="transition-all hover:shadow-elevated">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{job.title}</h3>
                      <p className="text-xs text-muted-foreground">{job.department}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{job.location}</div>
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />Publiée le {formatDate(job.postedDate)}</div>
                    <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{job.applicants} candidats</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <Badge variant="muted" className="capitalize">{job.type.replace('_', ' ')}</Badge>
                    <Button variant="outline" size="sm">Voir candidats</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Candidate pipeline */}
        <TabsContent value="pipeline">
          <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-4">
            {STAGES.map((stage) => {
              const stageCandidates = (candidates || []).filter((c) => c.stage === stage.id);
              return (
                <div key={stage.id} className="w-72 shrink-0">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2.5 w-2.5 rounded-full', stage.bg)} />
                      <h3 className="text-sm font-semibold">{stage.label}</h3>
                      <span className="text-xs text-muted-foreground">{stageCandidates.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-2 min-h-[150px]">
                    {stageCandidates.map((c) => (
                      <motion.div
                        key={c.id}
                        layout
                        className="rounded-lg border border-border bg-card p-3 shadow-soft"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8" style={{ backgroundColor: `${c.avatarColor}20` }}>
                            <AvatarFallback style={{ color: c.avatarColor, backgroundColor: 'transparent' }} className="text-2xs">
                              {initials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.jobTitle}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge variant={c.score >= 80 ? 'success' : c.score >= 60 ? 'warning' : 'muted'} className="text-2xs gap-1">
                            <Award className="h-2.5 w-2.5" />
                            Score: {c.score}
                          </Badge>
                          <span className="text-2xs text-muted-foreground">{formatDate(c.appliedAt)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
