import type { AnalyticsData, BIReport, ForecastData, AuditLog } from '@/lib/api/types';
import { uuid, daysAgo, hoursAgo, FIRST_NAMES, LAST_NAMES } from './helpers';

export const MOCK_ANALYTICS: AnalyticsData = {
  kpis: [
    { label: 'Revenu MTD', value: 284500, change: 12.5, unit: '€' },
    { label: 'Pipeline', value: 1240000, change: 8.3, unit: '€' },
    { label: 'Clients actifs', value: 342, change: 5.2, unit: '' },
    { label: 'Taux de conversion', value: 24.8, change: -2.1, unit: '%' },
    { label: 'Churn rate', value: 3.2, change: -0.8, unit: '%' },
    { label: 'NPS', value: 47, change: 4, unit: '' },
  ],
  revenue: Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i, 1).toLocaleDateString('fr-FR', { month: 'short' }),
    revenue: 180000 + i * 12000 + (i % 3) * 5000,
    target: 200000 + i * 10000,
  })),
  users: Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i, 1).toLocaleDateString('fr-FR', { month: 'short' }),
    active: 200 + i * 15 + (i % 4) * 8,
    new: 20 + i * 3 + (i % 5) * 4,
  })),
  conversion: [
    { stage: 'Visiteurs', value: 12000, rate: 100 },
    { stage: 'Leads', value: 3600, rate: 30 },
    { stage: 'Qualifiés', value: 1800, rate: 15 },
    { stage: 'Devis', value: 720, rate: 6 },
    { stage: 'Clients', value: 298, rate: 2.5 },
  ],
  churn: Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i, 1).toLocaleDateString('fr-FR', { month: 'short' }),
    rate: 4.5 - i * 0.1 + (i % 3) * 0.3,
  })),
};

export const MOCK_BI_REPORTS: BIReport[] = [
  { id: 'rpt-1', name: 'Revenu par canal', description: 'Analyse du revenu par canal d\'acquisition', category: 'Finance', chartType: 'bar', lastRun: daysAgo(1), schedule: 'Hebdomadaire' },
  { id: 'rpt-2', name: 'Performance commerciale', description: 'KPIs de l\'équipe de vente', category: 'Sales', chartType: 'line', lastRun: daysAgo(0), schedule: 'Quotidien' },
  { id: 'rpt-3', name: 'Rétention client', description: 'Analyse de la rétention par cohorte', category: 'Customer', chartType: 'area', lastRun: daysAgo(2), schedule: 'Mensuel' },
  { id: 'rpt-4', name: 'Productivité équipe', description: 'Métriques de productivité par département', category: 'HR', chartType: 'bar', lastRun: daysAgo(3) },
  { id: 'rpt-5', name: 'ROI Marketing', description: 'Retour sur investissement par campagne', category: 'Marketing', chartType: 'pie', lastRun: daysAgo(1), schedule: 'Hebdomadaire' },
  { id: 'rpt-6', name: 'Santé financière', description: 'Vue d\'ensemble de la santé financière', category: 'Finance', chartType: 'area', lastRun: daysAgo(0), schedule: 'Quotidien' },
];

export const MOCK_FORECAST_7D: ForecastData = {
  horizon: '7d',
  data: Array.from({ length: 7 }, (_, i) => {
    const base = 9500 + i * 200;
    return {
      date: new Date(Date.now() + i * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      actual: i < 2 ? base : undefined,
      forecast: base,
      lower: base - 800,
      upper: base + 800,
    };
  }),
  model: { name: 'Prophet v2', version: '2.1.3', mae: 342, lastTrained: daysAgo(1), confidence: 94.2 },
  recommendations: [
    'Augmentation prévue du CA de 8% la semaine prochaine',
    'Pic de demande attendu jeudi — préparez les stocks',
    'La tendance haussière se confirme sur 7 jours',
  ],
};

export const MOCK_FORECAST_30D: ForecastData = {
  horizon: '30d',
  data: Array.from({ length: 30 }, (_, i) => {
    const base = 9500 + i * 150 + Math.sin(i / 3) * 500;
    return {
      date: new Date(Date.now() + i * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      actual: i < 5 ? base : undefined,
      forecast: Math.round(base),
      lower: Math.round(base - 1200),
      upper: Math.round(base + 1200),
    };
  }),
  model: { name: 'Prophet v2', version: '2.1.3', mae: 487, lastTrained: daysAgo(1), confidence: 89.5 },
  recommendations: [
    'Croissance mensuelle projetée: +12%',
    'Risque de plateau la 3ème semaine — envisagez une promotion',
    'La saisonnalité montre un pic en fin de mois',
  ],
};

export const MOCK_FORECAST_90D: ForecastData = {
  horizon: '90d',
  data: Array.from({ length: 90 }, (_, i) => {
    const base = 9500 + i * 80 + Math.sin(i / 7) * 800;
    return {
      date: new Date(Date.now() + i * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      actual: i < 10 ? base : undefined,
      forecast: Math.round(base),
      lower: Math.round(base - 2000),
      upper: Math.round(base + 2000),
    };
  }),
  model: { name: 'Prophet v2', version: '2.1.3', mae: 723, lastTrained: daysAgo(1), confidence: 82.1 },
  recommendations: [
    'Tendance haussière sur le trimestre: +18%',
    'Période de croissance plus lente attendue en mois 2',
    'Investir dans la capacité pour répondre à la demande du mois 3',
  ],
};

export const MOCK_AUDIT_LOGS: AuditLog[] = Array.from({ length: 30 }, (_, i) => ({
  id: uuid(),
  timestamp: hoursAgo(i * 3 + 1),
  userId: `user-${(i % 5) + 1}`,
  userName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
  action: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'VIEW'][i % 7],
  resource: ['Contact', 'Invoice', 'Project', 'Task', 'Employee', 'Contract', 'Setting'][i % 7],
  resourceId: `res-${i}`,
  ip: `192.168.${i % 255}.${(i * 7) % 255}`,
  details: 'Action effectuée depuis le navigateur',
}));
