import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

// Stage is now a dynamic string that maps to InterviewType slugs
const stageTypeSchema = z.string().min(1).max(100)

const recommendationEnum = z.enum([
  'STRONG_HIRE',
  'HIRE',
  'HOLD',
  'NO_HIRE',
  'STRONG_NO_HIRE',
])

const criteriaSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  weight: z.number().min(1).max(5).default(1),
})

export const interviewStageRouter = router({
  // List all interview stage templates
  listTemplates: protectedProcedure
    .input(z.object({ jobId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.interviewStageTemplate.findMany({
        where: {
          isActive: true,
          ...(input?.jobId ? { OR: [{ jobId: input.jobId }, { jobId: null }] } : {}),
        },
        include: {
          criteria: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
    }),

  // Get a single template
  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.interviewStageTemplate.findUnique({
        where: { id: input.id },
        include: {
          criteria: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview stage template not found',
        })
      }

      return template
    }),

  // Create a new stage template
  createTemplate: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        description: z.string().max(1000).optional(),
        stage: stageTypeSchema,
        sortOrder: z.number().optional(),
        jobId: z.string().optional(),
        criteria: z.array(criteriaSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { criteria, ...templateData } = input

      return ctx.prisma.interviewStageTemplate.create({
        data: {
          name: templateData.name.trim(),
          description: templateData.description?.trim(),
          stage: templateData.stage,
          sortOrder: templateData.sortOrder || 0,
          jobId: templateData.jobId,
          criteria: criteria?.length
            ? {
                create: criteria.map((c, index) => ({
                  name: c.name.trim(),
                  description: c.description?.trim(),
                  weight: c.weight,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: {
          criteria: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }),

  // Update a stage template
  updateTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(200).optional(),
        description: z.string().max(1000).optional().nullable(),
        stage: stageTypeSchema.optional(),
        sortOrder: z.number().optional(),
        criteria: z.array(criteriaSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, criteria, ...data } = input

      const existing = await ctx.prisma.interviewStageTemplate.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview stage template not found',
        })
      }

      // If criteria provided, replace all
      if (criteria !== undefined) {
        await ctx.prisma.interviewStageCriteria.deleteMany({
          where: { stageId: id },
        })

        if (criteria.length > 0) {
          await ctx.prisma.interviewStageCriteria.createMany({
            data: criteria.map((c, index) => ({
              stageId: id,
              name: c.name.trim(),
              description: c.description?.trim(),
              weight: c.weight,
              sortOrder: index,
            })),
          })
        }
      }

      return ctx.prisma.interviewStageTemplate.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.stage && { stage: data.stage }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        },
        include: {
          criteria: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }),

  // Delete (soft delete) a template
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.interviewStageTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Submit an evaluation (scorecard)
  submitEvaluation: protectedProcedure
    .input(
      z.object({
        stageTemplateId: z.string(),
        candidateId: z.string(),
        interviewId: z.string().optional(), // Link to CandidateInterview if exists
        overallRating: z.number().min(1).max(5),
        recommendation: recommendationEnum,
        notes: z.string().max(5000).optional(),
        criteriaScores: z.array(
          z.object({
            criteriaId: z.string(),
            score: z.number().min(1).max(5),
            notes: z.string().max(1000).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { criteriaScores, ...evaluationData } = input

      if (!evaluationData.interviewId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Interview ID is required to submit an evaluation.',
        })
      }
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to submit an evaluation.',
        })
      }
      const evaluatorName = ctx.session.user.name || ctx.session.user.email || 'Evaluator'

      // Create the evaluation
      const evaluation = await ctx.prisma.interviewEvaluation.create({
        data: {
          stageTemplateId: evaluationData.stageTemplateId,
          interviewId: evaluationData.interviewId,
          evaluatorId: ctx.session.user.id,
          evaluatorName,
          evaluatorEmail: ctx.session.user.email ?? null,
          overallScore: evaluationData.overallRating,
          recommendation: evaluationData.recommendation,
          overallNotes: evaluationData.notes?.trim(),
          submittedAt: new Date(),
          criteriaScores: {
            create: criteriaScores.map((cs) => ({
              criteriaId: cs.criteriaId,
              score: cs.score,
              notes: cs.notes?.trim(),
            })),
          },
        },
        include: {
          criteriaScores: {
            include: {
              criteria: true,
            },
          },
        },
      })

      // Update candidate interview if linked
      if (evaluationData.interviewId) {
        await ctx.prisma.candidateInterview.update({
          where: { id: evaluationData.interviewId },
          data: { status: 'COMPLETED' },
        })
      }

      return evaluation
    }),

  // Get evaluations for a candidate
  getEvaluations: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.interviewEvaluation.findMany({
        where: { interview: { candidateId: input.candidateId } },
        include: {
          stageTemplate: true,
          criteriaScores: {
            include: {
              criteria: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      })
    }),

  // Get evaluations for a specific interview stage
  getStageEvaluations: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        stageTemplateId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.interviewEvaluation.findMany({
        where: {
          interview: { candidateId: input.candidateId },
          stageTemplateId: input.stageTemplateId,
        },
        include: {
          criteriaScores: {
            include: {
              criteria: true,
            },
          },
        },
        orderBy: { submittedAt: 'asc' },
      })
    }),

  // Update an evaluation
  updateEvaluation: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        overallRating: z.number().min(1).max(5).optional(),
        recommendation: recommendationEnum.optional(),
        notes: z.string().max(5000).optional(),
        criteriaScores: z
          .array(
            z.object({
              criteriaId: z.string(),
              score: z.number().min(1).max(5),
              notes: z.string().max(1000).optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, criteriaScores, ...data } = input

      const existing = await ctx.prisma.interviewEvaluation.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evaluation not found',
        })
      }
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to update evaluations.',
        })
      }

      // Check if user is the evaluator
      if (existing.evaluatorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only edit your own evaluations',
        })
      }

      // Update criteria scores if provided
      if (criteriaScores) {
        await ctx.prisma.interviewCriteriaScore.deleteMany({
          where: { evaluationId: id },
        })

        await ctx.prisma.interviewCriteriaScore.createMany({
          data: criteriaScores.map((cs) => ({
            evaluationId: id,
            criteriaId: cs.criteriaId,
            score: cs.score,
            notes: cs.notes?.trim(),
          })),
        })
      }

      return ctx.prisma.interviewEvaluation.update({
        where: { id },
        data: {
          ...(data.overallRating !== undefined && { overallScore: data.overallRating }),
          ...(data.recommendation && { recommendation: data.recommendation }),
          ...(data.notes !== undefined && { overallNotes: data.notes?.trim() }),
        },
        include: {
          criteriaScores: {
            include: {
              criteria: true,
            },
          },
        },
      })
    }),

  // Delete an evaluation
  deleteEvaluation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.interviewEvaluation.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Evaluation not found',
        })
      }
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to delete evaluations.',
        })
      }

      // Check if user is the evaluator or admin
      if (existing.evaluatorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own evaluations',
        })
      }

      await ctx.prisma.interviewEvaluation.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get summary of evaluations for a candidate (aggregate scores)
  getEvaluationSummary: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const evaluations = await ctx.prisma.interviewEvaluation.findMany({
        where: { interview: { candidateId: input.candidateId } },
        include: {
          stageTemplate: true,
          criteriaScores: {
            include: { criteria: true },
          },
        },
        orderBy: [
          { stageTemplate: { sortOrder: 'asc' } },
          { submittedAt: 'asc' },
        ],
      })

      // Group by stage
      const byStage = evaluations.reduce(
        (acc, ev) => {
          const stage = ev.stageTemplate?.name || 'Unknown'
          if (!acc[stage]) {
            acc[stage] = {
              stageType: ev.stageTemplate?.stage,
              evaluations: [],
              avgRating: 0,
              totalEvaluators: 0,
            }
          }
          acc[stage].evaluations.push(ev)
          return acc
        },
        {} as Record<string, { stageType: string | undefined; evaluations: typeof evaluations; avgRating: number; totalEvaluators: number }>
      )

      // Calculate averages
      Object.keys(byStage).forEach((stage) => {
        const evals = byStage[stage].evaluations
        const scored = evals.filter((e) => e.overallScore !== null)
        byStage[stage].totalEvaluators = evals.length
        byStage[stage].avgRating =
          scored.length > 0
            ? scored.reduce((sum, e) => sum + (e.overallScore ?? 0), 0) / scored.length
            : 0
      })

      return byStage
    }),
})
