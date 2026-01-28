import { sendEmail } from '@/lib/email'
import { getOrganizationName } from '@/lib/organization'
import prisma from '@/lib/prisma'
import { formatAuditAction, isAdminRole } from '@/lib/notifications'
import { getNotificationEmailSettings, listAdminUsers } from '@/lib/notification-settings'
import { formatDateTime } from '@/lib/utils'

function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  return raw || 'http://localhost:3000'
}

function formatActorName(params: {
  actor?: { name?: string | null; email?: string | null } | null
  actorEmail?: string | null
}): string {
  return params.actor?.name || params.actorEmail || params.actor?.email || 'System'
}

export async function notifyAdminsOfAuditLog(params: {
  id: string
  action: string
  resourceType: string
  resourceId?: string | null
  actorId?: string | null
  actorEmail?: string | null
  actor?: { name?: string | null; email?: string | null } | null
  createdAt: Date
}): Promise<void> {
  try {
    const settings = await getNotificationEmailSettings()
    if (!settings.enabled) return
    if (!settings.actions.includes(params.action)) return

    const adminUsers = await listAdminUsers()
    let recipients = adminUsers

    if (settings.recipientMode === 'SELECTED') {
      const selectedIds = new Set(settings.recipients)
      recipients = adminUsers.filter((user) => selectedIds.has(user.id))
    }

    if (settings.recipientMode === 'INITIATOR') {
      const actorById = params.actorId
        ? await prisma.user.findUnique({
            where: { id: params.actorId },
            select: { id: true, email: true, role: true },
          })
        : null
      const actorByEmail = !actorById && params.actorEmail
        ? await prisma.user.findUnique({
            where: { email: params.actorEmail },
            select: { id: true, email: true, role: true },
          })
        : null
      const actorUser = actorById || actorByEmail
      const isAdmin = isAdminRole(actorUser?.role)
      recipients = isAdmin && actorUser?.email ? [{ id: actorUser.id, email: actorUser.email, name: null, role: actorUser.role }] : []
    }

    const emails = recipients.map((recipient) => recipient.email).filter(Boolean)
    if (emails.length === 0) return

    const organizationName = await getOrganizationName()
    const actionLabel = formatAuditAction(params.action)
    const actorName = formatActorName({ actor: params.actor, actorEmail: params.actorEmail })
    const resourceLine = params.resourceId
      ? `${params.resourceType} · ${params.resourceId}`
      : params.resourceType
    const timeLabel = formatDateTime(params.createdAt)
    const appUrl = getAppUrl()
    const notificationsUrl = `${appUrl}/notifications`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #111827; color: #ffffff; padding: 20px 24px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; }
            .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin-bottom: 6px; }
            .value { font-size: 15px; margin: 0 0 12px 0; color: #111827; }
            .button { display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; font-size: 20px;">${actionLabel}</h2>
              <p style="margin: 6px 0 0; font-size: 14px; color: #d1d5db;">${organizationName}</p>
            </div>
            <div class="content">
              <div class="label">Actor</div>
              <p class="value">${actorName}</p>
              <div class="label">Resource</div>
              <p class="value">${resourceLine}</p>
              <div class="label">Time</div>
              <p class="value">${timeLabel}</p>
              <a class="button" href="${notificationsUrl}">View notifications</a>
            </div>
          </div>
        </body>
      </html>
    `

    await Promise.allSettled(
      emails.map((email) =>
        sendEmail({
          to: email,
          subject: `${actionLabel} • ${organizationName}`,
          html,
        })
      )
    )
  } catch (error) {
    console.warn('Failed to send notification email:', error)
  }
}
