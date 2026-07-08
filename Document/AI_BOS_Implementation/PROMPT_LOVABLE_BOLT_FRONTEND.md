# PROMPT LOVABLE / BOLT — Frontend AI BOS complet

> Copier-coller le bloc **« PROMPT À COPIER »** ci-dessous dans Lovable.dev ou Bolt.new  
> Mode : **Frontend uniquement** — mocks + couche API prête pour brancher FastAPI plus tard

---

## PROMPT À COPIER

```
# PROJECT: AI BOS — AI Business Operating System (Frontend Shell + All Modules UI)

Build a complete, production-grade B2B SaaS frontend application. BACKEND DOES NOT EXIST YET — use realistic mock data + a centralized API service layer that switches to real endpoints when VITE_API_URL is set.

---

## 1. PRODUCT VISION

AI BOS is the intelligent operating system for businesses — NOT a classic ERP. One unified app where AI is everywhere: copilot widget on every screen, agents, workflows, analytics, CRM, finance, HR, projects, etc.

Think: Notion + Salesforce + Microsoft Copilot + Power BI + Monday.com in ONE platform.

The user NEVER leaves the app. All modules are connected. AI can answer: "Which clients haven't paid?", "Forecast Q4 revenue", "Summarize yesterday's meeting", "Create a marketing campaign".

Target users: SMB to mid-market companies (10–5000 employees). Roles: CEO, CFO, Sales Director, HR Manager, Operations, Admin.

---

## 2. TECH STACK (MANDATORY — do not substitute)

- React 18+ / 19 with TypeScript (strict)
- Vite
- React Router v6 OR TanStack Router
- TanStack Query (React Query) for server state
- Zustand for client state (auth, i18n, UI preferences, org context)
- Tailwind CSS
- shadcn/ui components (Button, Card, Dialog, Table, Tabs, Sheet, Dropdown, Command, Calendar, Badge, Avatar, Sonner toasts)
- Recharts for charts
- Lucide React icons
- date-fns for dates
- react-hook-form + zod for forms
- Framer Motion for subtle animations (copilot, modals)

DO NOT use Next.js unless required by platform. Prefer SPA with Vite.

---

## 3. DESIGN SYSTEM — "AI BOS Pro"

Modern, calm, enterprise-trustworthy. Inspired by Linear + Notion + Stripe Dashboard.

### Colors (CSS variables in :root)
- Primary: deep indigo `#4F46E5` (oklch ~ 0.51 0.23 277)
- Secondary: teal accent `#0D9488`
- Background: warm off-white `#FAFAF9`
- Surface/card: white `#FFFFFF`
- Muted text: `#64748B`
- Success: `#10B981` | Warning: `#F59E0B` | Danger: `#EF4444`
- Sidebar: dark slate `#0F172A` with light text
- AI accent gradient: indigo → violet for copilot elements

### Typography
- Font: Inter (Google Fonts)
- Headings: semibold, tight tracking
- Body: 14px base, 16px on desktop

### Layout
- Collapsible sidebar (desktop 260px, collapsed 72px icons only)
- Topbar: search (Command palette ⌘K), notifications bell, org switcher, user menu, language switcher
- Content max-width: 1400px
- Mobile: hamburger drawer sidebar, responsive tables → cards

### UI patterns
- KPI cards with trend arrows (+12% vs last month)
- Data tables: sortable, filterable, pagination, row actions
- Empty states with illustration + CTA
- Skeleton loaders on all async data
- Toast notifications for success/error
- Confirm dialogs for destructive actions
- Status badges (active, pending, overdue, won, lost)

---

## 4. ARCHITECTURE — FOLDER STRUCTURE

