import { z } from 'zod'
import { router, adminProcedure, publicProcedure } from '@/lib/trpc'

// Default settings for all public pages
const DEFAULT_PUBLIC_PAGE_SETTINGS = {
  careers: { enabled: true },
  apply: { enabled: true },
  assessment: { enabled: true },
  recruiter: { enabled: true },
  interview: { enabled: true },
  offer: { enabled: true },
  onboarding: { enabled: true },
  apiDocs: { enabled: true },
  auth: { enabled: true },
}

// Public page definitions for the UI
export const PUBLIC_PAGES = [
  {
    key: 'careers',
    name: 'Careers Portal',
    description: 'Public job posting with application form. Shows job title, description, salary, requirements.',
    route: '/careers/[id]',
    category: 'candidate',
    icon: 'Globe',
  },
  {
    key: 'apply',
    name: 'Extended Application Form',
    description: 'Comprehensive interest form with work authorization, salary expectations, skills, leadership questions.',
    route: '/apply/[jobId]',
    category: 'candidate',
    icon: 'FileText',
  },
  {
    key: 'assessment',
    name: 'Assessment Page',
    description: 'Candidate assessment submission. Supports text, file upload, or URL submissions.',
    route: '/assessment/[token]',
    category: 'candidate',
    icon: 'ClipboardCheck',
  },
  {
    key: 'recruiter',
    name: 'Recruiter Portal',
    description: 'External recruiter portal for submitting candidates to specific jobs.',
    route: '/recruiter/[token]',
    category: 'recruiter',
    icon: 'Users',
  },
  {
    key: 'interview',
    name: 'Interview Evaluation',
    description: 'Interviewer feedback form with rubric-based scoring and recommendations.',
    route: '/interview/[token]',
    category: 'hiring',
    icon: 'Video',
  },
  {
    key: 'offer',
    name: 'Offer/Contract Signing',
    description: 'Electronic signature page for offers and employment contracts.',
    route: '/offer/[id]/sign',
    category: 'employee',
    icon: 'PenTool',
  },
  {
    key: 'onboarding',
    name: 'Onboarding Portal',
    description: 'Employee self-service onboarding with personal details, values, and personality assessments.',
    route: '/welcome/[token]',
    category: 'employee',
    icon: 'UserPlus',
  },
  {
    key: 'apiDocs',
    name: 'API Documentation',
    description: 'Public REST API documentation for integrations.',
    route: '/api-docs',
    category: 'developer',
    icon: 'Code',
  },
  {
    key: 'auth',
    name: 'Authentication Pages',
    description: 'Sign in, password reset, and team member invitation acceptance.',
    route: '/auth/*',
    category: 'auth',
    icon: 'Lock',
    cannotDisable: true, // Auth pages should always be enabled
  },
]

export const publicPagesRouter = router({
  // Get all public page settings
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findFirst({
      select: { publicPageSettings: true },
    })

    const settings = (org?.publicPageSettings as Record<string, any>) || {}

    // Merge with defaults to ensure all pages have settings
    const mergedSettings: Record<string, any> = {}
    for (const page of PUBLIC_PAGES) {
      mergedSettings[page.key] = {
        ...DEFAULT_PUBLIC_PAGE_SETTINGS[page.key as keyof typeof DEFAULT_PUBLIC_PAGE_SETTINGS],
        ...settings[page.key],
      }
    }

    return {
      settings: mergedSettings,
      pages: PUBLIC_PAGES,
    }
  }),

  // Update settings for a specific page
  updatePageSettings: adminProcedure
    .input(
      z.object({
        pageKey: z.string(),
        settings: z.object({
          enabled: z.boolean().optional(),
          customTitle: z.string().optional(),
          customMessage: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findFirst()
      if (!org) throw new Error('Organization not found')

      const currentSettings = (org.publicPageSettings as Record<string, any>) || {}
      const updatedSettings = {
        ...currentSettings,
        [input.pageKey]: {
          ...currentSettings[input.pageKey],
          ...input.settings,
        },
      }

      await ctx.prisma.organization.update({
        where: { id: org.id },
        data: { publicPageSettings: updatedSettings },
      })

      return { success: true }
    }),

  // Bulk update all settings
  updateAllSettings: adminProcedure
    .input(z.record(z.string(), z.record(z.string(), z.any())))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findFirst()
      if (!org) throw new Error('Organization not found')

      await ctx.prisma.organization.update({
        where: { id: org.id },
        data: { publicPageSettings: input },
      })

      return { success: true }
    }),

  // Get preview URLs using real data from database
  getPreviewUrls: adminProcedure.query(async ({ ctx }) => {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Find first available data for each page type
    const [job, assessment, recruiterJob, interviewToken, offer, onboarding] = await Promise.all([
      // First active job for careers/apply (preview mode bypasses isPublic check)
      ctx.prisma.job.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First assessment with invite token (inviteToken is optional, so filter for non-empty)
      ctx.prisma.candidateAssessment.findFirst({
        where: {
          inviteToken: { not: '' },
        },
        select: { inviteToken: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First recruiter job (accessToken is required with default, so all records have one)
      ctx.prisma.recruiterJob.findFirst({
        select: { accessToken: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First interview token (from InterviewerToken table)
      ctx.prisma.interviewerToken.findFirst({
        where: {
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        select: { token: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First sent offer (uses offer ID directly, no token needed)
      ctx.prisma.offer.findFirst({
        where: { status: 'SENT' },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First onboarding workflow (accessToken is required with default, so all records have one)
      ctx.prisma.onboardingWorkflow.findFirst({
        select: { accessToken: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      careers: job ? `${baseUrl}/careers/${job.id}?preview=true` : null,
      apply: job ? `${baseUrl}/apply/${job.id}?preview=true` : null,
      assessment: assessment?.inviteToken ? `${baseUrl}/assessment/${assessment.inviteToken}?preview=true` : null,
      recruiter: recruiterJob?.accessToken ? `${baseUrl}/recruiter/${recruiterJob.accessToken}?preview=true` : null,
      interview: interviewToken?.token ? `${baseUrl}/interview/${interviewToken.token}?preview=true` : null,
      offer: offer ? `${baseUrl}/offer/${offer.id}/sign?preview=true` : null,
      onboarding: onboarding?.accessToken ? `${baseUrl}/welcome/${onboarding.accessToken}?preview=true` : null,
      apiDocs: `${baseUrl}/api-docs?preview=true`,
      auth: `${baseUrl}/auth/signin?preview=true`,
    }
  }),

  // Check if a specific page is enabled (for public pages to call)
  isPageEnabled: publicProcedure
    .input(z.object({ pageKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findFirst({
        select: { publicPageSettings: true },
      })

      const settings = (org?.publicPageSettings as Record<string, any>) || {}
      const pageSettings = settings[input.pageKey] || DEFAULT_PUBLIC_PAGE_SETTINGS[input.pageKey as keyof typeof DEFAULT_PUBLIC_PAGE_SETTINGS]

      return {
        enabled: pageSettings?.enabled !== false, // Default to enabled if not set
        settings: pageSettings || {},
      }
    }),
})
