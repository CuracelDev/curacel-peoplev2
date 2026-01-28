import { prisma } from './prisma'
import {
  normalizeAddressForStorage,
  normalizeEmailForStorage,
  normalizePhoneForStorage,
  normalizeWebsiteForStorage,
} from './letterhead'

const organizationSelect = {
  id: true,
  name: true,
  logoUrl: true,
  letterheadEmail: true,
  letterheadWebsite: true,
  letterheadPhone: true,
  letterheadAddress: true,
} as const

export type OrganizationForLetterhead = {
  id: string
  name: string
  logoUrl: string | null
  letterheadEmail: string | null
  letterheadWebsite: string | null
  letterheadPhone: string | null
  letterheadAddress: string | null
}

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

async function ensureOrganizationLetterhead(org: OrganizationForLetterhead): Promise<OrganizationForLetterhead> {
  const defaults = computeDefaultLetterhead()

  const needsEmail = !org.letterheadEmail && defaults.letterheadEmail
  const needsWebsite = !org.letterheadWebsite && defaults.letterheadWebsite
  const needsPhone = !org.letterheadPhone && defaults.letterheadPhone
  const needsAddress = !org.letterheadAddress && defaults.letterheadAddress

  if (!needsEmail && !needsWebsite && !needsPhone && !needsAddress) return org

  return prisma.organization.update({
    where: { id: org.id },
    data: {
      ...(needsEmail ? { letterheadEmail: defaults.letterheadEmail } : {}),
      ...(needsWebsite ? { letterheadWebsite: defaults.letterheadWebsite } : {}),
      ...(needsPhone ? { letterheadPhone: defaults.letterheadPhone } : {}),
      ...(needsAddress ? { letterheadAddress: defaults.letterheadAddress } : {}),
    },
    select: organizationSelect,
  })
}

export async function getOrganization(): Promise<OrganizationForLetterhead> {
  let org = await prisma.organization.findFirst({ select: organizationSelect })
  
  if (!org) {
    // Create default organization
    org = await prisma.organization.create({
      data: {
        name: process.env.COMPANY_NAME || 'Curacel',
        oneSentenceDescription: process.env.COMPANY_NAME 
          ? `${process.env.COMPANY_NAME} is an insurtech infrastructure company that helps insurers & partners in Africa and other emerging.`
          : null,
        careerPageUrl: process.env.COMPANY_DOMAIN 
          ? `https://curacel.ai/careers/${process.env.COMPANY_DOMAIN}`
          : null,
        ...computeDefaultLetterhead(),
      },
      select: organizationSelect,
    })
  }
  
  return ensureOrganizationLetterhead(org)
}

export async function getOrganizationName(): Promise<string> {
  const org = await getOrganization()
  return org.name
}
