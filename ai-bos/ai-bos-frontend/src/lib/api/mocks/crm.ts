import type { Contact, Lead, Activity } from '@/lib/api/types';
import { uuid, daysAgo, hoursAgo, COMPANIES, FIRST_NAMES, LAST_NAMES, AVATAR_COLORS, randomColor } from './helpers';

const TAGS = ['VIP', 'Hot Lead', 'Newsletter', 'Partner', 'Enterprise', 'SMB', 'Referral', 'Cold', 'Warm', 'Decision Maker'];

export const MOCK_CONTACTS: Contact[] = Array.from({ length: 50 }, (_, i) => {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
  const company = COMPANIES[i % COMPANIES.length];
  const statuses: Contact['status'][] = ['active', 'active', 'active', 'lead', 'inactive', 'archived'];
  return {
    id: `contact-${i + 1}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    phone: `+33 6 ${String((i * 13) % 100).padStart(2, '0')} ${String((i * 7) % 100).padStart(2, '0')} ${String((i * 11) % 100).padStart(2, '0')} ${String((i * 17) % 100).padStart(2, '0')}`,
    company,
    position: ['CEO', 'CTO', 'Manager', 'Director', 'VP Sales', 'Head of Ops', 'Procurement', 'Marketing Lead'][i % 8],
    status: statuses[i % statuses.length],
    ownerId: `user-${(i % 5) + 1}`,
    ownerName: ['Jean Bernard', 'Sophie Martin', 'Pierre Dubois', 'Marie Lefevre', 'Lucas Thomas'][i % 5],
    tags: [TAGS[i % TAGS.length], TAGS[(i + 3) % TAGS.length]].filter((v, idx, a) => a.indexOf(v) === idx),
    lastActivityAt: hoursAgo(i * 7 + 3),
    createdAt: daysAgo(i * 5 + 10),
    avatarColor: randomColor(i),
  };
});

const LEAD_STAGES: Lead['stage'][] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const LEAD_TITLES = [
  'Refonte site web', 'Migration cloud', 'Audit sécurité', 'Implementation CRM',
  'Campagne marketing', 'Consultation juridique', 'Formation équipe', 'Maintenance applicative',
  'Developpement mobile', 'Stratégie digitale', 'Optimisation SEO', 'Analyse données',
];

export const MOCK_LEADS: Lead[] = Array.from({ length: 30 }, (_, i) => {
  const company = COMPANIES[i % COMPANIES.length];
  const stage = LEAD_STAGES[i % LEAD_STAGES.length];
  const value = (i + 1) * 2500 + (i % 7) * 1200;
  return {
    id: `lead-${i + 1}`,
    title: LEAD_TITLES[i % LEAD_TITLES.length],
    company,
    contactName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 5) % LAST_NAMES.length]}`,
    value,
    currency: 'EUR',
    stage,
    probability: stage === 'won' ? 100 : stage === 'lost' ? 0 : stage === 'negotiation' ? 75 : stage === 'proposal' ? 50 : stage === 'qualified' ? 30 : 10,
    ownerId: `user-${(i % 3) + 2}`,
    ownerName: ['Sophie Martin', 'Pierre Dubois', 'Marie Lefevre'][i % 3],
    ownerAvatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    expectedCloseDate: new Date(Date.now() + (i * 5 + 7) * 86400000).toISOString(),
    daysInStage: (i % 20) + 1,
    createdAt: daysAgo(i * 3 + 5),
  };
});

export const MOCK_ACTIVITIES: Activity[] = Array.from({ length: 20 }, (_, i) => {
  const types: Activity['type'][] = ['call', 'email', 'meeting', 'note', 'task'];
  return {
    id: uuid(),
    type: types[i % types.length],
    description: [
      'Appel de découverte avec le client',
      'Email de suivi envoyé',
      'Réunion de démonstration produit',
      'Note interne ajoutée',
      'Tâche de suivi créée',
    ][i % 5],
    contactId: `contact-${(i % 50) + 1}`,
    userId: `user-${(i % 5) + 1}`,
    userName: ['Jean Bernard', 'Sophie Martin', 'Pierre Dubois', 'Marie Lefevre', 'Lucas Thomas'][i % 5],
    createdAt: hoursAgo(i * 12 + 6),
  };
});
