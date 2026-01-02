import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure, publicProcedure } from '@/lib/trpc'
import { Prisma } from '@prisma/client'
import { sendInterviewerInviteEmail } from '@/lib/email'

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
          interviewType: true,
        },
        orderBy: [
          { scheduledAt: 'asc' },
          { createdAt: 'desc' },
        ],
      })

      // Extract all unique employee IDs from interviewers
      const employeeIds = new Set<string>()
      interviews.forEach((interview) => {
        if (interview.interviewers && Array.isArray(interview.interviewers)) {
          ;(interview.interviewers as Array<{ employeeId?: string }>).forEach((interviewer) => {
            if (interviewer.employeeId) {
              employeeIds.add(interviewer.employeeId)
            }
          })
        }
      })

      // Fetch employee data for all interviewers
      const employees = await ctx.prisma.employee.findMany({
        where: {
          id: { in: Array.from(employeeIds) },
        },
        select: {
          id: true,
          profileImageUrl: true,
        },
      })

      // Create a map of employeeId to profileImageUrl
      const employeeImageMap = new Map(
        employees.map((emp) => [emp.id, emp.profileImageUrl])
      )

      // Add display names and employee images to interviews
      return interviews.map((interview) => {
        // Enrich interviewers with profile images
        const enrichedInterviewers = interview.interviewers && Array.isArray(interview.interviewers)
          ? (interview.interviewers as Array<{ employeeId?: string; name: string; email?: string }>).map((interviewer) => ({
              ...interviewer,
              profileImageUrl: interviewer.employeeId ? employeeImageMap.get(interviewer.employeeId) : null,
            }))
          : interview.interviewers

        return {
          ...interview,
          interviewers: enrichedInterviewers,
          stageDisplayName: interview.interviewType?.name || stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
        }
      })
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

      // Find next interview for the same candidate
      const nextInterview = await ctx.prisma.candidateInterview.findFirst({
        where: {
          candidateId: interview.candidateId,
          scheduledAt: { gt: interview.scheduledAt },
        },
        orderBy: { scheduledAt: 'asc' },
        select: { id: true },
      })

      // Find previous interview for the same candidate
      const previousInterview = await ctx.prisma.candidateInterview.findFirst({
        where: {
          candidateId: interview.candidateId,
          scheduledAt: { lt: interview.scheduledAt },
        },
        orderBy: { scheduledAt: 'desc' },
        select: { id: true },
      })

      return {
        ...interview,
        stageDisplayName: stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
        nextInterviewId: nextInterview?.id || null,
        previousInterviewId: previousInterview?.id || null,
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
            assignedToInterviewerId: z.string().optional(),
            assignedToInterviewerName: z.string().optional(),
          })
        ).optional(),
        // Interviewer assignments for questions from bank (questionId -> interviewerId mapping)
        questionAssignments: z.record(z.string(), z.object({
          interviewerId: z.string(),
          interviewerName: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log('Schedule mutation input:', JSON.stringify(input, null, 2))

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

      // Generate interviewer tokens for each interviewer
      if (input.interviewers?.length) {
        const tokenExpiresAt = new Date()
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30) // 30 days expiry

        await ctx.prisma.interviewerToken.createMany({
          data: input.interviewers.map((interviewer) => ({
            interviewId: interview.id,
            interviewerId: interviewer.employeeId,
            interviewerName: interviewer.name,
            interviewerEmail: interviewer.email,
            expiresAt: tokenExpiresAt,
          })),
        })
      }

      // Assign questions if provided
      if (input.questionIds?.length || input.customQuestions?.length) {
        const assignedQuestions = []

        // Add questions from bank
        if (input.questionIds?.length) {
          for (let i = 0; i < input.questionIds.length; i++) {
            const questionId = input.questionIds[i]
            const assignment = input.questionAssignments?.[questionId]
            assignedQuestions.push({
              interviewId: interview.id,
              questionId,
              sortOrder: i,
              assignedToInterviewerId: assignment?.interviewerId || null,
              assignedToInterviewerName: assignment?.interviewerName || null,
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
                  createdById: ctx.session?.user?.employeeId || null,
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
              assignedToInterviewerId: customQ.assignedToInterviewerId || null,
              assignedToInterviewerName: customQ.assignedToInterviewerName || null,
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

  // Update interview details (for editing scheduled interviews)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.string().optional(),
        duration: z.number().optional(),
        meetingLink: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        interviewers: z.array(
          z.object({
            employeeId: z.string().optional(),
            name: z.string(),
            email: z.string().email(),
          })
        ).optional(),
        interviewTypeId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, scheduledAt, duration, meetingLink, notes, interviewers, interviewTypeId } = input

      // Build update data
      const updateData: Record<string, unknown> = {}
      if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt)
      if (duration !== undefined) updateData.duration = duration
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink
      if (notes !== undefined) updateData.feedback = notes
      if (interviewers !== undefined) updateData.interviewers = interviewers
      if (interviewTypeId !== undefined) updateData.interviewTypeId = interviewTypeId

      const interview = await ctx.prisma.candidateInterview.update({
        where: { id },
        data: updateData,
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          interviewType: true,
        },
      })

      // Generate tokens for new interviewers (if interviewers were updated)
      if (interviewers && interviewers.length > 0) {
        // Get existing tokens for this interview
        const existingTokens = await ctx.prisma.interviewerToken.findMany({
          where: { interviewId: id },
          select: { interviewerEmail: true },
        })
        const existingEmails = new Set(existingTokens.map(t => t.interviewerEmail))

        // Find new interviewers that don't have tokens yet
        const newInterviewers = interviewers.filter(i => !existingEmails.has(i.email))

        if (newInterviewers.length > 0) {
          const tokenExpiresAt = new Date()
          tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30) // 30 days expiry

          await ctx.prisma.interviewerToken.createMany({
            data: newInterviewers.map((interviewer) => ({
              interviewId: id,
              interviewerId: interviewer.employeeId,
              interviewerName: interviewer.name,
              interviewerEmail: interviewer.email,
              expiresAt: tokenExpiresAt,
            })),
          })
        }
      }

      return {
        ...interview,
        stageDisplayName: interview.interviewType?.name || stageDisplayNames[interview.stage] || interview.stageName || interview.stage,
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

  // Generate tokens for all interviewers who don't have one yet
  generateMissingTokens: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        expiresInDays: z.number().optional().default(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get interview with interviewers
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      const interviewers = (interview.interviewers as Array<{
        employeeId?: string
        name: string
        email: string
      }>) || []

      // Get existing tokens
      const existingTokens = await ctx.prisma.interviewerToken.findMany({
        where: { interviewId: input.interviewId },
        select: { interviewerEmail: true, tokenType: true },
      })
      const existingEmails = new Set(existingTokens.map(t => t.interviewerEmail))
      const hasPeopleTeamToken = existingTokens.some(t => t.tokenType === 'PEOPLE_TEAM')

      // Find interviewers without tokens
      const newInterviewers = interviewers.filter(i => !existingEmails.has(i.email))

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

      const createdTokens: Array<{ id: string; token: string; tokenType: string; interviewerName: string; interviewerEmail: string }> = []

      // Create People Team token if it doesn't exist
      if (!hasPeopleTeamToken) {
        const peopleTeamToken = await ctx.prisma.interviewerToken.create({
          data: {
            interviewId: input.interviewId,
            tokenType: 'PEOPLE_TEAM',
            interviewerName: 'People Team',
            interviewerEmail: 'people-team@internal',
            expiresAt,
          },
        })
        createdTokens.push(peopleTeamToken)
      }

      // Create tokens for new interviewers
      if (newInterviewers.length) {
        const interviewerTokens = await Promise.all(
          newInterviewers.map((interviewer) =>
            ctx.prisma.interviewerToken.create({
              data: {
                interviewId: input.interviewId,
                tokenType: 'INTERVIEWER',
                interviewerId: interviewer.employeeId,
                interviewerName: interviewer.name,
                interviewerEmail: interviewer.email,
                expiresAt,
              },
            })
          )
        )
        createdTokens.push(...interviewerTokens)

        // Send email notifications to new interviewers
        // Fetch interview with candidate and job details
        const interviewWithDetails = await ctx.prisma.candidateInterview.findUnique({
          where: { id: input.interviewId },
          include: {
            candidate: {
              include: {
                job: true,
              },
            },
          },
        })

        if (interviewWithDetails?.candidate) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const companyName = process.env.COMPANY_NAME || 'Curacel'

          // Send emails in parallel (don't block on failures)
          await Promise.allSettled(
            interviewerTokens.map((token) =>
              sendInterviewerInviteEmail({
                to: token.interviewerEmail,
                interviewerName: token.interviewerName,
                candidateName: interviewWithDetails.candidate.name,
                jobTitle: interviewWithDetails.candidate.job?.title || 'Open Position',
                interviewDate: interviewWithDetails.scheduledAt || new Date(),
                interviewType: stageDisplayNames[interviewWithDetails.stage] || interviewWithDetails.stage,
                interviewLink: `${appUrl}/interview/${token.token}`,
                companyName,
              })
            )
          )
        }
      }

      return { created: createdTokens.length, tokens: createdTokens }
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

  // Resend interviewer invite email
  resendInterviewerEmail: protectedProcedure
    .input(
      z.object({
        tokenId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the token with interview and candidate details
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

      if (token.tokenType === 'PEOPLE_TEAM') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot send email to People Team token',
        })
      }

      if (token.isRevoked) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Token has been revoked',
        })
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const companyName = process.env.COMPANY_NAME || 'Curacel'

      await sendInterviewerInviteEmail({
        to: token.interviewerEmail,
        interviewerName: token.interviewerName,
        candidateName: token.interview.candidate.name,
        jobTitle: token.interview.candidate.job?.title || 'Open Position',
        interviewDate: token.interview.scheduledAt || new Date(),
        interviewType: stageDisplayNames[token.interview.stage] || token.interview.stage,
        interviewLink: `${appUrl}/interview/${token.token}`,
        companyName,
      })

      return { success: true }
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

      // Check if this is a People Team token
      const isPeopleTeam = tokenRecord.tokenType === 'PEOPLE_TEAM'

      // Get other tokens (panel members) status - for People Team, get ALL interviewer tokens
      const allTokens = await ctx.prisma.interviewerToken.findMany({
        where: {
          interviewId: tokenRecord.interviewId,
          tokenType: 'INTERVIEWER', // Only get interviewer tokens, not People Team
          ...(isPeopleTeam ? {} : { id: { not: tokenRecord.id } }), // People Team sees all, interviewers see others
        },
        select: {
          id: true,
          interviewerId: true,
          interviewerName: true,
          interviewerEmail: true,
          interviewerRole: true,
          evaluationStatus: true,
          overallRating: true,
          recommendation: true,
          evaluationNotes: true,
          questionResponses: true,
          submittedAt: true,
        },
      })

      // Get rubric template if linked
      let rubricCriteria: Array<{
        id: string
        name: string
        description: string | null
        weight: number
      }> = []

      if (tokenRecord.interview.stageTemplateId) {
        const template = await ctx.prisma.interviewStageTemplate.findUnique({
          where: { id: tokenRecord.interview.stageTemplateId },
          include: {
            criteria: {
              orderBy: { sortOrder: 'asc' },
            },
          },
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

      // Fetch assigned questions for this interview
      const assignedQuestions = await ctx.prisma.interviewAssignedQuestion.findMany({
        where: { interviewId: tokenRecord.interviewId },
        include: {
          question: true,
        },
        orderBy: { sortOrder: 'asc' },
      })

      // Map questions with assignment info
      const interviewQuestions = assignedQuestions.map(aq => ({
        id: aq.id,
        questionId: aq.questionId,
        text: aq.question?.text || aq.customText || '',
        category: aq.question?.category || aq.category || 'general',
        followUp: aq.question?.followUp || null,
        isRequired: aq.isRequired,
        isCustom: !aq.questionId,
        assignedToInterviewerId: aq.assignedToInterviewerId,
        assignedToInterviewerName: aq.assignedToInterviewerName,
        // Check if this question is assigned to the current interviewer
        isAssignedToMe: aq.assignedToInterviewerId === tokenRecord.interviewerId ||
                        aq.assignedToInterviewerName === tokenRecord.interviewerName,
      }))

      // Calculate lockout date (3 days after interview)
      const lockoutDays = 3 // Could be made configurable per organization
      const lockoutDate = tokenRecord.interview.scheduledAt
        ? new Date(tokenRecord.interview.scheduledAt.getTime() + (lockoutDays * 24 * 60 * 60 * 1000))
        : null
      const isLocked = lockoutDate ? new Date() > lockoutDate : false

      // Determine if editing is allowed
      const canEdit = !isPeopleTeam && !isLocked

      // For People Team, group questions by interviewer with their responses
      const interviewerQuestionResponses = isPeopleTeam
        ? allTokens.map(t => ({
            interviewerId: t.interviewerId,
            interviewerName: t.interviewerName,
            interviewerEmail: t.interviewerEmail,
            evaluationStatus: t.evaluationStatus,
            overallRating: t.overallRating,
            recommendation: t.recommendation,
            evaluationNotes: t.evaluationNotes,
            submittedAt: t.submittedAt,
            questionResponses: t.questionResponses as Record<string, { score: number | null; notes: string }> | null,
            // Questions assigned to this interviewer
            assignedQuestions: interviewQuestions.filter(
              q => q.assignedToInterviewerId === t.interviewerId ||
                   q.assignedToInterviewerName === t.interviewerName
            ),
          }))
        : null

      return {
        tokenId: tokenRecord.id,
        tokenType: tokenRecord.tokenType,
        isPeopleTeam,
        canEdit,
        interviewer: {
          id: tokenRecord.interviewerId,
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
        interviewQuestions,
        // For People Team: full interviewer responses grouped by person
        interviewerQuestionResponses,
        panelMembers: allTokens.map(t => ({
          id: t.id,
          interviewerId: t.interviewerId,
          name: t.interviewerName,
          email: t.interviewerEmail,
          role: t.interviewerRole,
          status: t.evaluationStatus,
          overallRating: t.overallRating,
          recommendation: t.recommendation,
          submittedAt: t.submittedAt,
        })),
        previousEvaluations: tokenRecord.interview.evaluations.map(e => ({
          evaluatorName: e.evaluatorName,
          score: e.overallScore,
          recommendation: e.recommendation,
        })),
        evaluationStatus: tokenRecord.evaluationStatus,
        isLocked,
        lockoutDate,
        savedDraft: tokenRecord.evaluationNotes ? {
          overallRating: tokenRecord.overallRating,
          recommendation: tokenRecord.recommendation,
          notes: tokenRecord.evaluationNotes,
          customQuestions: tokenRecord.customQuestions,
          questionResponses: tokenRecord.questionResponses,
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
        // Question responses: scores and notes for each interview question
        questionResponses: z.record(z.string(), z.object({
          score: z.number().min(1).max(5).nullable(),
          notes: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.prisma.interviewerToken.findUnique({
        where: { token: input.token },
        include: {
          interview: {
            select: { scheduledAt: true },
          },
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

      if (tokenRecord.evaluationStatus === 'SUBMITTED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Evaluation has already been submitted',
        })
      }

      // Check lockout (3 days after interview)
      const lockoutDays = 3
      if (tokenRecord.interview.scheduledAt) {
        const lockoutDate = new Date(tokenRecord.interview.scheduledAt.getTime() + (lockoutDays * 24 * 60 * 60 * 1000))
        if (new Date() > lockoutDate) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Feedback period has ended. Responses are now locked.',
          })
        }
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
          questionResponses: input.questionResponses,
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
        // Question responses: scores and notes for each interview question
        questionResponses: z.record(z.string(), z.object({
          score: z.number().min(1).max(5).nullable(),
          notes: z.string(),
        })).optional(),
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

      // Check lockout (3 days after interview)
      const lockoutDays = 3
      if (tokenRecord.interview.scheduledAt) {
        const lockoutDate = new Date(tokenRecord.interview.scheduledAt.getTime() + (lockoutDays * 24 * 60 * 60 * 1000))
        if (new Date() > lockoutDate) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Feedback period has ended. Responses are now locked.',
          })
        }
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
          questionResponses: input.questionResponses,
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
  // Interviewer Question Management (Public)
  // ============================================

  // Get question bank for token (public)
  getQuestionBankForToken: publicProcedure
    .input(z.object({
      token: z.string(),
      search: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const tokenRecord = await ctx.prisma.interviewerToken.findUnique({
        where: { token: input.token },
        include: {
          interview: {
            include: {
              candidate: {
                select: { jobId: true },
              },
            },
          },
        },
      })

      if (!tokenRecord || tokenRecord.tokenType === 'PEOPLE_TEAM') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid token or not authorized',
        })
      }

      // Get questions from the bank, filtered by job/category if applicable
      const questions = await ctx.prisma.interviewQuestion.findMany({
        where: {
          ...(input.search ? {
            text: { contains: input.search, mode: 'insensitive' as const },
          } : {}),
          ...(input.category ? { category: input.category } : {}),
          isActive: true,
        },
        take: input.limit,
        orderBy: { createdAt: 'desc' },
      })

      return {
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          category: q.category,
          followUp: q.followUp,
          isRequired: false,
        })),
      }
    }),

  // Add question to interviewer's assignments (public)
  addInterviewerQuestion: publicProcedure
    .input(z.object({
      token: z.string(),
      questionId: z.string().optional(), // From bank
      customQuestion: z.object({
        text: z.string(),
        category: z.string().optional(),
        followUp: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.prisma.interviewerToken.findUnique({
        where: { token: input.token },
        include: {
          interview: {
            select: { id: true, scheduledAt: true },
          },
        },
      })

      if (!tokenRecord || tokenRecord.tokenType === 'PEOPLE_TEAM') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid token or not authorized',
        })
      }

      // Check lockout
      const lockoutDays = 3
      const lockoutDate = tokenRecord.interview.scheduledAt
        ? new Date(tokenRecord.interview.scheduledAt.getTime() + (lockoutDays * 24 * 60 * 60 * 1000))
        : null
      if (lockoutDate && new Date() > lockoutDate) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot edit questions after the feedback period has ended',
        })
      }

      // Get the max sort order
      const maxSortOrder = await ctx.prisma.interviewAssignedQuestion.aggregate({
        where: { interviewId: tokenRecord.interview.id },
        _max: { sortOrder: true },
      })

      const newSortOrder = (maxSortOrder._max.sortOrder || 0) + 1

      // Create the assigned question
      const assignedQuestion = await ctx.prisma.interviewAssignedQuestion.create({
        data: {
          interviewId: tokenRecord.interview.id,
          questionId: input.questionId || null,
          customText: input.customQuestion?.text || null,
          category: input.customQuestion?.category || 'general',
          isRequired: false,
          sortOrder: newSortOrder,
          assignedToInterviewerId: tokenRecord.interviewerId,
          assignedToInterviewerName: tokenRecord.interviewerName,
        },
        include: {
          question: true,
        },
      })

      return {
        success: true,
        question: {
          id: assignedQuestion.id,
          text: assignedQuestion.question?.text || assignedQuestion.customText || '',
          category: assignedQuestion.question?.category || assignedQuestion.category || 'general',
          isCustom: !assignedQuestion.questionId,
        },
      }
    }),

  // Remove question from interviewer's assignments (public)
  removeInterviewerQuestion: publicProcedure
    .input(z.object({
      token: z.string(),
      assignedQuestionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.prisma.interviewerToken.findUnique({
        where: { token: input.token },
        include: {
          interview: {
            select: { id: true, scheduledAt: true },
          },
        },
      })

      if (!tokenRecord || tokenRecord.tokenType === 'PEOPLE_TEAM') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid token or not authorized',
        })
      }

      // Check lockout
      const lockoutDays = 3
      const lockoutDate = tokenRecord.interview.scheduledAt
        ? new Date(tokenRecord.interview.scheduledAt.getTime() + (lockoutDays * 24 * 60 * 60 * 1000))
        : null
      if (lockoutDate && new Date() > lockoutDate) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot edit questions after the feedback period has ended',
        })
      }

      // Verify the question is assigned to this interviewer
      const assignedQuestion = await ctx.prisma.interviewAssignedQuestion.findUnique({
        where: { id: input.assignedQuestionId },
      })

      if (!assignedQuestion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      // Only allow removing if assigned to this interviewer
      if (assignedQuestion.assignedToInterviewerId !== tokenRecord.interviewerId &&
          assignedQuestion.assignedToInterviewerName !== tokenRecord.interviewerName) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only remove questions assigned to you',
        })
      }

      await ctx.prisma.interviewAssignedQuestion.delete({
        where: { id: input.assignedQuestionId },
      })

      return { success: true }
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
          firefliesActionItems: Prisma.JsonNull,
          firefliesHighlights: Prisma.JsonNull,
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

      const { slots, calendarErrors } = await connector.findAvailableSlots({
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

      return { slots, calendarErrors }
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
      return {
        success: false,
        message: 'Calendar event tracking is not configured for interviews.',
      }
    }),

  // Delete calendar event for an interview
  deleteInterviewCalendarEvent: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
      })
    )
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
      return { success: true, message: 'No calendar event linked.' }
    }),

  // Get calendar event details for an interview
  getInterviewCalendarEvent: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        select: {
          meetingLink: true,
        },
      })

      if (!interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        })
      }

      return interview.meetingLink
        ? {
            eventId: null,
            meetLink: interview.meetingLink,
            htmlLink: null,
          }
        : null
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

      // Get AI settings
      const aiSettings = await ctx.prisma.aISettings.findFirst({
        orderBy: { updatedAt: 'desc' },
      })

      if (!aiSettings?.isEnabled) {
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
          include: { criteria: { orderBy: { sortOrder: 'asc' } } },
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

      const prompt = `You are AuntyPelz, an expert recruiting analyst at Curacel. Analyze this interview transcript and provide detailed feedback.

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

        switch (aiSettings.provider) {
          case 'ANTHROPIC': {
            if (!aiSettings.anthropicKeyEncrypted) {
              throw new Error('Anthropic API key not configured')
            }
            const apiKey = decrypt(aiSettings.anthropicKeyEncrypted)
            const { default: Anthropic } = await import('@anthropic-ai/sdk')
            const client = new Anthropic({ apiKey })

            const response = await client.messages.create({
              model: aiSettings.anthropicModel,
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
            if (!aiSettings.openaiKeyEncrypted) {
              throw new Error('OpenAI API key not configured')
            }
            const apiKey = decrypt(aiSettings.openaiKeyEncrypted)
            const { default: OpenAI } = await import('openai')
            const client = new OpenAI({ apiKey })

            const response = await client.chat.completions.create({
              model: aiSettings.openaiModel,
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
            if (!aiSettings.geminiKeyEncrypted) {
              throw new Error('Gemini API key not configured')
            }
            const apiKey = decrypt(aiSettings.geminiKeyEncrypted)
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.geminiModel}:generateContent?key=${apiKey}`,
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

      return {
        analysis: analysisResult,
        wasRegenerated: true,
        analyzedAt: new Date(),
      }
    }),

  // Get AI analysis for an interview
  getAIAnalysis: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await ctx.prisma.candidateInterview.findUnique({
        where: { id: input.interviewId },
        select: {
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
        hasAnalysis: false,
        analysis: null,
        analyzedAt: null,
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

      const { getGoogleWorkspaceConnector } = await import('@/lib/integrations/google-workspace')
      const connector = await getGoogleWorkspaceConnector()

      if (!connector) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Google Workspace integration is not configured',
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
          meetingLink: event.meetLink || fullInterview.meetingLink,
        },
      })

      return {
        action: 'created',
        meetLink: event.meetLink,
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
        assignedToInterviewerId: q.assignedToInterviewerId,
        assignedToInterviewerName: q.assignedToInterviewerName,
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
            assignedToInterviewerId: z.string().optional(),
            assignedToInterviewerName: z.string().optional(),
          })
        ).optional(),
        // Interviewer assignments for questions from bank (questionId -> interviewerId mapping)
        questionAssignments: z.record(z.string(), z.object({
          interviewerId: z.string(),
          interviewerName: z.string(),
        })).optional(),
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
            const assignment = input.questionAssignments?.[questionId]
            assignedQuestions.push({
              interviewId: input.interviewId,
              questionId,
              sortOrder: currentOrder++,
              assignedToInterviewerId: assignment?.interviewerId || null,
              assignedToInterviewerName: assignment?.interviewerName || null,
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
                createdById: ctx.session?.user?.employeeId || null,
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
            assignedToInterviewerId: customQ.assignedToInterviewerId || null,
            assignedToInterviewerName: customQ.assignedToInterviewerName || null,
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

  // Update an assigned question (mark as asked, add rating, interviewer assignment, etc.)
  updateAssignedQuestion: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        wasAsked: z.boolean().optional(),
        rating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
        isRequired: z.boolean().optional(),
        assignedToInterviewerId: z.string().nullable().optional(),
        assignedToInterviewerName: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      return ctx.prisma.interviewAssignedQuestion.update({
        where: { id },
        data,
      })
    }),

  // Bulk update interviewer assignments for questions
  updateQuestionAssignments: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
        assignments: z.array(
          z.object({
            questionId: z.string(), // InterviewAssignedQuestion.id
            interviewerId: z.string().nullable(),
            interviewerName: z.string().nullable(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates = input.assignments.map((assignment) =>
        ctx.prisma.interviewAssignedQuestion.update({
          where: { id: assignment.questionId },
          data: {
            assignedToInterviewerId: assignment.interviewerId,
            assignedToInterviewerName: assignment.interviewerName,
          },
        })
      )

      await ctx.prisma.$transaction(updates)
      return { updated: input.assignments.length }
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
