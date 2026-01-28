import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

export const hiringRubricRouter = router({
  // List all active rubrics with criteria
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.hiringRubric.findMany({
      where: { isActive: true },
      include: {
        criteria: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Get rubrics for dropdown/select (minimal data)
  listForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.hiringRubric.findMany({
      where: { isActive: true },
      select: { id: true, name: true, version: true },
      orderBy: { name: 'asc' },
    })
  }),

  // Get a single rubric by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rubric = await ctx.prisma.hiringRubric.findUnique({
        where: { id: input.id },
        include: {
          criteria: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!rubric) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hiring rubric not found',
        })
      }

      return rubric
    }),

  // Create a new rubric with criteria
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        description: z.string().max(500).optional(),
        criteria: z.array(
          z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
            weight: z.number().min(1).max(5).default(1),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { criteria, ...rubricData } = input

      return ctx.prisma.hiringRubric.create({
        data: {
          name: rubricData.name.trim(),
          description: rubricData.description?.trim(),
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

  // Update a rubric
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(200).optional(),
        description: z.string().max(500).optional().nullable(),
        criteria: z.array(
          z.object({
            id: z.string().optional(), // existing criteria have id
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
            weight: z.number().min(1).max(5).default(1),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, criteria, ...data } = input

      const existing = await ctx.prisma.hiringRubric.findUnique({
        where: { id },
        include: { criteria: true },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hiring rubric not found',
        })
      }

      // Increment version if criteria changed
      const criteriaChanged = criteria !== undefined
      const newVersion = criteriaChanged ? existing.version + 1 : existing.version

      // If criteria provided, replace all criteria
      if (criteria !== undefined) {
        // Delete existing criteria
        await ctx.prisma.rubricCriteria.deleteMany({
          where: { rubricId: id },
        })

        // Create new criteria
        if (criteria.length > 0) {
          await ctx.prisma.rubricCriteria.createMany({
            data: criteria.map((c, index) => ({
              rubricId: id,
              name: c.name.trim(),
              description: c.description?.trim(),
              weight: c.weight,
              sortOrder: index,
            })),
          })
        }
      }

      return ctx.prisma.hiringRubric.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          version: newVersion,
        },
        include: {
          criteria: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }),

  // Delete (soft delete) a rubric
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.hiringRubric.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Duplicate a rubric
  duplicate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.hiringRubric.findUnique({
        where: { id: input.id },
        include: { criteria: { orderBy: { sortOrder: 'asc' } } },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hiring rubric not found',
        })
      }

      return ctx.prisma.hiringRubric.create({
        data: {
          name: `${existing.name} (Copy)`,
          description: existing.description,
          version: 1,
          criteria: {
            create: existing.criteria.map((c, index) => ({
              name: c.name,
              description: c.description,
              weight: c.weight,
              sortOrder: index,
            })),
          },
        },
        include: {
          criteria: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    }),
})
