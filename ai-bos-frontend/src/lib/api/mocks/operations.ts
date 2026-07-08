import type { Campaign, Ticket, Contract, KnowledgeArticle, Workflow, Agent, InventoryItem, CalendarEvent, Meeting, DocumentItem } from '@/lib/api/types';
import { uuid, daysAgo, daysFromNow, hoursFromNow, COMPANIES, randomColor } from './helpers';

export const MOCK_CAMPAIGNS: Campaign[] = Array.from({ length: 8 }, (_, i) => {
  const statuses: Campaign['status'][] = ['draft', 'scheduled', 'active', 'completed', 'paused'];
  return {
    id: `camp-${i + 1}`,
    name: ['Promo Été 2024', 'Webinar Series Q3', 'Newsletter Mensuelle', 'Lancement Produit X', 'Black Friday', 'Nurturing Leads', 'Reactivation Clients', 'Webinaire RH'][i],
    type: (['email', 'webinar', 'email', 'email', 'sms', 'email', 'social', 'webinar'] as Campaign['type'][])[i],
    status: statuses[i % statuses.length],
    reach: (i + 1) * 5000 + 1200,
    openRate: 25 + (i % 15),
    clickRate: 8 + (i % 8),
    conversions: (i + 1) * 45 + 12,
    budget: (i + 1) * 3000,
    spent: Math.round((i + 1) * 3000 * 0.7),
    startDate: daysAgo(i * 10 + 5),
    endDate: i % 3 === 0 ? daysAgo(i * 2) : daysFromNow(i * 3 + 7),
  };
});

export const MOCK_TICKETS: Ticket[] = Array.from({ length: 10 }, (_, i) => {
  const priorities: Ticket['priority'][] = ['low', 'medium', 'high', 'urgent'];
  const statuses: Ticket['status'][] = ['open', 'pending', 'resolved', 'closed'];
  return {
    id: `ticket-${i + 1}`,
    ticketNumber: `TKT-${String(i + 1).padStart(4, '0')}`,
    subject: [
      'Problème de connexion au portail', 'Facture incorrecte', 'Demande de remboursement',
      'Bug dans le module CRM', 'Question sur l\'abonnement', 'Impossible d\'exporter les données',
      'Erreur 500 sur dashboard', 'Demande de formation', 'Problème de synchronisation', 'Accès refusé API',
    ][i],
    customerName: `${COMPANIES[i % COMPANIES.length]}`,
    customerEmail: `support@${COMPANIES[i % COMPANIES.length].toLowerCase().replace(/[^a-z]/g, '')}.com`,
    priority: priorities[i % 4],
    status: statuses[i % 4],
    agentId: i % 3 === 0 ? undefined : `user-${(i % 3) + 2}`,
    agentName: i % 3 === 0 ? undefined : ['Sophie Martin', 'Pierre Dubois', 'Marie Lefevre'][i % 3],
    createdAt: daysAgo(i * 2 + 1),
    updatedAt: daysAgo(i),
    slaDeadline: hoursFromNow(i * 4 - 12),
    category: ['Technique', 'Facturation', 'Compte', 'Produit', 'Formation'][i % 5],
    messages: [
      { id: uuid(), author: 'Customer', content: 'Bonjour, j\'ai un problème avec mon compte.', createdAt: daysAgo(i * 2 + 1), isInternal: false },
      { id: uuid(), author: 'Support Agent', content: 'Bonjour, je vais regarder cela pour vous immédiatement.', createdAt: daysAgo(i * 2), isInternal: false },
    ],
  };
});

export const MOCK_CONTRACTS: Contract[] = Array.from({ length: 12 }, (_, i) => {
  const statuses: Contract['status'][] = ['active', 'active', 'active', 'expiring', 'expired', 'draft'];
  return {
    id: `contract-${i + 1}`,
    title: ['Contrat de service TechSolutions', 'Accord de confidentialité', 'Contrat de travail CDI', 'Contrat fournisseur Cloud', 'Bail commercial', 'Contrat de maintenance'][i % 6],
    type: (['service', 'nda', 'employment', 'vendor', 'lease', 'service'] as Contract['type'][])[i % 6],
    counterparty: COMPANIES[i % COMPANIES.length],
    value: (i + 1) * 15000,
    currency: 'EUR',
    startDate: daysAgo(i * 30 + 60),
    endDate: daysFromNow(i * 10 - 15),
    status: statuses[i % statuses.length],
    owner: ['Jean Bernard', 'Sophie Martin', 'Pierre Dubois'][i % 3],
  };
});

