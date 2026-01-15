import prisma from './prisma'
import { Prisma, type AuditAction } from '@prisma/client'
import { notifyAdminsOfAuditLog } from './notification-email'
import { ADMIN_NOTIFICATION_ROLES, isNotifiableAction } from './notifications'

interface AuditLogParams {
  actorId?: string
  actorEmail?: string
  actorType?: 'user' | 'system' | 'webhook'
  action: AuditAction
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const log = await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorType: params.actorType || 'user',
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    include: {
      actor: { select: { name: true, email: true } },
    },
  })

  void notifyAdminsOfAuditLog({
    id: log.id,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    actorId: log.actorId,
    actorEmail: log.actorEmail,
    actor: log.actor,
    createdAt: log.createdAt,
  })

  if (isNotifiableAction(log.action)) {
    const notificationClient = (prisma as typeof prisma & { notification?: typeof prisma.notification }).notification
    if (!notificationClient) {
      return
    }
    const adminUsers = await prisma.user.findMany({
      where: { role: { in: [...ADMIN_NOTIFICATION_ROLES] } },
      select: { id: true },
    })

    if (adminUsers.length > 0) {
      await notificationClient.createMany({
        data: adminUsers.map((user) => ({
          userId: user.id,
          auditLogId: log.id,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          actorName: log.actor?.name ?? null,
          actorEmail: log.actorEmail ?? log.actor?.email ?? null,
        })),
      })
    }
  }
}

export async function logOfferEvent(params: {
  actorId?: string
  actorEmail?: string
  actorType?: 'user' | 'system' | 'webhook'
  action: AuditAction
  offerId: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await createAuditLog({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    actorType: params.actorType,
    action: params.action,
    resourceType: 'offer',
    resourceId: params.offerId,
    metadata: params.metadata,
  })
}

export async function logEmployeeEvent(params: {
  actorId?: string
  actorEmail?: string
  actorType?: 'user' | 'system' | 'webhook'
  action: AuditAction
  employeeId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await createAuditLog({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    actorType: params.actorType,
    action: params.action,
    resourceType: 'employee',
    resourceId: params.employeeId,
    metadata: params.metadata,
  })
}

export async function logIntegrationEvent(params: {
  actorId?: string
  actorEmail?: string
  actorType?: 'user' | 'system' | 'webhook'
  action: AuditAction
  appAccountId?: string
  employeeId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await createAuditLog({
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    actorType: params.actorType,
    action: params.action,
    resourceType: 'app_account',
    resourceId: params.appAccountId,
    metadata: {
      ...params.metadata,
      employeeId: params.employeeId,
    },
  })
}
