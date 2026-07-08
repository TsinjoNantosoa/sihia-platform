import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react';
import { NAV_GROUPS } from '@/lib/navigation';
import { useAuth } from '@/lib/auth/store';
import { useI18n } from '@/lib/i18n/store';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const { hasPermission, hasAnyPermission } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(NAV_GROUPS.map((g) => g.label)));

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const canSeeItem = (item: { permission?: string; permissions?: string[] }) => {
    if (item.permission) return hasPermission(item.permission);
    if (item.permissions) return hasAnyPermission(item.permissions);
    return true;
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-[260px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Logo collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="hidden lg:flex text-slate-400 hover:text-white hover:bg-sidebar-accent"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(canSeeItem);
            if (visibleItems.length === 0) return null;
            const isExpanded = expandedGroups.has(group.label) || collapsed;

            return (
              <div key={group.label} className="mb-1">
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-2xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span>{t(group.label)}</span>
                    <ChevronDown
                      className={cn('h-3 w-3 transition-transform', isExpanded ? '' : '-rotate-90')}
                    />
                  </button>
                )}
                {isExpanded && (
                  <div className="mt-0.5 space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;

                      if (collapsed) {
                        return (
                          <Tooltip key={item.path}>
                            <TooltipTrigger asChild>
                              <NavLink
                                to={item.path}
                                onClick={onMobileClose}
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                                  isActive
                                    ? 'bg-primary text-white shadow-soft'
                                    : 'text-slate-400 hover:bg-sidebar-accent hover:text-white'
                                )}
                              >
                                <Icon className="h-[18px] w-[18px]" />
                              </NavLink>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-900">
                              {t(item.label)}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={onMobileClose}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            isActive
                              ? 'bg-primary text-white shadow-soft'
                              : 'text-slate-400 hover:bg-sidebar-accent hover:text-white'
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate">{t(item.label)}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-primary-500/20 px-1.5 py-0.5 text-2xs text-primary-300">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-ai">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">AI BOS Pro</p>
                <p className="text-2xs text-slate-500">Plan Enterprise</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

import { Sparkles } from 'lucide-react';
