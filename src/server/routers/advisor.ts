import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/lib/trpc'

export const advisorRouter = router({
  // List all advisors
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isActive: z.boolean().optional().default(true),
        limit: z.number().min(1).max(100).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, isActive, limit } = input || { isActive: true, limit: 50 }

      const advisors = await ctx.prisma.advisor.findMany({
        where: {
          isActive: isActive,
          ...(search && {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: { fullName: 'asc' },
        take: limit,
      })

      return { advisors }
    }),

  // Get a single advisor by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const advisor = await ctx.prisma.advisor.findUnique({
        where: { id: input.id },
      })

      if (!advisor) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Advisor not found',
        })
      }

      return advisor
    }),

  // Create a new advisor
  create: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(1),
        email: z.string().email(),
        title: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate email
      const existing = await ctx.prisma.advisor.findUnique({
        where: { email: input.email },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An advisor with this email already exists',
        })
      }

      const advisor = await ctx.prisma.advisor.create({
        data: input,
      })

      return advisor
    }),

  // Update an advisor
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        fullName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        title: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Check for duplicate email if changing email
      if (data.email) {
        const existing = await ctx.prisma.advisor.findFirst({
          where: {
            email: data.email,
            NOT: { id },
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An advisor with this email already exists',
          })
        }
      }

      const advisor = await ctx.prisma.advisor.update({
        where: { id },
        data,
      })

      return advisor
    }),

  // Delete an advisor
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.advisor.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Toggle advisor active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const advisor = await ctx.prisma.advisor.findUnique({
        where: { id: input.id },
      })

      if (!advisor) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Advisor not found',
        })
      }

      const updated = await ctx.prisma.advisor.update({
        where: { id: input.id },
        data: { isActive: !advisor.isActive },
      })

      return updated
    }),
})
