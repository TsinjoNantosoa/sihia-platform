import type { Invoice, FinanceOverview, Transaction, Order } from '@/lib/api/types';
import { uuid, daysAgo, daysFromNow, COMPANIES } from './helpers';

const INVOICE_STATUSES: Invoice['status'][] = ['draft', 'sent', 'paid', 'paid', 'paid', 'overdue', 'cancelled'];

export const MOCK_INVOICES: Invoice[] = Array.from({ length: 20 }, (_, i) => {
  const company = COMPANIES[i % COMPANIES.length];
  const status = INVOICE_STATUSES[i % INVOICE_STATUSES.length];
  const amount = (i + 1) * 1200 + (i % 5) * 800;
  const taxAmount = Math.round(amount * 0.2);
  const lineCount = (i % 3) + 1;
  const lineItems = Array.from({ length: lineCount }, (_, j) => {
    const qty = (j + 1) * (i % 3 + 1);
    const unitPrice = Math.round(amount / (lineCount * qty));
    return {
      id: uuid(),
      description: ['Consultation', 'Développement', 'Licence logicielle', 'Formation', 'Support technique'][j % 5],
      quantity: qty,
      unitPrice,
      taxRate: 20,
      total: qty * unitPrice,
    };
  });
  return {
    id: `inv-${i + 1}`,
    invoiceNumber: `INV-2024-${String(i + 1).padStart(3, '0')}`,
    clientId: `contact-${(i % 50) + 1}`,
    clientName: company,
    amount,
    taxAmount,
    totalAmount: amount + taxAmount,
    currency: 'EUR',
    status,
    issueDate: daysAgo(i * 5 + 3),
    dueDate: daysAgo(i * 5 - 30 + 3),
    paidDate: status === 'paid' ? daysAgo(i * 2) : undefined,
    lineItems,
  };
});

export const MOCK_TRANSACTIONS: Transaction[] = Array.from({ length: 15 }, (_, i) => {
  const isIncome = i % 3 !== 0;
  return {
    id: uuid(),
    description: isIncome
      ? `Paiement reçu — ${COMPANIES[i % COMPANIES.length]}`
      : ['Loyer bureau', 'Salaires', 'Abonnement SaaS', 'Fournitures', 'Marketing ads'][i % 5],
    amount: isIncome ? (i + 1) * 1500 + 500 : (i + 1) * 800 + 200,
    type: isIncome ? 'income' : 'expense',
    category: isIncome ? 'Ventes' : ['Loyer', 'RH', 'IT', 'Operations', 'Marketing'][i % 5],
    date: daysAgo(i * 2 + 1),
    account: ['Compte courant', 'Comme épargne', 'PayPal'][i % 3],
  };
});

export const MOCK_FINANCE_OVERVIEW: FinanceOverview = {
  cashBalance: 482300,
  arOutstanding: 156800,
  apOutstanding: 89200,
  burnRate: 145000,
  monthlyRevenue: Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2024, i, 1).toLocaleDateString('fr-FR', { month: 'short' });
    return {
      month,
      revenue: 180000 + i * 12000 + (i % 3) * 5000,
      expenses: 120000 + i * 3000 + (i % 4) * 2000,
    };
  }),
  agingReceivables: [
    { bucket: '0-30 jours', amount: 78400 },
    { bucket: '31-60 jours', amount: 42100 },
    { bucket: '61-90 jours', amount: 23800 },
    { bucket: '90+ jours', amount: 12500 },
  ],
  recentTransactions: MOCK_TRANSACTIONS.slice(0, 8),
};

const ORDER_STATUSES: Order['status'][] = ['draft', 'sent', 'accepted', 'fulfilled', 'invoiced', 'cancelled'];

export const MOCK_ORDERS: Order[] = Array.from({ length: 15 }, (_, i) => {
  const company = COMPANIES[i % COMPANIES.length];
  const amount = (i + 1) * 3500 + (i % 4) * 1200;
  return {
    id: `order-${i + 1}`,
    orderNumber: `ORD-2024-${String(i + 1).padStart(3, '0')}`,
    customerId: `contact-${(i % 50) + 1}`,
    customerName: company,
    status: ORDER_STATUSES[i % ORDER_STATUSES.length],
    amount,
    currency: 'EUR',
    date: daysAgo(i * 4 + 2),
    salesRepId: `user-${(i % 3) + 2}`,
    salesRepName: ['Sophie Martin', 'Pierre Dubois', 'Marie Lefevre'][i % 3],
    lineItems: Array.from({ length: (i % 3) + 1 }, (_, j) => ({
      id: uuid(),
      description: ['Service premium', 'Module additionnel', 'Formation', 'Support annuel'][j % 4],
      quantity: (j + 1) * 2,
      unitPrice: Math.round(amount / ((i % 3 + 1) * 2)),
      total: amount,
    })),
  };
});
