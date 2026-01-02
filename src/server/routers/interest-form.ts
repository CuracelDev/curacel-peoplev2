import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure, publicProcedure } from '@/lib/trpc'
import { generateCandidateAnalysis } from '@/lib/ai/hiring/analysis'

const questionTypeEnum = z.enum([
  'TEXT',
  'EMAIL',
  'PHONE',
  'URL',
  'TEXTAREA',
  'SELECT',
  'MULTISELECT',
  'RADIO',
  'CHECKBOX',
  'DATE',
  'FILE',
  'SCALE',
])

const questionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(500),
  type: questionTypeEnum,
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  isRequired: z.boolean().default(true),
  options: z.string().optional(), // JSON string for select/radio/checkbox options
  validation: z.string().optional(), // JSON string for validation rules
})

export const interestFormRouter = router({
  // List all interest form templates
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.interestFormTemplate.findMany({
      where: { isActive: true },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { responses: true, jobs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Get templates for select dropdown
  listForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.interestFormTemplate.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  }),

  // Get a single template by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.interestFormTemplate.findUnique({
        where: { id: input.id },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interest form template not found',
        })
      }

      return template
    }),

  // Get form for public submission (by job ID)
  getPublicForm: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.jobId },
        include: {
          interestForm: {
            include: {
              questions: {
                orderBy: { sortOrder: 'asc' },
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

      let form = job.interestForm
      if (!form) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No interest form is assigned to this job.',
        })
      }

      return {
        job: {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.locations,
          type: job.employmentType,
        },
        form,
      }
    }),

  // Create a new template
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        description: z.string().max(1000).optional(),
        questions: z.array(questionSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { questions, ...templateData } = input

      return ctx.prisma.interestFormTemplate.create({
        data: {
          name: templateData.name.trim(),
          description: templateData.description?.trim(),
          isDefault: false,
          questions: questions?.length
            ? {
                create: questions.map((q, index) => ({
                  question: q.label.trim(),
                  type: q.type,
                  description: q.helpText?.trim(),
                  required: q.isRequired ?? true,
                  options: q.options,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }),

  // Update a template
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(200).optional(),
        description: z.string().max(1000).optional().nullable(),
        questions: z.array(questionSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, questions, ...data } = input

      const existing = await ctx.prisma.interestFormTemplate.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interest form template not found',
        })
      }

      // If questions provided, replace all questions
      if (questions !== undefined) {
        await ctx.prisma.interestFormQuestion.deleteMany({
          where: { templateId: id },
        })

        if (questions.length > 0) {
          await ctx.prisma.interestFormQuestion.createMany({
            data: questions.map((q, index) => ({
              templateId: id,
              question: q.label.trim(),
              type: q.type,
              description: q.helpText?.trim(),
              required: q.isRequired ?? true,
              options: q.options,
              sortOrder: index,
            })),
          })
        }
      }

      return ctx.prisma.interestFormTemplate.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
        },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }),

  // Delete (soft delete) a template
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.interestFormTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Duplicate a template
  duplicate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.interestFormTemplate.findUnique({
        where: { id: input.id },
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interest form template not found',
        })
      }

      return ctx.prisma.interestFormTemplate.create({
        data: {
          name: `${existing.name} (Copy)`,
          description: existing.description,
          isDefault: false,
          questions: {
            create: existing.questions.map((q, index) => ({
              question: q.question,
              type: q.type,
              description: q.description,
              required: q.required,
              options: q.options ?? undefined,
              sortOrder: index,
            })),
          },
        },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }),

  // Submit a form response (public)
  submitResponse: publicProcedure
    .input(
      z.object({
        jobId: z.string(),
        templateId: z.string(),
        candidateId: z.string().optional(), // If existing candidate
        candidateData: z.object({
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().email(),
          phone: z.string().optional(),
          linkedinUrl: z.string().optional(),
        }).optional(),
        responses: z.record(z.string(), z.any()), // questionId -> answer
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { jobId, templateId, candidateId, candidateData, responses } = input

      // Get or create candidate
      let candidate: { id: string; email: string; name: string } | null = null

      if (candidateId) {
        candidate = await ctx.prisma.jobCandidate.findUnique({
          where: { id: candidateId },
          select: { id: true, email: true, name: true },
        })
      }

      if (!candidate && candidateData) {
        // Create new candidate
        candidate = await ctx.prisma.jobCandidate.create({
          data: {
            jobId,
            name: [candidateData.firstName, candidateData.lastName].filter(Boolean).join(' '),
            email: candidateData.email,
            phone: candidateData.phone,
            linkedinUrl: candidateData.linkedinUrl,
            source: 'INBOUND',
            stage: 'APPLIED',
          },
          select: { id: true, email: true, name: true },
        })
      }

      if (!candidate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Candidate information is required',
        })
      }

      // Create the form response
      const formResponse = await ctx.prisma.interestFormResponse.create({
        data: {
          templateId,
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          candidateName: candidate.name || candidate.email,
          responses: JSON.stringify(responses),
          submittedAt: new Date(),
        },
      })

      // Update candidate with interest form response reference
      // Trigger AI analysis in the background (don't await)
      generateCandidateAnalysis({
        candidateId: candidate.id,
        analysisType: 'APPLICATION_REVIEW',
        triggerStage: 'APPLIED',
        triggerEvent: 'interest_form_submission',
      })
        .then(async (analysis) => {
          // Update the form response with AI analysis
          await ctx.prisma.interestFormResponse.update({
            where: { id: formResponse.id },
            data: {
              aiAnalysis: {
                analysisId: analysis.id,
                summary: analysis.summary,
                overallScore: analysis.overallScore,
                recommendation: analysis.recommendation,
              },
              aiAnalyzedAt: new Date(),
            },
          })
        })
        .catch((err) => {
          console.error('Failed to generate AI analysis for interest form:', err)
        })

      return { success: true, candidateId: candidate.id }
    }),

  // Get responses for a candidate
  getResponses: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.interestFormResponse.findMany({
        where: { candidateId: input.candidateId },
        include: {
          template: {
            include: {
              questions: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      })
    }),
})
