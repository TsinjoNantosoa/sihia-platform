// ============================================================
// AI BOS — API Services
// Every service: try apiFetch → catch → return mock data
// ============================================================

import { apiFetch, USE_MOCKS } from './client';
import type * as T from './types';

// --- Auth ---
export async function login(email: string, password: string): Promise<T.AuthResponse> {
  if (USE_MOCKS) {
    const { DEMO_USERS, DEMO_PASSWORD } = await import('./mocks/auth');
    const user = DEMO_USERS[email];
    if (!user || password !== DEMO_PASSWORD) throw new Error('Invalid credentials');
    return { user, token: `mock-token-${user.id}`, refreshToken: `mock-refresh-${user.id}` };
  }
  return apiFetch<T.AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<T.User> {
  if (USE_MOCKS) {
    const { DEMO_USERS } = await import('./mocks/auth');
    return DEMO_USERS['ceo@demo.aibos.io'];
  }
  return apiFetch<T.User>('/api/v1/auth/me');
}

// --- Organizations ---
export async function getOrganizations(): Promise<T.Organization[]> {
  if (USE_MOCKS) {
    const { ORGANIZATIONS } = await import('./mocks/auth');
    return ORGANIZATIONS;
  }
  return apiFetch<T.Organization[]>('/api/v1/platform/organizations');
}

// --- Notifications ---
export async function getNotifications(): Promise<T.AppNotification[]> {
  if (USE_MOCKS) {
    const { MOCK_NOTIFICATIONS } = await import('./mocks/auth');
    return MOCK_NOTIFICATIONS;
  }
  return apiFetch<T.AppNotification[]>('/api/v1/platform/notifications');
}

// --- CRM Contacts ---
export async function getContacts(): Promise<T.Contact[]> {
  if (USE_MOCKS) {
    const { MOCK_CONTACTS } = await import('./mocks/crm');
    return MOCK_CONTACTS;
  }
  return apiFetch<T.Contact[]>('/api/v1/crm/contacts');
}

export async function getActivities(): Promise<T.Activity[]> {
  if (USE_MOCKS) {
    const { MOCK_ACTIVITIES } = await import('./mocks/crm');
    return MOCK_ACTIVITIES;
  }
  return apiFetch<T.Activity[]>('/api/v1/crm/activities');
}

// --- CRM Leads ---
export async function getLeads(): Promise<T.Lead[]> {
  if (USE_MOCKS) {
    const { MOCK_LEADS } = await import('./mocks/crm');
    return MOCK_LEADS;
  }
  return apiFetch<T.Lead[]>('/api/v1/crm/leads');
}

// --- Sales Orders ---
export async function getOrders(): Promise<T.Order[]> {
  if (USE_MOCKS) {
    const { MOCK_ORDERS } = await import('./mocks/finance');
    return MOCK_ORDERS;
  }
  return apiFetch<T.Order[]>('/api/v1/sales/orders');
}

// --- Finance ---
export async function getFinanceOverview(): Promise<T.FinanceOverview> {
  if (USE_MOCKS) {
    const { MOCK_FINANCE_OVERVIEW } = await import('./mocks/finance');
    return MOCK_FINANCE_OVERVIEW;
  }
  return apiFetch<T.FinanceOverview>('/api/v1/finance/overview');
}

export async function getInvoices(): Promise<T.Invoice[]> {
  if (USE_MOCKS) {
    const { MOCK_INVOICES } = await import('./mocks/finance');
    return MOCK_INVOICES;
  }
  return apiFetch<T.Invoice[]>('/api/v1/finance/invoices');
}

// --- Projects ---
export async function getProjects(): Promise<T.Project[]> {
  if (USE_MOCKS) {
    const { MOCK_PROJECTS } = await import('./mocks/projects');
    return MOCK_PROJECTS;
  }
  return apiFetch<T.Project[]>('/api/v1/projects');
}

// --- Tasks ---
export async function getTasks(): Promise<T.Task[]> {
  if (USE_MOCKS) {
    const { MOCK_TASKS } = await import('./mocks/projects');
    return MOCK_TASKS;
  }
  return apiFetch<T.Task[]>('/api/v1/tasks');
}

// --- HR ---
export async function getEmployees(): Promise<T.Employee[]> {
  if (USE_MOCKS) {
    const { MOCK_EMPLOYEES } = await import('./mocks/projects');
    return MOCK_EMPLOYEES;
  }
  return apiFetch<T.Employee[]>('/api/v1/hr/employees');
}

export async function getJobOpenings(): Promise<T.JobOpening[]> {
  if (USE_MOCKS) {
    const { MOCK_JOB_OPENINGS } = await import('./mocks/projects');
    return MOCK_JOB_OPENINGS;
  }
  return apiFetch<T.JobOpening[]>('/api/v1/hr/jobs');
}

export async function getCandidates(): Promise<T.Candidate[]> {
  if (USE_MOCKS) {
    const { MOCK_CANDIDATES } = await import('./mocks/projects');
    return MOCK_CANDIDATES;
  }
  return apiFetch<T.Candidate[]>('/api/v1/hr/candidates');
}

// --- Marketing ---
export async function getCampaigns(): Promise<T.Campaign[]> {
  if (USE_MOCKS) {
    const { MOCK_CAMPAIGNS } = await import('./mocks/operations');
    return MOCK_CAMPAIGNS;
  }
  return apiFetch<T.Campaign[]>('/api/v1/marketing/campaigns');
}

// --- Support ---
export async function getTickets(): Promise<T.Ticket[]> {
  if (USE_MOCKS) {
    const { MOCK_TICKETS } = await import('./mocks/operations');
    return MOCK_TICKETS;
  }
  return apiFetch<T.Ticket[]>('/api/v1/support/tickets');
}

// --- Contracts ---
export async function getContracts(): Promise<T.Contract[]> {
  if (USE_MOCKS) {
    const { MOCK_CONTRACTS } = await import('./mocks/operations');
    return MOCK_CONTRACTS;
  }
  return apiFetch<T.Contract[]>('/api/v1/contracts');
}

// --- Knowledge ---
export async function getArticles(): Promise<T.KnowledgeArticle[]> {
  if (USE_MOCKS) {
    const { MOCK_ARTICLES } = await import('./mocks/operations');
    return MOCK_ARTICLES;
  }
  return apiFetch<T.KnowledgeArticle[]>('/api/v1/knowledge/articles');
}

// --- Workflows ---
export async function getWorkflows(): Promise<T.Workflow[]> {
  if (USE_MOCKS) {
    const { MOCK_WORKFLOWS } = await import('./mocks/operations');
    return MOCK_WORKFLOWS;
  }
  return apiFetch<T.Workflow[]>('/api/v1/workflows');
}

// --- Agents ---
export async function getAgents(): Promise<T.Agent[]> {
  if (USE_MOCKS) {
    const { MOCK_AGENTS } = await import('./mocks/operations');
    return MOCK_AGENTS;
  }
  return apiFetch<T.Agent[]>('/api/v1/ai/agents');
}

// --- Inventory ---
export async function getInventory(): Promise<T.InventoryItem[]> {
  if (USE_MOCKS) {
    const { MOCK_INVENTORY } = await import('./mocks/operations');
    return MOCK_INVENTORY;
  }
  return apiFetch<T.InventoryItem[]>('/api/v1/inventory/items');
}

// --- Calendar ---
export async function getEvents(): Promise<T.CalendarEvent[]> {
  if (USE_MOCKS) {
    const { MOCK_EVENTS } = await import('./mocks/operations');
    return MOCK_EVENTS;
  }
  return apiFetch<T.CalendarEvent[]>('/api/v1/calendar/events');
}

// --- Meetings ---
export async function getMeetings(): Promise<T.Meeting[]> {
  if (USE_MOCKS) {
    const { MOCK_MEETINGS } = await import('./mocks/operations');
    return MOCK_MEETINGS;
  }
  return apiFetch<T.Meeting[]>('/api/v1/meetings');
}

// --- Documents ---
export async function getDocuments(): Promise<T.DocumentItem[]> {
  if (USE_MOCKS) {
    const { MOCK_DOCUMENTS } = await import('./mocks/operations');
    return MOCK_DOCUMENTS;
  }
  return apiFetch<T.DocumentItem[]>('/api/v1/documents');
}

// --- Analytics ---
export async function getAnalytics(): Promise<T.AnalyticsData> {
  if (USE_MOCKS) {
    const { MOCK_ANALYTICS } = await import('./mocks/analytics');
    return MOCK_ANALYTICS;
  }
  return apiFetch<T.AnalyticsData>('/api/v1/analytics/kpis');
}

// --- BI ---
export async function getBIReports(): Promise<T.BIReport[]> {
  if (USE_MOCKS) {
    const { MOCK_BI_REPORTS } = await import('./mocks/analytics');
    return MOCK_BI_REPORTS;
  }
  return apiFetch<T.BIReport[]>('/api/v1/bi/reports');
}

// --- Forecasts ---
export async function getForecast(horizon: '7d' | '30d' | '90d'): Promise<T.ForecastData> {
  if (USE_MOCKS) {
    const mocks = await import('./mocks/analytics');
    if (horizon === '7d') return mocks.MOCK_FORECAST_7D;
    if (horizon === '30d') return mocks.MOCK_FORECAST_30D;
    return mocks.MOCK_FORECAST_90D;
  }
  return apiFetch<T.ForecastData>(`/api/v1/ml/forecast?horizon=${horizon}`);
}

// --- Transactions / Accounting Ledger ---
export async function getTransactions(): Promise<T.Transaction[]> {
  if (USE_MOCKS) {
    const { MOCK_TRANSACTIONS } = await import('./mocks/finance');
    return MOCK_TRANSACTIONS;
  }
  return apiFetch<T.Transaction[]>('/api/v1/finance/transactions');
}

// --- Procurement ---
export async function getSuppliers(): Promise<T.Supplier[]> {
  if (USE_MOCKS) {
    const { MOCK_SUPPLIERS } = await import('./mocks/procurement');
    return MOCK_SUPPLIERS;
  }
  return apiFetch<T.Supplier[]>('/api/v1/procurement/suppliers');
}

export async function getPurchaseOrders(): Promise<T.PurchaseOrder[]> {
  if (USE_MOCKS) {
    const { MOCK_PURCHASE_ORDERS } = await import('./mocks/procurement');
    return MOCK_PURCHASE_ORDERS;
  }
  return apiFetch<T.PurchaseOrder[]>('/api/v1/procurement/purchase-orders');
}

// --- Audit Logs ---
export async function getAuditLogs(): Promise<T.AuditLog[]> {
  if (USE_MOCKS) {
    const { MOCK_AUDIT_LOGS } = await import('./mocks/analytics');
    return MOCK_AUDIT_LOGS;
  }
  return apiFetch<T.AuditLog[]>('/api/v1/platform/audit-logs');
}

// --- Copilot (mock streaming) ---
export async function* streamCopilotResponse(prompt: string, agentId?: string): AsyncGenerator<string> {
  const responses = [
    `Basé sur l'analyse de vos données, voici ce que j'ai trouvé concernant "${prompt}":\n\n` +
    `• Le revenu mensuel est en hausse de 12.5% par rapport au mois dernier\n` +
    `• 3 factures sont en retard de paiement, totalisant 45 200 €\n` +
    `• Le pipeline commercial contient 12 deals actifs pour une valeur de 340 000 €\n\n` +
    `Je recommande de prioriser le suivi des factures impayées et de contacter les clients concernés.`,
    
    `Voici un résumé de la situation:\n\n` +
    `**Performance globale:** Excellente. Tous les indicateurs clés sont au vert.\n\n` +
    `**Points d'attention:**\n` +
    `- 2 contrats arrivent à échéance dans les 30 prochains jours\n` +
    `- Le stock de 3 articles est critique\n\n` +
    `Souhaitez-vous que je prépare un plan d'action détaillé ?`,
    
    `Excellente question ! En analysant les données récentes, je constate que:\n\n` +
    `1. **Tendance positive** sur les ventes (+15% ce trimestre)\n` +
    `2. **Opportunité** d'expansion sur le segment enterprise\n` +
    `3. **Risque** modéré sur la trésorerie à 60 jours\n\n` +
    `Je peux générer un rapport détaillé si vous le souhaitez.`,
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];
  const words = response.split(' ');
  for (let i = 0; i < words.length; i++) {
    yield words[i] + (i < words.length - 1 ? ' ' : '');
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 40));
  }
}
