export const ADMIN_NOTIFICATION_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN'] as const
const ADMIN_NOTIFICATION_ROLE_SET = new Set(ADMIN_NOTIFICATION_ROLES)
export const HIDDEN_NOTIFICATION_ACTIONS = new Set(['USER_LOGIN', 'USER_LOGOUT'])

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false
  return ADMIN_NOTIFICATION_ROLE_SET.has(role)
}

export function isNotifiableAction(action: string): boolean {
  return !HIDDEN_NOTIFICATION_ACTIONS.has(action)
}

export function formatAuditAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}
