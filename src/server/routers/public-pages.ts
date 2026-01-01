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
    route: '/careers/[jobId]',
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
    const [job, assessment, recruiterJob, interview, offer, onboarding] = await Promise.all([
      // First open job for careers/apply
      ctx.prisma.job.findFirst({
        where: { status: 'OPEN' },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First assessment with token
      ctx.prisma.candidateAssessment.findFirst({
        where: { accessToken: { not: null } },
        select: { accessToken: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First recruiter job with token
      ctx.prisma.recruiterJob.findFirst({
        where: { accessToken: { not: null } },
        select: { accessToken: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First interview with token
      ctx.prisma.candidateInterview.findFirst({
        where: { token: { not: null } },
        select: { token: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First sent offer
      ctx.prisma.offer.findFirst({
        where: { status: 'SENT' },
        select: { id: true, accessToken: true },
        orderBy: { createdAt: 'desc' },
      }),
      // First onboarding workflow with token
      ctx.prisma.onboardingWorkflow.findFirst({
        where: { accessToken: { not: null } },
        select: { accessToken: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      careers: job ? `${baseUrl}/careers/${job.id}?preview=true` : null,
      apply: job ? `${baseUrl}/apply/${job.id}?preview=true` : null,
      assessment: assessment?.accessToken ? `${baseUrl}/assessment/${assessment.accessToken}?preview=true` : null,
      recruiter: recruiterJob?.accessToken ? `${baseUrl}/recruiter/${recruiterJob.accessToken}?preview=true` : null,
      interview: interview?.token ? `${baseUrl}/interview/${interview.token}?preview=true` : null,
      offer: offer ? `${baseUrl}/offer/${offer.id}/sign?preview=true${offer.accessToken ? `&token=${offer.accessToken}` : ''}` : null,
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
