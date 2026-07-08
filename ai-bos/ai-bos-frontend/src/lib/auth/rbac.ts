import { useAuth } from './store';

export function hasPermission(permission: string): boolean {
  return useAuth.getState().hasPermission(permission);
}

export function hasAnyPermission(permissions: string[]): boolean {
  return useAuth.getState().hasAnyPermission(permissions);
}

export function hasRole(role: string | string[]): boolean {
  const user = useAuth.getState().user;
  if (!user) return false;
  return Array.isArray(role) ? role.includes(user.role) : user.role === role;
}

// Permission constants for easy reference
export const PERMS = {
  CRM_READ: 'crm.contact.read',
  CRM_WRITE: 'crm.contact.write',
  LEAD_READ: 'crm.lead.read',
  LEAD_WRITE: 'crm.lead.write',
  FINANCE_READ: 'finance.invoice.read',
  FINANCE_WRITE: 'finance.invoice.write',
  HR_READ: 'hr.employee.read',
  HR_WRITE: 'hr.employee.write',
  PROJECT_READ: 'project.read',
  PROJECT_WRITE: 'project.write',
  AI_USE: 'ai.agent.use',
  COPILOT_USE: 'ai.copilot.use',
  ANALYTICS_READ: 'analytics.read',
  BI_READ: 'bi.read',
  WORKFLOW_WRITE: 'workflow.write',
  SETTINGS_TEAM: 'settings.team',
  SETTINGS_BILLING: 'settings.billing',
  ADMIN_AUDIT: 'admin.audit',
  ADMIN_FLAGS: 'admin.flags',
} as const;
