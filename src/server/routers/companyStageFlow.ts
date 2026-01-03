import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

export const companyStageFlowRouter = router({
  // List all company stage flows with their latest snapshot info
  list: protectedProcedure.query(async ({ ctx }) => {
    const flows = await ctx.prisma.companyStageFlow.findMany({
      where: { isActive: true },
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            snapshots: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    // Get employee counts per flow
    const employeeCounts = await ctx.prisma.employee.groupBy({
      by: ['companyStageFlowSnapshotId'],
      where: {
        companyStageFlowSnapshotId: { not: null },
      },
      _count: true,
    })

    const employeeCountMap = new Map<string, number>()
    for (const count of employeeCounts) {
      if (count.companyStageFlowSnapshotId) {
        employeeCountMap.set(count.companyStageFlowSnapshotId, count._count)
      }
    }

    // Get all snapshots for these flows to calculate total employee count per flow
    const allSnapshots = await ctx.prisma.companyStageFlowSnapshot.findMany({
      where: {
        flowId: { in: flows.map((f) => f.id) },
      },
      select: { id: true, flowId: true, version: true },
    })

    return flows.map((flow) => {
      const latestSnapshot = flow.snapshots[0]
      const flowSnapshots = allSnapshots.filter((s) => s.flowId === flow.id)
      const latestVersion = flowSnapshots.reduce((max, s) => Math.max(max, s.version), 0)

      // Calculate total employees using any version of this flow
      const totalEmployees = flowSnapshots.reduce((sum, s) => sum + (employeeCountMap.get(s.id) || 0), 0)

      // Calculate employees on outdated versions
      const outdatedEmployees = flowSnapshots
        .filter((s) => s.version < latestVersion)
        .reduce((sum, s) => sum + (employeeCountMap.get(s.id) || 0), 0)

      return {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        stages: flow.stages as string[],
        isDefault: flow.isDefault,
        isActive: flow.isActive,
        latestSnapshotId: latestSnapshot?.id,
        latestVersion: latestSnapshot?.version ?? 0,
        totalVersions: flow._count.snapshots,
        totalEmployees,
        outdatedEmployees,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
      }
    })
  }),

  // Get a single flow with all its snapshots
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const flow = await ctx.prisma.companyStageFlow.findUnique({
        where: { id: input.id },
        include: {
          snapshots: {
            orderBy: { version: 'desc' },
          },
        },
      })

      if (!flow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Company stage flow not found',
        })
      }

      return flow
    }),

  // Get the latest snapshot for a flow (for assigning to employees)
  getLatestSnapshot: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .query(async ({ ctx, input }) => {
      const snapshot = await ctx.prisma.companyStageFlowSnapshot.findFirst({
        where: { flowId: input.flowId },
        orderBy: { version: 'desc' },
        include: { flow: true },
      })

      if (!snapshot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No snapshot found for this flow',
        })
      }

      return snapshot
    }),

  // Create a new company stage flow
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        stages: z.array(z.string().min(1).max(100)).min(2),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if flow with same name exists
      const existing = await ctx.prisma.companyStageFlow.findUnique({
        where: { name: input.name },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A company stage flow with this name already exists',
        })
      }

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await ctx.prisma.companyStageFlow.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      // Create flow with initial snapshot
      const flow = await ctx.prisma.companyStageFlow.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim(),
          stages: input.stages,
          isDefault: input.isDefault ?? false,
          snapshots: {
            create: {
              version: 1,
              stages: input.stages,
            },
          },
        },
        include: {
          snapshots: true,
        },
      })

      return flow
    }),

  // Update a company stage flow (creates a new snapshot)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        stages: z.array(z.string().min(1).max(100)).min(2).optional(),
        isDefault: z.boolean().optional(),
        // Stage mapping for migrating existing employees
        stageMapping: z
          .record(z.string(), z.string().nullable())
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, stageMapping, ...data } = input

      const existing = await ctx.prisma.companyStageFlow.findUnique({
        where: { id },
        include: {
          snapshots: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Company stage flow not found',
        })
      }

      // Check for duplicate name
      if (data.name && data.name !== existing.name) {
        const duplicate = await ctx.prisma.companyStageFlow.findUnique({
          where: { name: data.name },
        })

        if (duplicate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A company stage flow with this name already exists',
          })
        }
      }

      // If setting as default, unset other defaults
      if (data.isDefault === true) {
        await ctx.prisma.companyStageFlow.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }

      const currentVersion = existing.snapshots[0]?.version ?? 0
      const stagesChanged =
        data.stages &&
        JSON.stringify(data.stages) !== JSON.stringify(existing.stages)

      // If stages changed, create a new snapshot
      if (stagesChanged && data.stages) {
        // Create new snapshot
        await ctx.prisma.companyStageFlowSnapshot.create({
          data: {
            flowId: id,
            version: currentVersion + 1,
            stages: data.stages,
          },
        })

        // Note: Employee stage migration would require additional tracking
        // This can be implemented as needed
      }

      // Update the flow
      const updated = await ctx.prisma.companyStageFlow.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && {
            description: data.description?.trim() || null,
          }),
          ...(data.stages && { stages: data.stages }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        },
        include: {
          snapshots: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      })

      return updated
    }),

  // Delete (soft delete) a company stage flow
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if any employees are using this flow
      const snapshots = await ctx.prisma.companyStageFlowSnapshot.findMany({
        where: { flowId: input.id },
        select: { id: true },
      })

      const employeeCount = await ctx.prisma.employee.count({
        where: { companyStageFlowSnapshotId: { in: snapshots.map((s) => s.id) } },
      })

      if (employeeCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete this flow. ${employeeCount} employee(s) are using it.`,
        })
      }

      await ctx.prisma.companyStageFlow.update({
        where: { id: input.id },
        data: { isActive: false },
      })

      return { success: true }
    }),

  // Set a flow as the default
  setDefault: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Unset all other defaults
      await ctx.prisma.companyStageFlow.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })

      // Set this one as default
      await ctx.prisma.companyStageFlow.update({
        where: { id: input.id },
        data: { isDefault: true },
      })

      return { success: true }
    }),

  // Get the default flow
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const flow = await ctx.prisma.companyStageFlow.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    return flow
  }),
})
