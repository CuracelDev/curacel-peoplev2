import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'
import { CompetencyFrameworkSyncService } from '@/lib/competency-framework/sync-service'

export const competencyFrameworkRouter = router({
  // List all competency framework sources
  listSources: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.competencyFrameworkSource.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            coreCompetencies: true,
            syncLogs: true,
          },
        },
      },
    })
  }),

  // Get a single source with its competencies
  getSource: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const source = await ctx.prisma.competencyFrameworkSource.findUnique({
        where: { id: input.id },
        include: {
          coreCompetencies: {
            include: {
              subCompetencies: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!source) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency framework source not found',
        })
      }

      return source
    }),

  // Get competencies by source type
  getByType: protectedProcedure
    .input(
      z.object({
        type: z.enum(['DEPARTMENT', 'AI', 'VALUES']),
        department: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        type: input.type,
        isActive: true,
      }

      if (input.department) {
        where.department = input.department
      }

      const sources = await ctx.prisma.competencyFrameworkSource.findMany({
        where,
        include: {
          coreCompetencies: {
            include: {
              subCompetencies: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      return sources
    }),

  // Sync a single source from Google Sheets
  syncSource: adminProcedure
    .input(
      z.object({
        id: z.string(),
        forceRefresh: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const syncService = new CompetencyFrameworkSyncService(ctx.prisma)
      const result = await syncService.syncSource(input.id, {
        forceRefresh: input.forceRefresh,
      })

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Sync failed',
        })
      }

      return result
    }),

  // Sync all sources
  syncAllSources: adminProcedure
    .input(
      z.object({
        forceRefresh: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const syncService = new CompetencyFrameworkSyncService(ctx.prisma)
      const result = await syncService.syncAllSources({
        forceRefresh: input.forceRefresh,
      })

      return result
    }),

  // Get sync logs for a source
  getSyncLogs: adminProcedure
    .input(
      z.object({
        sourceId: z.string(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.competencySyncLog.findMany({
        where: { sourceId: input.sourceId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      })
    }),

  // Create a new competency framework source
  createSource: adminProcedure
    .input(
      z.object({
        type: z.enum(['DEPARTMENT', 'AI', 'VALUES']),
        name: z.string().min(2).max(100),
        department: z.string().max(50).optional(),
        sheetUrl: z.string().url(),
        tabName: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Extract sheet ID from URL
      const { extractSpreadsheetId } = await import('@/lib/google-sheets')
      const sheetId = extractSpreadsheetId(input.sheetUrl)

      return ctx.prisma.competencyFrameworkSource.create({
        data: {
          type: input.type,
          name: input.name,
          department: input.department,
          sheetUrl: input.sheetUrl,
          sheetId,
          gidOrTabName: input.tabName,
          formatType: 'STANDARD_4_LEVEL', // Will be detected on first sync
          levelNames: [],
          minLevel: 1,
          maxLevel: 4,
        },
      })
    }),

  // Update a competency framework source
  updateSource: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        sheetUrl: z.string().url().optional(),
        tabName: z.string().max(100).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      let updateData: any = {}

      if (data.name) updateData.name = data.name
      if (data.tabName !== undefined) updateData.gidOrTabName = data.tabName
      if (data.isActive !== undefined) updateData.isActive = data.isActive

      if (data.sheetUrl) {
        const { extractSpreadsheetId } = await import('@/lib/google-sheets')
        const sheetId = extractSpreadsheetId(data.sheetUrl)
        updateData.sheetUrl = data.sheetUrl
        updateData.sheetId = sheetId
      }

      return ctx.prisma.competencyFrameworkSource.update({
        where: { id },
        data: updateData,
      })
    }),

  // Delete (deactivate) a source
  deleteSource: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.competencyFrameworkSource.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Get sub-competencies for a job's department
  getForJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.jobId },
        select: { department: true },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      // Get department competencies
      const departmentSource = await ctx.prisma.competencyFrameworkSource.findFirst({
        where: {
          type: 'DEPARTMENT',
          department: job.department,
          isActive: true,
        },
        include: {
          coreCompetencies: {
            include: {
              subCompetencies: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      // Get AI competencies
      const aiSource = await ctx.prisma.competencyFrameworkSource.findFirst({
        where: {
          type: 'AI',
          isActive: true,
        },
        include: {
          coreCompetencies: {
            include: {
              subCompetencies: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      // Get Values competencies
      const valuesSource = await ctx.prisma.competencyFrameworkSource.findFirst({
        where: {
          type: 'VALUES',
          isActive: true,
        },
        include: {
          coreCompetencies: {
            include: {
              subCompetencies: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      return {
        department: departmentSource,
        ai: aiSource,
        values: valuesSource,
      }
    }),
})
