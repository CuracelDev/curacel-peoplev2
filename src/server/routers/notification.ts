import { z } from 'zod'
import { router, adminProcedure } from '@/lib/trpc'

export const notificationRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          includeArchived: z.boolean().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { includeArchived = false, page = 1, limit = 20 } = input || {}
      if (!ctx.prisma?.notification) {
        const [logs, total] = await Promise.all([
          ctx.prisma.auditLog.findMany({
            include: { actor: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          ctx.prisma.auditLog.count(),
        ])

        return {
          notifications: logs.map((log) => ({
            id: `audit-${log.id}`,
            action: log.action,
            resourceType: log.resourceType,
            resourceId: log.resourceId ?? null,
            actorName: log.actor?.name ?? null,
            actorEmail: log.actorEmail ?? log.actor?.email ?? null,
            readAt: null,
            archivedAt: null,
            createdAt: log.createdAt,
          })),
          total,
          pages: Math.ceil(total / limit),
        }
      }

      const where: Record<string, unknown> = {
        userId: ctx.user.id,
      }
      if (!includeArchived) {
        where.archivedAt = null
      }

      const [notifications, total] = await Promise.all([
        ctx.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.notification.count({ where }),
      ])

      return {
        notifications,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  unreadCount: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.prisma?.notification) {
      return { count: 0 }
    }
    const count = await ctx.prisma.notification.count({
      where: {
        userId: ctx.user.id,
        readAt: null,
        archivedAt: null,
      },
    })
    return { count }
  }),

  markAllRead: adminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.prisma?.notification) {
      return { success: true }
    }
    await ctx.prisma.notification.updateMany({
      where: {
        userId: ctx.user.id,
        readAt: null,
        archivedAt: null,
      },
      data: { readAt: new Date() },
    })
    return { success: true }
  }),

  markRead: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.prisma?.notification) {
        return { success: true }
      }
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { readAt: new Date() },
      })
      return { success: true }
    }),

  archive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.prisma?.notification) {
        return { success: true }
      }
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { archivedAt: new Date() },
      })
      return { success: true }
    }),

  restore: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.prisma?.notification) {
        return { success: true }
      }
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { archivedAt: null },
      })
      return { success: true }
    }),
})