export const MOCK_ARTICLES: KnowledgeArticle[] = Array.from({ length: 12 }, (_, i) => ({
  id: `article-${i + 1}`,
  title: [
    'Comment configurer l\'authentification à deux facteurs', 'Guide de démarrage rapide AI BOS',
    'Importer des contacts depuis un fichier CSV', 'Créer et envoyer une facture',
    'Configurer les workflows automatisés', 'Utiliser le copilote IA efficacement',
    'Personnaliser le tableau de bord', 'Gérer les permissions et rôles',
    'Intégrer AI BOS avec Slack', 'Exporter des rapports financiers',
    'Créer une campagne marketing', 'Comprendre les prévisions ML',
  ][i],
  category: ['Sécurité', 'Guide', 'CRM', 'Finance', 'Automatisation', 'IA', 'Personnalisation', 'Administration', 'Intégrations', 'Finance', 'Marketing', 'Analytics'][i],
  excerpt: 'Un guide détaillé pour vous aider à tirer le meilleur parti d\'AI BOS.',
  content: `# Article complet\n\nCet article explique en détail les meilleures pratiques et étapes à suivre.`,
  author: ['Marie Lefevre', 'Jean Bernard', 'Sophie Martin'][i % 3],
  updatedAt: daysAgo(i * 3 + 1),
  views: (i + 1) * 120 + 45,
  helpful: (i + 1) * 30 + 5,
}));

export const MOCK_WORKFLOWS: Workflow[] = Array.from({ length: 5 }, (_, i) => ({
  id: `wf-${i + 1}`,
  name: ['Notification nouveau lead', 'Relance facture impayée', 'Onboarding employé', 'Rapport hebdo auto', 'Alerte stock faible'][i],
  description: 'Workflow automatisé pour améliorer l\'efficacité opérationnelle.',
  status: (['active', 'active', 'inactive', 'active', 'draft'] as Workflow['status'][])[i % 5],
  trigger: ['Lead créé', 'Facture en retard', 'Employé ajouté', 'Planification hebdo', 'Stock bas'][i],
  actions: ['Envoyer email', 'Créer tâche', 'Notifier Slack', 'Mettre à jour CRM'].slice(0, (i % 3) + 1),
  lastRun: daysAgo(i + 1),
  runCount: (i + 1) * 120 + 34,
  successRate: 92 + (i % 7),
}));

