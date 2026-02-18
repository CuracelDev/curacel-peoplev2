import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'
import {
  sendCandidateEmail,
  saveDraft,
  syncInboundEmails,
  getCandidateThreads,
  getThreadMessages,
  markThreadAsRead,
  bulkSendRejection,
  applyTemplateVariables,
  getTemplateForStage,
} from '@/lib/email-service'
import { getEmailAnalytics } from '@/lib/email-tracking'
import { getGmailConnector } from '@/lib/integrations/gmail'

// Schema definitions
const SendEmailSchema = z.object({
  candidateId: z.string(),
  subject: z.string().min(1, 'Subject is required'),
  htmlBody: z.string().min(1, 'Email body is required'),
  textBody: z.string().optional(),
  templateId: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    content: z.string(), // Base64 encoded
  })).optional(),
  replyToEmailId: z.string().optional(),
  scheduledFor: z.date().optional(),
})

const SaveDraftSchema = z.object({
  candidateId: z.string(),
  subject: z.string(),
  htmlBody: z.string(),
  textBody: z.string().optional(),
  templateId: z.string().optional(),
})

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  stage: z.string().optional(),
  jobId: z.string().optional(),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  aiEnhancementEnabled: z.boolean().default(false),
  aiEnhancementPrompt: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
})

const UpdateTemplateSchema = CreateTemplateSchema.partial().extend({
  id: z.string(),
})

const PreviewTemplateSchema = z.object({
  templateId: z.string(),
  candidateId: z.string(),
  customVars: z.record(z.string()).optional(),
})

const BulkRejectionSchema = z.object({
  candidateIds: z.array(z.string()).min(1),
  templateId: z.string().optional(),
})

