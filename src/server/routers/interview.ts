import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure, publicProcedure } from '@/lib/trpc'

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
        stage: interviewStageEnum.optional(),
        interviewTypeId: z.string().optional(),
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
        // Question assignment during scheduling
        questionIds: z.array(z.string()).optional(),
        customQuestions: z.array(
          z.object({
            text: z.string(),
            category: z.string(),
            isRequired: z.boolean().optional().default(false),
            saveToBank: z.boolean().optional().default(false),
          })
        ).optional(),
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

      // Get interview type if provided
      let stage = input.stage || 'HR_SCREEN'
      let stageName = stageDisplayNames[stage] || stage
      let stageTemplateId = input.stageTemplateId
      let duration = input.duration

      if (input.interviewTypeId) {
        const interviewType = await ctx.prisma.interviewType.findUnique({
          where: { id: input.interviewTypeId },
          include: { rubricTemplate: true },
        })

        if (interviewType) {
          stageName = interviewType.name
          stageTemplateId = interviewType.rubricTemplateId || stageTemplateId
          duration = input.duration || interviewType.defaultDuration
        }
      }

      const interview = await ctx.prisma.candidateInterview.create({
        data: {
          candidateId: input.candidateId,
          stage,
          stageName,
          interviewTypeId: input.interviewTypeId,
          scheduledAt: new Date(input.scheduledAt),
          duration,
          interviewers: input.interviewers,
          meetingLink: input.meetingLink,
          stageTemplateId,
          feedback: input.notes,
          status: 'SCHEDULED',
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          interviewType: true,
        },
      })

      // Assign questions if provided
      if (input.questionIds?.length || input.customQuestions?.length) {
        const assignedQuestions = []

        // Add questions from bank
        if (input.questionIds?.length) {
          for (let i = 0; i < input.questionIds.length; i++) {
            assignedQuestions.push({
              interviewId: interview.id,
              questionId: input.questionIds[i],
              sortOrder: i,
            })
          }
        }

        // Add custom questions
        if (input.customQuestions?.length) {
          const startOrder = input.questionIds?.length || 0
          for (let i = 0; i < input.customQuestions.length; i++) {
            const customQ = input.customQuestions[i]

            // If saveToBank is true, create the question first
            let questionId: string | undefined
            if (customQ.saveToBank) {
              const newQuestion = await ctx.prisma.interviewQuestion.create({
                data: {
                  text: customQ.text,
                  category: customQ.category,
                  tags: [],
                  createdById: ctx.session?.user?.employee?.id || null,
                },
              })
              questionId = newQuestion.id
            }

            assignedQuestions.push({
              interviewId: interview.id,
              questionId: questionId || null,
              customText: questionId ? null : customQ.text,
              category: customQ.category,
              isRequired: customQ.isRequired || false,
              saveToBank: customQ.saveToBank || false,
              sortOrder: startOrder + i,
            })
          }
        }

        await ctx.prisma.interviewAssignedQuestion.createMany({
          data: assignedQuestions,
        })
      }

      return {
        ...interview,
        stageDisplayName: interview.interviewType?.name || stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
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

  // ============================================
  // Phase 3: Public Evaluation Form
  // ============================================

  // Get interview data by token (public)
  getInterviewByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const tokenRecord = await ctx.prisma.interviewerToken.findUnique({
        where: { token: input.token },
        include: {
          interview: {
            include: {
              candidate: {
                include: {
                  job: true,
                },
              },
              evaluations: {
                select: {
                  id: true,
                  evaluatorName: true,
                  evaluatorEmail: true,
                  overallScore: true,
                  recommendation: true,
                  submittedAt: true,
                },
              },
            },
          },
        },
      })

      if (!tokenRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid or expired interview link',
        })
      }

      if (tokenRecord.isRevoked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This interview link has been revoked',
        })
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This interview link has expired',
        })
      }

      // Update access timestamps
      const now = new Date()
      await ctx.prisma.interviewerToken.update({
        where: { id: tokenRecord.id },
        data: {
          accessedAt: tokenRecord.accessedAt || now,
          lastAccessAt: now,
        },
      })

      // Get all interviewers for this interview
      const interviewers = (tokenRecord.interview.interviewers as Array<{
        employeeId?: string
        name: string
        email: string
        role?: string
      }>) || []

      // Get other tokens (panel members) status
      const allTokens = await ctx.prisma.interviewerToken.findMany({
        where: {
          interviewId: tokenRecord.interviewId,
          id: { not: tokenRecord.id },
        },
        select: {
          interviewerName: true,
          interviewerRole: true,
          evaluationStatus: true,
        },
      })

      // Get rubric template if linked
      let rubricCriteria: Array<{
        id: string
        name: string
        description: string | null
        weight: number
        guideNotes: string | null
      }> = []

      if (tokenRecord.interview.stageTemplateId) {
        const template = await ctx.prisma.interviewStageTemplate.findUnique({
          where: { id: tokenRecord.interview.stageTemplateId },
          include: {
            criteria: {
              orderBy: { order: 'asc' },
            },
          },
        })
        if (template) {
          rubricCriteria = template.criteria.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            weight: c.weight,
            guideNotes: c.guideNotes,
          }))
        }
      }

      return {
        tokenId: tokenRecord.id,
        interviewer: {
          name: tokenRecord.interviewerName,
          email: tokenRecord.interviewerEmail,
          role: tokenRecord.interviewerRole,
        },
        interview: {
          id: tokenRecord.interview.id,
          stage: tokenRecord.interview.stage,
          stageName: stageDisplayNames[tokenRecord.interview.stage] || tokenRecord.interview.stageName || tokenRecord.interview.stage,
          scheduledAt: tokenRecord.interview.scheduledAt,
          duration: tokenRecord.interview.duration,
          meetingLink: tokenRecord.interview.meetingLink,
        },
        candidate: {
          id: tokenRecord.interview.candidate.id,
          name: tokenRecord.interview.candidate.name,
          email: tokenRecord.interview.candidate.email,
          phone: tokenRecord.interview.candidate.phone,
          linkedinUrl: tokenRecord.interview.candidate.linkedinUrl,
          resumeUrl: tokenRecord.interview.candidate.resumeUrl,
        },
        job: tokenRecord.interview.candidate.job ? {
          id: tokenRecord.interview.candidate.job.id,
          title: tokenRecord.interview.candidate.job.title,
          department: tokenRecord.interview.candidate.job.department,
        } : null,
        rubricCriteria,
        panelMembers: allTokens.map(t => ({
          name: t.interviewerName,
          role: t.interviewerRole,
          status: t.evaluationStatus,
        })),
        previousEvaluations: tokenRecord.interview.evaluations.map(e => ({
          evaluatorName: e.evaluatorName,
          score: e.overallScore,
          recommendation: e.recommendation,
        })),
        evaluationStatus: tokenRecord.evaluationStatus,
        savedDraft: tokenRecord.evaluationNotes ? {
          overallRating: tokenRecord.overallRating,
          recommendation: tokenRecord.recommendation,
          notes: tokenRecord.evaluationNotes,
          customQuestions: tokenRecord.customQuestions,
        } : null,
      }
    }),

  // Save evaluation draft (public)
  saveInterviewerDraft: publicProcedure
    .input(
      z.object({
        token: z.string(),
        scores: z.record(z.string(), z.number().min(1).max(5)).optional(),
        notes: z.record(z.string(), z.string()).optional(),
        overallRating: z.number().min(1).max(5).optional(),
        recommendation: z.string().optional(),
        overallNotes: z.string().optional(),
        customQuestions: z.array(
          z.object({
            id: z.string(),
            question: z.string(),
            answer: z.string(),
            score: z.number().min(1).max(5).nullable(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.prisma.interviewerToken.findUnique({
        where: { token: input.token },
      })

      if (!tokenRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid interview link',
        })
      }

      if (tokenRecord.isRevoked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This interview link has been revoked',
        })
      }

      if (tokenRecord.evaluationStatus === 'SUBMITTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Evaluation has already been submitted',
        })
      }

      // Save draft data to the token record
      await ctx.prisma.interviewerToken.update({
        where: { id: tokenRecord.id },
        data: {
          overallRating: input.overallRating,
          recommendation: input.recommendation,
          evaluationNotes: JSON.stringify({
            scores: input.scores,
            notes: input.notes,
            overallNotes: input.overallNotes,
          }),
          customQuestions: input.customQuestions,
          evaluationStatus: 'IN_PROGRESS',
        },
      })

      return { success: true, savedAt: new Date() }
    }),

  // Submit evaluation (public)
  submitInterviewerFeedback: publicProcedure
    .input(
      z.object({
        token: z.string(),
        scores: z.record(z.string(), z.number().min(1).max(5)),
        notes: z.record(z.string(), z.string()),
        overallRating: z.number().min(1).max(5),
        recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE', 'STRONG_NO_HIRE']),
        overallNotes: z.string(),
        customQuestions: z.array(
          z.object({
            id: z.string(),
            question: z.string(),
            answer: z.string(),
            score: z.number().min(1).max(5).nullable(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.prisma.interviewerToken.findUnique({
        where: { token: input.token },
        include: {
          interview: true,
        },
      })

      if (!tokenRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid interview link',
        })
      }

      if (tokenRecord.isRevoked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This interview link has been revoked',
        })
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This interview link has expired',
        })
      }

      if (tokenRecord.evaluationStatus === 'SUBMITTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Evaluation has already been submitted',
        })
      }

      const now = new Date()

      // Create the InterviewEvaluation record
      const evaluation = await ctx.prisma.interviewEvaluation.create({
        data: {
          interviewId: tokenRecord.interviewId,
          stageTemplateId: tokenRecord.interview.stageTemplateId,
          evaluatorName: tokenRecord.interviewerName,
          evaluatorEmail: tokenRecord.interviewerEmail,
          overallScore: input.overallRating,
          recommendation: input.recommendation,
          overallNotes: input.overallNotes,
          submittedAt: now,
        },
      })

      // Create criteria scores if we have rubric criteria
      if (tokenRecord.interview.stageTemplateId) {
        const template = await ctx.prisma.interviewStageTemplate.findUnique({
          where: { id: tokenRecord.interview.stageTemplateId },
          include: { criteria: true },
        })

        if (template) {
          for (const criteria of template.criteria) {
            const score = input.scores[criteria.id]
            const noteText = input.notes[criteria.id]

            if (score !== undefined) {
              await ctx.prisma.interviewCriteriaScore.create({
                data: {
                  evaluationId: evaluation.id,
                  criteriaId: criteria.id,
                  score,
                  notes: noteText,
                },
              })
            }
          }
        }
      }

      // Update the token as submitted
      await ctx.prisma.interviewerToken.update({
        where: { id: tokenRecord.id },
        data: {
          evaluationStatus: 'SUBMITTED',
          submittedAt: now,
          overallRating: input.overallRating,
          recommendation: input.recommendation,
          evaluationNotes: input.overallNotes,
          customQuestions: input.customQuestions,
        },
      })

      // Recalculate interview aggregate score
      const allEvaluations = await ctx.prisma.interviewEvaluation.findMany({
        where: { interviewId: tokenRecord.interviewId },
        select: { overallScore: true },
      })

      if (allEvaluations.length > 0) {
        const avgScore = allEvaluations.reduce((sum, e) => sum + (e.overallScore || 0), 0) / allEvaluations.length
        await ctx.prisma.candidateInterview.update({
          where: { id: tokenRecord.interviewId },
          data: {
            overallScore: Math.round(avgScore * 20), // Convert 1-5 to 0-100
          },
        })
      }

      return {
        success: true,
        evaluationId: evaluation.id,
        message: 'Thank you for submitting your evaluation',
      }
    }),

  // ============================================
  // Phase 6: Fireflies Integration
  // ============================================

  // Check if Fireflies is configured
  isFirefliesConfigured: protectedProcedure.query(() => {
    return { configured: !!process.env.FIREFLIES_API_KEY }
  }),

  // Search Fireflies meetings
  searchFirefliesMeetings: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        participantEmail: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        candidateName: z.string().optional(),
        candidateEmail: z.string().optional(),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const { getFirefliesConnector } = await import('@/lib/integrations/fireflies')
      const connector = await getFirefliesConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Fireflies integration is not configured. Add FIREFLIES_API_KEY to environment.',
        })
      }

      // If searching by candidate, use special method
      if (input.candidateName || input.candidateEmail) {
        const meetings = await connector.searchMeetingsByCandidate(
          input.candidateName || '',
          input.candidateEmail
        )
        return meetings.slice(0, input.limit)
      }

      // Otherwise, use general search
      const meetings = await connector.searchMeetings({
        title: input.title,
        participant_email: input.participantEmail,
        from_date: input.fromDate,
        to_date: input.toDate,
        limit: input.limit,
      })

      return meetings
    }),

  // Get Fireflies meeting details
  getFirefliesMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const { getFirefliesConnector } = await import('@/lib/integrations/fireflies')
      const connector = await getFirefliesConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Fireflies integration is not configured',
        })
      }

      const meeting = await connector.getMeetingWithSummary(input.meetingId)

      if (!meeting) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meeting not found in Fireflies',
        })
      }

      return meeting
    }),

  // Attach Fireflies recording to interview
  attachFirefliesRecording: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        firefliesMeetingId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getFirefliesConnector } = await import('@/lib/integrations/fireflies')
      const connector = await getFirefliesConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Fireflies integration is not configured',
        })
      }

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

      // Get meeting data from Fireflies
      const meeting = await connector.getMeetingWithSummary(input.firefliesMeetingId)

      if (!meeting) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meeting not found in Fireflies',
        })
      }

      // Get full transcript
      const transcriptText = await connector.getTranscriptText(input.firefliesMeetingId)

      // Get highlights
      const highlights = await connector.extractHighlights(input.firefliesMeetingId)

      // Update interview with Fireflies data
      const updatedInterview = await ctx.prisma.candidateInterview.update({
        where: { id: input.interviewId },
        data: {
          firefliesMeetingId: input.firefliesMeetingId,
          firefliesTranscript: transcriptText,
          firefliesSummary: meeting.summary?.overview || null,
          firefliesActionItems: meeting.summary?.action_items || [],
          firefliesHighlights: highlights,
          transcriptUrl: meeting.transcript_url || null,
          recordingUrl: meeting.video_url || meeting.audio_url || null,
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
        ...updatedInterview,
        stageDisplayName: stageDisplayNames[updatedInterview.stage] || updatedInterview.stageName || updatedInterview.stage,
      }
    }),

  // Detach Fireflies recording from interview
  detachFirefliesRecording: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      const updatedInterview = await ctx.prisma.candidateInterview.update({
        where: { id: input.interviewId },
        data: {
          firefliesMeetingId: null,
          firefliesTranscript: null,
          firefliesSummary: null,
          firefliesActionItems: null,
          firefliesHighlights: null,
          transcriptUrl: null,
          recordingUrl: null,
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
        ...updatedInterview,
        stageDisplayName: stageDisplayNames[updatedInterview.stage] || updatedInterview.stageName || updatedInterview.stage,
      }
    }),

  // Get transcript for an interview
  getTranscript: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        select: {
          firefliesMeetingId: true,
          firefliesTranscript: true,
          firefliesSummary: true,
          firefliesActionItems: true,
          firefliesHighlights: true,
          transcriptUrl: true,
          recordingUrl: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      if (!interview.firefliesMeetingId) {
        return null
      }

      return {
        meetingId: interview.firefliesMeetingId,
        transcript: interview.firefliesTranscript,
        summary: interview.firefliesSummary,
        actionItems: interview.firefliesActionItems as string[] | null,
        highlights: interview.firefliesHighlights as Array<{
          timestamp: string
          text: string
          speaker: string
        }> | null,
        transcriptUrl: interview.transcriptUrl,
        recordingUrl: interview.recordingUrl,
      }
    }),

  // ============================================
  // Phase 7: Google Calendar Integration
  // ============================================

  // Check if Google Calendar is configured
  isCalendarConfigured: protectedProcedure.query(async () => {
    const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
    const connector = await getGoogleWorkspaceConnector()

    if (!connector) {
      return { configured: false, reason: 'Google Workspace not configured' }
    }

    // Check if the connector has calendar capabilities
    return { configured: true }
  }),

  // Get interviewer availability (free/busy times)
  getInterviewerAvailability: protectedProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()),
        dateFrom: z.string(),  // ISO date
        dateTo: z.string(),    // ISO date
      })
    )
    .query(async ({ input }) => {
      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Workspace integration is not configured',
        })
      }

      const busyTimes = await connector.getFreeBusy({
        emails: input.emails,
        timeMin: new Date(input.dateFrom),
        timeMax: new Date(input.dateTo),
      })

      return busyTimes
    }),

  // Find available time slots for all interviewers
  findAvailableSlots: protectedProcedure
    .input(
      z.object({
        interviewerEmails: z.array(z.string().email()),
        duration: z.number().min(15).max(480),  // 15 min to 8 hours
        dateFrom: z.string(),
        dateTo: z.string(),
        workingHoursStart: z.number().min(0).max(23).optional().default(9),
        workingHoursEnd: z.number().min(0).max(23).optional().default(17),
      })
    )
    .query(async ({ input }) => {
      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Workspace integration is not configured',
        })
      }

      const slots = await connector.findAvailableSlots({
        requiredAttendees: input.interviewerEmails,
        duration: input.duration,
        dateRange: {
          start: new Date(input.dateFrom),
          end: new Date(input.dateTo),
        },
        workingHours: {
          start: input.workingHoursStart,
          end: input.workingHoursEnd,
        },
      })

      return slots
    }),

  // Create calendar event for an interview
  createInterviewCalendarEvent: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        createGoogleMeet: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Workspace integration is not configured',
        })
      }

      // Get interview with candidate and job details
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          interviewType: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      if (!interview.scheduledAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview must have a scheduled time',
        })
      }

      // Build attendee list from interviewers
      const interviewers = (interview.interviewers as Array<{
        employeeId?: string
        name: string
        email: string
        role?: string
      }>) || []

      const attendeeEmails = [
        ...interviewers.map(i => i.email),
        interview.candidate.email,
      ].filter(Boolean) as string[]

      // Build event title and description
      const stageName = interview.interviewType?.name ||
        stageDisplayNames[interview.stage] ||
        interview.stageName ||
        interview.stage

      const summary = `${stageName} Interview - ${interview.candidate.name}`
      const description = [
        `Interview Type: ${stageName}`,
        `Candidate: ${interview.candidate.name}`,
        `Position: ${interview.candidate.job?.title || 'N/A'}`,
        `Department: ${interview.candidate.job?.department || 'N/A'}`,
        '',
        'Interviewers:',
        ...interviewers.map(i => `- ${i.name} (${i.email})${i.role ? ` - ${i.role}` : ''}`),
        '',
        interview.feedback ? `Notes: ${interview.feedback}` : '',
      ].filter(Boolean).join('\n')

      // Calculate end time
      const endTime = new Date(interview.scheduledAt)
      endTime.setMinutes(endTime.getMinutes() + (interview.duration || 60))

      // Create calendar event
      const event = await connector.createCalendarEvent({
        summary,
        description,
        start: interview.scheduledAt,
        end: endTime,
        attendees: attendeeEmails,
        createMeet: input.createGoogleMeet,
      })

      // Update interview with calendar event details
      const updatedInterview = await ctx.prisma.candidateInterview.update({
        where: { id: input.interviewId },
        data: {
          calendarEventId: event.eventId,
          googleMeetLink: event.meetLink || null,
          // If we got a meet link and no existing meeting link, use it
          meetingLink: event.meetLink || interview.meetingLink,
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
        interview: {
          ...updatedInterview,
          stageDisplayName: stageDisplayNames[updatedInterview.stage] || updatedInterview.stageName || updatedInterview.stage,
        },
        calendarEvent: event,
      }
    }),

  // Update calendar event for an interview
  updateInterviewCalendarEvent: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Workspace integration is not configured',
        })
      }

      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          interviewType: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      if (!interview.calendarEventId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview has no linked calendar event',
        })
      }

      // Build updated event details
      const interviewers = (interview.interviewers as Array<{
        employeeId?: string
        name: string
        email: string
        role?: string
      }>) || []

      const attendeeEmails = [
        ...interviewers.map(i => i.email),
        interview.candidate.email,
      ].filter(Boolean) as string[]

      const stageName = interview.interviewType?.name ||
        stageDisplayNames[interview.stage] ||
        interview.stageName ||
        interview.stage

      const summary = `${stageName} Interview - ${interview.candidate.name}`
      const description = [
        `Interview Type: ${stageName}`,
        `Candidate: ${interview.candidate.name}`,
        `Position: ${interview.candidate.job?.title || 'N/A'}`,
        `Department: ${interview.candidate.job?.department || 'N/A'}`,
        '',
        'Interviewers:',
        ...interviewers.map(i => `- ${i.name} (${i.email})${i.role ? ` - ${i.role}` : ''}`),
        '',
        interview.feedback ? `Notes: ${interview.feedback}` : '',
      ].filter(Boolean).join('\n')

      const endTime = interview.scheduledAt ? new Date(interview.scheduledAt) : null
      if (endTime) {
        endTime.setMinutes(endTime.getMinutes() + (interview.duration || 60))
      }

      // Update calendar event
      await connector.updateCalendarEvent(interview.calendarEventId, {
        summary,
        description,
        start: interview.scheduledAt || undefined,
        end: endTime || undefined,
        attendees: attendeeEmails,
      })

      return { success: true }
    }),

  // Delete calendar event for an interview
  deleteInterviewCalendarEvent: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Workspace integration is not configured',
        })
      }

      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      if (!interview.calendarEventId) {
        // No calendar event to delete
        return { success: true, message: 'No calendar event linked' }
      }

      // Delete calendar event
      await connector.deleteCalendarEvent(interview.calendarEventId)

      // Clear calendar event from interview
      await ctx.prisma.candidateInterview.update({
        where: { id: input.interviewId },
        data: {
          calendarEventId: null,
          googleMeetLink: null,
        },
      })

      return { success: true }
    }),

  // Get calendar event details for an interview
  getInterviewCalendarEvent: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        select: {
          calendarEventId: true,
          googleMeetLink: true,
          meetingLink: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      if (!interview.calendarEventId) {
        return null
      }

      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        // Return basic info if connector not available
        return {
          eventId: interview.calendarEventId,
          meetLink: interview.googleMeetLink,
          htmlLink: null,
        }
      }

      try {
        const event = await connector.getCalendarEvent(interview.calendarEventId)
        return event
      } catch {
        // Event might have been deleted externally
        return {
          eventId: interview.calendarEventId,
          meetLink: interview.googleMeetLink,
          htmlLink: null,
          error: 'Could not fetch calendar event details',
        }
      }
    }),

  // ============================================
  // Phase 8: AI Transcript Analysis
  // ============================================

  // Analyze interview transcript with AI
  analyzeTranscriptWithAI: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        forceRegenerate: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get interview with transcript and rubric
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          interviewType: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      if (!interview.firefliesTranscript) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No transcript attached to this interview. Attach a Fireflies recording first.',
        })
      }

      // Check if we already have AI analysis and not forcing regeneration
      if (interview.aiAnalysis && !input.forceRegenerate) {
        return {
          analysis: interview.aiAnalysis,
          wasRegenerated: false,
        }
      }

      // Get AI settings
      const aiSettings = await ctx.prisma.aISettings.findFirst({
        orderBy: { updatedAt: 'desc' },
      })

      if (!aiSettings?.apiKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI settings not configured',
        })
      }

      // Get rubric criteria if available
      let rubricCriteria: Array<{ id: string; name: string; description: string | null; weight: number }> = []
      if (interview.stageTemplateId) {
        const template = await ctx.prisma.interviewStageTemplate.findUnique({
          where: { id: interview.stageTemplateId },
          include: { criteria: { orderBy: { order: 'asc' } } },
        })
        if (template) {
          rubricCriteria = template.criteria.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            weight: c.weight,
          }))
        }
      }

      // Build AI prompt
      const stageName = interview.interviewType?.name ||
        stageDisplayNames[interview.stage] ||
        interview.stageName ||
        interview.stage

      const prompt = `You are BlueAI, an expert recruiting analyst at Curacel. Analyze this interview transcript and provide detailed feedback.

## Company Values (PRESS)
- Passionate Work: Deep love for what we do
- Relentless Growth: Continuous improvement mindset
- Empowered Action: Taking ownership and initiative
- Sense of Urgency: Moving fast and decisively
- Seeing Possibilities: Innovation and creative problem-solving

## Interview Context
- Candidate: ${interview.candidate.name}
- Position: ${interview.candidate.job?.title || 'Unknown'}
- Interview Type: ${stageName}
- Duration: ${interview.duration} minutes

${rubricCriteria.length > 0 ? `## Evaluation Criteria
${rubricCriteria.map(c => `- ${c.name} (weight: ${c.weight}): ${c.description || 'No description'}`).join('\n')}` : ''}

## Transcript
${interview.firefliesTranscript.slice(0, 15000)}${interview.firefliesTranscript.length > 15000 ? '\n... [transcript truncated]' : ''}

## Response Format (JSON)
{
  "candidateScores": [
    {
      "criteriaName": "string",
      "score": 4, // 1-5 scale
      "confidence": 0.85, // 0-1
      "evidence": ["Quote or observation from transcript"],
      "reasoning": "Why this score"
    }
  ],
  "overallAssessment": {
    "score": 75, // 0-100
    "recommendation": "HIRE", // STRONG_HIRE, HIRE, MAYBE, NO_HIRE, STRONG_NO_HIRE
    "confidence": 0.8,
    "summary": "2-3 sentence summary"
  },
  "pressValuesAlignment": {
    "passionateWork": 4,
    "relentlessGrowth": 4,
    "empoweredAction": 3,
    "senseOfUrgency": 4,
    "seeingPossibilities": 3
  },
  "interviewerFeedback": [
    {
      "interviewerName": "string",
      "questionsAsked": 5,
      "followUpQuality": "good", // poor, fair, good, excellent
      "listeningRatio": 0.65, // % time candidate spoke
      "biasIndicators": ["potential concern"],
      "strengths": ["what they did well"],
      "improvements": ["areas to improve"]
    }
  ],
  "highlights": [
    {
      "timestamp": "05:32",
      "type": "strength", // strength, concern, red_flag, notable
      "content": "Candidate demonstrated...",
      "relevantCriteria": "Communication"
    }
  ],
  "communicationAnalysis": {
    "clarity": 4,
    "confidence": 4,
    "specificity": 3,
    "enthusiasm": 4,
    "technicalArticulation": 4
  },
  "suggestedFollowUps": ["Questions for next round"],
  "concerns": ["Areas that need validation"],
  "strengths": ["Key candidate strengths observed"]
}

Respond ONLY with valid JSON, no additional text.`

      // Call AI for analysis
      let analysisResult: unknown

      try {
        const { decrypt } = await import('@/lib/encryption')
        const apiKey = decrypt(aiSettings.apiKey)

        switch (aiSettings.provider) {
          case 'ANTHROPIC': {
            const { default: Anthropic } = await import('@anthropic-ai/sdk')
            const client = new Anthropic({ apiKey })

            const response = await client.messages.create({
              model: aiSettings.model,
              max_tokens: 4096,
              messages: [{ role: 'user', content: prompt }],
            })

            const textContent = response.content.find(c => c.type === 'text')
            if (!textContent || textContent.type !== 'text') {
              throw new Error('No text response from AI')
            }

            analysisResult = JSON.parse(textContent.text)
            break
          }

          case 'OPENAI': {
            const { default: OpenAI } = await import('openai')
            const client = new OpenAI({ apiKey })

            const response = await client.chat.completions.create({
              model: aiSettings.model,
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' },
            })

            const content = response.choices[0]?.message?.content
            if (!content) {
              throw new Error('No response from AI')
            }

            analysisResult = JSON.parse(content)
            break
          }

          case 'GEMINI': {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: 'application/json' },
                }),
              }
            )

            const data = await response.json()
            const genContent = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!genContent) {
              throw new Error('No response from AI')
            }

            analysisResult = JSON.parse(genContent)
            break
          }

          default:
            throw new Error(`Unsupported AI provider: ${aiSettings.provider}`)
        }
      } catch (error) {
        console.error('AI transcript analysis failed:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze transcript',
        })
      }

      // Store analysis result on interview
      const updatedInterview = await ctx.prisma.candidateInterview.update({
        where: { id: input.interviewId },
        data: {
          aiAnalysis: analysisResult as object,
          aiAnalyzedAt: new Date(),
        },
      })

      return {
        analysis: updatedInterview.aiAnalysis,
        wasRegenerated: true,
        analyzedAt: updatedInterview.aiAnalyzedAt,
      }
    }),

  // Get AI analysis for an interview
  getAIAnalysis: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        select: {
          aiAnalysis: true,
          aiAnalyzedAt: true,
          firefliesTranscript: true,
          firefliesMeetingId: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      return {
        hasTranscript: !!interview.firefliesTranscript,
        hasAnalysis: !!interview.aiAnalysis,
        analysis: interview.aiAnalysis,
        analyzedAt: interview.aiAnalyzedAt,
      }
    }),

  // Sync interview to calendar (create or update)
  syncInterviewToCalendar: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        createGoogleMeet: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        select: { calendarEventId: true },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      // Dynamically import to avoid issues with calling procedures
      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Workspace integration is not configured',
        })
      }

      if (interview.calendarEventId) {
        // Update existing event
        const fullInterview = await ctx.prisma.candidateInterview.findUnique({
          where: { id: input.interviewId },
          include: {
            candidate: {
              include: {
                job: true,
              },
            },
            interviewType: true,
          },
        })

        if (!fullInterview) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Interview not found',
          })
        }

        const interviewers = (fullInterview.interviewers as Array<{
          employeeId?: string
          name: string
          email: string
          role?: string
        }>) || []

        const attendeeEmails = [
          ...interviewers.map(i => i.email),
          fullInterview.candidate.email,
        ].filter(Boolean) as string[]

        const stageName = fullInterview.interviewType?.name ||
          stageDisplayNames[fullInterview.stage] ||
          fullInterview.stageName ||
          fullInterview.stage

        const summary = `${stageName} Interview - ${fullInterview.candidate.name}`
        const description = [
          `Interview Type: ${stageName}`,
          `Candidate: ${fullInterview.candidate.name}`,
          `Position: ${fullInterview.candidate.job?.title || 'N/A'}`,
          `Department: ${fullInterview.candidate.job?.department || 'N/A'}`,
          '',
          'Interviewers:',
          ...interviewers.map(i => `- ${i.name} (${i.email})${i.role ? ` - ${i.role}` : ''}`),
          '',
          fullInterview.feedback ? `Notes: ${fullInterview.feedback}` : '',
        ].filter(Boolean).join('\n')

        const endTime = fullInterview.scheduledAt ? new Date(fullInterview.scheduledAt) : null
        if (endTime) {
          endTime.setMinutes(endTime.getMinutes() + (fullInterview.duration || 60))
        }

        await connector.updateCalendarEvent(interview.calendarEventId, {
          summary,
          description,
          start: fullInterview.scheduledAt || undefined,
          end: endTime || undefined,
          attendees: attendeeEmails,
        })

        return {
          action: 'updated',
          calendarEventId: interview.calendarEventId,
        }
      } else {
        // Create new event
        const fullInterview = await ctx.prisma.candidateInterview.findUnique({
          where: { id: input.interviewId },
          include: {
            candidate: {
              include: {
                job: true,
              },
            },
            interviewType: true,
          },
        })

        if (!fullInterview) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Interview not found',
          })
        }

        if (!fullInterview.scheduledAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Interview must have a scheduled time',
          })
        }

        const interviewers = (fullInterview.interviewers as Array<{
          employeeId?: string
          name: string
          email: string
          role?: string
        }>) || []

        const attendeeEmails = [
          ...interviewers.map(i => i.email),
          fullInterview.candidate.email,
        ].filter(Boolean) as string[]

        const stageName = fullInterview.interviewType?.name ||
          stageDisplayNames[fullInterview.stage] ||
          fullInterview.stageName ||
          fullInterview.stage

        const summary = `${stageName} Interview - ${fullInterview.candidate.name}`
        const description = [
          `Interview Type: ${stageName}`,
          `Candidate: ${fullInterview.candidate.name}`,
          `Position: ${fullInterview.candidate.job?.title || 'N/A'}`,
          `Department: ${fullInterview.candidate.job?.department || 'N/A'}`,
          '',
          'Interviewers:',
          ...interviewers.map(i => `- ${i.name} (${i.email})${i.role ? ` - ${i.role}` : ''}`),
          '',
          fullInterview.feedback ? `Notes: ${fullInterview.feedback}` : '',
        ].filter(Boolean).join('\n')

        const endTime = new Date(fullInterview.scheduledAt)
        endTime.setMinutes(endTime.getMinutes() + (fullInterview.duration || 60))

        const event = await connector.createCalendarEvent({
          summary,
          description,
          start: fullInterview.scheduledAt,
          end: endTime,
          attendees: attendeeEmails,
          createMeet: input.createGoogleMeet,
        })

        await ctx.prisma.candidateInterview.update({
          where: { id: input.interviewId },
          data: {
            calendarEventId: event.eventId,
            googleMeetLink: event.meetLink || null,
            meetingLink: event.meetLink || fullInterview.meetingLink,
          },
        })

        return {
          action: 'created',
          calendarEventId: event.eventId,
          meetLink: event.meetLink,
        }
      }
    }),

  // Get assigned questions for an interview
  getAssignedQuestions: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const questions = await ctx.prisma.interviewAssignedQuestion.findMany({
        where: { interviewId: input.interviewId },
        include: {
          question: {
            include: {
              interviewType: true,
              job: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })

      return questions.map((q) => ({
        id: q.id,
        questionId: q.questionId,
        text: q.question?.text || q.customText || '',
        followUp: q.question?.followUp,
        category: q.question?.category || q.category || '',
        tags: q.question?.tags || [],
        isRequired: q.isRequired,
        wasAsked: q.wasAsked,
        rating: q.rating,
        notes: q.notes,
        sortOrder: q.sortOrder,
        isCustom: !q.questionId,
        saveToBank: q.saveToBank,
      }))
    }),

  // Assign questions to an existing interview
  assignQuestions: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        questionIds: z.array(z.string()).optional(),
        customQuestions: z.array(
          z.object({
            text: z.string(),
            category: z.string(),
            isRequired: z.boolean().optional().default(false),
            saveToBank: z.boolean().optional().default(false),
          })
        ).optional(),
        replaceExisting: z.boolean().optional().default(false),
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

      // Delete existing if replacing
      if (input.replaceExisting) {
        await ctx.prisma.interviewAssignedQuestion.deleteMany({
          where: { interviewId: input.interviewId },
        })
      }

      // Get current max sortOrder
      const maxSortOrder = input.replaceExisting
        ? -1
        : (await ctx.prisma.interviewAssignedQuestion.aggregate({
            where: { interviewId: input.interviewId },
            _max: { sortOrder: true },
          }))._max.sortOrder ?? -1

      const assignedQuestions = []
      let currentOrder = maxSortOrder + 1

      // Add questions from bank
      if (input.questionIds?.length) {
        for (const questionId of input.questionIds) {
          // Skip if already assigned
          const existing = await ctx.prisma.interviewAssignedQuestion.findFirst({
            where: { interviewId: input.interviewId, questionId },
          })
          if (!existing) {
            assignedQuestions.push({
              interviewId: input.interviewId,
              questionId,
              sortOrder: currentOrder++,
            })
          }
        }
      }

      // Add custom questions
      if (input.customQuestions?.length) {
        for (const customQ of input.customQuestions) {
          let questionId: string | null = null
          if (customQ.saveToBank) {
            const newQuestion = await ctx.prisma.interviewQuestion.create({
              data: {
                text: customQ.text,
                category: customQ.category,
                tags: [],
                createdById: ctx.session?.user?.employee?.id || null,
              },
            })
            questionId = newQuestion.id
          }

          assignedQuestions.push({
            interviewId: input.interviewId,
            questionId,
            customText: questionId ? null : customQ.text,
            category: customQ.category,
            isRequired: customQ.isRequired || false,
            saveToBank: customQ.saveToBank || false,
            sortOrder: currentOrder++,
          })
        }
      }

      if (assignedQuestions.length > 0) {
        await ctx.prisma.interviewAssignedQuestion.createMany({
          data: assignedQuestions,
        })
      }

      return { added: assignedQuestions.length }
    }),

  // Update an assigned question (mark as asked, add rating, etc.)
  updateAssignedQuestion: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        wasAsked: z.boolean().optional(),
        rating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
        isRequired: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      return ctx.prisma.interviewAssignedQuestion.update({
        where: { id },
        data,
      })
    }),

  // Remove an assigned question
  removeAssignedQuestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.interviewAssignedQuestion.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  // Reorder assigned questions
  reorderAssignedQuestions: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        questionOrder: z.array(z.string()), // Array of assigned question IDs in new order
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates = input.questionOrder.map((id, index) =>
        ctx.prisma.interviewAssignedQuestion.update({
          where: { id },
          data: { sortOrder: index },
        })
      )

      await ctx.prisma.$transaction(updates)
      return { success: true }
    }),
})