export const MOCK_AGENTS: Agent[] = [
  { id: 'agent-1', name: 'CEO Agent', description: 'Assistant stratégique pour la direction. Analyse KPIs, suggère des décisions.', status: 'active', category: 'Executive', icon: 'Crown', toolsCount: 12, lastUsed: daysAgo(0), conversations: 234 },
  { id: 'agent-2', name: 'Sales Agent', description: 'Optimise le pipeline commercial, analyse les deals et propose des actions.', status: 'active', category: 'Sales', icon: 'TrendingUp', toolsCount: 8, lastUsed: daysAgo(1), conversations: 189 },
  { id: 'agent-3', name: 'Finance Agent', description: 'Surveille la trésorerie, détecte les anomalies, prépare des rapports.', status: 'active', category: 'Finance', icon: 'Wallet', toolsCount: 10, lastUsed: daysAgo(0), conversations: 156 },
  { id: 'agent-4', name: 'Marketing Agent', description: 'Crée et optimise les campagnes, analyse les performances.', status: 'idle', category: 'Marketing', icon: 'Megaphone', toolsCount: 6, lastUsed: daysAgo(3), conversations: 78 },
  { id: 'agent-5', name: 'Legal Agent', description: 'Analyse les contrats, détecte les clauses à risque.', status: 'idle', category: 'Legal', icon: 'Scale', toolsCount: 5, lastUsed: daysAgo(5), conversations: 45 },
  { id: 'agent-6', name: 'HR Agent', description: 'Gère le recrutement, onboarding, et les demandes RH.', status: 'active', category: 'HR', icon: 'Users', toolsCount: 9, lastUsed: daysAgo(1), conversations: 112 },
  { id: 'agent-7', name: 'Data Analyst', description: 'Interroge les données, génère des insights et des visualisations.', status: 'active', category: 'Analytics', icon: 'BarChart3', toolsCount: 14, lastUsed: daysAgo(0), conversations: 298 },
  { id: 'agent-8', name: 'Project Manager', description: 'Suit l\'avancement des projets, identifie les risques.', status: 'idle', category: 'Projects', icon: 'KanbanSquare', toolsCount: 7, lastUsed: daysAgo(2), conversations: 67 },
  { id: 'agent-9', name: 'Support Agent', description: 'Répond aux tickets, suggère des solutions basées sur la base de connaissances.', status: 'active', category: 'Support', icon: 'LifeBuoy', toolsCount: 8, lastUsed: daysAgo(0), conversations: 345 },
  { id: 'agent-10', name: 'Meeting Agent', description: 'Transcrit les réunions, génère des comptes-rendus et des actions.', status: 'idle', category: 'Meetings', icon: 'Video', toolsCount: 4, lastUsed: daysAgo(1), conversations: 89 },
  { id: 'agent-11', name: 'Compliance Agent', description: 'Vérifie la conformité réglementaire, alerte sur les risques.', status: 'idle', category: 'Compliance', icon: 'ShieldCheck', toolsCount: 6, lastUsed: daysAgo(7), conversations: 23 },
];

export const MOCK_INVENTORY: InventoryItem[] = Array.from({ length: 20 }, (_, i) => {
  const qty = i % 5 === 0 ? 0 : i % 3 === 0 ? 5 : 50 + i * 10;
  const reorder = 20;
  return {
    id: `inv-${i + 1}`,
    sku: `SKU-${String(i + 1).padStart(4, '0')}`,
    name: ['Ordinateur portable Pro', 'Écran 27" 4K', 'Clavier mécanique', 'Souris sans fil', 'Casque audio', 'Webcam HD', 'Disque SSD 1To', 'Routeur WiFi 6', 'Imprimante laser', 'Projecteur', 'Tablette graphique', 'Hub USB-C', 'Câble HDMI 2m', 'Support écran', 'Tapis de souris', 'Webcam 4K', 'Micro USB', 'Enceinte Bluetooth', 'Onduleur', 'Scanner'][i],
    category: ['IT', 'IT', 'Accessoires', 'Accessoires', 'Audio', 'Vidéo', 'Stockage', 'Réseau', 'Impression', 'Présentation', 'Design', 'Accessoires', 'Câbles', 'Mobilier', 'Accessoires', 'Vidéo', 'Audio', 'Audio', 'Alimentation', 'Impression'][i],
    quantity: qty,
    reorderLevel: reorder,
    warehouse: ['Paris Nord', 'Lyon Sud', 'Bordeaux'][i % 3],
    unitPrice: 50 + i * 120,
    status: qty === 0 ? 'out_of_stock' : qty < reorder ? 'low_stock' : 'in_stock',
  };
});

export const MOCK_EVENTS: CalendarEvent[] = Array.from({ length: 15 }, (_, i) => {
  const types: CalendarEvent['type'][] = ['meeting', 'deadline', 'reminder', 'task'];
  const colors = ['#4f46e5', '#ef4444', '#f59e0b', '#0d9488'];
  const dayOffset = i < 5 ? 0 : i < 10 ? 1 : i < 15 ? 2 : 3;
  const hour = 9 + i % 8;
  return {
    id: `event-${i + 1}`,
    title: ['Réunion équipe', 'Deadline projet', 'Rappel facture', 'Tâche CRM', 'Démo client', 'Formation', 'Point hebdo', 'Review sprint'][i % 8],
    type: types[i % 4],
    startDate: new Date(new Date().setDate(new Date().getDate() + dayOffset)).setHours(hour, 0, 0, 0) as unknown as string,
    endDate: new Date(new Date().setDate(new Date().getDate() + dayOffset)).setHours(hour + 1, 0, 0, 0) as unknown as string,
    color: colors[i % 4],
    location: i % 2 === 0 ? 'Salle de conférence A' : 'Visio',
    attendees: ['Jean Bernard', 'Sophie Martin', 'Pierre Dubois'].slice(0, (i % 3) + 1),
  };
});

