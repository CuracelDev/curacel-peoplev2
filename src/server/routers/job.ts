import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc'

const InboundChannelEnum = z.enum(['YC', 'PEOPLEOS', 'COMPANY_SITE', 'OTHER'])
const OutboundChannelEnum = z.enum(['LINKEDIN', 'JOB_BOARDS', 'GITHUB', 'TWITTER', 'OTHER'])
const CandidateSourceEnum = z.enum(['INBOUND', 'OUTBOUND', 'RECRUITER', 'EXCELLER'])

const JobStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'HIRED'])
type JobStatusType = z.infer<typeof JobStatusEnum>

const JobCandidateStageEnum = z.enum([
  'APPLIED',
  'HR_SCREEN',     // People Chat
  'TEAM_CHAT',     // Team Chat
  'ADVISOR_CHAT',  // Advisor Chat
  'TECHNICAL',     // Coding Test
  'PANEL',
  'TRIAL',
  'CEO_CHAT',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
])

export const jobRouter = router({
  // List all jobs with optional filters
  list: protectedProcedure
    .input(
      z.object({
        status: JobStatusEnum.optional(),
        department: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: { status?: JobStatusType; department?: string } = {}

      if (input?.status) {
        where.status = input.status
      }
      if (input?.department) {
        where.department = input.department
      }

      const jobs = await ctx.prisma.job.findMany({
        where,
        include: {
          jobDescription: { select: { id: true, name: true } },
          hiringManager: { select: { id: true, fullName: true } },
          followers: {
            include: { employee: { select: { id: true, fullName: true } } },
          },
          competencies: {
            include: { competency: { select: { id: true, name: true, category: true } } },
          },
          candidates: {
            select: { id: true, stage: true, score: true },
          },
          _count: {
            select: { followers: true, competencies: true, candidates: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Calculate stats for each job
      return jobs.map((job) => {
        const activeCandidates = job.candidates.filter(
          (c) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(c.stage)
        )
        const scores = job.candidates.filter((c) => c.score != null).map((c) => c.score as number)
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

        const stats = {
          applicants: job._count.candidates,
          inReview: job.candidates.filter((c) => c.stage === 'APPLIED').length,
          interviewing: job.candidates.filter((c) =>
            ['HR_SCREEN', 'TECHNICAL', 'PANEL'].includes(c.stage)
          ).length,
          offerStage: job.candidates.filter((c) => c.stage === 'OFFER').length,
          hired: job.candidates.filter((c) => c.stage === 'HIRED').length,
          avgScore,
        }

        const { candidates, ...jobWithoutCandidates } = job
        return { ...jobWithoutCandidates, stats }
      })
    }),

  // Get a single job by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.id },
        include: {
          jobDescription: true,
          hiringManager: { select: { id: true, fullName: true, workEmail: true } },
          followers: {
            include: { employee: { select: { id: true, fullName: true, workEmail: true } } },
          },
          competencies: {
            include: { competency: true },
          },
          hiringFlowSnapshot: {
            include: {
              flow: {
                include: {
                  snapshots: {
                    orderBy: { version: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      // Calculate if the flow is outdated
      let flowOutdated = false
      let latestVersion: number | null = null
      let currentVersion: number | null = null

      if (job.hiringFlowSnapshot?.flow?.snapshots?.[0]) {
        latestVersion = job.hiringFlowSnapshot.flow.snapshots[0].version
        currentVersion = job.hiringFlowSnapshot.version
        flowOutdated = latestVersion > currentVersion
      }

      return {
        ...job,
        flowOutdated,
        latestVersion,
        currentVersion,
      }
    }),

  // Create a new job
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2).max(200),
        department: z.string().optional(),
        employmentType: z.string().default('full-time'),
        status: JobStatusEnum.default('DRAFT'),
        priority: z.number().min(1).max(5).default(3),
        deadline: z.string().optional(), // ISO date string
        hiresCount: z.number().min(1).default(1),
        // Salary
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        salaryCurrency: z.string().optional(),
        salaryFrequency: z.string().optional(),
        // Equity
        equityMin: z.number().optional(),
        equityMax: z.number().optional(),
        // Locations
        locations: z.array(z.string()).default([]),
        // References
        hiringFlowId: z.string().optional(),
        jobDescriptionId: z.string().optional(),
        hiringManagerId: z.string().optional(),
        // AI settings
        autoArchiveLocation: z.boolean().default(false),
        // Relations
        followerIds: z.array(z.string()).default([]),
        competencyIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { followerIds, competencyIds, deadline, hiringFlowId, ...data } = input

      // Convert hiringFlowId to hiringFlowSnapshotId by finding the latest snapshot
      let hiringFlowSnapshotId: string | undefined
      if (hiringFlowId) {
        const latestSnapshot = await ctx.prisma.hiringFlowSnapshot.findFirst({
          where: { flowId: hiringFlowId },
          orderBy: { version: 'desc' },
        })
        if (latestSnapshot) {
          hiringFlowSnapshotId = latestSnapshot.id
        }
      }

      const job = await ctx.prisma.job.create({
        data: {
          ...data,
          hiringFlowId, // Keep legacy field for reference
          hiringFlowSnapshotId, // Assign the latest snapshot
          deadline: deadline ? new Date(deadline) : null,
          locations: data.locations,
          followers: {
            create: followerIds.map((employeeId) => ({ employeeId })),
          },
          competencies: {
            create: competencyIds.map((competencyId) => ({ competencyId })),
          },
        },
        include: {
          jobDescription: { select: { id: true, name: true } },
          hiringManager: { select: { id: true, fullName: true } },
          followers: {
            include: { employee: { select: { id: true, fullName: true } } },
          },
          competencies: {
            include: { competency: { select: { id: true, name: true, category: true } } },
          },
        },
      })

      return job
    }),

  // Update a job
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(2).max(200).optional(),
        department: z.string().optional().nullable(),
        employmentType: z.string().optional(),
        status: JobStatusEnum.optional(),
        priority: z.number().min(1).max(5).optional(),
        deadline: z.string().optional().nullable(),
        hiresCount: z.number().min(1).optional(),
        // Salary
        salaryMin: z.number().optional().nullable(),
        salaryMax: z.number().optional().nullable(),
        salaryCurrency: z.string().optional().nullable(),
        salaryFrequency: z.string().optional().nullable(),
        // Equity
        equityMin: z.number().optional().nullable(),
        equityMax: z.number().optional().nullable(),
        // Locations
        locations: z.array(z.string()).optional(),
        // References
        hiringFlowId: z.string().optional().nullable(),
        jobDescriptionId: z.string().optional().nullable(),
        hiringManagerId: z.string().optional().nullable(),
        // AI settings
        autoArchiveLocation: z.boolean().optional(),
        // Relations (replace all)
        followerIds: z.array(z.string()).optional(),
        competencyIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, followerIds, competencyIds, deadline, locations, hiringFlowId, ...data } = input

      const existing = await ctx.prisma.job.findUnique({ where: { id } })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      // Build update operations
      const updateData: Record<string, unknown> = { ...data }

      if (deadline !== undefined) {
        updateData.deadline = deadline ? new Date(deadline) : null
      }

      if (locations !== undefined) {
        updateData.locations = locations
      }

      // Convert hiringFlowId to hiringFlowSnapshotId if provided
      if (hiringFlowId !== undefined) {
        updateData.hiringFlowId = hiringFlowId

        if (hiringFlowId) {
          const latestSnapshot = await ctx.prisma.hiringFlowSnapshot.findFirst({
            where: { flowId: hiringFlowId },
            orderBy: { version: 'desc' },
          })
          if (latestSnapshot) {
            updateData.hiringFlowSnapshotId = latestSnapshot.id
          }
        } else {
          updateData.hiringFlowSnapshotId = null
        }
      }

      // Update job with optional relation replacements
      const job = await ctx.prisma.job.update({
        where: { id },
        data: updateData,
      })

      // Replace followers if provided
      if (followerIds !== undefined) {
        await ctx.prisma.jobFollower.deleteMany({ where: { jobId: id } })
        if (followerIds.length > 0) {
          await ctx.prisma.jobFollower.createMany({
            data: followerIds.map((employeeId) => ({ jobId: id, employeeId })),
          })
        }
      }

      // Replace competencies if provided
      if (competencyIds !== undefined) {
        await ctx.prisma.jobCompetency.deleteMany({ where: { jobId: id } })
        if (competencyIds.length > 0) {
          await ctx.prisma.jobCompetency.createMany({
            data: competencyIds.map((competencyId) => ({ jobId: id, competencyId })),
          })
        }
      }

      // Return updated job with relations
      return ctx.prisma.job.findUnique({
        where: { id },
        include: {
          jobDescription: { select: { id: true, name: true } },
          hiringManager: { select: { id: true, fullName: true } },
          followers: {
            include: { employee: { select: { id: true, fullName: true } } },
          },
          competencies: {
            include: { competency: { select: { id: true, name: true, category: true } } },
          },
        },
      })
    }),

  // Delete a job (or close it)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.job.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  // Pause a job
  pause: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.job.update({
        where: { id: input.id },
        data: { status: 'PAUSED' },
      })
    }),

  // Mark a job as hired (all positions filled)
  markHired: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.job.update({
        where: { id: input.id },
        data: { status: 'HIRED' },
      })
    }),

  // Get job counts by status
  getCounts: protectedProcedure.query(async ({ ctx }) => {
    const [all, active, draft, paused, hired] = await Promise.all([
      ctx.prisma.job.count(),
      ctx.prisma.job.count({ where: { status: 'ACTIVE' } }),
      ctx.prisma.job.count({ where: { status: 'DRAFT' } }),
      ctx.prisma.job.count({ where: { status: 'PAUSED' } }),
      ctx.prisma.job.count({ where: { status: 'HIRED' } }),
    ])

    return { all, active, draft, paused, hired }
  }),

  // List candidates for a job
  listCandidates: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        stage: JobCandidateStageEnum.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: { jobId: string; stage?: string } = { jobId: input.jobId }
      if (input.stage) {
        where.stage = input.stage
      }

      const candidates = await ctx.prisma.jobCandidate.findMany({
        where,
        orderBy: [{ score: 'desc' }, { appliedAt: 'desc' }],
      })

      // Get stage counts
      const stageCounts = await ctx.prisma.jobCandidate.groupBy({
        by: ['stage'],
        where: { jobId: input.jobId },
        _count: true,
      })

      const counts = {
        all: candidates.length,
        applied: 0,
        hrScreen: 0,
        technical: 0,
        panel: 0,
        offer: 0,
        hired: 0,
        rejected: 0,
      }

      stageCounts.forEach((s) => {
        switch (s.stage) {
          case 'APPLIED':
            counts.applied = s._count
            break
          case 'HR_SCREEN':
            counts.hrScreen = s._count
            break
          case 'TECHNICAL':
            counts.technical = s._count
            break
          case 'PANEL':
            counts.panel = s._count
            break
          case 'OFFER':
            counts.offer = s._count
            break
          case 'HIRED':
            counts.hired = s._count
            break
          case 'REJECTED':
            counts.rejected = s._count
            break
        }
      })

      counts.all = stageCounts.reduce((sum, s) => sum + s._count, 0)

      return { candidates, counts }
    }),

  // Add a candidate to a job
  addCandidate: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        resumeUrl: z.string().optional(),
        linkedinUrl: z.string().optional(),
        // Enhanced source tracking
        source: CandidateSourceEnum.default('EXCELLER'),
        inboundChannel: InboundChannelEnum.optional(),
        outboundChannel: OutboundChannelEnum.optional(),
        bio: z.string().optional(),
        coverLetter: z.string().optional(),
        referredBy: z.string().optional(),
        notes: z.string().optional(),
        score: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { jobId, source, inboundChannel, outboundChannel, ...data } = input

      // Check job exists
      const job = await ctx.prisma.job.findUnique({ where: { id: jobId } })
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      // Get the current user's employee ID for addedById (OUTBOUND/EXCELLER sources)
      const addedById = ['OUTBOUND', 'EXCELLER'].includes(source) && ctx.user?.employeeId
        ? ctx.user.employeeId
        : undefined

      return ctx.prisma.jobCandidate.create({
        data: {
          ...data,
          jobId,
          source,
          inboundChannel: source === 'INBOUND' ? inboundChannel : null,
          outboundChannel: source === 'OUTBOUND' ? outboundChannel : null,
          addedById,
          stage: 'APPLIED',
        },
      })
    }),

  // Update candidate stage or details
  updateCandidate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional().nullable(),
        resumeUrl: z.string().optional().nullable(),
        linkedinUrl: z.string().optional().nullable(),
        stage: JobCandidateStageEnum.optional(),
        score: z.number().min(0).max(100).optional().nullable(),
        source: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        decisionStatus: z.enum(['PENDING', 'HIRE', 'HOLD', 'NO_HIRE']).optional(),
        decisionNotes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, decisionStatus, decisionNotes, ...data } = input
      const updateData: Record<string, unknown> = { ...data }

      if (decisionStatus) {
        updateData.decisionStatus = decisionStatus
        updateData.decisionNotes = decisionNotes ?? null
        updateData.decisionAt = new Date()
        if (ctx.user?.employeeId) {
          updateData.decisionBy = ctx.user.employeeId
        }
      } else if (decisionNotes !== undefined) {
        updateData.decisionNotes = decisionNotes
      }

      return ctx.prisma.jobCandidate.update({
        where: { id },
        data: updateData,
      })
    }),

  // Bulk update candidate stages
  bulkUpdateCandidateStage: protectedProcedure
    .input(
      z.object({
        candidateIds: z.array(z.string()),
        stage: JobCandidateStageEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.jobCandidate.updateMany({
        where: { id: { in: input.candidateIds } },
        data: { stage: input.stage },
      })
    }),

  // Delete a candidate
  deleteCandidate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.jobCandidate.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  // =====================
  // WEBHOOK PROCEDURES
  // =====================

  // Update webhook settings for a job
  updateWebhookSettings: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        webhookUrl: z.string().url().optional().or(z.literal('')),
        webhookSecret: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, webhookUrl, webhookSecret, isPublic } = input

      const job = await ctx.prisma.job.findUnique({ where: { id } })
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      return ctx.prisma.job.update({
        where: { id },
        data: {
          webhookUrl: webhookUrl || null,
          webhookSecret: webhookSecret || null,
          ...(isPublic !== undefined && { isPublic }),
        },
      })
    }),

  // =====================
  // PUBLIC PROCEDURES
  // =====================

  // Get a public job posting by ID
  getPublicJob: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findFirst({
        where: {
          id: input.id,
          isPublic: true,
          status: 'ACTIVE',
        },
        include: {
          jobDescription: {
            select: {
              id: true,
              name: true,
              content: true,
            },
          },
        },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found or not publicly available',
        })
      }

      return job
    }),

  // =====================
  // ALL CANDIDATES ACROSS JOBS
  // =====================

  // Get all candidates across all jobs with filtering
  getAllCandidates: protectedProcedure
    .input(
      z.object({
        stage: JobCandidateStageEnum.optional(),
        source: CandidateSourceEnum.optional(),
        search: z.string().optional(),
        jobId: z.string().optional(),
        sortBy: z.enum(['score', 'appliedAt', 'name', 'updatedAt']).default('appliedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input || {}

      // Build where clause
      const where: Record<string, unknown> = {}

      if (filters.stage) {
        where.stage = filters.stage
      } else {
        // Exclude rejected/withdrawn by default
        where.stage = { notIn: ['REJECTED', 'WITHDRAWN'] }
      }

      if (filters.source) {
        where.source = filters.source
      }

      if (filters.jobId) {
        where.jobId = filters.jobId
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { currentCompany: { contains: filters.search, mode: 'insensitive' } },
          { currentRole: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      // Get candidates with pagination
      const [candidates, total] = await Promise.all([
        ctx.prisma.jobCandidate.findMany({
          where,
          orderBy: { [filters.sortBy || 'appliedAt']: filters.sortOrder || 'desc' },
          take: filters.limit,
          skip: filters.offset,
          include: {
            job: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        }),
        ctx.prisma.jobCandidate.count({ where }),
      ])

      // Get counts by stage
      const stageCounts = await ctx.prisma.jobCandidate.groupBy({
        by: ['stage'],
        _count: { id: true },
        where: filters.jobId ? { jobId: filters.jobId } : undefined,
      })

      const stageDisplayNames: Record<string, string> = {
        APPLIED: 'Applied',
        HR_SCREEN: 'People Chat',
        TECHNICAL: 'Coding Test',
        TEAM_CHAT: 'Team Chat',
        ADVISOR_CHAT: 'Advisor Chat',
        PANEL: 'Panel',
        TRIAL: 'Trial',
        CEO_CHAT: 'CEO Chat',
        OFFER: 'Offer',
        HIRED: 'Hired',
        REJECTED: 'Rejected',
        WITHDRAWN: 'Withdrawn',
      }

      const byStageCounts = stageCounts.reduce((acc, item) => {
        acc[item.stage] = {
          count: item._count.id,
          displayName: stageDisplayNames[item.stage] || item.stage,
        }
        return acc
      }, {} as Record<string, { count: number; displayName: string }>)

      return {
        candidates: candidates.map((c) => ({
          ...c,
          stageDisplayName: stageDisplayNames[c.stage] || c.stage,
        })),
        total,
        byStageCounts,
      }
    }),

  // Get full candidate profile with all related data
  getCandidateProfile: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const candidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id: input.candidateId },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              hiringFlowSnapshot: {
                select: {
                  id: true,
                  version: true,
                  stages: true,
                },
              },
            },
          },
          interviews: {
            include: {
              evaluations: {
                include: {
                  criteriaScores: {
                    include: {
                      criteria: true,
                    },
                  },
                },
              },
              interviewerTokens: {
                select: {
                  id: true,
                  interviewerName: true,
                  interviewerEmail: true,
                  interviewerRole: true,
                  evaluationStatus: true,
                  overallRating: true,
                  recommendation: true,
                  evaluationNotes: true,
                  submittedAt: true,
                  customQuestions: true,
                },
              },
            },
            orderBy: { scheduledAt: 'asc' },
          },
          assessments: {
            include: {
              template: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          addedBy: {
            select: {
              id: true,
              fullName: true,
              workEmail: true,
            },
          },
          recruiterCandidate: {
            include: {
              recruiter: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  organizationName: true,
                },
              },
            },
          },
          interestFormResponses: {
            include: {
              template: {
                include: {
                  questions: true,
                },
              },
            },
          },
        },
      })

      if (!candidate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidate not found',
        })
      }

      // Build stage display name mapping
      const stageDisplayNames: Record<string, string> = {
        APPLIED: 'Applied',
        HR_SCREEN: 'People Chat',
        TECHNICAL: 'Coding Test',
        TEAM_CHAT: 'Team Chat',
        ADVISOR_CHAT: 'Advisor Chat',
        PANEL: 'Panel',
        TRIAL: 'Trial',
        CEO_CHAT: 'CEO Chat',
        OFFER: 'Offer',
        HIRED: 'Hired',
        REJECTED: 'Rejected',
        WITHDRAWN: 'Withdrawn',
      }

      // Build evaluation summary
      const evaluationsByStage: Record<string, {
        stage: string
        stageName: string
        evaluators: {
          name: string
          role: string | null
          overallRating: number | null
          recommendation: string | null
          notes: string | null
          criteriaScores: Array<{ name: string; score: number; notes: string | null }>
        }[]
        averageScore: number | null
      }> = {}

      for (const interview of candidate.interviews) {
        const evaluators = []

        // Combine evaluations from InterviewEvaluation and InterviewerToken
        for (const evaluation of interview.evaluations) {
          evaluators.push({
            name: evaluation.evaluatorName,
            role: null,
            overallRating: evaluation.overallScore,
            recommendation: evaluation.recommendation,
            notes: evaluation.overallNotes,
            criteriaScores: evaluation.criteriaScores.map((cs) => ({
              name: cs.criteria.name,
              score: cs.score,
              notes: cs.notes,
            })),
          })
        }

        for (const token of interview.interviewerTokens) {
          if (token.evaluationStatus === 'SUBMITTED') {
            evaluators.push({
              name: token.interviewerName,
              role: token.interviewerRole,
              overallRating: token.overallRating,
              recommendation: token.recommendation,
              notes: token.evaluationNotes,
              criteriaScores: [],
            })
          }
        }

        if (evaluators.length > 0) {
          const scores = evaluators.filter((e) => e.overallRating != null).map((e) => e.overallRating as number)
          const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

          evaluationsByStage[interview.stage] = {
            stage: interview.stage,
            stageName: interview.stageName || stageDisplayNames[interview.stage] || interview.stage,
            evaluators,
            averageScore,
          }
        }
      }

      return {
        candidate: {
          ...candidate,
          stageDisplayName: stageDisplayNames[candidate.stage] || candidate.stage,
        },
        interviews: candidate.interviews.map((i) => ({
          ...i,
          stageDisplayName: stageDisplayNames[i.stage] || i.stage,
        })),
        assessments: candidate.assessments,
        evaluationSummary: {
          byStage: Object.values(evaluationsByStage),
          overallScore: candidate.score,
          recommendation: candidate.recommendation,
          aiRecommendation: {
            decision: candidate.recommendation,
            confidence: candidate.recommendationConfidence,
            summary: candidate.recommendationSummary,
            strengths: candidate.recommendationStrengths,
            risks: candidate.recommendationRisks,
          },
        },
        documents: candidate.documents as Array<{
          id: string
          name: string
          type: string
          url: string
          uploadedAt: string
        }> | null,
        stageDisplayNames,
      }
    }),

  // Submit a public job application
  submitApplication: publicProcedure
    .input(
      z.object({
        jobId: z.string(),
        name: z.string().min(2, 'Name is required'),
        email: z.string().email('Invalid email address'),
        phone: z.string().optional(),
        linkedinUrl: z.string().url().optional().or(z.literal('')),
        bio: z.string().optional(),
        coverLetter: z.string().min(10, 'Please write a cover letter'),
        resumeUrl: z.string().optional(),
        inboundChannel: InboundChannelEnum.default('PEOPLEOS'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { jobId, inboundChannel, ...candidateData } = input

      // Verify job exists and is public/active
      const job = await ctx.prisma.job.findFirst({
        where: {
          id: jobId,
          isPublic: true,
          status: 'ACTIVE',
        },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found or not accepting applications',
        })
      }

      // Check if candidate has already applied to this job
      const existingApplication = await ctx.prisma.jobCandidate.findFirst({
        where: {
          jobId,
          email: input.email,
        },
      })

      if (existingApplication) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You have already applied to this position',
        })
      }

      // Create the candidate with INBOUND source
      const candidate = await ctx.prisma.jobCandidate.create({
        data: {
          ...candidateData,
          jobId,
          source: 'INBOUND',
          inboundChannel,
          stage: 'APPLIED',
        },
      })

      return { success: true, candidateId: candidate.id }
    }),

  // BULK UPLOAD ENDPOINTS
  // =====================

  // Parse uploaded file and use AI to match fields
  parseUploadForBulkImport: protectedProcedure
    .input(
      z.object({
        fileContent: z.string(), // Base64 or CSV content
        fileName: z.string(),
        fileType: z.enum(['csv', 'xlsx', 'xls']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileContent, fileName, fileType } = input

      // Expected candidate fields
      const expectedFields = [
        { key: 'name', label: 'Full Name', required: true },
        { key: 'email', label: 'Email Address', required: true },
        { key: 'phone', label: 'Phone Number', required: false },
        { key: 'linkedinUrl', label: 'LinkedIn URL', required: false },
        { key: 'currentRole', label: 'Current Role/Title', required: false },
        { key: 'currentCompany', label: 'Current Company', required: false },
        { key: 'yearsOfExperience', label: 'Years of Experience', required: false },
        { key: 'location', label: 'Location', required: false },
        { key: 'source', label: 'Source', required: false },
        { key: 'notes', label: 'Notes', required: false },
        { key: 'resumeUrl', label: 'Resume URL', required: false },
      ]

      // Parse CSV content to extract headers and sample rows
      let headers: string[] = []
      let sampleRows: string[][] = []
      let allRows: string[][] = []

      try {
        if (fileType === 'csv') {
          // Parse CSV
          const lines = fileContent.split('\n').filter((line) => line.trim())
          if (lines.length === 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Empty file' })
          }

          // Simple CSV parsing (handles basic comma separation)
          const parseLine = (line: string): string[] => {
            const result: string[] = []
            let current = ''
            let inQuotes = false

            for (let i = 0; i < line.length; i++) {
              const char = line[i]
              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
              } else {
                current += char
              }
            }
            result.push(current.trim())
            return result
          }

          headers = parseLine(lines[0])
          allRows = lines.slice(1).map(parseLine)
          sampleRows = allRows.slice(0, 5) // First 5 rows as sample
        } else {
          // For Excel files, we'd need xlsx library on the server
          // For now, return an error asking for CSV
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Excel files are not yet supported. Please convert to CSV.',
          })
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to parse file. Please check the format.',
        })
      }

      // Get AI settings for field matching
      let aiMapping: Record<string, string> = {}
      let confidenceScores: Record<string, number> = {}
      let needsManualMapping = false

      try {
        const settings = await ctx.prisma.aISettings.findFirst({
          orderBy: { updatedAt: 'desc' },
        })

        if (settings?.apiKey) {
          const { decrypt } = await import('@/lib/encryption')
          const apiKey = decrypt(settings.apiKey)

          // Build prompt for AI field matching
          const prompt = `You are an expert at data field mapping. Given the following CSV headers and sample data, match each header to the most appropriate candidate field.

CSV Headers: ${JSON.stringify(headers)}

Sample Data (first 3 rows):
${sampleRows
  .slice(0, 3)
  .map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`)
  .join('\n')}

