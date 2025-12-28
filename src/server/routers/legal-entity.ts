import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '@/lib/trpc'
import { getOrganization } from '@/lib/organization'
import { LEGAL_ENTITIES } from '@/lib/legal-entities'

type LegalEntityRow = {
  id: string
  organizationId: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

function hasLegalEntityClient(ctx: { prisma: any }): boolean {
  return Boolean(ctx.prisma?.legalEntity)
}

async function listLegalEntitiesRaw(ctx: { prisma: any }, organizationId: string): Promise<LegalEntityRow[]> {
  try {
    return await ctx.prisma.$queryRawUnsafe<LegalEntityRow[]>(
      'select "id", "organizationId", "name", "isActive", "createdAt", "updatedAt" from "LegalEntity" where "organizationId" = $1 and "isActive" = true order by "name" asc',
      organizationId
    )
  } catch (error) {
    console.error('Legal entity raw list failed:', error)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Legal entities require database setup. Run db:push, db:generate, and restart the server.',
    })
  }
}

async function ensureDefaultLegalEntitiesRaw(ctx: { prisma: any }, organizationId: string) {
  for (const name of LEGAL_ENTITIES) {
    await ctx.prisma.$executeRawUnsafe(
      'insert into "LegalEntity" ("organizationId", "name", "isActive", "createdAt", "updatedAt") values ($1, $2, true, now(), now()) on conflict ("organizationId", "name") do nothing',
      organizationId,
      name
    )
  }
}

export const legalEntityRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const organization = await getOrganization()
    if (hasLegalEntityClient(ctx)) {
      const entities = await ctx.prisma.legalEntity.findMany({
        where: { organizationId: organization.id, isActive: true },
        orderBy: { name: 'asc' },
      })

      if (entities.length > 0) return entities

      const defaults = LEGAL_ENTITIES.map((name) => ({
        organizationId: organization.id,
        name,
      }))
      await ctx.prisma.legalEntity.createMany({ data: defaults, skipDuplicates: true })

      return ctx.prisma.legalEntity.findMany({
        where: { organizationId: organization.id, isActive: true },
        orderBy: { name: 'asc' },
      })
    }

    const entities = await listLegalEntitiesRaw(ctx, organization.id)
    if (entities.length > 0) return entities

    await ensureDefaultLegalEntitiesRaw(ctx, organization.id)
    return listLegalEntitiesRaw(ctx, organization.id)
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(2).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const organization = await getOrganization()
      const name = input.name.trim()

      if (hasLegalEntityClient(ctx)) {
        const existing = await ctx.prisma.legalEntity.findFirst({
          where: { organizationId: organization.id, name: { equals: name, mode: 'insensitive' } },
        })
        if (existing) return existing

        return ctx.prisma.legalEntity.create({
          data: {
            organizationId: organization.id,
            name,
          },
        })
      }

      try {
        const existing = await ctx.prisma.$queryRawUnsafe<LegalEntityRow[]>(
          'select "id", "organizationId", "name", "isActive", "createdAt", "updatedAt" from "LegalEntity" where "organizationId" = $1 and lower("name") = lower($2) limit 1',
          organization.id,
          name
        )
        if (existing[0]) return existing[0]

        const created = await ctx.prisma.$queryRawUnsafe<LegalEntityRow[]>(
          'insert into "LegalEntity" ("organizationId", "name", "isActive", "createdAt", "updatedAt") values ($1, $2, true, now(), now()) returning "id", "organizationId", "name", "isActive", "createdAt", "updatedAt"',
          organization.id,
          name
        )
        return created[0]
      } catch (error) {
        console.error('Legal entity raw create failed:', error)
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Legal entities require database setup. Run db:push, db:generate, and restart the server.',
        })
      }
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (hasLegalEntityClient(ctx)) {
        await ctx.prisma.legalEntity.update({
          where: { id: input.id },
          data: { isActive: false },
        })
      } else {
        try {
          await ctx.prisma.$executeRawUnsafe(
            'update "LegalEntity" set "isActive" = false, "updatedAt" = now() where "id" = $1',
            input.id
          )
        } catch (error) {
          console.error('Legal entity raw remove failed:', error)
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Legal entities require database setup. Run db:push, db:generate, and restart the server.',
          })
        }
      }
      return { success: true }
    }),
})