export const MOCK_MEETINGS: Meeting[] = Array.from({ length: 8 }, (_, i) => ({
  id: `meeting-${i + 1}`,
  title: ['Revue trimestrielle Q3', 'Point commercial hebdo', 'Réunion produit', 'Comité de direction', 'Rétrospective sprint', 'Revue budget', 'Préparation salon', 'Onboarding nouveau client'][i],
  date: daysAgo(i * 2 - 3),
  duration: 60,
  attendees: Array.from({ length: (i % 4) + 2 }, (_, j) => ({
    id: `user-${j + 1}`,
    name: ['Jean Bernard', 'Sophie Martin', 'Pierre Dubois', 'Marie Lefevre', 'Lucas Thomas'][j % 5],
    avatarColor: randomColor(j),
  })),
  agenda: ['Point sur les KPIs', 'Discussion stratégie', 'Décisions à prendre', 'Actions à suivre'].slice(0, (i % 3) + 2),
  summary: i < 4 ? 'Réunion productive. L\'équipe a revu les objectifs du trimestre et identifié 3 priorités principales. Les métriques montrent une croissance de 15% sur le mois. Décision d\'investir dans le nouveau module CRM.' : undefined,
  actionItems: i < 4 ? [
    { id: uuid(), text: 'Préparer le rapport Q4', done: false, assignee: 'Pierre Dubois' },
    { id: uuid(), text: 'Contacter 5 prospects prioritaires', done: true, assignee: 'Sophie Martin' },
    { id: uuid(), text: 'Mettre à jour le roadmap produit', done: false, assignee: 'Jean Bernard' },
  ] : [],
  status: i < 4 ? 'completed' : 'upcoming',
  location: i % 2 === 0 ? 'Salle de conférence' : 'Visio Teams',
}));

export const MOCK_DOCUMENTS: DocumentItem[] = [
  { id: 'doc-1', name: 'Contrats', type: 'folder', size: 0, modifiedAt: daysAgo(1), modifiedBy: 'Marie Lefevre' },
  { id: 'doc-2', name: 'Factures', type: 'folder', size: 0, modifiedAt: daysAgo(2), modifiedBy: 'Pierre Dubois' },
  { id: 'doc-3', name: 'Rapports', type: 'folder', size: 0, modifiedAt: daysAgo(3), modifiedBy: 'Jean Bernard' },
  { id: 'doc-4', name: 'Présentations', type: 'folder', size: 0, modifiedAt: daysAgo(5), modifiedBy: 'Sophie Martin' },
  { id: 'doc-5', name: 'Contrat_TechSolutions_2024.pdf', type: 'pdf', size: 245678, parentId: 'doc-1', modifiedAt: daysAgo(1), modifiedBy: 'Marie Lefevre' },
  { id: 'doc-6', name: 'Facture_INV-2024-018.pdf', type: 'pdf', size: 128456, parentId: 'doc-2', modifiedAt: daysAgo(2), modifiedBy: 'Pierre Dubois' },
  { id: 'doc-7', name: 'Rapport_Trimestriel_Q3.xlsx', type: 'xlsx', size: 567890, parentId: 'doc-3', modifiedAt: daysAgo(3), modifiedBy: 'Jean Bernard', starred: true },
  { id: 'doc-8', name: 'Présentation_Commerciale.pptx', type: 'docx', size: 345678, parentId: 'doc-4', modifiedAt: daysAgo(5), modifiedBy: 'Sophie Martin' },
  { id: 'doc-9', name: 'Guide_Utilisateur.pdf', type: 'pdf', size: 890123, modifiedAt: daysAgo(7), modifiedBy: 'Lucas Thomas' },
  { id: 'doc-10', name: 'Logo_Acme.png', type: 'image', size: 45678, modifiedAt: daysAgo(10), modifiedBy: 'Sophie Martin' },
];
