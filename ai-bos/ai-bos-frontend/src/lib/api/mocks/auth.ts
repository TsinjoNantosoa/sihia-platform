import type { User, Organization, AppNotification } from '@/lib/api/types';
import { uuid, hoursAgo, daysAgo } from './helpers';

export const ORGANIZATIONS: Organization[] = [
  { id: 'org-1', name: 'Acme Corp', plan: 'enterprise', currency: 'EUR', timezone: 'Europe/Paris', locale: 'fr' },
  { id: 'org-2', name: 'Acme EU', plan: 'pro', currency: 'EUR', timezone: 'Europe/Berlin', locale: 'fr' },
  { id: 'org-3', name: 'Demo Org', plan: 'starter', currency: 'USD', timezone: 'America/New_York', locale: 'en' },
];

const ALL_PERMISSIONS = [
  'crm.contact.read', 'crm.contact.write', 'crm.lead.read', 'crm.lead.write',
  'finance.invoice.read', 'finance.invoice.write', 'finance.payment.read',
  'hr.employee.read', 'hr.employee.write', 'hr.recruitment.read',
  'project.read', 'project.write', 'task.read', 'task.write',
  'ai.agent.use', 'ai.copilot.use',
  'analytics.read', 'bi.read', 'ml.forecast.read',
  'workflow.read', 'workflow.write',
  'settings.profile', 'settings.org', 'settings.team', 'settings.billing',
  'admin.audit', 'admin.flags',
  'support.ticket.read', 'support.ticket.write',
  'marketing.campaign.read', 'marketing.campaign.write',
  'inventory.read', 'inventory.write',
  'document.read', 'document.write',
  'contract.read', 'contract.write',
  'knowledge.read',
  'calendar.read', 'calendar.write', 'meeting.read',
];

export const DEMO_USERS: Record<string, User> = {
  'ceo@demo.aibos.io': {
    id: 'user-1',
    email: 'ceo@demo.aibos.io',
    firstName: 'Jean',
    lastName: 'Bernard',
    role: 'owner',
    permissions: ALL_PERMISSIONS,
    orgId: 'org-1',
    jobTitle: 'CEO & Founder',
    department: 'Executive',
    phone: '+33 6 12 34 56 78',
    twoFactorEnabled: true,
  },
  'sales@demo.aibos.io': {
    id: 'user-2',
    email: 'sales@demo.aibos.io',
    firstName: 'Sophie',
    lastName: 'Martin',
    role: 'sales_manager',
    permissions: [
      'crm.contact.read', 'crm.contact.write', 'crm.lead.read', 'crm.lead.write',
      'sales.order.read', 'sales.order.write',
      'marketing.campaign.read', 'marketing.campaign.write',
      'analytics.read', 'ai.copilot.use', 'ai.agent.use',
      'settings.profile', 'support.ticket.read',
    ],
    orgId: 'org-1',
    jobTitle: 'Sales Director',
    department: 'Sales',
    phone: '+33 6 23 45 67 89',
  },
  'finance@demo.aibos.io': {
    id: 'user-3',
    email: 'finance@demo.aibos.io',
    firstName: 'Pierre',
    lastName: 'Dubois',
    role: 'finance_manager',
    permissions: [
      'finance.invoice.read', 'finance.invoice.write', 'finance.payment.read',
      'analytics.read', 'bi.read', 'ml.forecast.read',
      'ai.copilot.use', 'ai.agent.use', 'settings.profile',
    ],
    orgId: 'org-1',
    jobTitle: 'CFO',
    department: 'Finance',
    phone: '+33 6 34 56 78 90',
  },
  'hr@demo.aibos.io': {
    id: 'user-4',
    email: 'hr@demo.aibos.io',
    firstName: 'Marie',
    lastName: 'Lefevre',
    role: 'hr_manager',
    permissions: [
      'hr.employee.read', 'hr.employee.write', 'hr.recruitment.read', 'hr.recruitment.write',
      'ai.copilot.use', 'ai.agent.use', 'settings.profile',
    ],
    orgId: 'org-1',
    jobTitle: 'HR Manager',
    department: 'Human Resources',
    phone: '+33 6 45 67 89 01',
  },
  'staff@demo.aibos.io': {
    id: 'user-5',
    email: 'staff@demo.aibos.io',
    firstName: 'Lucas',
    lastName: 'Thomas',
    role: 'staff',
    permissions: [
      'crm.contact.read', 'task.read', 'task.write',
      'ai.copilot.use', 'settings.profile', 'calendar.read', 'calendar.write',
      'document.read', 'knowledge.read', 'meeting.read',
    ],
    orgId: 'org-1',
    jobTitle: 'Operations Associate',
    department: 'Operations',
  },
};

export const DEMO_PASSWORD = 'demo1234';

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: uuid(), type: 'warning', title: 'Facture en retard', message: 'TechSolutions SAS n\'a pas payé la facture #INV-2024-018 (45 jours de retard)', read: false, createdAt: hoursAgo(2), link: '/app/finance/invoices' },
  { id: uuid(), type: 'info', title: 'Nouveau lead', message: 'Un nouveau lead "GreenEnergy Corp" a été ajouté au pipeline', read: false, createdAt: hoursAgo(5), link: '/app/crm/pipeline' },
  { id: uuid(), type: 'success', title: 'Deal gagné', message: 'Le deal "Studio Pixel" a été gagné — 12 500 €', read: false, createdAt: hoursAgo(8), link: '/app/crm/pipeline' },
  { id: uuid(), type: 'warning', title: 'Stock faible', message: 'L\'article "Ordinateur portable Pro" est en dessous du seuil de réapprovisionnement', read: true, createdAt: daysAgo(1), link: '/app/inventory' },
  { id: uuid(), type: 'info', title: 'Réunion programmée', message: 'Réunion de revue trimestrielle demain à 14h00', read: true, createdAt: daysAgo(1), link: '/app/calendar' },
  { id: uuid(), type: 'error', title: 'Contrat expirant', message: 'Le contrat avec "Logitrans SARL" expire dans 15 jours', read: true, createdAt: daysAgo(2), link: '/app/contracts' },
  { id: uuid(), type: 'success', title: 'Campagne terminée', message: 'La campagne "Promo Été" a généré 234 conversions', read: true, createdAt: daysAgo(3), link: '/app/marketing/campaigns' },
];
