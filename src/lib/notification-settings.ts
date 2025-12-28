import prisma from '@/lib/prisma'
import { getOrganization } from '@/lib/organization'
import { ADMIN_NOTIFICATION_ROLES } from '@/lib/notifications'
import { ALL_NOTIFICATION_ACTIONS, DEFAULT_EMAIL_NOTIFICATION_ACTIONS } from '@/lib/notification-actions'

const allowedActions = new Set(ALL_NOTIFICATION_ACTIONS)

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function normalizeActions(value: unknown, fallback: string[]): string[] {
  const actions = normalizeStringArray(value).filter((action) => allowedActions.has(action))
  return actions.length === 0 ? fallback : actions
}

function normalizeRecipients(value: unknown): string[] {
  return normalizeStringArray(value)
}

export type NotificationEmailSettings = {
  enabled: boolean
  actions: string[]
  recipients: string[]
  recipientMode: 'ALL_ADMINS' | 'INITIATOR' | 'SELECTED'
}

type NotificationSettingsRow = {
  notificationEmailEnabled?: boolean | null
  notificationEmailActions?: unknown
  notificationEmailRecipients?: unknown
  notificationEmailRecipientMode?: NotificationEmailSettings['recipientMode'] | null
}

async function readNotificationSettingsRaw(organizationId: string): Promise<NotificationSettingsRow | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<NotificationSettingsRow[]>(
      'select "notificationEmailEnabled", "notificationEmailActions", "notificationEmailRecipients", "notificationEmailRecipientMode" from "Organization" where id = $1',
      organizationId
    )
    return rows[0] ?? null
  } catch (error) {
    console.warn('Notification settings raw read failed:', error)
    return null
  }
}

async function updateNotificationSettingsRaw(
  organizationId: string,
  params: { enabled: boolean; actions: string[]; recipients: string[]; recipientMode: NotificationEmailSettings['recipientMode'] }
): Promise<NotificationSettingsRow | null> {
  try {
    await prisma.$executeRawUnsafe(
      'update "Organization" set "notificationEmailEnabled" = $1, "notificationEmailActions" = $2::jsonb, "notificationEmailRecipients" = $3::jsonb, "notificationEmailRecipientMode" = $4::"NotificationRecipientMode" where id = $5',
      params.enabled,
      JSON.stringify(params.actions),
      JSON.stringify(params.recipients),
      params.recipientMode,
      organizationId
    )
    return await readNotificationSettingsRaw(organizationId)
  } catch (error) {
    console.warn('Notification settings raw update failed:', error)
    return null
  }
}

export async function getNotificationEmailSettings(): Promise<NotificationEmailSettings> {
  const organization = await getOrganization()
  let orgSettings: NotificationSettingsRow | null = null

  try {
    orgSettings = await (prisma.organization as any).findUnique({
      where: { id: organization.id },
      select: {
        notificationEmailEnabled: true,
        notificationEmailActions: true,
        notificationEmailRecipients: true,
        notificationEmailRecipientMode: true,
      },
    })
  } catch (error) {
    console.warn('Notification settings fallback (missing columns):', error)
    orgSettings = await readNotificationSettingsRaw(organization.id)
  }
  const adminUsers = await listAdminUsers()
  const adminUserIds = new Set(adminUsers.map((user) => user.id))

  const rawActions = orgSettings?.notificationEmailActions
  const actions =
    rawActions === null || rawActions === undefined
      ? [...DEFAULT_EMAIL_NOTIFICATION_ACTIONS]
      : normalizeActions(rawActions, [])

  const rawRecipients = orgSettings?.notificationEmailRecipients
  const recipients =
    rawRecipients === null || rawRecipients === undefined
      ? adminUsers.map((user) => user.id)
      : normalizeRecipients(rawRecipients).filter((id) => adminUserIds.has(id))

  const enabled = orgSettings?.notificationEmailEnabled ?? true
  const recipientMode = orgSettings?.notificationEmailRecipientMode ?? 'ALL_ADMINS'

  return { enabled, actions, recipients, recipientMode }
}

export async function listAdminUsers() {
  return prisma.user.findMany({
    where: { role: { in: [...ADMIN_NOTIFICATION_ROLES] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })
}

export async function updateNotificationEmailSettings(params: {
  enabled: boolean
  actions: string[]
  recipients: string[]
  recipientMode: 'ALL_ADMINS' | 'INITIATOR' | 'SELECTED'
}): Promise<NotificationEmailSettings> {
  const organization = await getOrganization()
  const sanitizedActions = normalizeActions(params.actions, [])
  const adminUsers = await prisma.user.findMany({
    where: {
      id: { in: params.recipients },
      role: { in: [...ADMIN_NOTIFICATION_ROLES] },
    },
    select: { id: true },
  })
  const sanitizedRecipients = adminUsers.map((user) => user.id)

  let updated: NotificationSettingsRow | null = null

  try {
    updated = await (prisma.organization as any).update({
      where: { id: organization.id },
      data: {
        notificationEmailEnabled: params.enabled,
        notificationEmailActions: sanitizedActions,
        notificationEmailRecipients: sanitizedRecipients,
        notificationEmailRecipientMode: params.recipientMode,
      },
      select: {
        notificationEmailEnabled: true,
        notificationEmailActions: true,
        notificationEmailRecipients: true,
        notificationEmailRecipientMode: true,
      },
    })
  } catch (error) {
    console.warn('Notification settings update fallback (missing columns):', error)
    updated = await updateNotificationSettingsRaw(organization.id, {
      enabled: params.enabled,
      actions: sanitizedActions,
      recipients: sanitizedRecipients,
      recipientMode: params.recipientMode,
    })
  }

  if (!updated) {
    throw new Error('Failed to save notification settings.')
  }

  return {
    enabled: updated?.notificationEmailEnabled ?? params.enabled ?? true,
    actions: normalizeActions(updated?.notificationEmailActions ?? sanitizedActions, []),
    recipients: normalizeRecipients(updated?.notificationEmailRecipients ?? sanitizedRecipients),
    recipientMode: updated?.notificationEmailRecipientMode ?? params.recipientMode ?? 'ALL_ADMINS',
  }
}