export const candidateEmailRouter = router({
  // =====================
  // Thread Management
  // =====================

  listThreads: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ input }) => {
      return getCandidateThreads(input.candidateId)
    }),

  getThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await ctx.prisma.candidateEmailThread.findUnique({
        where: { id: input.threadId },
        include: {
          candidate: {
            select: { id: true, name: true, email: true, job: { select: { id: true, title: true } } },
          },
        },
      })

      if (!thread) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Thread not found',
        })
      }

      const messages = await getThreadMessages(input.threadId)

      return { thread, messages }
    }),

  markAsRead: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ input }) => {
      await markThreadAsRead(input.threadId)
      return { success: true }
    }),

  // =====================
  // Email Operations
  // =====================

  sendEmail: protectedProcedure
    .input(SendEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user
      if (!user?.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User email not found',
        })
      }

      const result = await sendCandidateEmail({
        candidateId: input.candidateId,
        recruiterId: user.id,
        recruiterEmail: user.email,
        recruiterName: user.name || undefined,
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        templateId: input.templateId,
        attachments: input.attachments?.map(a => ({
          filename: a.filename,
          mimeType: a.mimeType,
          content: Buffer.from(a.content, 'base64'),
        })),
        replyToEmailId: input.replyToEmailId,
        scheduledFor: input.scheduledFor,
      })

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to send email',
        })
      }

      return result
    }),

  saveDraft: protectedProcedure
    .input(SaveDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user
      if (!user?.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User email not found',
        })
      }

      const result = await saveDraft({
        candidateId: input.candidateId,
        recruiterId: user.id,
        recruiterEmail: user.email,
        recruiterName: user.name || undefined,
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        templateId: input.templateId,
      })

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to save draft',
        })
      }

      return result
    }),

  getEmail: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .query(async ({ ctx, input }) => {
      const email = await ctx.prisma.candidateEmail.findUnique({
        where: { id: input.emailId },
        include: {
          thread: {
            include: {
              candidate: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          template: true,
        },
      })

      if (!email) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email not found',
        })
      }

      // Get analytics
      const analytics = await getEmailAnalytics(input.emailId)

      return { email, analytics }
    }),

  deleteDraft: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const email = await ctx.prisma.candidateEmail.findUnique({
        where: { id: input.emailId },
      })

      if (!email) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email not found',
        })
      }

      if (email.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only drafts can be deleted',
        })
      }

      await ctx.prisma.candidateEmail.delete({
        where: { id: input.emailId },
      })

      return { success: true }
    }),

  // =====================
  // Sync Operations
  // =====================

  syncReplies: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ input }) => {
      const newEmails = await syncInboundEmails(input.threadId)
      return {
        success: true,
        newEmailCount: newEmails.length,
        emails: newEmails,
      }
    }),

  // =====================
  // Bulk Operations
  // =====================

  bulkSendRejection: adminProcedure
    .input(BulkRejectionSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user
      if (!user?.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User email not found',
        })
      }

      const result = await bulkSendRejection(
        input.candidateIds,
        user.id,
        user.email,
        user.name || 'Curacel Recruiting',
        input.templateId
      )

      return result
    }),

  // =====================
  // Template Management
  // =====================

  listTemplates: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      jobId: z.string().optional(),
      stage: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { isActive: true }

      if (input?.category) where.category = input.category
      if (input?.stage) where.stage = input.stage
      if (input?.jobId) {
        // Include both global and job-specific templates
        where.OR = [
          { jobId: null },
          { jobId: input.jobId },
        ]
        delete where.jobId
      }

      return ctx.prisma.emailTemplate.findMany({
        where,
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' },
        ],
        include: {
          job: {
            select: { id: true, title: true },
          },
        },
      })
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.emailTemplate.findUnique({
        where: { id: input.id },
        include: {
          job: {
            select: { id: true, title: true },
          },
        },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      return template
    }),

  getTemplateForStage: protectedProcedure
    .input(z.object({
      stage: z.string(),
      jobId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getTemplateForStage(input.stage, input.jobId)
    }),

  createTemplate: protectedProcedure
    .input(CreateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate slug
      const existing = await ctx.prisma.emailTemplate.findFirst({
        where: {
          slug: input.slug,
          jobId: input.jobId || null,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A template with this slug already exists',
        })
      }

      // If setting as default, unset other defaults in same category/stage
      if (input.isDefault) {
        await ctx.prisma.emailTemplate.updateMany({
          where: {
            category: input.category,
            stage: input.stage,
            jobId: input.jobId || null,
            isDefault: true,
          },
          data: { isDefault: false },
        })
      }

      return ctx.prisma.emailTemplate.create({
        data: {
          ...input,
          textBody: input.textBody || input.htmlBody.replace(/<[^>]*>/g, ''),
        },
      })
    }),

  updateTemplate: adminProcedure
    .input(UpdateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const template = await ctx.prisma.emailTemplate.findUnique({
        where: { id },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      // If setting as default, unset other defaults
      if (data.isDefault) {
        await ctx.prisma.emailTemplate.updateMany({
          where: {
            category: data.category || template.category,
            stage: data.stage || template.stage,
            jobId: template.jobId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }

      return ctx.prisma.emailTemplate.update({
        where: { id },
        data,
      })
    }),

  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.emailTemplate.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  duplicateTemplate: adminProcedure
    .input(z.object({
      id: z.string(),
      newName: z.string().optional(),
      jobId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.emailTemplate.findUnique({
        where: { id: input.id },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      const newSlug = `${template.slug}-copy-${Date.now()}`

      return ctx.prisma.emailTemplate.create({
        data: {
          name: input.newName || `${template.name} (Copy)`,
          slug: newSlug,
          description: template.description,
          category: template.category,
          stage: template.stage,
          jobId: input.jobId !== undefined ? input.jobId : template.jobId,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          aiEnhancementEnabled: template.aiEnhancementEnabled,
          aiEnhancementPrompt: template.aiEnhancementPrompt,
          isActive: true,
          isDefault: false,
        },
      })
    }),

  previewTemplate: protectedProcedure
    .input(PreviewTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.emailTemplate.findUnique({
        where: { id: input.templateId },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        })
      }

      const candidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id: input.candidateId },
        include: { job: true },
      })

      if (!candidate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidate not found',
        })
      }

      const user = ctx.session?.user
      const content = await applyTemplateVariables(
        template,
        candidate,
        { name: user?.name || 'Recruiter', email: user?.email || '' },
        input.customVars
      )

      return content
    }),

  // =====================
  // Reminder Management
  // =====================

  listReminders: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.emailReminder.findMany({
        where: {
          email: {
            thread: {
              candidateId: input.candidateId,
            },
          },
          isCancelled: false,
        },
        include: {
          email: {
            select: { id: true, subject: true, sentAt: true },
          },
        },
        orderBy: { scheduledFor: 'asc' },
      })
    }),

  cancelReminder: protectedProcedure
    .input(z.object({ reminderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.emailReminder.update({
        where: { id: input.reminderId },
        data: { isCancelled: true },
      })
      return { success: true }
    }),

  // =====================
  // Gmail Connection Test
  // =====================

  testGmailConnection: adminProcedure
    .query(async () => {
      const gmail = await getGmailConnector()
      if (!gmail) {
        return { success: false, error: 'Gmail not configured. Please configure Google Workspace integration first.' }
      }

      return gmail.testConnection()
    }),
})
