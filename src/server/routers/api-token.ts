import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, hrAdminProcedure } from '@/lib/trpc'
import { generateApiToken } from '@/lib/api-tokens'

export const apiTokenRouter = router({
  list: hrAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.apiToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })
  }),

  create: hrAdminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const trimmedName = input.name.trim()
      if (!trimmedName) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token name is required' })
      }

      const tokenData = generateApiToken()
      const apiToken = await ctx.prisma.apiToken.create({
        data: {
          name: trimmedName,
          tokenHash: tokenData.tokenHash,
          tokenPrefix: tokenData.tokenPrefix,
          createdById: (ctx.user as { id: string }).id,
        },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          createdAt: true,
        },
      })

      return {
        token: tokenData.token,
        apiToken,
      }
    }),

  revoke: hrAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.apiToken.findUnique({ where: { id: input.id } })
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'API token not found' })
      }

      if (existing.revokedAt) {
        return existing
      }

      return ctx.prisma.apiToken.update({
        where: { id: input.id },
        data: { revokedAt: new Date() },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          revokedAt: true,
          createdAt: true,
        },
      })
    }),
})
