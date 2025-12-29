import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

export const jobDescriptionRouter = router({
  // List all active JDs
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.jobDescription.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }),

  // Get JDs for dropdown/select
  listForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.jobDescription.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true },
      orderBy: { name: 'asc' },
    })
  }),

  // Get a single JD by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const jd = await ctx.prisma.jobDescription.findUnique({
        where: { id: input.id },
      })

      if (!jd) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        })
      }

      return jd
    }),

  // Create a new JD
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        department: z.string().max(100).optional(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.jobDescription.create({
        data: {
          name: input.name.trim(),
          department: input.department?.trim(),
          content: input.content,
        },
      })
    }),

  // Update a JD (creates new version)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(200).optional(),
        department: z.string().max(100).optional().nullable(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.prisma.jobDescription.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        })
      }

      // Increment version if content changed
      const newVersion = data.content && data.content !== existing.content
        ? existing.version + 1
        : existing.version

      return ctx.prisma.jobDescription.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.department !== undefined && { department: data.department?.trim() || null }),
          ...(data.content && { content: data.content }),
          version: newVersion,
        },
      })
    }),

  // Delete (soft delete) a JD
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.jobDescription.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Duplicate a JD
  duplicate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.jobDescription.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        })
      }

      return ctx.prisma.jobDescription.create({
        data: {
          name: `${existing.name} (Copy)`,
          department: existing.department,
          content: existing.content,
          version: 1,
        },
      })
    }),
})