src/
├── components/
│   ├── layout/          # AppLayout, Sidebar, Topbar, OrgSwitcher
│   ├── shared/          # KpiCard, DataTable, StatusBadge, PermissionGuard, EmptyState
│   ├── ui/              # shadcn primitives
│   ├── copilot/         # CopilotWidget (floating), CopilotPanel, AgentSelector
│   └── modules/         # Feature-specific components per module
├── pages/ OR routes/    # One file per route
├── lib/
│   ├── api/
│   │   ├── client.ts    # fetch wrapper with auth headers, 401 refresh, correlation ID
│   │   ├── services.ts  # ALL API calls — mock when no VITE_API_URL
│   │   ├── types.ts     # TypeScript interfaces matching future API
│   │   └── mocks/       # Realistic mock data per module
│   ├── auth/
│   │   ├── store.ts     # Zustand: user, token, refreshToken, permissions, orgId
│   │   ├── rbac.ts      # Permission checks
│   │   └── guards.tsx   # ProtectedRoute, RequirePermission
│   └── i18n/
│       ├── store.ts     # locale: fr | en | ar, RTL for ar
│       └── dictionaries.ts
├── hooks/
└── App.tsx

### API client pattern (CRITICAL)

```typescript
// lib/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || '';
const USE_MOCKS = !API_URL || import.meta.env.VITE_USE_MOCKS === 'true';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (USE_MOCKS) throw new MockModeError(path); // caught by services.ts
  const token = useAuth.getState().token;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      'X-Correlation-ID': crypto.randomUUID(),
      'X-Tenant-Id': useAuth.getState().orgId || '',
      ...options?.headers,
    },
  });
  if (res.status === 401) { /* trigger refresh */ }
  if (!res.ok) throw new ApiError(res);
  return res.json();
}
```

Every service function: try apiFetch → catch → return mock data. This allows zero frontend changes when backend is ready.

---

## 5. AUTHENTICATION & RBAC

### Pages
- `/login` — email + password, demo accounts buttons, forgot password link (UI only)
- `/403` — access denied page
- `/onboarding` — welcome wizard for new org (3 steps: company info, invite team, connect integrations)

### Demo accounts (show on login page)
| Email | Password | Role |
|-------|----------|------|
| ceo@demo.aibos.io | demo1234 | owner (all permissions) |
| sales@demo.aibos.io | demo1234 | sales_manager |
| finance@demo.aibos.io | demo1234 | finance_manager |
| hr@demo.aibos.io | demo1234 | hr_manager |
| staff@demo.aibos.io | demo1234 | staff (limited) |

### Roles & permissions (implement PermissionGuard)
- owner, admin, sales_manager, finance_manager, hr_manager, project_manager, staff, viewer
- Permissions format: `crm.contact.read`, `finance.invoice.write`, `ai.agent.use`, etc.
- Sidebar items hidden if no permission
- Buttons disabled/hidden based on role

