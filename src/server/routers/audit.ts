import { z } from 'zod'
import { router, adminProcedure } from '@/lib/trpc'

export const auditRouter = router({
  list: adminProcedure
    .input(z.object({
      action: z.string().optional(),
      resourceType: z.string().optional(),
      resourceId: z.string().optional(),
      actorId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const {
        action,
        resourceType,
        resourceId,
        actorId,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = input || {}

      const where: Record<string, unknown> = {}
      
      if (action) where.action = action
      if (resourceType) where.resourceType = resourceType
      if (resourceId) where.resourceId = resourceId
      if (actorId) where.actorId = actorId
      
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
        if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
      }

      const [logs, total] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.auditLog.count({ where }),
      ])

      return {
        logs,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  getByResource: adminProcedure
    .input(z.object({
      resourceType: z.string(),
      resourceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.auditLog.findMany({
        where: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    }),

  getActions: adminProcedure
    .query(async ({ ctx }) => {
      const logs = await ctx.prisma.auditLog.findMany({
        select: { action: true },
      })
      // Get unique actions
      const uniqueActions = Array.from(new Set(logs.map(l => l.action)))
      return uniqueActions.sort()
    }),

  getResourceTypes: adminProcedure
    .query(async ({ ctx }) => {
      const logs = await ctx.prisma.auditLog.findMany({
        select: { resourceType: true },
      })
      // Get unique resource types
      const uniqueTypes = Array.from(new Set(logs.map(l => l.resourceType)))
      return uniqueTypes.sort()
    }),
})

