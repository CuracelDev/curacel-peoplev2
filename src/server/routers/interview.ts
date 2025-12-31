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

  // ============================================
  // Phase 2: Interviewer Management
  // ============================================

  // Add an interviewer to an interview
  addInterviewer: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        employeeId: z.string().optional(),
        name: z.string(),
        email: z.string().email(),
        role: z.string().optional(),
        generateToken: z.boolean().optional().default(true),
        tokenExpiresInDays: z.number().optional().default(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current interview
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      // Get current interviewers array
      const currentInterviewers = (interview.interviewers as Array<{
        employeeId?: string
        name: string
        email: string
        role?: string
      }>) || []

      // Check if interviewer already exists
      if (currentInterviewers.some(i => i.email === input.email)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This interviewer has already been added',
        })
      }

      // Add new interviewer
      const newInterviewer = {
        employeeId: input.employeeId,
        name: input.name,
        email: input.email,
        role: input.role,
      }

      // Update interview with new interviewer
      const updatedInterview = await ctx.prisma.candidateInterview.update({
        where: { id: input.interviewId },
        data: {
          interviewers: [...currentInterviewers, newInterviewer],
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
        },
      })

      // Create token if requested
      let token = null
      if (input.generateToken) {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + input.tokenExpiresInDays)

        token = await ctx.prisma.interviewerToken.create({
          data: {
            interviewId: input.interviewId,
            interviewerId: input.employeeId,
            interviewerName: input.name,
            interviewerEmail: input.email,
            interviewerRole: input.role,
            expiresAt,
          },
        })
      }

      return {
        interview: {
          ...updatedInterview,
          stageDisplayName: stageDisplayNames[updatedInterview.stage] || updatedInterview.stageName || updatedInterview.stage,
        },
        token,
      }
    }),

  // Remove an interviewer from an interview
  removeInterviewer: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current interview
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      // Get current interviewers array
      const currentInterviewers = (interview.interviewers as Array<{
        employeeId?: string
        name: string
        email: string
        role?: string
      }>) || []

      // Remove interviewer
      const updatedInterviewers = currentInterviewers.filter(i => i.email !== input.email)

      // Update interview
      const updatedInterview = await ctx.prisma.candidateInterview.update({
        where: { id: input.interviewId },
        data: {
          interviewers: updatedInterviewers,
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
        },
      })

      // Revoke any tokens for this interviewer
      await ctx.prisma.interviewerToken.updateMany({
        where: {
          interviewId: input.interviewId,
          interviewerEmail: input.email,
        },
        data: {
          isRevoked: true,
        },
      })

      return {
        ...updatedInterview,
        stageDisplayName: stageDisplayNames[updatedInterview.stage] || updatedInterview.stageName || updatedInterview.stage,
      }
    }),

  // Create a new token for an interviewer
  createInterviewerToken: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        interviewerName: z.string(),
        interviewerEmail: z.string().email(),
        interviewerRole: z.string().optional(),
        expiresInDays: z.number().optional().default(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check interview exists
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      // Revoke any existing tokens for this interviewer
      await ctx.prisma.interviewerToken.updateMany({
        where: {
          interviewId: input.interviewId,
          interviewerEmail: input.interviewerEmail,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      })

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

      const token = await ctx.prisma.interviewerToken.create({
        data: {
          interviewId: input.interviewId,
          interviewerName: input.interviewerName,
          interviewerEmail: input.interviewerEmail,
          interviewerRole: input.interviewerRole,
          expiresAt,
        },
      })

      return token
    }),

  // Revoke an interviewer token
  revokeInterviewerToken: protectedProcedure
    .input(
      z.object({
        tokenId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.prisma.interviewerToken.update({
        where: { id: input.tokenId },
        data: {
          isRevoked: true,
        },
      })

      return token
    }),

  // Get all tokens for an interview
  getInterviewerTokens: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tokens = await ctx.prisma.interviewerToken.findMany({
        where: { interviewId: input.interviewId },
        orderBy: { createdAt: 'desc' },
      })

      return tokens.map(token => ({
        ...token,
        isExpired: token.expiresAt < new Date(),
        isActive: !token.isRevoked && token.expiresAt >= new Date(),
      }))
    }),

  // Send reminder email to interviewer
  sendInterviewerReminder: protectedProcedure
    .input(
      z.object({
        tokenId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = await ctx.prisma.interviewerToken.findUnique({
        where: { id: input.tokenId },
        include: {
          interview: {
            include: {
              candidate: {
                include: {
                  job: true,
                },
              },
            },
          },
        },
      })

      if (!token) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Token not found',
        })
      }

      if (token.isRevoked) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Token has been revoked',
        })
      }

      if (token.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Token has expired',
        })
      }

      if (token.evaluationStatus === 'SUBMITTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Evaluation has already been submitted',
        })
      }

      // TODO: Send email using email service
      // For now, just return success
      return {
        success: true,
        message: `Reminder would be sent to ${token.interviewerEmail}`,
      }
    }),
})
