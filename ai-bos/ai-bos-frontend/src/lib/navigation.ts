import {
    LayoutDashboard, Sparkles, Inbox,
    Users, KanbanSquare, FileText, Megaphone,
    Wallet, Receipt, CreditCard, BookOpen, FileBarChart,
    FolderKanban, CheckSquare, Calendar, Video, FolderOpen, Package, ShoppingCart,
    UserCircle, Network, UserPlus, DollarSign,
    LifeBuoy, ScrollText, BookMarked,
    BarChart3, Brain, TrendingUp, Workflow, Bot,
    Settings, Building2, UsersRound, CreditCard as Billing, Plug, Bell, KeyRound,
    ShieldAlert, Flag,
  } from 'lucide-react';
  import type { LucideIcon } from 'lucide-react';
  
  export interface NavItem {
    label: string;
    path: string;
    icon: LucideIcon;
    permission?: string;
    permissions?: string[];
    badge?: string;
  }
  
  export interface NavGroup {
    label: string;
    items: NavItem[];
  }
  
  export const NAV_GROUPS: NavGroup[] = [
    {
      label: 'nav.overview',
      items: [
        { label: 'nav.dashboard', path: '/app/dashboard', icon: LayoutDashboard },
        { label: 'nav.copilot', path: '/app/copilot', icon: Sparkles, permission: 'ai.copilot.use' },
        { label: 'nav.inbox', path: '/app/inbox', icon: Inbox },
      ],
    },
    {
      label: 'nav.sales',
      items: [
        { label: 'nav.crmContacts', path: '/app/crm/contacts', icon: Users, permission: 'crm.contact.read' },
        { label: 'nav.crmPipeline', path: '/app/crm/pipeline', icon: KanbanSquare, permission: 'crm.lead.read' },
        { label: 'nav.salesOrders', path: '/app/sales/orders', icon: FileText, permissions: ['crm.contact.read', 'sales.order.read'] },
        { label: 'nav.marketing', path: '/app/marketing/campaigns', icon: Megaphone, permission: 'marketing.campaign.read' },
      ],
    },
    {
      label: 'nav.finance',
      items: [
        { label: 'nav.financeOverview', path: '/app/finance', icon: Wallet, permission: 'finance.invoice.read' },
        { label: 'nav.invoices', path: '/app/finance/invoices', icon: Receipt, permission: 'finance.invoice.read' },
        { label: 'nav.payments', path: '/app/finance/payments', icon: CreditCard, permission: 'finance.payment.read' },
        { label: 'nav.accounting', path: '/app/finance/accounting', icon: BookOpen, permission: 'finance.invoice.read' },
        { label: 'nav.reports', path: '/app/finance/reports', icon: FileBarChart, permission: 'finance.invoice.read' },
      ],
    },
    {
      label: 'nav.operations',
      items: [
        { label: 'nav.projects', path: '/app/projects', icon: FolderKanban, permission: 'project.read' },
        { label: 'nav.tasks', path: '/app/tasks', icon: CheckSquare, permission: 'task.read' },
        { label: 'nav.calendar', path: '/app/calendar', icon: Calendar, permission: 'calendar.read' },
        { label: 'nav.meetings', path: '/app/meetings', icon: Video, permission: 'meeting.read' },
        { label: 'nav.documents', path: '/app/documents', icon: FolderOpen, permission: 'document.read' },
        { label: 'nav.inventory', path: '/app/inventory', icon: Package, permission: 'inventory.read' },
        { label: 'nav.procurement', path: '/app/procurement', icon: ShoppingCart, permission: 'inventory.read' },
      ],
    },
    {
      label: 'nav.people',
      items: [
        { label: 'nav.employees', path: '/app/hr/employees', icon: UserCircle, permission: 'hr.employee.read' },
        { label: 'nav.orgChart', path: '/app/hr/org-chart', icon: Network, permission: 'hr.employee.read' },
        { label: 'nav.recruitment', path: '/app/hr/recruitment', icon: UserPlus, permission: 'hr.recruitment.read' },
        { label: 'nav.payroll', path: '/app/hr/payroll', icon: DollarSign, permission: 'hr.employee.read' },
      ],
    },
    {
      label: 'nav.support',
      items: [
        { label: 'nav.tickets', path: '/app/support/tickets', icon: LifeBuoy, permission: 'support.ticket.read' },
        { label: 'nav.contracts', path: '/app/contracts', icon: ScrollText, permission: 'contract.read' },
        { label: 'nav.knowledge', path: '/app/knowledge', icon: BookMarked, permission: 'knowledge.read' },
      ],
    },
    {
      label: 'nav.intelligence',
      items: [
        { label: 'nav.analytics', path: '/app/analytics', icon: BarChart3, permission: 'analytics.read' },
        { label: 'nav.bi', path: '/app/bi', icon: Brain, permission: 'bi.read' },
        { label: 'nav.forecasts', path: '/app/forecasts', icon: TrendingUp, permission: 'ml.forecast.read' },
        { label: 'nav.workflows', path: '/app/workflows', icon: Workflow, permission: 'workflow.read' },
        { label: 'nav.agents', path: '/app/agents', icon: Bot, permission: 'ai.agent.use' },
      ],
    },
    {
      label: 'nav.platform',
      items: [
        { label: 'nav.settingsProfile', path: '/app/settings/profile', icon: Settings, permission: 'settings.profile' },
        { label: 'nav.settingsOrg', path: '/app/settings/organization', icon: Building2, permission: 'settings.org' },
        { label: 'nav.settingsTeam', path: '/app/settings/team', icon: UsersRound, permission: 'settings.team' },
        { label: 'nav.settingsBilling', path: '/app/settings/billing', icon: Billing, permission: 'settings.billing' },
        { label: 'nav.settingsIntegrations', path: '/app/settings/integrations', icon: Plug, permission: 'settings.org' },
        { label: 'nav.settingsNotifications', path: '/app/settings/notifications', icon: Bell, permission: 'settings.profile' },
        { label: 'nav.settingsApiKeys', path: '/app/settings/api-keys', icon: KeyRound, permission: 'settings.org' },
        { label: 'nav.adminAudit', path: '/app/admin/audit', icon: ShieldAlert, permission: 'admin.audit' },
        { label: 'nav.adminFlags', path: '/app/admin/flags', icon: Flag, permission: 'admin.flags' },
      ],
    },
  ];
  