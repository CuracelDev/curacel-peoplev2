import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

export const competencyRouter = router({
  // List all active competencies
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.competency.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }),

  // List competencies for dropdown/select
  listForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.competency.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }),

  // List competencies grouped by category
  listByCategory: protectedProcedure.query(async ({ ctx }) => {
    const competencies = await ctx.prisma.competency.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    // Group by category
    const grouped = competencies.reduce((acc, comp) => {
      if (!acc[comp.category]) {
        acc[comp.category] = []
      }
      acc[comp.category].push(comp)
      return acc
    }, {} as Record<string, typeof competencies>)

    return grouped
  }),

  // Get all unique categories
  categories: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.prisma.competency.groupBy({
      by: ['category'],
      where: { isActive: true },
      orderBy: { category: 'asc' },
    })
    return result.map((r) => r.category)
  }),

  // Get a single competency by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const competency = await ctx.prisma.competency.findUnique({
        where: { id: input.id },
      })

      if (!competency) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency not found',
        })
      }

      return competency
    }),

  // Create a new competency
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        category: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if competency with same name and category exists
      const existing = await ctx.prisma.competency.findFirst({
        where: {
          name: { equals: input.name, mode: 'insensitive' },
          category: { equals: input.category, mode: 'insensitive' },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A competency with this name already exists in this category',
        })
      }

      return ctx.prisma.competency.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim(),
          category: input.category.trim(),
        },
      })
    }),

  // Update a competency
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        category: z.string().min(1).max(50).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.prisma.competency.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency not found',
        })
      }

      // Check for duplicate if name or category is changing
      if (data.name || data.category) {
        const duplicate = await ctx.prisma.competency.findFirst({
          where: {
            id: { not: id },
            name: { equals: data.name || existing.name, mode: 'insensitive' },
            category: { equals: data.category || existing.category, mode: 'insensitive' },
          },
        })

        if (duplicate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A competency with this name already exists in this category',
          })
        }
      }

      return ctx.prisma.competency.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.category && { category: data.category.trim() }),
        },
      })
    }),

  // Delete (soft delete) a competency
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.competency.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Bulk create competencies
  bulkCreate: adminProcedure
    .input(
      z.array(
        z.object({
          name: z.string().min(2).max(100),
          description: z.string().max(500).optional(),
          category: z.string().min(1).max(50),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.map(async (comp) => {
          const existing = await ctx.prisma.competency.findFirst({
            where: {
              name: { equals: comp.name, mode: 'insensitive' },
              category: { equals: comp.category, mode: 'insensitive' },
            },
          })

          if (existing) {
            return existing
          }

          return ctx.prisma.competency.create({
            data: {
              name: comp.name.trim(),
              description: comp.description?.trim(),
              category: comp.category.trim(),
            },
          })
        })
      )

      return results
    }),
})
