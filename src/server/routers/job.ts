import { z } from 'zod'
import * as xlsx from 'xlsx'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, publicProcedure } from '@/lib/trpc'
import { onJobStatusChange, syncJobToWebflow, unpublishJobFromWebflow } from '@/lib/integrations/webflow-sync'

const InboundChannelEnum = z.enum(['YC', 'PEOPLEOS', 'COMPANY_SITE', 'OTHER'])
const OutboundChannelEnum = z.enum(['LINKEDIN', 'JOB_BOARDS', 'GITHUB', 'TWITTER', 'OTHER'])
const CandidateSourceEnum = z.enum(['INBOUND', 'OUTBOUND', 'RECRUITER', 'EXCELLER'])

const JobStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'HIRED'])
type JobStatusType = z.infer<typeof JobStatusEnum>

const JobCandidateStageEnum = z.enum([
  'APPLIED',
  'SHORTLISTED',
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
  'ARCHIVED',
])
type JobCandidateStageType = z.infer<typeof JobCandidateStageEnum>

const allCandidatesFiltersSchema = z.object({
  stage: JobCandidateStageEnum.optional(),
  source: CandidateSourceEnum.optional(),
  search: z.string().optional(),
  jobId: z.string().optional(),
  department: z.string().optional(),
  appliedFrom: z.date().optional(),
  appliedTo: z.date().optional(),
  includeArchived: z.boolean().optional(),
  sortBy: z.enum(['score', 'appliedAt', 'name', 'updatedAt']).default('appliedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
}).optional()
type AllCandidatesFilters = z.infer<typeof allCandidatesFiltersSchema>

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
          hiringFlowSnapshot: {
            select: {
              stages: true,
            },
          },
          _count: {
            select: { followers: true, competencies: true, candidates: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const stageDisplayNames: Record<string, string> = {
        APPLIED: 'Applied',
        SHORTLISTED: 'Short Listed',
        HR_SCREEN: 'HR Screen',
        TECHNICAL: 'Technical',
        PANEL: 'Panel',
        CASE_STUDY: 'Case Study',
        CULTURE_FIT: 'Culture Fit',
        FINAL: 'Final',
        TRIAL: 'Trial',
        CEO_CHAT: 'CEO Chat',
        OFFER: 'Offer',
        HIRED: 'Hired',
        REJECTED: 'Rejected',
        WITHDRAWN: 'Withdrawn',
        ARCHIVED: 'Archived',
      }

      const stageEnumOrder = [
        'APPLIED',
        'SHORTLISTED',
        'HR_SCREEN',
        'TECHNICAL',
        'PANEL',
        'TEAM_CHAT',
        'ADVISOR_CHAT',
        'TRIAL',
        'CEO_CHAT',
        'OFFER',
        'HIRED',
        'REJECTED',
        'WITHDRAWN',
        'ARCHIVED',
      ]

      // Calculate stats for each job
      return jobs.map((job) => {
        const activeCandidates = job.candidates.filter(
          (c) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(c.stage)
        )
        const scores = job.candidates.filter((c) => c.score != null).map((c) => c.score as number)
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
        const maxScore = scores.length > 0 ? Math.max(...scores) : 0
        const stageCounts = job.candidates.reduce<Record<string, number>>((acc, candidate) => {
          acc[candidate.stage] = (acc[candidate.stage] || 0) + 1
          return acc
        }, {})
        const stagesData = (job.hiringFlowSnapshot?.stages as unknown) || []
        const stages = Array.isArray(stagesData) ? (stagesData as string[]) : []
        const stageBreakdown = stages.length > 0
          ? stages
            .map((stageName, index) => {
              const stageEnum = stageEnumOrder[index]
              if (!stageEnum) return null
              return {
                stage: stageEnum,
                label: stageName,
                count: stageCounts[stageEnum] || 0,
              }
            })
            .filter((item): item is { stage: string; label: string; count: number } => item !== null)
          : stageEnumOrder.map((stage) => ({
            stage,
            label: stageDisplayNames[stage] || stage,
            count: stageCounts[stage] || 0,
          }))

        const stats = {
          applicants: job._count.candidates,
          inReview: job.candidates.filter((c) => ['APPLIED', 'SHORTLISTED'].includes(c.stage)).length,
          interviewing: job.candidates.filter((c) =>
            ['HR_SCREEN', 'TECHNICAL', 'PANEL'].includes(c.stage)
          ).length,
          offerStage: job.candidates.filter((c) => c.stage === 'OFFER').length,
          hired: job.candidates.filter((c) => c.stage === 'HIRED').length,
          avgScore,
          maxScore,
        }

        const { candidates, ...jobWithoutCandidates } = job
        return { ...jobWithoutCandidates, stats, stageBreakdown }
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

  // Get comprehensive job details for detailed view page
  getDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.id },
        include: {
          jobDescription: true,
          scorecard: true,
          competencyRequirements: {
            include: {
              subCompetency: {
                include: {
                  coreCompetency: {
                    include: {
                      source: {
                        select: {
                          id: true,
                          name: true,
                          type: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: [
              {
                priority: 'asc', // CRITICAL first, then HIGH, MEDIUM, LOW
              },
              {
                isRequired: 'desc', // Required before optional
              },
            ],
          },
          hiringManager: {
            select: { id: true, fullName: true, workEmail: true, personalEmail: true },
          },
          followers: {
            include: {
              employee: { select: { id: true, fullName: true, workEmail: true } },
            },
          },
          hiringFlowSnapshot: {
            include: {
              flow: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          candidates: {
            select: { id: true, stage: true, score: true },
          },
        },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      // Extract hiring flow stages first
      const stagesData = (job.hiringFlowSnapshot?.stages as unknown) || []
      const stages = Array.isArray(stagesData) ? stagesData as string[] : []

      // Calculate pipeline stats based on hiring flow stages
      const activeCandidates = job.candidates.filter(
        (c) => !['REJECTED', 'WITHDRAWN', 'ARCHIVED'].includes(c.stage)
      )
      const scores = job.candidates.filter((c) => c.score != null).map((c) => c.score as number)
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

      // Group candidates by stage enum
      const candidatesByStageEnum = job.candidates.reduce((acc, candidate) => {
        acc[candidate.stage] = (acc[candidate.stage] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Standard stage enum order that maps to hiring flow positions
      const stageEnumOrder = [
        'APPLIED',
        'SHORTLISTED',
        'HR_SCREEN',
        'TECHNICAL',
        'TEAM_CHAT',
        'ADVISOR_CHAT',
        'PANEL',
        'TRIAL',
        'CEO_CHAT',
        'OFFER',
      ]

      // Build dynamic stage metrics using actual hiring flow stage names
      const stageMetrics: Array<{ name: string; count: number; stageEnum: string }> = []

      if (stages.length > 0) {
        stages.forEach((stageName, index) => {
          const stageEnum = stageEnumOrder[index]
          if (stageEnum) {
            stageMetrics.push({
              name: stageName, // Use actual hiring flow stage name
              count: candidatesByStageEnum[stageEnum] || 0,
              stageEnum,
            })
          }
        })
      }

      const stats = {
        totalCandidates: job.candidates.length,
        activeCandidates: activeCandidates.length,
        hired: job.candidates.filter((c) => c.stage === 'HIRED').length,
        avgScore,
        stageMetrics, // Dynamic stage metrics based on hiring flow
        byStage: candidatesByStageEnum, // Keep for backwards compatibility
      }

      // Group competencies by core competency
      const competenciesByCore: Record<string, {
        coreCompetency: {
          id: string
          name: string
          description: string | null
          functionArea: string | null
        }
        source: {
          id: string
          name: string
          type: string
        }
        requirements: Array<{
          id: string
          subCompetency: {
            id: string
            name: string
            description: string | null
          }
          requiredLevel: number
          requiredLevelName: string
          validationStage: string | null
          priority: string
          isRequired: boolean
        }>
      }> = {}

      for (const req of job.competencyRequirements) {
        const coreId = req.subCompetency.coreCompetency.id

        if (!competenciesByCore[coreId]) {
          competenciesByCore[coreId] = {
            coreCompetency: {
              id: req.subCompetency.coreCompetency.id,
              name: req.subCompetency.coreCompetency.name,
              description: req.subCompetency.coreCompetency.description,
              functionArea: req.subCompetency.coreCompetency.functionArea,
            },
            source: req.subCompetency.coreCompetency.source,
            requirements: [],
          }
        }

        competenciesByCore[coreId].requirements.push({
          id: req.id,
          subCompetency: {
            id: req.subCompetency.id,
            name: req.subCompetency.name,
            description: req.subCompetency.description,
          },
          requiredLevel: req.requiredLevel,
          requiredLevelName: req.requiredLevelName,
          validationStage: req.validationStage,
          priority: req.priority,
          isRequired: req.isRequired,
        })
      }

      const { candidates, ...jobWithoutCandidates } = job

      return {
        ...jobWithoutCandidates,
        stats,
        stages,
        competenciesByCore: Object.values(competenciesByCore),
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
        interestFormId: z.string().optional(),
        // AI settings
        autoArchiveLocation: z.boolean().default(false),
        // Relations
        followerIds: z.array(z.string()).default([]),
        competencyIds: z.array(z.string()).default([]),
        actionIds: z.array(z.string()).default([]),
        // Scorecard
        scorecardData: z
          .object({
            mission: z.string(),
            outcomes: z.array(
              z.object({
                name: z.string(),
                description: z.string(),
                successCriteria: z.array(z.string()),
              })
            ),
          })
          .optional(),
        // Competency Requirements (NEW v2 system)
        competencyRequirements: z
          .array(
            z.object({
              subCompetencyId: z.string(),
              requiredLevel: z.number().min(1).max(5),
              requiredLevelName: z.string(),
              priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
              isRequired: z.boolean().default(true),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        followerIds,
        competencyIds,
        actionIds,
        deadline,
        hiringFlowId,
        interestFormId,
        scorecardData,
        competencyRequirements,
        ...data
      } = input

      if (!interestFormId) {
        const activeForms = await ctx.prisma.interestFormTemplate.count({
          where: { isActive: true },
        })
        if (activeForms > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Select an interest form for this job.',
          })
        }
      }

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
          interestFormId: interestFormId || null,
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
          // Create AI action associations
          actions: {
            create: actionIds.map((actionId) => ({ actionId })),
          },
          // Create scorecard if provided
          scorecard: scorecardData
            ? {
              create: scorecardData,
            }
            : undefined,
          // Create competency requirements (NEW v2)
          competencyRequirements: {
            create: competencyRequirements,
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
          scorecard: true,
          competencyRequirements: {
            include: {
              subCompetency: {
                include: {
                  coreCompetency: {
                    include: { source: true },
                  },
                },
              },
            },
          },
        },
      })

      // Auto-sync to Webflow if job is created as ACTIVE and public
      if (job.status === 'ACTIVE' && job.isPublic) {
        syncJobToWebflow(job.id).catch(console.error)
      }

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
        interestFormId: z.string().optional().nullable(),
        // AI settings
        autoArchiveLocation: z.boolean().optional(),
        // Relations (replace all)
        followerIds: z.array(z.string()).optional(),
        competencyIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, followerIds, competencyIds, deadline, locations, hiringFlowId, interestFormId, ...data } = input

      const existing = await ctx.prisma.job.findUnique({ where: { id } })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      // Build update operations
      const updateData: Record<string, unknown> = { ...data }

      if (interestFormId !== undefined) {
        if (!interestFormId) {
          const activeForms = await ctx.prisma.interestFormTemplate.count({
            where: { isActive: true },
          })
          if (activeForms > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Select an interest form for this job.',
            })
          }
          updateData.interestFormId = null
        } else {
          updateData.interestFormId = interestFormId
        }
      }

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

      // Webflow auto-sync: trigger on status change
      if (input.status && input.status !== existing.status) {
        // Fire async - don't wait for completion
        onJobStatusChange(id, existing.status, input.status).catch(console.error)
      } else if (job.status === 'ACTIVE' && job.isPublic) {
        // If job is active and public, sync content changes
        syncJobToWebflow(id).catch(console.error)
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
      const existing = await ctx.prisma.job.findUnique({ where: { id: input.id } })
      const job = await ctx.prisma.job.update({
        where: { id: input.id },
        data: { status: 'PAUSED' },
      })
      // Trigger Webflow sync for status change
      if (existing && existing.status !== 'PAUSED') {
        onJobStatusChange(input.id, existing.status, 'PAUSED').catch(console.error)
      }
      return job
    }),

  // Mark a job as hired (all positions filled)
  markHired: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.job.findUnique({ where: { id: input.id } })
      const job = await ctx.prisma.job.update({
        where: { id: input.id },
        data: { status: 'HIRED' },
      })
      // Trigger Webflow sync for status change
      if (existing && existing.status !== 'HIRED') {
        onJobStatusChange(input.id, existing.status, 'HIRED').catch(console.error)
      }
      return job
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
      // Fetch job with hiring flow snapshot
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.jobId },
        select: {
          id: true,
          hiringFlowSnapshot: {
            select: {
              stages: true,
            },
          },
        },
      })

      const where: { jobId: string; stage?: JobCandidateStageType } = { jobId: input.jobId }
      if (input.stage) {
        where.stage = input.stage
      }

      const candidates = await ctx.prisma.jobCandidate.findMany({
        where,
        orderBy: [{ score: 'desc' }, { appliedAt: 'desc' }],
      })

      // Get hiring flow stages
      const hiringFlowStages = (job?.hiringFlowSnapshot?.stages as string[]) || []

      // Get stage counts from database
      const stageCounts = await ctx.prisma.jobCandidate.groupBy({
        by: ['stage'],
        where: { jobId: input.jobId },
        _count: true,
      })

      // Create a map of stage enum to count
      const stageCountMap: Record<string, number> = {}
      stageCounts.forEach((s) => {
        stageCountMap[s.stage] = s._count
      })

      // Build stage info directly from database stage counts
      const stageInfo: Array<{ stage: string; displayName: string; count: number }> = []

      // Default display names for stage enums
      const defaultStageNames: Record<string, string> = {
        APPLIED: 'Apply',
        SHORTLISTED: 'Short Listed',
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
        ARCHIVED: 'Archived',
      }

      // Stage display order
      const stageOrder = [
        'APPLIED',
        'SHORTLISTED',
        'HR_SCREEN',
        'TECHNICAL',
        'TEAM_CHAT',
        'ADVISOR_CHAT',
        'PANEL',
        'TRIAL',
        'CEO_CHAT',
        'OFFER',
        'HIRED',
        'REJECTED',
        'WITHDRAWN',
        'ARCHIVED',
      ]

      // Build stageInfo from actual database counts, sorted by stage order
      stageOrder.forEach((stageEnum) => {
        const count = stageCountMap[stageEnum]
        if (count && count > 0) {
          stageInfo.push({
            stage: stageEnum,
            displayName: defaultStageNames[stageEnum] || stageEnum.replace(/_/g, ' '),
            count,
          })
        }
      })

      const counts = {
        all: candidates.length,
        applied: 0,
        shortListed: 0,
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
          case 'SHORTLISTED':
            counts.shortListed = s._count
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

      return {
        candidates,
        counts,
        stageInfo,
        hiringFlowStages,
      }
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
        documents: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['resume', 'cover_letter', 'portfolio', 'certificate', 'other']).default('other'),
            url: z.string().url(),
            uploadedAt: z.string(),
          })
        ).optional(),
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
        skipAutoEmail: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, decisionStatus, decisionNotes, skipAutoEmail, ...data } = input

      // Get current candidate state for stage comparison
      const currentCandidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id },
        select: { stage: true },
      })

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

      const result = await ctx.prisma.jobCandidate.update({
        where: { id },
        data: updateData,
      })

      // Queue auto-email if stage changed
      if (input.stage && currentCandidate && input.stage !== currentCandidate.stage) {
        try {
          const { queueStageEmail } = await import('@/lib/jobs/stage-email')
          const { getWorker, initializeWorker } = await import('@/lib/jobs/worker')

          let boss = getWorker()
          if (!boss) {
            console.log('[updateCandidate] Worker not initialized, attempting auto-initialization...')
            boss = await initializeWorker()
          }

          if (boss && ctx.user) {
            await queueStageEmail(boss, {
              candidateId: id,
              fromStage: currentCandidate.stage,
              toStage: input.stage,
              recruiterId: ctx.user.id,
              recruiterEmail: ctx.user.email || '',
              recruiterName: ctx.user.name || undefined,
              skipAutoEmail: skipAutoEmail || false,
            })
            console.log(`[updateCandidate] Queued stage email for candidate ${id} moving to ${input.stage}`)
          } else {
            console.warn('[updateCandidate] Background worker not available or user email missing, skipping email queue')
          }
        } catch (error) {
          // Log error but don't fail the mutation
          console.error('[updateCandidate] Failed to queue stage email:', error)
        }

        // Auto-create employee and offer when candidate moves to OFFER stage
        if (input.stage === 'OFFER') {
          try {
            const { queueHireFlow } = await import('@/lib/jobs/hire-flow')
            const { getWorker } = await import('@/lib/jobs/worker')

            const boss = getWorker()
            if (boss) {
              await queueHireFlow(boss, {
                candidateId: id,
                jobId: result.jobId,
              })
              console.log('[updateCandidate] Queued hire flow for candidate:', id)
            }
          } catch (error) {
            // Log error but don't fail the mutation
            console.error('[updateCandidate] Failed to queue hire flow:', error)
          }
        }
      }

      return result
    }),

  // Bulk update candidate stages
  bulkUpdateCandidateStage: protectedProcedure
    .input(
      z.object({
        candidateIds: z.array(z.string()),
        stage: JobCandidateStageEnum,
        skipAutoEmail: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current stages for all candidates
      const currentCandidates = await ctx.prisma.jobCandidate.findMany({
        where: { id: { in: input.candidateIds } },
        select: { id: true, stage: true },
      })

      // Update all candidates
      const result = await ctx.prisma.jobCandidate.updateMany({
        where: { id: { in: input.candidateIds } },
        data: { stage: input.stage },
      })

      // Queue auto-emails for candidates whose stage actually changed
      try {
        const { queueStageEmail } = await import('@/lib/jobs/stage-email')
        const { getWorker, initializeWorker } = await import('@/lib/jobs/worker')

        let boss = getWorker()
        if (!boss) {
          console.log('[bulkUpdateCandidateStage] Worker not initialized, attempting auto-initialization...')
          boss = await initializeWorker().catch(e => {
            console.error('[bulkUpdateCandidateStage] Auto-initialization failed:', e)
            return null
          })
        }

        if (boss && ctx.user) {
          let queuedCount = 0
          for (const candidate of currentCandidates) {
            if (candidate.stage !== input.stage) {
              await queueStageEmail(boss, {
                candidateId: candidate.id,
                fromStage: candidate.stage,
                toStage: input.stage,
                recruiterId: ctx.user.id,
                recruiterEmail: ctx.user.email || '',
                recruiterName: ctx.user.name || undefined,
                skipAutoEmail: input.skipAutoEmail || false,
              })
              queuedCount++
            }
          }
          console.log(`[bulkUpdateCandidateStage] Queued ${queuedCount} stage emails for move to ${input.stage}`)
        } else {
          console.warn('[bulkUpdateCandidateStage] Background worker not available, skipping email queue')
        }
      } catch (error) {
        // Log error but don't fail the mutation
        console.error('[bulkUpdateCandidateStage] Failed to queue stage emails:', error)
      }

      return result
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

      const existing = await ctx.prisma.job.findUnique({ where: { id } })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      const updatedJob = await ctx.prisma.job.update({
        where: { id },
        data: {
          webhookUrl: webhookUrl || null,
          webhookSecret: webhookSecret || null,
          ...(isPublic !== undefined && { isPublic }),
        },
      })

      // Trigger Webflow sync when isPublic changes
      if (isPublic !== undefined && isPublic !== existing.isPublic) {
        if (isPublic && updatedJob.status === 'ACTIVE') {
          // Job became public, sync to Webflow
          syncJobToWebflow(id).catch(console.error)
        } else if (!isPublic && existing.isPublic) {
          // Job became private, unpublish from Webflow
          unpublishJobFromWebflow(id).catch(console.error)
        }
      }

      return updatedJob
    }),

  // =====================
  // PUBLIC PROCEDURES
  // =====================

  // Get a public job posting by ID
  getPublicJob: publicProcedure
    .input(z.object({ id: z.string(), preview: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      // In preview mode, skip the isPublic and status checks (for admin testing)
      const whereClause: { id: string; isPublic?: boolean; status?: JobStatusType } = input.preview
        ? { id: input.id }
        : { id: input.id, isPublic: true, status: 'ACTIVE' }

      const job = await ctx.prisma.job.findFirst({
        where: whereClause,
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
    .input(allCandidatesFiltersSchema)
    .query(async ({ ctx, input }) => {
      const filters = {
        sortBy: 'appliedAt',
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
        ...(input ?? {}),
      } as NonNullable<AllCandidatesFilters>

      // Build where clause
      const baseWhere: Record<string, unknown> = {}

      if (filters.source) {
        baseWhere.source = filters.source
      }

      if (filters.jobId) {
        baseWhere.jobId = filters.jobId
      }

      if (filters.department) {
        baseWhere.job = { department: filters.department }
      }

      if (filters.appliedFrom || filters.appliedTo) {
        baseWhere.appliedAt = {
          ...(filters.appliedFrom ? { gte: filters.appliedFrom } : {}),
          ...(filters.appliedTo ? { lte: filters.appliedTo } : {}),
        }
      }

      if (filters.search) {
        baseWhere.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { currentCompany: { contains: filters.search, mode: 'insensitive' } },
          { currentRole: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      const excludedStages = filters.includeArchived
        ? ['REJECTED', 'WITHDRAWN']
        : ['REJECTED', 'WITHDRAWN', 'ARCHIVED']

      const where: Record<string, unknown> = { ...baseWhere }
      if (filters.stage) {
        where.stage = filters.stage
      } else {
        where.stage = { notIn: excludedStages }
      }

      const countsWhere: Record<string, unknown> = {
        ...baseWhere,
        stage: { notIn: excludedStages },
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
        where: countsWhere,
      })

      const stageDisplayNames: Record<string, string> = {
        APPLIED: 'Applied',
        SHORTLISTED: 'Short Listed',
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
        ARCHIVED: 'Archived',
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

  // Create a new candidate
  createCandidate: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      linkedinUrl: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      jobId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let targetJobId = input.jobId

      if (!targetJobId) {
        // Look for an active job or create a generic talent pool
        const activeJob = await ctx.prisma.job.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        })

        if (activeJob) {
          targetJobId = activeJob.id
        } else {
          // Create "General Application" job
          const generalJob = await ctx.prisma.job.create({
            data: {
              title: 'General Application',
              department: 'General',
              status: 'ACTIVE',
              employmentType: 'full-time',
            }
          })
          targetJobId = generalJob.id
        }
      }

      // Check if candidate already exists by email
      const existingCandidate = await ctx.prisma.jobCandidate.findFirst({
        where: { email: input.email.toLowerCase() }
      })

      if (existingCandidate) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A candidate with this email address already exists.'
        })
      }

      // Map source to enum
      let source: 'INBOUND' | 'OUTBOUND' | 'RECRUITER' | 'EXCELLER' = 'INBOUND'
      let inboundChannel: any = null
      let outboundChannel: any = null

      if (input.source === 'linkedin') {
        source = 'OUTBOUND'
        outboundChannel = 'LINKEDIN'
      } else if (input.source === 'job-board') {
        source = 'OUTBOUND'
        outboundChannel = 'JOB_BOARDS'
      } else if (input.source === 'recruiter') {
        source = 'RECRUITER'
      } else if (input.source === 'referral') {
        source = 'EXCELLER'
      } else if (input.source === 'careers-page') {
        source = 'INBOUND'
        inboundChannel = 'PEOPLEOS'
      }

      // Create candidate
      const candidate = await ctx.prisma.jobCandidate.create({
        data: {
          jobId: targetJobId,
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
          linkedinUrl: input.linkedinUrl,
          source,
          inboundChannel,
          outboundChannel,
          notes: input.notes,
          stage: 'APPLIED',
        }
      })

      // Create employee record with status CANDIDATE
      try {
        const employee = await ctx.prisma.employee.create({
          data: {
            fullName: input.name,
            personalEmail: input.email.toLowerCase(),
            status: 'CANDIDATE',
            phone: input.phone,
            candidateId: candidate.id,
            jobTitle: 'Candidate', // Placeholder
          }
        })

        // Link candidate back to employee (if needed, though already linked via candidateId on Employee)
      } catch (error) {
        console.error('Failed to create employee for new candidate:', error)
      }

      return candidate
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
        SHORTLISTED: 'Short Listed',
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
        ARCHIVED: 'Archived',
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

        // Include all interviews, even those without evaluations
        const scores = evaluators.filter((e) => e.overallRating != null).map((e) => e.overallRating as number)
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

        evaluationsByStage[interview.stage] = {
          stage: interview.stage,
          stageName: interview.stageName || stageDisplayNames[interview.stage] || interview.stage,
          evaluators,
          averageScore,
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
        linkedinUrl: z.string()
          .transform((val) => {
            if (!val || val === '') return ''
            // Add https:// if no protocol is present
            if (!val.startsWith('http://') && !val.startsWith('https://')) {
              return `https://${val}`
            }
            return val
          })
          .pipe(z.string().url().optional().or(z.literal(''))),
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
          const workbook = xlsx.read(fileContent, { type: 'base64' })
          const sheetName = workbook.SheetNames[0]
          if (!sheetName) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'No sheets found in Excel file.' })
          }
          const sheet = workbook.Sheets[sheetName]
          const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as Array<Array<unknown>>
          if (rows.length === 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Empty file' })
          }

          headers = (rows[0] || []).map((cell) => String(cell ?? '').trim())
          allRows = rows.slice(1).map((row) => row.map((cell) => String(cell ?? '').trim()))
          sampleRows = allRows.slice(0, 5)
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

        if (settings?.isEnabled) {
          const { decrypt } = await import('@/lib/encryption')

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

          if (settings.provider === 'OPENAI' && settings.openaiKeyEncrypted) {
            const apiKey = decrypt(settings.openaiKeyEncrypted)
            const { default: OpenAI } = await import('openai')
            const client = new OpenAI({ apiKey })

            const response = await client.chat.completions.create({
              model: settings.openaiModel || 'gpt-4o-mini',
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
          } else if (settings.provider === 'ANTHROPIC' && settings.anthropicKeyEncrypted) {
            const apiKey = decrypt(settings.anthropicKeyEncrypted)
            const { default: Anthropic } = await import('@anthropic-ai/sdk')
            const client = new Anthropic({ apiKey })

            const response = await client.messages.create({
              model: settings.anthropicModel || 'claude-3-haiku-20240307',
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
          } else {
            needsManualMapping = true
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
            addedById: ctx.session?.user?.id ?? null,
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

  // Auto-assign hiring flows to jobs without one
  autoAssignHiringFlows: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Find all jobs without a hiring flow
      const jobsWithoutFlow = await ctx.prisma.job.findMany({
        where: {
          hiringFlowSnapshotId: null,
        },
        select: {
          id: true,
          department: true,
        },
      })

      if (jobsWithoutFlow.length === 0) {
        return {
          success: true,
          updatedCount: 0,
          message: 'All jobs already have hiring flows assigned',
        }
      }

      // Get all hiring flows
      const hiringFlows = await ctx.prisma.hiringFlow.findMany({
        include: {
          snapshots: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      })

      // Find the standard flow (or first flow as fallback)
      const standardFlow = hiringFlows.find(
        (flow) => flow.name.toLowerCase().includes('standard')
      ) || hiringFlows[0]

      if (!standardFlow || !standardFlow.snapshots[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No hiring flows available. Please create a hiring flow first.',
        })
      }

      // Create a map of department to hiring flow
      const departmentFlowMap = new Map<string, string>()
      hiringFlows.forEach((flow) => {
        if (flow.snapshots[0]) {
          // Match flow name with department (e.g., "Engineering Flow" -> "Engineering")
          const department = flow.name.split(' ')[0].toLowerCase()
          departmentFlowMap.set(department, flow.snapshots[0].id)
        }
      })

      // Update jobs
      let updatedCount = 0
      for (const job of jobsWithoutFlow) {
        let flowSnapshotId = standardFlow.snapshots[0].id

        // Try to match by department
        if (job.department) {
          const departmentKey = job.department.toLowerCase()
          const matchedFlowId = departmentFlowMap.get(departmentKey)
          if (matchedFlowId) {
            flowSnapshotId = matchedFlowId
          }
        }

        await ctx.prisma.job.update({
          where: { id: job.id },
          data: {
            hiringFlowSnapshotId: flowSnapshotId,
            hiringFlowId: standardFlow.id, // Keep legacy field updated
          },
        })

        updatedCount++
      }

      return {
        success: true,
        updatedCount,
        message: `Successfully assigned hiring flows to ${updatedCount} job(s)`,
      }
    }),
})
