import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

export const hiringFlowRouter = router({
  // List all hiring flows with their latest snapshot info
  list: protectedProcedure.query(async ({ ctx }) => {
    const flows = await ctx.prisma.hiringFlow.findMany({
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

    // Get job counts per flow
    const jobCounts = await ctx.prisma.job.groupBy({
      by: ['hiringFlowSnapshotId'],
      where: {
        hiringFlowSnapshotId: { not: null },
      },
      _count: true,
    })

    const jobCountMap = new Map<string, number>()
    for (const count of jobCounts) {
      if (count.hiringFlowSnapshotId) {
        jobCountMap.set(count.hiringFlowSnapshotId, count._count)
      }
    }

    // Get all snapshots for these flows to calculate total job count per flow
    const allSnapshots = await ctx.prisma.hiringFlowSnapshot.findMany({
      where: {
        flowId: { in: flows.map((f) => f.id) },
      },
      select: { id: true, flowId: true, version: true },
    })

    return flows.map((flow) => {
      const latestSnapshot = flow.snapshots[0]
      const flowSnapshots = allSnapshots.filter((s) => s.flowId === flow.id)
      const latestVersion = flowSnapshots.reduce((max, s) => Math.max(max, s.version), 0)

      // Calculate total jobs using any version of this flow
      const totalJobs = flowSnapshots.reduce((sum, s) => sum + (jobCountMap.get(s.id) || 0), 0)

      // Calculate jobs on outdated versions
      const outdatedJobs = flowSnapshots
        .filter((s) => s.version < latestVersion)
        .reduce((sum, s) => sum + (jobCountMap.get(s.id) || 0), 0)

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
        totalJobs,
        outdatedJobs,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
      }
    })
  }),

  // Get a single flow with all its snapshots
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const flow = await ctx.prisma.hiringFlow.findUnique({
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
          message: 'Hiring flow not found',
        })
      }

      return flow
    }),

  // Get the latest snapshot for a flow (for assigning to jobs)
  getLatestSnapshot: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .query(async ({ ctx, input }) => {
      const snapshot = await ctx.prisma.hiringFlowSnapshot.findFirst({
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

  // Create a new hiring flow
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
      const existing = await ctx.prisma.hiringFlow.findUnique({
        where: { name: input.name },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A hiring flow with this name already exists',
        })
      }

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await ctx.prisma.hiringFlow.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      // Create flow with initial snapshot
      const flow = await ctx.prisma.hiringFlow.create({
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

  // Update a hiring flow (creates a new snapshot)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        stages: z.array(z.string().min(1).max(100)).min(2).optional(),
        isDefault: z.boolean().optional(),
        // Stage mapping for migrating existing candidates
        stageMapping: z
          .record(z.string(), z.string().nullable())
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, stageMapping, ...data } = input

      const existing = await ctx.prisma.hiringFlow.findUnique({
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
          message: 'Hiring flow not found',
        })
      }

      // Check for duplicate name
      if (data.name && data.name !== existing.name) {
        const duplicate = await ctx.prisma.hiringFlow.findUnique({
          where: { name: data.name },
        })

        if (duplicate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A hiring flow with this name already exists',
          })
        }
      }

      // If setting as default, unset other defaults
      if (data.isDefault === true) {
        await ctx.prisma.hiringFlow.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        })
      }

      const currentVersion = existing.snapshots[0]?.version ?? 0
      const stagesChanged =
        data.stages &&
        JSON.stringify(data.stages) !== JSON.stringify(existing.stages)

      // If stages changed, create a new snapshot and optionally migrate candidates
      if (stagesChanged && data.stages) {
        // Create new snapshot
        const newSnapshot = await ctx.prisma.hiringFlowSnapshot.create({
          data: {
            flowId: id,
            version: currentVersion + 1,
            stages: data.stages,
          },
        })

        // If stage mapping provided, migrate candidates
        if (stageMapping) {
          // Get all jobs using any snapshot of this flow
          const oldSnapshots = await ctx.prisma.hiringFlowSnapshot.findMany({
            where: { flowId: id, version: { lt: currentVersion + 1 } },
            select: { id: true },
          })

          const oldSnapshotIds = oldSnapshots.map((s) => s.id)

          // Get all jobs on old snapshots
          const jobsToUpdate = await ctx.prisma.job.findMany({
            where: { hiringFlowSnapshotId: { in: oldSnapshotIds } },
            select: { id: true },
          })

          // Update all jobs to the new snapshot
          await ctx.prisma.job.updateMany({
            where: { id: { in: jobsToUpdate.map((j) => j.id) } },
            data: { hiringFlowSnapshotId: newSnapshot.id },
          })

          // Migrate candidates based on stage mapping
          // The stage mapping maps old stage names to new stage names
          // We need to update customStageName for candidates whose stage doesn't exist in new flow
          const oldStages = existing.stages as string[]
          const newStages = data.stages

          for (const [oldStage, newStage] of Object.entries(stageMapping)) {
            if (newStage === null) {
              // Stage was removed - mark candidates with customStageName
              await ctx.prisma.jobCandidate.updateMany({
                where: {
                  jobId: { in: jobsToUpdate.map((j) => j.id) },
                  customStageName: oldStage,
                },
                data: {
                  customStageName: `Legacy: ${oldStage}`,
                },
              })
            }
            // Note: Actual stage enum changes would require more complex logic
            // For now, customStageName is used for display purposes
          }
        }
      }

      // Update the flow
      const updated = await ctx.prisma.hiringFlow.update({
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

  // Delete (soft delete) a hiring flow
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if any jobs are using this flow
      const snapshots = await ctx.prisma.hiringFlowSnapshot.findMany({
        where: { flowId: input.id },
        select: { id: true },
      })

      const jobCount = await ctx.prisma.job.count({
        where: { hiringFlowSnapshotId: { in: snapshots.map((s) => s.id) } },
      })

      if (jobCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete this flow. ${jobCount} job(s) are using it.`,
        })
      }

      await ctx.prisma.hiringFlow.update({
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
      await ctx.prisma.hiringFlow.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })

      // Set this one as default
      await ctx.prisma.hiringFlow.update({
        where: { id: input.id },
        data: { isDefault: true },
      })

      return { success: true }
    }),

  // Get the default flow
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const flow = await ctx.prisma.hiringFlow.findFirst({
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

  // Get jobs with outdated flow snapshots
  getJobsWithOutdatedFlow: protectedProcedure
    .input(z.object({ flowId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get the latest snapshot version
      const latestSnapshot = await ctx.prisma.hiringFlowSnapshot.findFirst({
        where: { flowId: input.flowId },
        orderBy: { version: 'desc' },
      })

      if (!latestSnapshot) {
        return []
      }

      // Get all older snapshots
      const oldSnapshots = await ctx.prisma.hiringFlowSnapshot.findMany({
        where: {
          flowId: input.flowId,
          version: { lt: latestSnapshot.version },
        },
        select: { id: true, version: true, stages: true },
      })

      if (oldSnapshots.length === 0) {
        return []
      }

      // Get jobs on old snapshots
      const jobs = await ctx.prisma.job.findMany({
        where: {
          hiringFlowSnapshotId: { in: oldSnapshots.map((s) => s.id) },
        },
        include: {
          hiringFlowSnapshot: true,
          _count: {
            select: { candidates: true },
          },
        },
      })

      return jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        snapshotVersion: job.hiringFlowSnapshot?.version ?? 0,
        snapshotStages: (job.hiringFlowSnapshot?.stages as string[]) ?? [],
        candidateCount: job._count.candidates,
      }))
    }),

  // Upgrade a specific job to the latest flow snapshot
  upgradeJobFlow: adminProcedure
    .input(
      z.object({
        jobId: z.string(),
        stageMapping: z.record(z.string(), z.string().nullable()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.jobId },
        include: {
          hiringFlowSnapshot: {
            include: { flow: true },
          },
        },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      if (!job.hiringFlowSnapshot?.flow) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Job does not have an assigned hiring flow',
        })
      }

      // Get the latest snapshot for this flow
      const latestSnapshot = await ctx.prisma.hiringFlowSnapshot.findFirst({
        where: { flowId: job.hiringFlowSnapshot.flowId },
        orderBy: { version: 'desc' },
      })

      if (!latestSnapshot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No snapshot found for the hiring flow',
        })
      }

      if (latestSnapshot.id === job.hiringFlowSnapshotId) {
        return { success: true, message: 'Job is already on the latest flow version' }
      }

      // Update the job to use the latest snapshot
      await ctx.prisma.job.update({
        where: { id: input.jobId },
        data: { hiringFlowSnapshotId: latestSnapshot.id },
      })

      return { success: true, message: 'Job updated to latest flow version' }
    }),

  // Compare two snapshots to get the diff
  getFlowDiff: protectedProcedure
    .input(
      z.object({
        flowId: z.string(),
        fromVersion: z.number().optional(),
        toVersion: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.prisma.hiringFlowSnapshot.findMany({
        where: { flowId: input.flowId },
        orderBy: { version: 'desc' },
        take: 2,
      })

      if (snapshots.length < 2) {
        return {
          added: [],
          removed: [],
          unchanged: snapshots[0]?.stages as string[] ?? [],
          fromVersion: 0,
          toVersion: snapshots[0]?.version ?? 0,
        }
      }

      const [latest, previous] = snapshots
      const latestStages = new Set(latest.stages as string[])
      const previousStages = new Set(previous.stages as string[])

      const added = [...latestStages].filter((s) => !previousStages.has(s))
      const removed = [...previousStages].filter((s) => !latestStages.has(s))
      const unchanged = [...latestStages].filter((s) => previousStages.has(s))

      return {
        added,
        removed,
        unchanged,
        fromVersion: previous.version,
        toVersion: latest.version,
        fromStages: previous.stages as string[],
        toStages: latest.stages as string[],
      }
    }),

  // Assign the latest snapshot of a flow to a job
  assignToJob: adminProcedure
    .input(
      z.object({
        jobId: z.string(),
        flowId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the latest snapshot for the flow
      const snapshot = await ctx.prisma.hiringFlowSnapshot.findFirst({
        where: { flowId: input.flowId },
        orderBy: { version: 'desc' },
      })

      if (!snapshot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No snapshot found for this flow',
        })
      }

      // Update the job
      await ctx.prisma.job.update({
        where: { id: input.jobId },
        data: { hiringFlowSnapshotId: snapshot.id },
      })

      return { success: true, snapshotId: snapshot.id }
    }),
})
