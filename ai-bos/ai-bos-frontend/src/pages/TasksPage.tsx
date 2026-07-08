import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, List, Columns3, Flag, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getTasks } from '@/lib/api/services';
import type { Task, TaskStatus } from '@/lib/api/types';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatDate, initials } from '@/lib/utils';

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'todo', label: 'À faire', color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'in_progress', label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: 'review', label: 'Revue', color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: 'done', label: 'Terminé', color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-amber-500', medium: 'bg-blue-500', low: 'bg-slate-400',
};

export function TasksPage() {
  const { t } = useI18n();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const displayTasks = localTasks || tasks || [];

  const filtered = myTasksOnly ? displayTasks.filter((t) => t.assigneeName.includes('Sophie')) : displayTasks;

  const getTasksByStatus = (status: TaskStatus) => filtered.filter((t) => t.status === status);

  const handleDrop = (status: TaskStatus) => {
    if (!draggedTask) return;
    setLocalTasks((prev) => {
      const base = prev || tasks || [];
      return base.map((t) => t.id === draggedTask ? { ...t, status } : t);
    });
    setDraggedTask(null);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.tasks')}
        description="Gérez vos tâches et suivez leur progression"
        actions={
          <>
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <Button variant={view === 'kanban' ? 'default' : 'ghost'} size="icon-sm" onClick={() => setView('kanban')}>
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon-sm" onClick={() => setView('list')}>
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => setMyTasksOnly(!myTasksOnly)}>
              {myTasksOnly ? 'Toutes les tâches' : 'Mes tâches'}
            </Button>
            <Button><Plus className="h-4 w-4" />{t('common.create')}</Button>
          </>
        }
      />

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-4">
          {COLUMNS.map((col) => {
            const colTasks = getTasksByStatus(col.id);
            return (
              <div key={col.id} className="w-72 shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', col.bg)} />
                    <h3 className="text-sm font-semibold">{col.label}</h3>
                    <span className="text-xs text-muted-foreground">{colTasks.length}</span>
                  </div>
                </div>
                <div className="min-h-[200px] space-y-2 rounded-xl border border-dashed border-border bg-muted/20 p-2">
                  {colTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      draggable
                      onDragStart={() => setDraggedTask(task.id)}
                      onDragEnd={() => setDraggedTask(null)}
                      className={cn(
                        'cursor-grab rounded-lg border border-border bg-card p-3 shadow-soft transition-all hover:shadow-elevated active:cursor-grabbing',
                        draggedTask === task.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium flex-1">{task.title}</p>
                        <div className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', PRIORITY_COLORS[task.priority])} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{task.projectName}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {task.tags.map((tag) => <Badge key={tag} variant="muted" className="text-2xs">{tag}</Badge>)}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Avatar className="h-6 w-6" style={{ backgroundColor: `${task.assigneeAvatarColor}20` }}>
                          <AvatarFallback style={{ color: task.assigneeAvatarColor, backgroundColor: 'transparent' }} className="text-2xs">
                            {initials(task.assigneeName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Glissez les tâches ici</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{task.projectName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[task.priority])} />
                        <span className="text-sm capitalize">{task.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={task.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6" style={{ backgroundColor: `${task.assigneeAvatarColor}20` }}>
                          <AvatarFallback style={{ color: task.assigneeAvatarColor, backgroundColor: 'transparent' }} className="text-2xs">
                            {initials(task.assigneeName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.assigneeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(task.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
