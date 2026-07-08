import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

const STATUS_MAP: Record<string, BadgeVariant> = {
  active: 'success',
  paid: 'success',
  won: 'success',
  completed: 'success',
  resolved: 'success',
  hired: 'success',
  done: 'success',
  in_stock: 'success',
  open: 'default',
  sent: 'default',
  accepted: 'default',
  fulfilled: 'default',
  invoiced: 'default',
  qualified: 'default',
  proposal: 'default',
  negotiation: 'default',
  screening: 'default',
  interview: 'default',
  offer: 'default',
  draft: 'muted',
  pending: 'warning',
  review: 'warning',
  in_progress: 'warning',
  on_hold: 'warning',
  paused: 'warning',
  scheduled: 'warning',
  low_stock: 'warning',
  expiring: 'warning',
  overdue: 'danger',
  lost: 'danger',
  cancelled: 'danger',
  rejected: 'danger',
  expired: 'danger',
  out_of_stock: 'danger',
  terminated: 'danger',
  error: 'danger',
  inactive: 'muted',
  archived: 'muted',
  closed: 'muted',
  lead: 'secondary',
  new: 'default',
  applied: 'muted',
  planning: 'secondary',
  idle: 'muted',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const variant = STATUS_MAP[status] || 'default';
  return (
    <Badge variant={variant} className={cn('capitalize')}>
      {label || status.replace(/_/g, ' ')}
    </Badge>
  );
}
