import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/lib/auth/guards';
import { LoginPage } from '@/pages/LoginPage';
import { AutoLoginPage } from '@/pages/AutoLoginPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CRMContactsPage } from '@/pages/CRMContactsPage';
import { CRMPipelinePage } from '@/pages/CRMPipelinePage';
import { FinancePage } from '@/pages/FinancePage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { FinancePaymentsPage } from '@/pages/FinancePaymentsPage';
import { FinanceAccountingPage } from '@/pages/FinanceAccountingPage';
import { FinanceReportsPage } from '@/pages/FinanceReportsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { TasksPage } from '@/pages/TasksPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { MeetingsPage } from '@/pages/MeetingsPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { HREmployeesPage } from '@/pages/HREmployeesPage';
import { RecruitmentPage } from '@/pages/RecruitmentPage';
import { HROrgChartPage } from '@/pages/HROrgChartPage';
import { HRPayrollPage } from '@/pages/HRPayrollPage';
import { CopilotPage } from '@/pages/CopilotPage';
import { AgentsPage } from '@/pages/AgentsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { BIPage } from '@/pages/BIPage';
import { ForecastsPage } from '@/pages/ForecastsPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { SupportTicketsPage } from '@/pages/SupportTicketsPage';
import { MarketingCampaignsPage } from '@/pages/MarketingCampaignsPage';
import { InboxPage } from '@/pages/InboxPage';
import { SalesOrdersPage } from '@/pages/SalesOrdersPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ProcurementPage } from '@/pages/ProcurementPage';
import { ContractsPage } from '@/pages/ContractsPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { SettingsProfilePage } from '@/pages/settings/SettingsProfilePage';
import { SettingsOrgPage } from '@/pages/settings/SettingsOrgPage';
import { SettingsTeamPage } from '@/pages/settings/SettingsTeamPage';
import { SettingsBillingPage } from '@/pages/settings/SettingsBillingPage';
import { SettingsIntegrationsPage } from '@/pages/settings/SettingsIntegrationsPage';
import { SettingsNotificationsPage } from '@/pages/settings/SettingsNotificationsPage';
import { SettingsApiKeysPage } from '@/pages/settings/SettingsApiKeysPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';
import { AdminFlagsPage } from '@/pages/admin/AdminFlagsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AutoLoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="copilot" element={<CopilotPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="crm/contacts" element={<CRMContactsPage />} />
            <Route path="crm/pipeline" element={<CRMPipelinePage />} />
            <Route path="sales/orders" element={<SalesOrdersPage />} />
            <Route path="marketing/campaigns" element={<MarketingCampaignsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="finance/invoices" element={<InvoicesPage />} />
            <Route path="finance/payments" element={<FinancePaymentsPage />} />
            <Route path="finance/accounting" element={<FinanceAccountingPage />} />
            <Route path="finance/reports" element={<FinanceReportsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="procurement" element={<ProcurementPage />} />
            <Route path="hr/employees" element={<HREmployeesPage />} />
            <Route path="hr/org-chart" element={<HROrgChartPage />} />
            <Route path="hr/recruitment" element={<RecruitmentPage />} />
            <Route path="hr/payroll" element={<HRPayrollPage />} />
            <Route path="support/tickets" element={<SupportTicketsPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="bi" element={<BIPage />} />
            <Route path="forecasts" element={<ForecastsPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="settings/profile" element={<SettingsProfilePage />} />
            <Route path="settings/organization" element={<SettingsOrgPage />} />
            <Route path="settings/team" element={<SettingsTeamPage />} />
            <Route path="settings/billing" element={<SettingsBillingPage />} />
            <Route path="settings/integrations" element={<SettingsIntegrationsPage />} />
            <Route path="settings/notifications" element={<SettingsNotificationsPage />} />
            <Route path="settings/api-keys" element={<SettingsApiKeysPage />} />
            <Route path="admin/audit" element={<AdminAuditPage />} />
            <Route path="admin/flags" element={<AdminFlagsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
