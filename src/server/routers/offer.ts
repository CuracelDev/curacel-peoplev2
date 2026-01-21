import { z } from 'zod'
import { router, hrAdminProcedure, publicProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'
import { renderTemplate } from '@/lib/utils'
import { logOfferEvent } from '@/lib/audit'
import { sendOfferEmail, sendSignedOfferEmail } from '@/lib/email'
import { createDocuSignConnector } from '@/lib/integrations/docusign'
import { getOrganization } from '@/lib/organization'
import { renderHtmlToPdfBuffer } from '@/lib/pdf'
import { wrapAgreementHtmlWithLetterhead } from '@/lib/letterhead'

const offerCreateSchema = z.object({
  employeeId: z.string().optional(),
  candidateId: z.string().optional(),
  candidateEmail: z.string().email(),
  candidateName: z.string().min(1),
  templateId: z.string(),
  variables: z.record(z.string()),
})

const offerSendSchema = z.object({
  offerId: z.string(),
})

const offerUpdateSchema = z.object({
  offerId: z.string(),
  candidateEmail: z.string().email().optional(),
  candidateName: z.string().optional(),
  templateId: z.string().optional(),
  variables: z.record(z.string()).optional(),
  renderedHtml: z.string().optional(),
})

const ALLOWED_RESEND_STATUSES = ['DRAFT', 'SENT', 'VIEWED']

function ensureSendableStatus(status: string, allowResend = false) {
  if (allowResend) {
    if (!ALLOWED_RESEND_STATUSES.includes(status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft or previously sent offers can be resent' })
    }
    return
  }
  if (status !== 'DRAFT') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft offers can be sent' })
  }
}

export const offerRouter = router({
  list: hrAdminProcedure
    .input(z.object({
      status: z.string().optional(),
      candidateEmail: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { status, candidateEmail, search, page = 1, limit = 20 } = input || {}

      const where: Record<string, unknown> = {}

      if (status) where.status = status
      if (candidateEmail) where.candidateEmail = candidateEmail
      if (search) {
        where.OR = [
          { candidateName: { contains: search, mode: 'insensitive' } },
          { candidateEmail: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [offers, total] = await Promise.all([
        ctx.prisma.offer.findMany({
          where,
          include: {
            template: { select: { id: true, name: true } },
            employee: { select: { id: true, fullName: true, status: true } },
            events: { orderBy: { occurredAt: 'desc' }, take: 3 },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.offer.count({ where }),
      ])

      return {
        offers,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  getById: hrAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id },
        include: {
          template: true,
          employee: true,
          events: { orderBy: { occurredAt: 'desc' } },
        },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const renderedHtml =
        offer.renderedHtml ||
        (offer.template?.bodyHtml
          ? renderTemplate(offer.template.bodyHtml, offer.variables as Record<string, string>)
          : '')

      const organization = await getOrganization()
      const wrappedHtml = wrapAgreementHtmlWithLetterhead(renderedHtml, organization, {
        baseUrl: process.env.NEXTAUTH_URL,
      })

      return {
        ...offer,
        renderedHtml: wrappedHtml,
      }
    }),

  getCandidatesInOfferStage: hrAdminProcedure
    .query(async ({ ctx }) => {
      const candidates = await ctx.prisma.jobCandidate.findMany({
        where: {
          stage: 'OFFER',
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              employmentType: true,
              locations: true,
            },
          },
          employee: {
            select: {
              id: true,
              fullName: true,
              status: true,
              offers: {
                where: {
                  status: { in: ['DRAFT', 'SENT', 'VIEWED', 'SIGNED'] },
                },
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      })

      return candidates
    }),

  create: hrAdminProcedure
    .input(offerCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.offerTemplate.findUnique({
        where: { id: input.templateId },
      })

      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })
      }

      // If candidateId is provided, fetch candidate data
      let candidateData: { id: string; candidateId?: string } | null = null
      if (input.candidateId) {
        const candidate = await ctx.prisma.jobCandidate.findUnique({
          where: { id: input.candidateId },
          include: {
            job: {
              select: {
                title: true,
                department: true,
                locations: true,
                employmentType: true,
              },
            },
            employee: {
              select: { id: true },
            },
          },
        })

        if (candidate) {
          candidateData = { id: candidate.id, candidateId: input.candidateId }
        }
      }

      // Create or find employee
      let employeeId = input.employeeId

      if (!employeeId) {
        // If candidate has an existing employee, use it
        if (candidateData && input.candidateId) {
          const candidate = await ctx.prisma.jobCandidate.findUnique({
            where: { id: input.candidateId },
            include: { employee: true },
          })

          if (candidate?.employee) {
            employeeId = candidate.employee.id
          }
        }

        // Otherwise, check if employee exists with this email
        if (!employeeId) {
          const existingEmployee = await ctx.prisma.employee.findUnique({
            where: { personalEmail: input.candidateEmail },
          })

          if (existingEmployee) {
            employeeId = existingEmployee.id
          } else {
            // Create new employee as candidate
            const newEmployee = await ctx.prisma.employee.create({
              data: {
                fullName: input.candidateName,
                personalEmail: input.candidateEmail,
                status: 'CANDIDATE',
                jobTitle: input.variables.role || input.variables.job_title,
                department: input.variables.department,
                salaryAmount: input.variables.salary ? parseFloat(input.variables.salary) : undefined,
                salaryCurrency: input.variables.currency || 'USD',
                startDate: input.variables.start_date ? new Date(input.variables.start_date) : undefined,
                location: input.variables.location,
                candidateId: candidateData?.candidateId,
              },
            })
            employeeId = newEmployee.id
          }
        } else {
          // Update existing employee to link to candidate
          if (candidateData?.candidateId) {
            await ctx.prisma.employee.update({
              where: { id: employeeId },
              data: { candidateId: candidateData.candidateId },
            })
          }
        }
      }

      // Render the offer HTML
      const renderedHtml = renderTemplate(template.bodyHtml, input.variables)

      const offer = await ctx.prisma.offer.create({
        data: {
          employeeId,
          candidateEmail: input.candidateEmail,
          candidateName: input.candidateName,
          templateId: input.templateId,
          variables: input.variables,
          renderedHtml,
          status: 'DRAFT',
        },
      })

      // Create event
      await ctx.prisma.offerEvent.create({
        data: {
          offerId: offer.id,
          type: 'created',
          description: 'Offer created',
        },
      })

      await logOfferEvent({
        actorId: (ctx.user as { id: string }).id,
        action: 'OFFER_CREATED',
        offerId: offer.id,
        metadata: {
          candidateName: input.candidateName,
          templateId: input.templateId,
          candidateId: input.candidateId,
        },
      })

      return offer
    }),

  update: hrAdminProcedure
    .input(offerUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: input.offerId },
        include: { template: true },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (['SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED'].includes(offer.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Signed or closed offers cannot be edited' })
      }

      let template: typeof offer.template | null = offer.template

      if (input.templateId && input.templateId !== offer.templateId) {
        template = await ctx.prisma.offerTemplate.findUnique({ where: { id: input.templateId } })
        if (!template) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })
        }
      }

      const data: any = {}

      if (input.candidateName) data.candidateName = input.candidateName
      if (input.candidateEmail) data.candidateEmail = input.candidateEmail
      if (input.templateId) data.templateId = input.templateId

      if (input.renderedHtml) {
        data.renderedHtml = input.renderedHtml
      } else if (input.variables) {
        data.variables = input.variables
        data.renderedHtml =
          template?.bodyHtml && input.variables
            ? renderTemplate(template.bodyHtml, input.variables)
            : offer.renderedHtml
      }

      const updated = await ctx.prisma.offer.update({
        where: { id: input.offerId },
        data,
      })

      await ctx.prisma.offerEvent.create({
        data: {
          offerId: offer.id,
          type: 'updated',
          description: 'Offer updated',
        },
      })

      await logOfferEvent({
        actorId: (ctx.user as { id: string }).id,
        action: 'OFFER_UPDATED',
        offerId: offer.id,
      })

      return updated
    }),

  preview: hrAdminProcedure
    .input(z.object({
      templateId: z.string(),
      variables: z.record(z.string()),
    }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.offerTemplate.findUnique({
        where: { id: input.templateId },
      })

      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const organization = await getOrganization()

      return {
        html: wrapAgreementHtmlWithLetterhead(renderTemplate(template.bodyHtml, input.variables), organization, {
          baseUrl: process.env.NEXTAUTH_URL,
        }),
      }
    }),

  send: hrAdminProcedure
    .input(offerSendSchema)
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: input.offerId },
        include: { template: true, employee: true },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      ensureSendableStatus(offer.status, false)

      const docusign = createDocuSignConnector()

      if (docusign) {
        // Send via DocuSign
        try {
          const organization = await getOrganization()
          const documentHtml = wrapAgreementHtmlWithLetterhead(offer.renderedHtml || '', organization, {
            baseUrl: process.env.NEXTAUTH_URL,
          })

          const result = await docusign.sendEnvelope({
            signerEmail: offer.candidateEmail,
            signerName: offer.candidateName,
            subject: `Offer from ${organization.name} - ${offer.candidateName}`,
            documentHtml,
            callbackUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/docusign`,
          })

          await ctx.prisma.offer.update({
            where: { id: offer.id },
            data: {
              status: 'SENT',
              esignEnvelopeId: result.envelopeId,
              esignProvider: 'docusign',
              esignStatus: result.status,
              esignSentAt: new Date(),
              sentBy: (ctx.user as { id: string }).id,
            },
          })
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to send via DocuSign: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
      } else {
        // Fallback: Send link via email
        const offerLink = `${process.env.NEXTAUTH_URL}/offer/${offer.id}/sign`

        await sendOfferEmail({
          candidateEmail: offer.candidateEmail,
          candidateName: offer.candidateName,
          offerLink,
          companyName: (await getOrganization()).name,
        })

        await ctx.prisma.offer.update({
          where: { id: offer.id },
          data: {
            status: 'SENT',
            esignProvider: 'internal',
            esignStatus: 'sent',
            esignSentAt: new Date(),
            sentBy: (ctx.user as { id: string }).id,
          },
        })
      }

      // Update employee status
      await ctx.prisma.employee.update({
        where: { id: offer.employeeId },
        data: { status: 'OFFER_SENT' },
      })

      // Create event
      await ctx.prisma.offerEvent.create({
        data: {
          offerId: offer.id,
          type: 'sent',
          description: 'Offer sent to candidate',
        },
      })

      await logOfferEvent({
        actorId: (ctx.user as { id: string }).id,
        action: 'OFFER_SENT',
        offerId: offer.id,
        metadata: { candidateEmail: offer.candidateEmail },
      })

      return { success: true }
    }),

  resend: hrAdminProcedure
    .input(offerSendSchema)
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: input.offerId },
        include: { template: true, employee: true },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      ensureSendableStatus(offer.status, true)

      const docusign = createDocuSignConnector()
      const organization = await getOrganization()

      if (docusign) {
        try {
          const documentHtml = wrapAgreementHtmlWithLetterhead(offer.renderedHtml || '', organization, {
            baseUrl: process.env.NEXTAUTH_URL,
          })

          const result = await docusign.sendEnvelope({
            signerEmail: offer.candidateEmail,
            signerName: offer.candidateName,
            subject: `Offer from ${organization.name} - ${offer.candidateName}`,
            documentHtml,
            callbackUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/docusign`,
          })

          await ctx.prisma.offer.update({
            where: { id: offer.id },
            data: {
              status: 'SENT',
              esignEnvelopeId: result.envelopeId,
              esignProvider: 'docusign',
              esignStatus: result.status,
              esignSentAt: new Date(),
              sentBy: (ctx.user as { id: string }).id,
            },
          })
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to send via DocuSign: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
        }
      } else {
        const offerLink = `${process.env.NEXTAUTH_URL}/offer/${offer.id}/sign`

        await sendOfferEmail({
          candidateEmail: offer.candidateEmail,
          candidateName: offer.candidateName,
          offerLink,
          companyName: organization.name,
          logoUrl: organization.logoUrl || undefined,
        })

        await ctx.prisma.offer.update({
          where: { id: offer.id },
          data: {
            status: 'SENT',
            esignProvider: 'internal',
            esignStatus: 'sent',
            esignSentAt: new Date(),
            sentBy: (ctx.user as { id: string }).id,
          },
        })
      }

      if (offer.employeeId) {
        await ctx.prisma.employee.update({
          where: { id: offer.employeeId },
          data: { status: 'OFFER_SENT' },
        })
      }

      await ctx.prisma.offerEvent.create({
        data: {
          offerId: offer.id,
          type: 'sent',
          description: 'Offer resent to candidate',
        },
      })

      await logOfferEvent({
        actorId: (ctx.user as { id: string }).id,
        action: 'OFFER_SENT',
        offerId: offer.id,
        metadata: { candidateEmail: offer.candidateEmail, resend: true },
      })

      return { success: true }
    }),

  getSigningUrl: hrAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: offerId }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: offerId },
      })

      if (!offer || !offer.esignEnvelopeId) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const docusign = createDocuSignConnector()
      if (!docusign) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DocuSign not configured' })
      }

      const returnUrl = `${process.env.NEXTAUTH_URL}/offers/${offerId}?signed=complete`

      const signingUrl = await docusign.getSigningUrl(
        offer.esignEnvelopeId,
        offer.candidateEmail,
        offer.candidateName,
        returnUrl
      )

      return { url: signingUrl }
    }),

  cancel: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: offerId }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: offerId },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (offer.status === 'SIGNED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel signed offers' })
      }

      // Void in DocuSign if applicable
      if (offer.esignEnvelopeId) {
        const docusign = createDocuSignConnector()
        if (docusign) {
          try {
            await docusign.voidEnvelope(offer.esignEnvelopeId, 'Cancelled by HR')
          } catch (error) {
            console.warn('Failed to void DocuSign envelope:', error)
          }
        }
      }

      await ctx.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'CANCELLED' },
      })

      await ctx.prisma.offerEvent.create({
        data: {
          offerId,
          type: 'cancelled',
          description: 'Offer cancelled',
        },
      })

      await logOfferEvent({
        actorId: (ctx.user as { id: string }).id,
        action: 'OFFER_CANCELLED',
        offerId,
      })

      return { success: true }
    }),

  restore: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: offerId }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: offerId },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (offer.status !== 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only cancelled offers can be restored' })
      }

      const updated = await ctx.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'DRAFT' },
      })

      await ctx.prisma.offerEvent.create({
        data: {
          offerId,
          type: 'restored',
          description: 'Offer restored from cancelled status',
        },
      })

      await logOfferEvent({
        actorId: (ctx.user as { id: string }).id,
        action: 'OFFER_UPDATED',
        offerId,
        metadata: { action: 'restored' },
      })

      return updated
    }),

  // Public endpoint for candidates to view their offer
  getPublicOffer: publicProcedure
    .input(z.object({
      offerId: z.string(),
      token: z.string().optional(), // For additional security
    }))
    .query(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: input.offerId },
        select: {
          id: true,
          candidateName: true,
          status: true,
          renderedHtml: true,
          esignSignedAt: true,
          variables: true,
          template: { select: { name: true, bodyHtml: true } },
        },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const organization = await getOrganization()
      const variables = (offer.variables || {}) as Record<string, string>
      const renderedHtml =
        offer.renderedHtml ||
        (offer.template?.bodyHtml ? renderTemplate(offer.template.bodyHtml, variables) : '')
      const wrappedHtml = wrapAgreementHtmlWithLetterhead(renderedHtml, organization, {
        baseUrl: process.env.NEXTAUTH_URL,
      })

      // Mark as viewed if not already
      if (offer.status === 'SENT') {
        await ctx.prisma.offer.update({
          where: { id: input.offerId },
          data: {
            status: 'VIEWED',
            esignViewedAt: new Date(),
          },
        })

        await ctx.prisma.offerEvent.create({
          data: {
            offerId: input.offerId,
            type: 'viewed',
            description: 'Offer viewed by candidate',
          },
        })

        await logOfferEvent({
          action: 'OFFER_VIEWED',
          offerId: input.offerId,
        })
      }

      return {
        id: offer.id,
        candidateName: offer.candidateName,
        status: offer.status,
        esignSignedAt: offer.esignSignedAt,
        renderedHtml: wrappedHtml,
        template: { name: offer.template.name },
      }
    }),

  // Endpoint for manual signing (when DocuSign is not available)
  manualSign: publicProcedure
    .input(z.object({
      offerId: z.string(),
      signature: z.string(), // typed name (required)
      signatureImage: z.string().optional(), // optional base64 image
    }))
    .mutation(async ({ ctx, input }) => {
      const offer = await ctx.prisma.offer.findUnique({
        where: { id: input.offerId },
      })

      if (!offer) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (offer.status !== 'SENT' && offer.status !== 'VIEWED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Offer cannot be signed' })
      }

      const organization = await getOrganization()
      const vars = (offer.variables || {}) as Record<string, string>
      const signatureBlockId = vars.signature_block_id
      const signatureBlock = signatureBlockId
        ? await ctx.prisma.signatureBlock.findUnique({ where: { id: signatureBlockId } })
        : null

      const signedAt = new Date()

      const signatureBoxStyle =
        'border:1px solid #e5e7eb; padding:6px; background:white; width:280px; height:96px; overflow:hidden; display:flex; align-items:center; justify-content:center;'
      const signatureImgStyle = 'max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; display:block;'

      const signatureBlockHtml = `
        <div style="margin-top:32px;">
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${signatureBlock?.signatureImageUrl
          ? `<div style="${signatureBoxStyle}"><img src="${signatureBlock.signatureImageUrl}" alt="Company signature" style="${signatureImgStyle}" /></div>`
          : signatureBlock?.signatureText
            ? `<div style="${signatureBoxStyle}"><p style="margin:0; color:#111827; font-size:16px;">${signatureBlock.signatureText}</p></div>`
            : ''
        }
            <div>
              <p style="margin:0; font-weight:700; color:#111827;">${signatureBlock?.signatoryName || organization.name}</p>
              <p style="margin:0; color:#4b5563;">${signatureBlock?.signatoryTitle || ''}</p>
            </div>
          </div>
        </div>
      `

      const wrappedOfferHtml = wrapAgreementHtmlWithLetterhead(offer.renderedHtml || '', organization, {
        baseUrl: process.env.NEXTAUTH_URL,
      })

      const signingDetailsHtml = `
        <hr style="margin:24px 0; border:0; border-top:1px solid #e5e7eb;" />
        <div style="display:flex; gap:32px; flex-wrap:wrap;">
          <div>
            <p style="margin:0; font-weight:600; color:#111827;">Candidate signature</p>
            <p style="margin:4px 0; color:#111827;">${input.signature}</p>
            ${input.signatureImage
          ? `<div style="${signatureBoxStyle}"><img src="${input.signatureImage}" alt="Signature" style="${signatureImgStyle}" /></div>`
          : ''
        }
            <p style="margin:8px 0 0; color:#4b5563; font-size:12px;">Signed at: ${signedAt.toISOString()}</p>
          </div>
          <div>
            <p style="margin:0; font-weight:600; color:#111827;">Company</p>
            <p style="margin:4px 0; color:#111827;">${organization.name}</p>
            ${signatureBlock ? `<p style="margin:0; color:#111827;">${signatureBlock.signatoryName}</p>` : ''}
            ${signatureBlock ? `<p style="margin:0; color:#4b5563;">${signatureBlock.signatoryTitle}</p>` : ''}
            <p style="margin:0; color:#4b5563; font-size:12px;">Signed at: ${signedAt.toISOString()}</p>
          </div>
        </div>
        ${signatureBlockHtml}
      `

      const signedHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background:white;">
            <div style="background:#f9fafb; padding:16px 20px; border-bottom:1px solid #e5e7eb;">
              <h2 style="margin:0; font-size:18px; color:#111827;">Signed Offer</h2>
              <p style="margin:4px 0 0; color:#4b5563;">${organization.name}</p>
            </div>
            <div style="padding:20px;">
              ${wrappedOfferHtml}
              ${signingDetailsHtml}
            </div>
          </div>
        </div>
      `

      const signedPdf = await renderHtmlToPdfBuffer(signedHtml)
      const signedDocUrl = `data:application/pdf;base64,${signedPdf.toString('base64')}`

      // Update offer
      await ctx.prisma.offer.update({
        where: { id: input.offerId },
        data: {
          status: 'SIGNED',
          esignProvider: offer.esignProvider || 'internal',
          esignStatus: 'completed',
          esignSignedAt: signedAt,
          signedDocUrl,
        },
      })

      // Update employee
      await ctx.prisma.employee.update({
        where: { id: offer.employeeId },
        data: { status: 'OFFER_SIGNED' },
      })

      await ctx.prisma.offerEvent.create({
        data: {
          offerId: input.offerId,
          type: 'signed',
          description: 'Offer signed by candidate',
          metadata: {
            signature: input.signature,
            signatureImage: input.signatureImage,
            method: 'internal',
          },
        },
      })

      await logOfferEvent({
        action: 'OFFER_SIGNED',
        offerId: input.offerId,
        metadata: { method: 'manual', signature: input.signature, signatureImage: input.signatureImage },
      })

      // Email signed copy
      await sendSignedOfferEmail({
        to: offer.candidateEmail,
        candidateName: offer.candidateName,
        companyName: organization.name,
        signedHtml,
        signedPdf,
        signedFileName: `signed-offer-${offer.candidateName.replace(/\s+/g, '-').toLowerCase() || 'candidate'}.pdf`,
      })

      return { success: true }
    }),
})