### Auth store
- login(), logout(), logoutAll(), refreshToken on 401
- Persist to localStorage
- Redirect to /login if unauthenticated
- All routes under /app/* protected

---

## 6. GLOBAL SHELL FEATURES

### Sidebar navigation (grouped, collapsible sections)

**Overview**
- Dashboard (Executive)
- AI Copilot (full page chat)
- Inbox / Notifications

**Sales & CRM**
- CRM — Contacts & Accounts
- CRM — Leads & Pipeline
- Sales — Quotes & Orders
- Marketing — Campaigns

**Finance**
- Finance — Overview
- Invoices
- Payments & Treasury
- Accounting — Ledger (read-only UI)
- Reports & Exports

**Operations**
- Projects
- Tasks (Kanban board)
- Calendar
- Meetings
- Documents (file manager UI)
- Inventory
- Procurement

**People**
- HR — Employees
- HR — Org Chart
- Recruitment
- Payroll (summary UI)

**Support & Legal**
- Customer Support (tickets)
- Contracts
- Knowledge Base

**Intelligence**
- Analytics
- Business Intelligence
- ML Forecasts
- Workflows (automation builder UI)
- Agents (AI agents gallery)

**Platform**
- Settings — Profile
- Settings — Organization
- Settings — Team & Roles (RBAC admin)
- Settings — Billing & Subscription
- Settings — Integrations & API Keys
- Settings — Notifications preferences
- Admin — Audit Logs
- Admin — Feature Flags (owner only)

### Topbar
- Global search (Command palette ⌘K): search contacts, invoices, tasks, documents, ask AI
- Org switcher dropdown (multi-tenant): "Acme Corp", "Acme EU", "Demo Org"
- Notification center (dropdown with unread count)
- Language: FR | EN | AR (toggle RTL for Arabic)
- User avatar menu: profile, settings, logout, logout all devices
- API health indicator dot (green/yellow/red) — mock status

### Copilot Widget (FLOATING — on every authenticated page)
- Bottom-right FAB button with AI sparkle icon
- Expandable chat panel (400px wide, 600px tall)
- Features:
  - Streaming text animation (simulate SSE with typing effect)
  - Suggested prompts chips: "Résumé du jour", "Clients impayés", "Prévision CA"
  - Agent selector dropdown: CEO Agent, Sales Agent, Finance Agent, HR Agent, Data Analyst
  - Voice input button (UI only, show recording state)
  - Speaker button on bot messages (UI only)
  - Markdown rendering in messages
  - Context badge: "Context: Finance module" based on current route
- Separate full-page copilot at `/app/copilot` with history sidebar

---

## 7. BUILD EVERY PAGE — DETAILED REQUIREMENTS

### 7.1 Executive Dashboard `/app/dashboard`
- 6 KPI cards: Revenue MTD, Pipeline Value, Active Customers, Open Tickets, Cash Position, Team Headcount
- Revenue chart (12 months line chart, Recharts)
- Pipeline funnel chart
- Recent activity feed (timeline)
- AI insight card: "💡 3 clients haven't paid in 30+ days — [View]"
- Upcoming tasks & meetings widget
- Quick actions: New Invoice, New Lead, New Task, Ask AI

### 7.2 CRM — Contacts `/app/crm/contacts`
- Table: name, company, email, phone, status, owner, last activity, tags
- Search, filters (status, owner, tags), pagination
- Create/Edit contact modal (form with validation)
- Contact detail slide-over: timeline of activities, related deals, notes
- Bulk actions: tag, assign, export CSV

### 7.3 CRM — Leads & Pipeline `/app/crm/pipeline`
- Kanban board: columns New | Qualified | Proposal | Negotiation | Won | Lost
- Drag-and-drop cards (visual only, update mock state)
- Card: company, value €, probability %, owner avatar, days in stage
- Pipeline summary bar at top: total value per stage
- Filter by owner, date range

### 7.4 Sales — Quotes & Orders `/app/sales/orders`
- Table: order #, customer, amount, status, date, sales rep
- Status flow: draft → sent → accepted → fulfilled → invoiced
- Create quote wizard (3 steps)
- Order detail page with line items table

### 7.5 Finance — Overview `/app/finance`
- KPIs: Cash balance, AR outstanding, AP outstanding, burn rate
- Cash flow chart (in/out bars)
- Aging receivables chart (30/60/90 days)
- Recent transactions list
- AI alert: "Unusual expense detected"

### 7.6 Finance — Invoices `/app/finance/invoices`
- Table: #, client, amount, status (draft/sent/paid/overdue), due date
- Create invoice form with line items, tax, PDF preview button (UI mock)
- Send reminder button
- Filter by status, client, date

### 7.7 Projects `/app/projects`
- Grid of project cards with progress bar, team avatars, deadline
- Project detail: tabs Overview | Tasks | Timeline | Documents | Team
- Gantt-style timeline (simplified bar chart)

### 7.8 Tasks — Kanban `/app/tasks`
- Kanban: To Do | In Progress | Review | Done
- Drag cards, assignee, priority flag, due date, tags
- List view toggle
- My tasks filter

### 7.9 Calendar `/app/calendar`
- Month/week/day views
- Events: meetings, deadlines, reminders
- Create event modal
- Color-coded by type

### 7.10 Meetings `/app/meetings`
- List of past/upcoming meetings
- Meeting detail: attendees, agenda, AI-generated summary (mock text), action items checklist
- "Record & transcribe" button (UI only)

### 7.11 Documents `/app/documents`
- Folder tree sidebar + file grid
- Upload zone (drag & drop UI)
- File types: PDF, DOCX, XLSX, images
- Preview panel
- AI actions: "Summarize", "Extract data"

### 7.12 HR — Employees `/app/hr/employees`
- Employee directory table/cards
- Org chart visualization (tree diagram)
- Employee profile: role, department, manager, start date, documents

### 7.13 Recruitment `/app/hr/recruitment`
- Job openings table
- Kanban pipeline: Applied | Screening | Interview | Offer | Hired
- Candidate cards with score badge

### 7.14 Marketing — Campaigns `/app/marketing/campaigns`
- Campaign list with status, reach, open rate, conversions
- Campaign builder wizard (audience, content, schedule)
- Email preview panel

### 7.15 Customer Support `/app/support/tickets`
- Ticket table: #, subject, customer, priority, status, agent, SLA countdown
- Ticket detail: conversation thread, internal notes, AI suggested reply
- Status: open | pending | resolved | closed

### 7.16 Contracts `/app/contracts`
- Contract list with expiry dates, value, parties
- Alert for contracts expiring in 30 days
- Contract detail with key clauses highlighted (mock)

### 7.17 Knowledge Base `/app/knowledge`
- Article list with categories
- Rich article reader
- Search with AI answer box at top

### 7.18 Analytics `/app/analytics`
- Date range picker (3m / 6m / 12m / custom)
- Multiple chart types: revenue, users, conversion, churn
- Export CSV / PDF buttons
- Comparison vs previous period

### 7.19 Business Intelligence `/app/bi`
- Report gallery (pre-built reports as cards)
- Report viewer with filters and chart
- "Ask a question" NL input → mock AI table result
- Scheduled reports list

### 7.20 ML Forecasts `/app/forecasts`
- Forecast chart 7d / 30d / 90d toggle
- Confidence interval band (shaded area)
- Model metadata card: model name, version, MAE, last trained
- Recommendations list from AI

### 7.21 Workflows `/app/workflows`
- Workflow list (active/inactive)
- Visual workflow builder canvas:
  - Trigger nodes: schedule, webhook, record created, email received
  - Action nodes: send email, call API, run AI agent, create task, update record
  - Condition nodes: if/else
  - Connect nodes with lines (react-flow or similar)
- Execution history log table
- "Run now" button

### 7.22 AI Agents Gallery `/app/agents`
- Grid of agent cards: CEO, Sales, Finance, Marketing, Legal, HR, Data Analyst, Project Manager, Support, Meeting, Compliance
- Each card: name, description, status (active/idle), last used, tools count
- Agent detail page: configure instructions, view tools, test chat, execution logs

### 7.23 Inventory `/app/inventory`
- Stock levels table: SKU, product, quantity, warehouse, reorder level
- Low stock alerts
- Movement history

### 7.24 Settings pages `/app/settings/*`
- Profile: name, email, avatar, password change, 2FA toggle (UI)
- Organization: name, logo upload, address, timezone, currency
- Team: user table CRUD, invite modal, role assignment, suspend user
- Billing: current plan card (Starter/Pro/Enterprise), usage meters (seats, AI tokens, storage), upgrade CTA, invoice history
- Integrations: grid of integration cards (Slack, Google, Stripe, Zapier) with connect toggles
- Notifications: email/SMS/push preferences matrix
- API Keys: create/revoke keys table

### 7.25 Admin `/app/admin/*`
- Audit logs: searchable table (timestamp, user, action, resource, IP)
- Feature flags: toggle list per feature per org

---

## 8. MOCK DATA REQUIREMENTS

Generate REALISTIC mock data (French company names acceptable, mix FR/EN):
- 50 contacts, 30 leads, 20 invoices, 15 projects, 40 tasks
- 25 employees, 10 tickets, 8 campaigns, 5 workflows
- 12 months of revenue data for charts
- 3 organizations for org switcher
- Consistent IDs (uuid format)
- Dates relative to today

Store mocks in `src/lib/api/mocks/` separated by module.

---

## 9. FUTURE API ENDPOINTS (implement in services.ts as comments + types)

When VITE_API_URL is set, call these endpoints:

### Auth
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
GET  /api/v1/auth/me

### Platform
GET  /api/v1/platform/organizations
GET  /api/v1/platform/organizations/:id
PATCH /api/v1/platform/organizations/:id
GET  /api/v1/platform/users
POST /api/v1/platform/users
PATCH /api/v1/platform/users/:id
DELETE /api/v1/platform/users/:id
GET  /api/v1/platform/audit-logs
GET  /api/v1/platform/billing/subscription
GET  /api/v1/platform/billing/usage
GET  /api/v1/platform/notifications
PATCH /api/v1/platform/notifications/preferences
GET  /health
GET  /health/details

### CRM
GET/POST/PATCH/DELETE /api/v1/crm/contacts
GET/POST/PATCH/DELETE /api/v1/crm/leads
GET/PATCH /api/v1/crm/pipeline
GET/POST /api/v1/crm/activities

### Sales
GET/POST/PATCH /api/v1/sales/quotes
GET/POST/PATCH /api/v1/sales/orders

### Finance
GET /api/v1/finance/overview
GET/POST/PATCH /api/v1/finance/invoices
POST /api/v1/finance/invoices/:id/send
GET /api/v1/finance/payments
GET /api/v1/finance/transactions

### Projects & Tasks
GET/POST/PATCH /api/v1/projects
GET/POST/PATCH /api/v1/tasks

### Calendar & Meetings
GET/POST/PATCH/DELETE /api/v1/calendar/events
GET/POST /api/v1/meetings
GET /api/v1/meetings/:id/summary

### Documents
GET/POST/DELETE /api/v1/documents
POST /api/v1/documents/upload
POST /api/v1/documents/:id/summarize

### HR
GET/POST/PATCH /api/v1/hr/employees
GET /api/v1/hr/org-chart
GET/POST /api/v1/hr/jobs
GET/POST/PATCH /api/v1/hr/candidates

### Marketing
GET/POST/PATCH /api/v1/marketing/campaigns
GET /api/v1/marketing/campaigns/:id/stats

### Support
GET/POST/PATCH /api/v1/support/tickets
POST /api/v1/support/tickets/:id/reply
POST /api/v1/support/tickets/:id/ai-suggest

### Contracts
GET/POST/PATCH /api/v1/contracts

### Knowledge
GET/POST/PATCH /api/v1/knowledge/articles
POST /api/v1/knowledge/search

### Analytics & BI
GET /api/v1/analytics/kpis
GET /api/v1/analytics/revenue?period=12m
GET /api/v1/analytics/export/csv
GET /api/v1/analytics/export/pdf
GET /api/v1/bi/reports
POST /api/v1/bi/query (NL to data)

### ML
GET /api/v1/ml/forecast?horizon=7d|30d|90d
GET /api/v1/ml/metrics

### AI & Copilot
GET  /api/v1/ai/ui-config
GET  /api/v1/ai/conversations
GET  /api/v1/ai/conversations/:id/history
POST /api/v1/ai/query-stream (SSE)
POST /api/v1/ai/transcribe (multipart audio)
POST /api/v1/ai/speak
GET  /api/v1/ai/agents
GET  /api/v1/ai/agents/:id
POST /api/v1/ai/agents/:id/run

### Workflows
GET/POST/PATCH/DELETE /api/v1/workflows
POST /api/v1/workflows/:id/run
GET /api/v1/workflows/:id/executions

### Inventory
GET/POST/PATCH /api/v1/inventory/items
GET /api/v1/inventory/movements
GET /api/v1/inventory/alerts

---

## 10. i18n

Support 3 languages: French (default), English, Arabic.
- All UI strings in dictionaries.ts
- useT() hook
- When locale=ar: document.documentElement.dir = 'rtl', mirror sidebar to right
- Language switcher in topbar

Key namespaces: common, nav, auth, dashboard, crm, finance, hr, ai, settings, errors

---

## 11. ERROR HANDLING & UX

- 401: auto refresh token → retry → login redirect
- 403: redirect to /403 page
- 404: not found page for unknown routes
- 500: toast "Server error, please retry"
- Network error: toast + retry button
- All list pages: loading skeleton, empty state, error state
- Optimistic updates on Kanban drag (with rollback on error)

---

## 12. ENVIRONMENT VARIABLES

```env
VITE_API_URL=              # empty = mocks mode
VITE_USE_MOCKS=true          # force mocks even with API URL
VITE_APP_NAME=AI BOS
VITE_DEFAULT_LOCALE=fr
VITE_AI_COPILOT_ENABLED=true
```

---

## 13. WHAT NOT TO BUILD

- NO backend, NO database, NO serverless functions
- NO real OpenAI calls (simulate copilot responses with mock delays)
- NO real Stripe (billing UI only)
- NO real file upload to cloud (local preview only)
- NO email sending

---

## 14. QUALITY BAR

- Every page must be visually complete and navigable
- Mobile responsive (sidebar collapses, tables become cards)
- Accessible: focus rings, aria labels, keyboard nav for command palette
- No placeholder "Lorem ipsum" — use realistic business data
- Consistent spacing and component usage throughout
- Dark sidebar + light content area
- Professional SaaS polish level: comparable to Linear, Attio, or Stripe Dashboard

---

## 15. BUILD ORDER (follow this sequence)

Phase 1: Shell (layout, auth, routing, mocks infrastructure, design tokens)
Phase 2: Dashboard + CRM + Finance (core business value)
Phase 3: Projects, Tasks, Calendar, HR
Phase 4: Copilot widget + Agents gallery + full copilot page
Phase 5: Analytics, BI, Forecasts
Phase 6: Workflows builder, Support, Marketing, Documents
Phase 7: Settings, Admin, Billing, i18n, polish

Start with Phase 1 and Phase 2 completely before moving on.

---

## 16. BRANDING

App name: **AI BOS**
Tagline: "The Intelligent Operating System for Business"
Logo: abstract geometric "A" mark with indigo gradient (generate simple SVG)
Favicon: same mark

END OF SPEC — Build the complete frontend now.
```

---

## Notes d'utilisation

| Plateforme | Conseil |
|------------|---------|
| **Lovable** | Coller le prompt en entier dans le chat initial. Ajouter : « Build Phase 1 and 2 first » si la limite de tokens coupe. |
| **Bolt.new** | Même prompt. Si trop long, coller sections 1–6 puis demander « continue with section 7 pages ». |
| **v0.dev** | Utiliser sections 3 (design) + 7 (pages) pour générer composants page par page. |

### Après génération

1. Exporter le code vers GitHub
2. Brancher le backend FastAPI en définissant `VITE_API_URL=http://127.0.0.1:8000`
3. Remplacer les mocks module par module dans `services.ts`
4. Référence endpoints : [README_13_API.md](README_13_API.md)

### Lien documentation

- Architecture frontend : [README_03_Frontend.md](README_03_Frontend.md)
- Migration SIH IA : [README_35_MigrationFromSIHIA.md](README_35_MigrationFromSIHIA.md)
