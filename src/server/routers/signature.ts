import { z } from 'zod'
import { router, hrAdminProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'

const signatureBlockSchema = z.object({
  signatoryName: z.string().min(1, 'Signatory name is required'),
  signatoryTitle: z.string().min(1, 'Signatory title is required'),
  signatureText: z.string().optional(),
  signatureImageUrl: z.string().url().optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
})

export const signatureRouter = router({
  list: hrAdminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.signatureBlock.findMany({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })
    }),

  get: hrAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const signatureBlock = await ctx.prisma.signatureBlock.findUnique({
        where: { id },
      })

      if (!signatureBlock) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature block not found' })
      }

      return signatureBlock
    }),

  create: hrAdminProcedure
    .input(signatureBlockSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.prisma.signatureBlock.updateMany({
          data: { isDefault: false },
        })
      }

      const signatureBlock = await ctx.prisma.signatureBlock.create({
        data: {
          signatoryName: input.signatoryName,
          signatoryTitle: input.signatoryTitle,
          signatureText: input.signatureText || undefined,
          signatureImageUrl: input.signatureImageUrl || undefined,
          isDefault: input.isDefault ?? false,
        },
      })

      return signatureBlock
    }),

  update: hrAdminProcedure
    .input(
      z.object({
        id: z.string(),
        signatoryName: z.string().min(1).optional(),
        signatoryTitle: z.string().min(1).optional(),
        signatureText: z.string().optional(),
        signatureImageUrl: z.string().url().optional().or(z.literal('')),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.prisma.signatureBlock.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature block not found' })
      }

      const updateData: {
        signatoryName?: string
        signatoryTitle?: string
        signatureText?: string | null
        signatureImageUrl?: string | null
        isDefault?: boolean
      } = {}

      if (data.signatoryName !== undefined) {
        updateData.signatoryName = data.signatoryName
      }
      if (data.signatoryTitle !== undefined) {
        updateData.signatoryTitle = data.signatoryTitle
      }
      if (data.signatureText !== undefined) {
        updateData.signatureText = data.signatureText || null
      }
      if (data.signatureImageUrl !== undefined) {
        updateData.signatureImageUrl = data.signatureImageUrl || null
      }
      if (data.isDefault !== undefined) {
        updateData.isDefault = data.isDefault
        if (data.isDefault) {
          await ctx.prisma.signatureBlock.updateMany({
            data: { isDefault: false },
            where: { NOT: { id } },
          })
        }
      }

      const signatureBlock = await ctx.prisma.signatureBlock.update({
        where: { id },
        data: updateData,
      })

      return signatureBlock
    }),

  delete: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const existing = await ctx.prisma.signatureBlock.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature block not found' })
      }

      await ctx.prisma.signatureBlock.delete({
        where: { id },
      })

      return { success: true }
    }),

  setDefault: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const existing = await ctx.prisma.signatureBlock.findUnique({ where: { id } })
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Signature block not found' })
      }

      await ctx.prisma.signatureBlock.updateMany({
        data: { isDefault: false },
      })

      await ctx.prisma.signatureBlock.update({
        where: { id },
        data: { isDefault: true },
      })

      return { success: true }
    }),
})


