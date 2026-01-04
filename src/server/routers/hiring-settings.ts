import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/lib/trpc'
import { normalizeCandidateScoreWeights } from '@/lib/hiring/score-config'

export const hiringSettingsRouter = router({
  // Get hiring settings (creates if doesn't exist)
  get: protectedProcedure.query(async ({ ctx }) => {
    // Try to get existing settings
    let settings = await ctx.prisma.hiringSettings.findFirst()
    const normalizedScoreWeights = normalizeCandidateScoreWeights(
      settings?.candidateScoreWeights as ReturnType<typeof normalizeCandidateScoreWeights> | null
    )
    const jobScoreDisplay = settings?.jobScoreDisplay || 'average'

    // Create if doesn't exist
    if (!settings) {
      settings = await ctx.prisma.hiringSettings.create({
        data: {
          organizationId: 'default',
          candidateScoreWeights: normalizedScoreWeights,
          jobScoreDisplay,
        },
      })
    } else if (!settings.candidateScoreWeights || !settings.jobScoreDisplay) {
      settings = await ctx.prisma.hiringSettings.update({
        where: { id: settings.id },
        data: {
          candidateScoreWeights: normalizedScoreWeights,
          jobScoreDisplay,
        },
      })
    }

    return {
      ...settings,
      candidateScoreWeights: normalizedScoreWeights,
      jobScoreDisplay,
    }
  }),

  // Update hiring settings
  update: protectedProcedure
    .input(
      z.object({
        globalWebhookUrl: z.string().url().optional().or(z.literal('')),
        globalWebhookSecret: z.string().optional(),
        companyLogoUrl: z.string().url().optional().or(z.literal('')),
        companyDescription: z.string().optional(),
        socialLinks: z.object({
          linkedin: z.string().optional(),
          twitter: z.string().optional(),
          website: z.string().optional(),
        }).optional(),
        customInboundChannels: z.array(z.string()).optional(),
        customOutboundChannels: z.array(z.string()).optional(),
        candidateScoreWeights: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            description: z.string().optional(),
            weight: z.number(),
            enabled: z.boolean(),
          })
        ).optional(),
        jobScoreDisplay: z.enum(['average', 'max']).optional(),
        decisionSupportEnabled: z.boolean().optional(),
        personalityProfilesEnabled: z.boolean().optional(),
        teamProfilesEnabled: z.boolean().optional(),
        autoArchiveUnqualified: z.boolean().optional(),
        autoArchiveLocationMismatch: z.boolean().optional(),
        allowBackwardStageMovement: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedScoreWeights = input.candidateScoreWeights
        ? normalizeCandidateScoreWeights(input.candidateScoreWeights as Parameters<typeof normalizeCandidateScoreWeights>[0])
        : undefined
      const normalizedScoreWeightsJson = normalizedScoreWeights
        ? (normalizedScoreWeights as Prisma.InputJsonValue)
        : undefined

      // Get or create settings
      let settings = await ctx.prisma.hiringSettings.findFirst()

      if (!settings) {
        settings = await ctx.prisma.hiringSettings.create({
          data: {
            organizationId: 'default',
            ...input,
            globalWebhookUrl: input.globalWebhookUrl || null,
            companyLogoUrl: input.companyLogoUrl || null,
            candidateScoreWeights: normalizedScoreWeightsJson,
          },
        })
      } else {
        const fallbackScoreWeights = settings.candidateScoreWeights === null
          ? undefined
          : (settings.candidateScoreWeights as Prisma.InputJsonValue)
        settings = await ctx.prisma.hiringSettings.update({
          where: { id: settings.id },
          data: {
            ...input,
            globalWebhookUrl: input.globalWebhookUrl || null,
            companyLogoUrl: input.companyLogoUrl || null,
            candidateScoreWeights: normalizedScoreWeightsJson ?? fallbackScoreWeights,
          },
        })
      }

      return settings
    }),

  // Test webhook
  testWebhook: protectedProcedure
    .input(
      z.object({
        webhookUrl: z.string().url(),
        webhookSecret: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook from PeopleOS Hiring',
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'PeopleOS-Webhook/1.0',
        'X-Webhook-Event': 'webhook.test',
      }

      // Add HMAC signature if secret provided
      if (input.webhookSecret) {
        const crypto = await import('crypto')
        const signature = crypto
          .createHmac('sha256', input.webhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex')
        headers['X-Webhook-Signature'] = `sha256=${signature}`
      }

      try {
        const response = await fetch(input.webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })

        return {
          success: response.ok,
          statusCode: response.status,
          statusText: response.statusText,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Failed to send webhook: ${String(error)}`,
        })
      }
    }),

  // Get all jobs with their webhook settings
  getJobWebhooks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.job.findMany({
      where: {
        webhookUrl: { not: null },
      },
      select: {
        id: true,
        title: true,
        webhookUrl: true,
        webhookSecret: true,
        lastWebhookAt: true,
        status: true,
        isPublic: true,
      },
      orderBy: { title: 'asc' },
    })
  }),

  getDecisionSupportJobs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.job.findMany({
      select: {
        id: true,
        title: true,
        department: true,
        status: true,
        decisionSupportEnabled: true,
        personalityProfilesEnabled: true,
        teamProfilesEnabled: true,
      },
      orderBy: { title: 'asc' },
    })
  }),

  updateJobDecisionSupport: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        decisionSupportEnabled: z.boolean().optional(),
        personalityProfilesEnabled: z.boolean().optional(),
        teamProfilesEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.job.update({
        where: { id: input.jobId },
        data: {
          decisionSupportEnabled: input.decisionSupportEnabled,
          personalityProfilesEnabled: input.personalityProfilesEnabled,
          teamProfilesEnabled: input.teamProfilesEnabled,
        },
      })
    }),

  // Get source channel options (built-in + custom)
  getSourceChannels: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.hiringSettings.findFirst()

    const builtInInbound = ['YC', 'PEOPLEOS', 'COMPANY_SITE', 'OTHER']
    const builtInOutbound = ['LINKEDIN', 'JOB_BOARDS', 'GITHUB', 'TWITTER', 'OTHER']

    const customInbound = (settings?.customInboundChannels as string[]) || []
    const customOutbound = (settings?.customOutboundChannels as string[]) || []

    return {
      inbound: [...builtInInbound, ...customInbound],
      outbound: [...builtInOutbound, ...customOutbound],
      customInbound,
      customOutbound,
    }
  }),

  // Get all public jobs
  getPublicJobs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.job.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        department: true,
        status: true,
        isPublic: true,
        slug: true,
      },
      orderBy: { title: 'asc' },
    })
  }),

  // Toggle job public status
  toggleJobPublic: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        isPublic: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.job.update({
        where: { id: input.jobId },
        data: { isPublic: input.isPublic },
      })
    }),
})
