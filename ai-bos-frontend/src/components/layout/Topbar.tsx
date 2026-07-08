import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, Menu, Check, Globe, LogOut, Settings, User,
  ChevronDown, Building2, AlertCircle, CheckCircle2, Info, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/store';
import { useI18n } from '@/lib/i18n/store';
import { getNotifications } from '@/lib/api/services';
import type { AppNotification } from '@/lib/api/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from '@/components/ui/command';
import { NAV_GROUPS } from '@/lib/navigation';
import { cn, initials, formatRelativeTime } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/dictionaries';

export function Topbar({ onMobileMenuClick }: { onMobileMenuClick: () => void }) {
  const { user, organizations, orgId, setOrg, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [apiHealthy] = useState(true);

  useEffect(() => {
    getNotifications().then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentOrg = organizations.find((o) => o.id === orgId) || organizations[0];

  const navItems = NAV_GROUPS.flatMap((g) => g.items);

  const notifIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-6">
        {/* Mobile menu */}
        <Button variant="ghost" size="icon" onClick={onMobileMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="group flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">{t('common.search')}...</span>
          <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-2xs font-medium sm:flex">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {/* API health */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-border px-2 py-1 sm:flex">
            <span className={cn('h-2 w-2 rounded-full', apiHealthy ? 'bg-emerald-500 animate-pulse-soft' : 'bg-red-500')} />
            <span className="text-2xs font-medium text-muted-foreground">{apiHealthy ? 'API' : 'Down'}</span>
          </div>

          {/* Org switcher */}
          {currentOrg && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden max-w-[120px] truncate md:inline">{currentOrg.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Organisations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                  <DropdownMenuItem key={org.id} onClick={() => setOrg(org.id)} className="justify-between">
                    <span className="truncate">{org.name}</span>
                    {org.id === orgId && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/app/settings/organization')}>
                  <Settings className="h-4 w-4" />
                  {t('nav.settingsOrg')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale('fr')}>
                <span className="mr-2">🇫🇷</span> Français
                {locale === 'fr' && <Check className="ml-auto h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('en')}>
                <span className="mr-2">🇬🇧</span> English
                {locale === 'en' && <Check className="ml-auto h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('ar')}>
                <span className="mr-2">🇸🇦</span> العربية
                {locale === 'ar' && <Check className="ml-auto h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b border-border p-3">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && <Badge variant="default">{unreadCount} non lues</Badge>}
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.slice(0, 6).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 border-b border-border p-3 transition-colors hover:bg-muted/50',
                      !n.read && 'bg-primary-50/30'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-2xs text-muted-foreground">{formatRelativeTime(n.createdAt, locale)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <DropdownMenuItem className="justify-center text-sm text-primary" onClick={() => navigate('/app/inbox')}>
                Voir toutes les notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary-100 text-xs font-medium text-primary-700">
                    {user ? initials(`${user.firstName} ${user.lastName}`) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left leading-tight md:block">
                  <p className="text-xs font-medium">{user ? `${user.firstName} ${user.lastName}` : ''}</p>
                  <p className="text-2xs text-muted-foreground">{user?.jobTitle}</p>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/settings/profile')}>
                <User className="h-4 w-4" /> {t('common.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings/profile')}>
                <Settings className="h-4 w-4" /> {t('common.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/inbox')}>
                <Bell className="h-4 w-4" /> {t('nav.inbox')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4" /> {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command palette */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder={t('common.search')} />
        <CommandList>
          <CommandEmpty>{t('common.noResults')}</CommandEmpty>
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => {
              if (i.permission && !useAuth.getState().hasPermission(i.permission)) return false;
              if (i.permissions && !useAuth.getState().hasAnyPermission(i.permissions)) return false;
              return true;
            });
            if (items.length === 0) return null;
            return (
              <CommandGroup key={group.label} heading={t(group.label)}>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem key={item.path} onSelect={() => { navigate(item.path); setSearchOpen(false); }}>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{t(item.label)}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
          <CommandGroup heading="Actions IA">
            <CommandItem onSelect={() => { navigate('/app/copilot'); setSearchOpen(false); }}>
              <Search className="h-4 w-4 text-primary" />
              <span>Demander à l'IA...</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
