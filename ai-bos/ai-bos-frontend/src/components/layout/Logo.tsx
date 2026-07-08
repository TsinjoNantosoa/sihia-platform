import { cn } from '@/lib/utils';

export function Logo({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-ai shadow-soft">
        <svg viewBox="0 0 32 32" className="h-6 w-6">
          <path d="M16 7L25 25H21.5L16 13L10.5 25H7L16 7Z" fill="white" />
          <rect x="13" y="19" width="6" height="2.5" rx="1" fill="white" />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-white">AI BOS</span>
          <span className="text-2xs text-slate-400">Intelligent OS</span>
        </div>
      )}
    </div>
  );
}
