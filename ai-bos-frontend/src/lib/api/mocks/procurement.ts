import type { PurchaseOrder, Supplier } from '@/lib/api/types'
import { uuid, daysAgo, daysFromNow, COMPANIES, randomInt } from './helpers'

const SUPPLIER_STATUSES: Supplier['status'][] = ['active', 'active', 'active', 'paused', 'blacklisted']

export const MOCK_SUPPLIERS: Supplier[] = Array.from({ length: 14 }, (_, i) => {
  const company = COMPANIES[i % COMPANIES.length]
  return {
    id: `supp-${i + 1}`,
    name: company,
    email: `achats@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    phone: `+33 1 ${String((i * 17) % 90 + 10).padStart(2, '0')} ${String((i * 23) % 90 + 10).padStart(2, '0')}`,
    rating: 3 + (i % 3) * 0.5, // 3.0, 3.5, 4.0
    country: ['France', 'Belgique', 'Suisse', 'Maroc'][i % 4],
    status: SUPPLIER_STATUSES[i % SUPPLIER_STATUSES.length],
  }
})

const PO_STATUSES: PurchaseOrder['status'][] = ['draft', 'submitted', 'approved', 'received', 'cancelled']

const SUPPLIER_ID_BY_INDEX = (i: number) => `supp-${(i % MOCK_SUPPLIERS.length) + 1}`

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = Array.from({ length: 22 }, (_, i) => {
  const supplierIndex = i % MOCK_SUPPLIERS.length
  const supplier = MOCK_SUPPLIERS[supplierIndex]
  const status = PO_STATUSES[i % PO_STATUSES.length]
  const totalAmount = 15000 + i * 1200 + (status === 'received' ? 3000 : 0)

  return {
    id: `po-${i + 1}`,
    poNumber: `PO-${2024 + (i % 2)}-${String(i + 1).padStart(4, '0')}`,
    supplierId: supplier.id,
    supplierName: supplier.name,
    status,
    totalAmount,
    currency: 'EUR',
    createdAt: daysAgo(i * 2 + 3),
    expectedAt: status === 'received' ? daysAgo(i + 1) : daysFromNow(i % 10 + 7),
    ownerName: ['Sophie Martin', 'Pierre Dubois', 'Jean Bernard'][i % 3],
    itemCount: randomInt(3, 18),
  }
})

