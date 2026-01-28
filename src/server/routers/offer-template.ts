import { z } from 'zod'
import { router, hrAdminProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'

const templateCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  bodyHtml: z.string().min(1),
  bodyMarkdown: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']).optional(),
  includeNda: z.boolean().default(true),
  includePii: z.boolean().default(true),
  variableSchema: z.record(z.object({
    label: z.string(),
    type: z.enum(['text', 'number', 'date', 'select']),
    required: z.boolean().default(true),
    options: z.array(z.string()).optional(),
    defaultValue: z.string().optional(),
  })).optional(),
})

const templateUpdateSchema = templateCreateSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

export const offerTemplateRouter = router({
  list: hrAdminProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
      employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = input?.includeInactive ? {} : { isActive: true }
      
      if (input?.employmentType) {
        where.employmentType = input.employmentType
      }
      
      return ctx.prisma.offerTemplate.findMany({
        where,
        include: {
          _count: { select: { offers: true } },
          attachments: true,
        },
        orderBy: { name: 'asc' },
      })
    }),

  getById: hrAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const template = await ctx.prisma.offerTemplate.findUnique({
        where: { id },
        include: { attachments: true },
      })

      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return template
    }),

  create: hrAdminProcedure
    .input(templateCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.offerTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          bodyHtml: input.bodyHtml,
          bodyMarkdown: input.bodyMarkdown,
          employmentType: input.employmentType,
          includeNda: input.includeNda,
          includePii: input.includePii,
          variableSchema: input.variableSchema,
        },
      })
    }),

  update: hrAdminProcedure
    .input(templateUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      return ctx.prisma.offerTemplate.update({
        where: { id },
        data,
      })
    }),

  delete: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      // Check if template is used by any offers
      const offersCount = await ctx.prisma.offer.count({
        where: { templateId: id },
      })

      if (offersCount > 0) {
        // Soft delete by marking inactive
        return ctx.prisma.offerTemplate.update({
          where: { id },
          data: { isActive: false },
        })
      }

      return ctx.prisma.offerTemplate.delete({
        where: { id },
      })
    }),

  addAttachment: hrAdminProcedure
    .input(z.object({
      templateId: z.string(),
      name: z.string(),
      type: z.enum(['nda', 'pii', 'custom']),
      contentHtml: z.string().optional(),
      fileUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.offerTemplateAttachment.create({
        data: input,
      })
    }),

  removeAttachment: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      return ctx.prisma.offerTemplateAttachment.delete({
        where: { id },
      })
    }),
})

