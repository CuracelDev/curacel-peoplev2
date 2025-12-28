import { z } from 'zod'
import { router, adminProcedure, publicProcedure } from '@/lib/trpc'
import {
  normalizeAddressForStorage,
  normalizeEmailForStorage,
  normalizePhoneForStorage,
  normalizeWebsiteForStorage,
} from '@/lib/letterhead'

function computeDefaultLetterhead() {
  const companyDomain = (process.env.COMPANY_DOMAIN ?? '').trim()

  const envEmail = normalizeEmailForStorage(process.env.COMPANY_EMAIL)
  const envWebsite = normalizeWebsiteForStorage(process.env.COMPANY_WEBSITE)
  const envPhone = normalizePhoneForStorage(process.env.COMPANY_PHONE)
  const envAddress = normalizeAddressForStorage(process.env.COMPANY_ADDRESS)

  const defaultEmail = envEmail ?? (companyDomain ? `info@${companyDomain}` : null)
  const defaultWebsite = envWebsite ?? (companyDomain ? `https://${companyDomain}` : null)

  return {
    letterheadEmail: defaultEmail,
    letterheadWebsite: defaultWebsite,
    letterheadPhone: envPhone,
    letterheadAddress: envAddress,
  }
}

async function ensureOrganizationLetterhead(ctx: { prisma: any }, org: any) {
  const defaults = computeDefaultLetterhead()

  const needsEmail = !org.letterheadEmail && defaults.letterheadEmail
  const needsWebsite = !org.letterheadWebsite && defaults.letterheadWebsite
  const needsPhone = !org.letterheadPhone && defaults.letterheadPhone
  const needsAddress = !org.letterheadAddress && defaults.letterheadAddress

  if (!needsEmail && !needsWebsite && !needsPhone && !needsAddress) return org

  return ctx.prisma.organization.update({
    where: { id: org.id },
    data: {
      ...(needsEmail ? { letterheadEmail: defaults.letterheadEmail } : {}),
      ...(needsWebsite ? { letterheadWebsite: defaults.letterheadWebsite } : {}),
      ...(needsPhone ? { letterheadPhone: defaults.letterheadPhone } : {}),
      ...(needsAddress ? { letterheadAddress: defaults.letterheadAddress } : {}),
    },
  })
}

export const organizationRouter = router({
  getName: publicProcedure.query(async ({ ctx }) => {
    // Get or create organization (singleton)
    let org = await ctx.prisma.organization.findFirst()
    
    if (!org) {
      // Create default organization
      org = await ctx.prisma.organization.create({
        data: {
          name: process.env.COMPANY_NAME || 'Curacel',
          oneSentenceDescription: process.env.COMPANY_NAME 
            ? `${process.env.COMPANY_NAME} is an insurtech infrastructure company that helps insurers & partners in Africa and other emerging.`
            : null,
          careerPageUrl: process.env.COMPANY_DOMAIN 
            ? `https://curacel.ai/careers/${process.env.COMPANY_DOMAIN}`
            : null,
        },
      })
    }

    org = await ensureOrganizationLetterhead(ctx, org)
    if (!org) {
      throw new Error('Organization not found')
    }
    return org.name
  }),

  get: adminProcedure.query(async ({ ctx }) => {
    // Get or create organization (singleton)
    let org = await ctx.prisma.organization.findFirst()
    
    if (!org) {
      // Create default organization
      org = await ctx.prisma.organization.create({
        data: {
          name: process.env.COMPANY_NAME || 'Curacel',
          oneSentenceDescription: process.env.COMPANY_NAME 
            ? `${process.env.COMPANY_NAME} is an insurtech infrastructure company that helps insurers & partners in Africa and other emerging.`
            : null,
          careerPageUrl: process.env.COMPANY_DOMAIN 
            ? `https://curacel.ai/careers/${process.env.COMPANY_DOMAIN}`
            : null,
        },
      })
    }

    org = await ensureOrganizationLetterhead(ctx, org)
    if (!org) {
      throw new Error('Organization not found')
    }
    return org
  }),

  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        logoUrl: z.string().url().optional().nullable(),
        oneSentenceDescription: z.string().optional().nullable(),
        careerPageUrl: z.string().url().optional().nullable(),
        detailedDescription: z.string().optional().nullable(),
        letterheadEmail: z.string().optional().nullable(),
        letterheadWebsite: z.string().optional().nullable(),
        letterheadAddress: z.string().optional().nullable(),
        letterheadPhone: z.string().optional().nullable(),
        googleWorkspaceTransferToEmail: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalized = {
        ...input,
        letterheadEmail: normalizeEmailForStorage(input.letterheadEmail),
        letterheadWebsite: normalizeWebsiteForStorage(input.letterheadWebsite),
        letterheadAddress: normalizeAddressForStorage(input.letterheadAddress),
        letterheadPhone: normalizePhoneForStorage(input.letterheadPhone),
        googleWorkspaceTransferToEmail: normalizeEmailForStorage(input.googleWorkspaceTransferToEmail),
      }

      // Get or create organization
      let org = await ctx.prisma.organization.findFirst()
      
      if (!org) {
        org = await ctx.prisma.organization.create({
          data: normalized,
        })
      } else {
        org = await ctx.prisma.organization.update({
          where: { id: org.id },
          data: normalized,
        })
      }
      
      return org
    }),
})
