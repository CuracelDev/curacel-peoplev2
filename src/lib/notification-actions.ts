export const NOTIFICATION_ACTION_GROUPS: Array<{ title: string; actions: string[] }> = [
  {
    title: 'Offers & Contracts',
    actions: [
      'OFFER_CREATED',
      'OFFER_UPDATED',
      'OFFER_SENT',
      'OFFER_VIEWED',
      'OFFER_SIGNED',
      'OFFER_DECLINED',
      'OFFER_CANCELLED',
      'OFFER_WEBHOOK_RECEIVED',
    ],
  },
  {
    title: 'Employees',
    actions: ['EMPLOYEE_CREATED', 'EMPLOYEE_UPDATED', 'EMPLOYEE_STATUS_CHANGED'],
  },
  {
    title: 'Onboarding',
    actions: ['ONBOARDING_STARTED', 'ONBOARDING_TASK_COMPLETED', 'ONBOARDING_COMPLETED'],
  },
  {
    title: 'Offboarding',
    actions: ['OFFBOARDING_STARTED', 'OFFBOARDING_TASK_COMPLETED', 'OFFBOARDING_COMPLETED'],
  },
  {
    title: 'Applications & Integrations',
    actions: [
      'APP_CREATED',
      'APP_ARCHIVED',
      'APP_RESTORED',
      'APP_CONNECTED',
      'APP_DISCONNECTED',
      'APP_ACCOUNT_PROVISIONED',
      'APP_ACCOUNT_DEPROVISIONED',
      'GOOGLE_USER_CREATED',
      'GOOGLE_USER_DISABLED',
      'GOOGLE_USER_DELETED',
      'GOOGLE_GROUPS_UPDATED',
      'SLACK_USER_CREATED',
      'SLACK_USER_DISABLED',
      'SLACK_CHANNELS_UPDATED',
    ],
  },
  {
    title: 'Provisioning Rules',
    actions: ['PROVISIONING_RULE_CREATED', 'PROVISIONING_RULE_UPDATED', 'PROVISIONING_RULE_DELETED'],
  },
  {
    title: 'Auth Activity',
    actions: ['USER_LOGIN', 'USER_LOGOUT'],
  },
]

export const ALL_NOTIFICATION_ACTIONS = NOTIFICATION_ACTION_GROUPS.flatMap((group) => group.actions)

const DEFAULT_EXCLUDED_ACTIONS = new Set(['USER_LOGIN', 'USER_LOGOUT'])

export const DEFAULT_EMAIL_NOTIFICATION_ACTIONS = ALL_NOTIFICATION_ACTIONS.filter(
  (action) => !DEFAULT_EXCLUDED_ACTIONS.has(action)
)
