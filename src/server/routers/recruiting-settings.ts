import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/lib/trpc'

export const recruitingSettingsRouter = router({
  // Get recruiting settings (creates if doesn't exist)
  get: protectedProcedure.query(async ({ ctx }) => {
    // Try to get existing settings
    let settings = await ctx.prisma.recruitingSettings.findFirst()

    // Create if doesn't exist
    if (!settings) {
      settings = await ctx.prisma.recruitingSettings.create({
        data: {
          organizationId: 'default',
        },
      })
    }

    return settings
  }),

  // Update recruiting settings
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get or create settings
      let settings = await ctx.prisma.recruitingSettings.findFirst()

      if (!settings) {
        settings = await ctx.prisma.recruitingSettings.create({
          data: {
            organizationId: 'default',
            ...input,
            globalWebhookUrl: input.globalWebhookUrl || null,
            companyLogoUrl: input.companyLogoUrl || null,
          },
        })
      } else {
        settings = await ctx.prisma.recruitingSettings.update({
          where: { id: settings.id },
          data: {
            ...input,
            globalWebhookUrl: input.globalWebhookUrl || null,
            companyLogoUrl: input.companyLogoUrl || null,
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
        message: 'This is a test webhook from PeopleOS Recruiting',
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

  // Get source channel options (built-in + custom)
  getSourceChannels: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.recruitingSettings.findFirst()

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
