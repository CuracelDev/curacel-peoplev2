import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'

// Default interview types for Curacel
const DEFAULT_INTERVIEW_TYPES = [
  {
    name: 'People Chat',
    slug: 'people-chat',
    description: 'Initial conversation with PeopleOps to assess culture fit and alignment',
    defaultDuration: 45,
    allowedRoles: ['HR', 'PEOPLE_OPS'],
    questionCategories: ['situational', 'behavioral', 'motivational'],
    sortOrder: 1,
  },
  {
    name: 'Team Chat',
    slug: 'team-chat',
    description: 'Discussion with potential team members to assess collaboration fit',
    defaultDuration: 60,
    allowedRoles: ['ANY'],
    questionCategories: ['behavioral', 'technical', 'culture'],
    sortOrder: 2,
  },
  {
    name: 'Advisor Chat',
    slug: 'advisor-chat',
    description: 'Conversation with company advisors for senior roles',
    defaultDuration: 45,
    allowedRoles: ['ADVISOR', 'EXECUTIVE'],
    questionCategories: ['situational', 'behavioral', 'culture'],
    sortOrder: 3,
  },
  {
    name: 'CEO Chat',
    slug: 'ceo-chat',
    description: 'Final interview with CEO for culture alignment and leadership assessment',
    defaultDuration: 60,
    allowedRoles: ['CEO', 'EXECUTIVE'],
    questionCategories: ['motivational', 'culture'],
    sortOrder: 4,
  },
]

export const interviewTypeRouter = router({
  // List all interview types
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where = input?.includeInactive ? {} : { isActive: true }

      const types = await ctx.prisma.interviewType.findMany({
        where,
        include: {
          rubricTemplate: {
            include: {
              criteria: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          _count: {
            select: { interviews: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })

      return types
    }),

  // Get a single interview type
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const type = await ctx.prisma.interviewType.findUnique({
        where: { id: input.id },
        include: {
          rubricTemplate: {
            include: {
              criteria: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      })

      if (!type) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview type not found',
        })
      }

      return type
    }),

  // Get by slug
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const type = await ctx.prisma.interviewType.findUnique({
        where: { slug: input.slug },
        include: {
          rubricTemplate: {
            include: {
              criteria: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      })

      if (!type) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview type not found',
        })
      }

      return type
    }),

  // Create interview type
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        description: z.string().optional(),
        defaultDuration: z.number().min(15).max(240).optional().default(60),
        rubricTemplateId: z.string().optional(),
        allowedRoles: z.array(z.string()).optional().default(['ANY']),
        questionCategories: z.array(z.string()).optional().default([]),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate slug
      const existing = await ctx.prisma.interviewType.findUnique({
        where: { slug: input.slug },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An interview type with this slug already exists',
        })
      }

      // Get max sortOrder if not provided
      let sortOrder = input.sortOrder
      if (sortOrder === undefined) {
        const maxOrder = await ctx.prisma.interviewType.aggregate({
          _max: { sortOrder: true },
        })
        sortOrder = (maxOrder._max.sortOrder || 0) + 1
      }

      const type = await ctx.prisma.interviewType.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          defaultDuration: input.defaultDuration,
          rubricTemplateId: input.rubricTemplateId,
          allowedRoles: input.allowedRoles,
          questionCategories: input.questionCategories,
          sortOrder,
        },
        include: {
          rubricTemplate: true,
        },
      })

      return type
    }),

  // Update interview type
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        defaultDuration: z.number().min(15).max(240).optional(),
        rubricTemplateId: z.string().nullable().optional(),
        allowedRoles: z.array(z.string()).optional(),
        questionCategories: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const type = await ctx.prisma.interviewType.update({
        where: { id },
        data,
        include: {
          rubricTemplate: true,
        },
      })

      return type
    }),

  // Delete interview type
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if any interviews are using this type
      const interviewCount = await ctx.prisma.candidateInterview.count({
        where: { interviewTypeId: input.id },
      })

      if (interviewCount > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot delete: ${interviewCount} interviews are using this type. Deactivate it instead.`,
        })
      }

      await ctx.prisma.interviewType.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Reorder interview types
  reorder: adminProcedure
    .input(
      z.object({
        orderedIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update each type's sortOrder
      await Promise.all(
        input.orderedIds.map((id, index) =>
          ctx.prisma.interviewType.update({
            where: { id },
            data: { sortOrder: index + 1 },
          })
        )
      )

      return { success: true }
    }),

  // Seed default interview types
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const createdTypes = []

    for (const typeData of DEFAULT_INTERVIEW_TYPES) {
      // Check if already exists
      const existing = await ctx.prisma.interviewType.findUnique({
        where: { slug: typeData.slug },
      })

      if (!existing) {
        const created = await ctx.prisma.interviewType.create({
          data: typeData,
        })
        createdTypes.push(created)
      }
    }

    return {
      created: createdTypes.length,
      types: createdTypes,
    }
  }),

  // Link rubric template to interview type
  linkRubricTemplate: adminProcedure
    .input(
      z.object({
        interviewTypeId: z.string(),
        rubricTemplateId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const type = await ctx.prisma.interviewType.update({
        where: { id: input.interviewTypeId },
        data: { rubricTemplateId: input.rubricTemplateId },
        include: {
          rubricTemplate: {
            include: {
              criteria: true,
            },
          },
        },
      })

      return type
    }),

  // Get available rubric templates for linking
  getAvailableTemplates: protectedProcedure.query(async ({ ctx }) => {
    const templates = await ctx.prisma.interviewStageTemplate.findMany({
      where: { isActive: true, jobId: null }, // Only global templates
      include: {
        criteria: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { interviewTypes: true },
        },
      },
      orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }],
    })

    return templates
  }),
})
