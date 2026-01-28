/**
 * Email Settings Router
 *
 * Manages organization-wide email settings including:
 * - Auto-send configuration per stage
 * - Default sender settings (CC, reply-to)
 * - Email tracking toggles
 */

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'

// Schema for per-stage auto-send configuration
const AutoSendStageConfigSchema = z.object({
  enabled: z.boolean(),
  delayMinutes: z.number().min(0).max(1440), // Max 24 hours
  templateId: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderDelayHours: z.number().min(1).max(168).optional(), // 1 hour to 7 days
})

// Schema for the full auto-send stages config
const AutoSendStagesSchema = z.record(AutoSendStageConfigSchema)

// Schema for general email settings update
const UpdateEmailSettingsSchema = z.object({
  defaultCcEmail: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
      message: 'Invalid email address',
    }),
  defaultReplyTo: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
      message: 'Invalid email address',
    }),
  trackOpens: z.boolean().optional(),
  trackClicks: z.boolean().optional(),
  autoSendOnApplication: z.boolean().optional(),
})

export const emailSettingsRouter = router({
  /**
   * Get email settings for the organization
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    let settings = await ctx.prisma.emailSettings.findFirst()

    if (!settings) {
      // Create default settings if none exist
      settings = await ctx.prisma.emailSettings.create({
        data: {
          organizationId: 'default',
          autoSendStages: {},
          autoSendOnApplication: true,
          trackOpens: true,
          trackClicks: true,
        },
      })
    }

    return settings
  }),

  /**
   * Update general email settings
   */
  update: adminProcedure
    .input(UpdateEmailSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      let settings = await ctx.prisma.emailSettings.findFirst()

      if (!settings) {
        return ctx.prisma.emailSettings.create({
          data: {
            organizationId: 'default',
            ...input,
          },
        })
      }

      return ctx.prisma.emailSettings.update({
        where: { id: settings.id },
        data: input,
      })
    }),

  /**
   * Update auto-send stages configuration
   */
  updateAutoSendStages: adminProcedure
    .input(
      z.object({
        autoSendStages: AutoSendStagesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      let settings = await ctx.prisma.emailSettings.findFirst()

      if (!settings) {
        return ctx.prisma.emailSettings.create({
          data: {
            organizationId: 'default',
            autoSendStages: input.autoSendStages,
          },
        })
      }

      return ctx.prisma.emailSettings.update({
        where: { id: settings.id },
        data: { autoSendStages: input.autoSendStages },
      })
    }),

  /**
   * Get auto-send configuration for a specific stage
   */
  getAutoSendConfig: protectedProcedure
    .input(z.object({ stage: z.string() }))
    .query(async ({ ctx, input }) => {
      const settings = await ctx.prisma.emailSettings.findFirst()
      const stages = (settings?.autoSendStages as Record<string, unknown>) || {}
      const stageConfig = stages[input.stage] as
        | {
            enabled: boolean
            delayMinutes: number
            templateId?: string
            reminderEnabled?: boolean
            reminderDelayHours?: number
          }
        | undefined

      return (
        stageConfig || {
          enabled: false,
          delayMinutes: 0,
          reminderEnabled: false,
          reminderDelayHours: 72,
        }
      )
    }),

  /**
   * Get all stages with their auto-send configuration
   */
  getAllAutoSendConfigs: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.prisma.emailSettings.findFirst()
    const autoSendStages = (settings?.autoSendStages as Record<string, unknown>) || {}

    // Define all candidate stages
    const stages = [
      'APPLIED',
      'SHORTLISTED',
      'HR_SCREEN',
      'TECHNICAL',
      'TEAM_CHAT',
      'ADVISOR_CHAT',
      'PANEL',
      'TRIAL',
      'CEO_CHAT',
      'OFFER',
      'REJECTED',
    ]

    // Build config for each stage
    return stages.map((stage) => {
      const config = autoSendStages[stage] as
        | {
            enabled: boolean
            delayMinutes: number
            templateId?: string
            reminderEnabled?: boolean
            reminderDelayHours?: number
          }
        | undefined

      return {
        stage,
        enabled: config?.enabled || false,
        delayMinutes: config?.delayMinutes || 0,
        templateId: config?.templateId,
        reminderEnabled: config?.reminderEnabled || false,
        reminderDelayHours: config?.reminderDelayHours || 72,
      }
    })
  }),

  /**
   * Get queued emails for monitoring
   */
  getQueuedEmails: adminProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.queuedStageEmail.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          candidate: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      })
    }),

  /**
   * Get queue statistics
   */
  getQueueStats: adminProcedure.query(async ({ ctx }) => {
    const [pending, processing, sent, failed, cancelled] = await Promise.all([
      ctx.prisma.queuedStageEmail.count({ where: { status: 'PENDING' } }),
      ctx.prisma.queuedStageEmail.count({ where: { status: 'PROCESSING' } }),
      ctx.prisma.queuedStageEmail.count({ where: { status: 'SENT' } }),
      ctx.prisma.queuedStageEmail.count({ where: { status: 'FAILED' } }),
      ctx.prisma.queuedStageEmail.count({ where: { status: 'CANCELLED' } }),
    ])

    return { pending, processing, sent, failed, cancelled }
  }),

  /**
   * Cancel a pending queued email
   */
  cancelQueuedEmail: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.queuedStageEmail.update({
        where: { id: input.id },
        data: {
          status: 'CANCELLED',
          processedAt: new Date(),
        },
      })
    }),

  /**
   * Retry a failed queued email
   */
  retryQueuedEmail: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.queuedStageEmail.update({
        where: { id: input.id },
        data: {
          status: 'PENDING',
          error: null,
          processedAt: null,
          scheduledFor: new Date(), // Retry immediately
        },
      })
    }),
})
