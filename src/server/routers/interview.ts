import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'

const interviewStageEnum = z.enum([
  'HR_SCREEN',      // People Chat
  'TEAM_CHAT',
  'ADVISOR_CHAT',
  'TECHNICAL',      // Coding Test
  'PANEL',
  'CEO_CHAT',
  'TRIAL',
])

const interviewStatusEnum = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
])

// Stage display names mapping
const stageDisplayNames: Record<string, string> = {
  'HR_SCREEN': 'People Chat',
  'TEAM_CHAT': 'Team Chat',
  'ADVISOR_CHAT': 'Advisor Chat',
  'TECHNICAL': 'Coding Test',
  'PANEL': 'Panel Interview',
  'CEO_CHAT': 'CEO Chat',
  'TRIAL': 'Work Trial',
}

export const interviewRouter = router({
  // List all interviews across candidates
  list: protectedProcedure
    .input(
      z.object({
        stage: z.string().optional(),
        status: interviewStatusEnum.optional(),
        search: z.string().optional(),
        jobId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}

      if (input?.stage) {
        where.stage = input.stage
      }

      if (input?.status) {
        where.status = input.status
      }

      if (input?.dateFrom || input?.dateTo) {
        where.scheduledAt = {}
        if (input?.dateFrom) {
          (where.scheduledAt as Record<string, Date>).gte = new Date(input.dateFrom)
        }
        if (input?.dateTo) {
          (where.scheduledAt as Record<string, Date>).lte = new Date(input.dateTo)
        }
      }

      // Build search filter for candidate name or job title
      if (input?.search) {
        where.candidate = {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { job: { title: { contains: input.search, mode: 'insensitive' } } },
            { job: { department: { contains: input.search, mode: 'insensitive' } } },
          ],
        }
      }

      if (input?.jobId) {
        where.candidate = {
          ...((where.candidate as Record<string, unknown>) || {}),
          jobId: input.jobId,
        }
      }

      const interviews = await ctx.prisma.candidateInterview.findMany({
        where,
        include: {
          candidate: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                },
              },
            },
          },
        },
        orderBy: [
          { scheduledAt: 'asc' },
          { createdAt: 'desc' },
        ],
      })

      // Add display names to interviews
      return interviews.map((interview) => ({
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
      }))
    }),

  // Get interview counts by stage
  getCounts: protectedProcedure.query(async ({ ctx }) => {
    const stages = ['HR_SCREEN', 'TEAM_CHAT', 'ADVISOR_CHAT', 'TECHNICAL', 'PANEL', 'CEO_CHAT', 'TRIAL']

    const counts: Record<string, number> = {
      all: 0,
    }

    // Count all interviews
    counts.all = await ctx.prisma.candidateInterview.count()

    // Count by stage
    for (const stage of stages) {
      counts[stage] = await ctx.prisma.candidateInterview.count({
        where: { stage },
      })
    }

    // Also count upcoming scheduled
    counts.upcoming = await ctx.prisma.candidateInterview.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
      },
    })

    return counts
  }),

  // Get a single interview
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.id },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          evaluations: {
            include: {
              criteriaScores: {
                include: {
                  criteria: true,
                },
              },
            },
          },
          interviewerTokens: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      return {
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
      }
    }),

  // Schedule a new interview
  schedule: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        stage: interviewStageEnum,
        scheduledAt: z.string(),
        duration: z.number().optional().default(60),
        interviewers: z.array(
          z.object({
            employeeId: z.string().optional(),
            name: z.string(),
            email: z.string().email(),
          })
        ),
        meetingLink: z.string().optional(),
        stageTemplateId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check candidate exists
      const candidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id: input.candidateId },
      })

      if (!candidate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidate not found',
        })
      }

      const interview = await ctx.prisma.candidateInterview.create({
        data: {
          candidateId: input.candidateId,
          stage: input.stage,
          stageName: stageDisplayNames[input.stage] || input.stage,
          scheduledAt: new Date(input.scheduledAt),
          duration: input.duration,
          interviewers: input.interviewers,
          meetingLink: input.meetingLink,
          stageTemplateId: input.stageTemplateId,
          feedback: input.notes,
          status: 'SCHEDULED',
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
        },
      })

      return {
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
      }
    }),

  // Update interview status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: interviewStatusEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
        },
      })

      return {
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
      }
    }),

  // Reschedule interview
  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.string(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.update({
        where: { id: input.id },
        data: {
          scheduledAt: new Date(input.scheduledAt),
          ...(input.duration ? { duration: input.duration } : {}),
          status: 'SCHEDULED',
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
        },
      })

      return {
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
      }
    }),

  // Cancel interview
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.update({
        where: { id: input.id },
        data: {
          status: 'CANCELLED',
          feedback: input.reason ? `Cancelled: ${input.reason}` : undefined,
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
        },
      })

      return {
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
      }
    }),

  // Get upcoming interviews (for sidebar/dashboard)
  getUpcoming: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const interviews = await ctx.prisma.candidateInterview.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: new Date() },
        },
        include: {
          candidate: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: input?.limit || 10,
      })

      return interviews.map((interview) => ({
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
      }))
    }),
})