Expected Candidate Fields:
${expectedFields.map((f) => `- ${f.key}: ${f.label}${f.required ? ' (required)' : ''}`).join('\n')}

Return a JSON object where:
- Keys are the CSV header names (exactly as provided)
- Values are objects with:
  - "field": the matched candidate field key (or null if no match)
  - "confidence": a number 0-100 indicating match confidence

Example response:
{
  "Full Name": {"field": "name", "confidence": 95},
  "Email": {"field": "email", "confidence": 98},
  "Company": {"field": "currentCompany", "confidence": 85},
  "Unknown Column": {"field": null, "confidence": 0}
}

IMPORTANT: Return ONLY valid JSON, no additional text.`

          if (settings.provider === 'OPENAI') {
            const { default: OpenAI } = await import('openai')
            const client = new OpenAI({ apiKey })

            const response = await client.chat.completions.create({
              model: settings.model || 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' },
            })

            const content = response.choices[0]?.message?.content
            if (content) {
              const parsed = JSON.parse(content)
              for (const [header, match] of Object.entries(parsed)) {
                const m = match as { field: string | null; confidence: number }
                if (m.field) {
                  aiMapping[header] = m.field
                  confidenceScores[header] = m.confidence
                  if (m.confidence < 70) {
                    needsManualMapping = true
                  }
                } else {
                  needsManualMapping = true
                }
              }
            }
          } else if (settings.provider === 'ANTHROPIC') {
            const { default: Anthropic } = await import('@anthropic-ai/sdk')
            const client = new Anthropic({ apiKey })

            const response = await client.messages.create({
              model: settings.model || 'claude-3-haiku-20240307',
              max_tokens: 1024,
              messages: [{ role: 'user', content: prompt }],
            })

            const textContent = response.content.find((c) => c.type === 'text')
            if (textContent && textContent.type === 'text') {
              // Extract JSON from response (may have markdown code blocks)
              let jsonStr = textContent.text
              const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
              if (jsonMatch) {
                jsonStr = jsonMatch[1]
              }
              const parsed = JSON.parse(jsonStr.trim())
              for (const [header, match] of Object.entries(parsed)) {
                const m = match as { field: string | null; confidence: number }
                if (m.field) {
                  aiMapping[header] = m.field
                  confidenceScores[header] = m.confidence
                  if (m.confidence < 70) {
                    needsManualMapping = true
                  }
                } else {
                  needsManualMapping = true
                }
              }
            }
          }
        } else {
          // No AI configured, require manual mapping
          needsManualMapping = true
        }
      } catch (error) {
        console.error('AI field matching failed:', error)
        needsManualMapping = true
      }

      // Check if required fields are mapped
      const mappedFields = new Set(Object.values(aiMapping))
      for (const field of expectedFields) {
        if (field.required && !mappedFields.has(field.key)) {
          needsManualMapping = true
          break
        }
      }

      return {
        headers,
        sampleRows,
        totalRows: allRows.length,
        expectedFields,
        aiMapping,
        confidenceScores,
        needsManualMapping,
        parsedData: allRows,
      }
    }),

  // Bulk import candidates with field mapping
  bulkImportCandidates: protectedProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        fieldMapping: z.record(z.string(), z.string()), // header -> field key
        data: z.array(z.array(z.string())), // Parsed rows
        headers: z.array(z.string()),
        source: CandidateSourceEnum.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { jobId, fieldMapping, data, headers, source = 'INBOUND' } = input

      // If no job specified, we need to find or create a default one
      let targetJobId = jobId

      if (!targetJobId) {
        // Look for an active job or create a generic talent pool
        const activeJob = await ctx.prisma.job.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        })

        if (activeJob) {
          targetJobId = activeJob.id
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No active job found. Please select a job to import candidates to.',
          })
        }
      }

      // Build candidate records
      const candidates: Array<{
        name: string
        email: string
        phone?: string
        linkedinUrl?: string
        currentRole?: string
        currentCompany?: string
        yearsOfExperience?: number
        location?: string
        notes?: string
        resumeUrl?: string
      }> = []

      const errors: Array<{ row: number; error: string }> = []

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const candidate: Record<string, unknown> = {}

        // Map each column to the appropriate field
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j]
          const fieldKey = fieldMapping[header]
          const value = row[j]?.trim()

          if (fieldKey && value) {
            if (fieldKey === 'yearsOfExperience') {
              const num = parseInt(value, 10)
              if (!isNaN(num)) {
                candidate[fieldKey] = num
              }
            } else {
              candidate[fieldKey] = value
            }
          }
        }

        // Validate required fields
        if (!candidate.name || typeof candidate.name !== 'string') {
          errors.push({ row: i + 1, error: 'Missing name' })
          continue
        }

        if (!candidate.email || typeof candidate.email !== 'string') {
          errors.push({ row: i + 1, error: 'Missing email' })
          continue
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(candidate.email)) {
          errors.push({ row: i + 1, error: `Invalid email: ${candidate.email}` })
          continue
        }

        candidates.push(candidate as (typeof candidates)[0])
      }

      // Check for duplicate emails within the batch
      const emailSet = new Set<string>()
      const duplicates: string[] = []
      for (const c of candidates) {
        if (emailSet.has(c.email.toLowerCase())) {
          duplicates.push(c.email)
        } else {
          emailSet.add(c.email.toLowerCase())
        }
      }

      if (duplicates.length > 0) {
        errors.push({
          row: 0,
          error: `Duplicate emails in file: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? ` and ${duplicates.length - 3} more` : ''}`,
        })
      }

      // Check for existing candidates in database
      const existingEmails = await ctx.prisma.jobCandidate.findMany({
        where: {
          email: { in: candidates.map((c) => c.email.toLowerCase()) },
          jobId: targetJobId,
        },
        select: { email: true },
      })

      const existingSet = new Set(existingEmails.map((e) => e.email.toLowerCase()))
      const newCandidates = candidates.filter((c) => !existingSet.has(c.email.toLowerCase()))
      const skippedCount = candidates.length - newCandidates.length

      // Import new candidates
      let importedCount = 0

      if (newCandidates.length > 0) {
        const result = await ctx.prisma.jobCandidate.createMany({
          data: newCandidates.map((c) => ({
            jobId: targetJobId!,
            name: c.name,
            email: c.email.toLowerCase(),
            phone: c.phone,
            linkedinUrl: c.linkedinUrl,
            currentRole: c.currentRole,
            currentCompany: c.currentCompany,
            yearsOfExperience: c.yearsOfExperience,
            location: c.location,
            notes: c.notes,
            resumeUrl: c.resumeUrl,
            source,
            stage: 'APPLIED',
            addedById: ctx.session.user.id,
          })),
          skipDuplicates: true,
        })

        importedCount = result.count
      }

      return {
        success: true,
        totalRows: data.length,
        importedCount,
        skippedCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Return first 10 errors
      }
    }),
})
