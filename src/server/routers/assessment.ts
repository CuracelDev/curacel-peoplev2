import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'
import { randomUUID } from 'crypto'

const assessmentTypeEnum = z.enum([
  'CODING_TEST',
  'KANDI_IO',
  'PERSONALITY_MBTI',
  'PERSONALITY_BIG5',
  'WORK_TRIAL',
  'CUSTOM',
])

const assessmentStatusEnum = z.enum([
  'NOT_STARTED',
  'INVITED',
  'IN_PROGRESS',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
])

const recommendationEnum = z.enum([
  'HIRE',
  'HOLD',
  'NO_HIRE',
])

// Type display names
const typeDisplayNames: Record<string, string> = {
  'CODING_TEST': 'Coding Test',
  'KANDI_IO': 'Kandi.io',
  'PERSONALITY_MBTI': 'Personality (MBTI)',
  'PERSONALITY_BIG5': 'Personality (Big5)',
  'WORK_TRIAL': 'Work Trial',
  'CUSTOM': 'Custom',
}

// Helper to replace template variables
function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    result = result.replace(new RegExp(`{${key}}`, 'g'), value)
  }
  return result
}

// Generate default email body for assessment invite
function generateDefaultEmailBody(
  candidateName: string,
  assessmentName: string,
  jobTitle: string,
  assessmentUrl: string,
  expiresAt: Date | null,
  durationMinutes: number | null,
  instructions: string | null
): string {
  const expiryText = expiresAt
    ? `Please complete this assessment by ${expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`
    : 'Please complete this assessment at your earliest convenience.'

  const durationText = durationMinutes
    ? `This assessment will take approximately ${durationMinutes} minutes.`
    : ''

  const instructionsSection = instructions
    ? `<div style="background-color: #fff8e6; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
         <h3 style="margin: 0 0 12px 0; color: #92400e;">Important Instructions</h3>
         <p style="margin: 0; color: #78350f; white-space: pre-wrap;">${instructions}</p>
       </div>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Assessment Invitation</h1>
  </div>

  <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-bottom: 24px;">Hi ${candidateName},</p>

    <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at Curacel. As part of our evaluation process, we'd like you to complete the following assessment:</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">${assessmentName}</h2>
      ${durationText ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${durationText}</p>` : ''}
    </div>

    ${instructionsSection}

    <p>${expiryText}</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${assessmentUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Assessment</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #0066cc; font-size: 14px; word-break: break-all;">${assessmentUrl}</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

    <p style="color: #6b7280; font-size: 14px; margin: 0;">If you have any questions, please don't hesitate to reach out to us.</p>

    <p style="margin-top: 24px;">
      Best regards,<br>
      <strong>The Curacel Recruiting Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} Curacel. All rights reserved.</p>
    <p style="margin: 8px 0 0 0;">This email was sent to you as part of your job application.</p>
  </div>
</body>
</html>
`
}

export const assessmentRouter = router({
  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================

  // List all assessment templates
  listTemplates: protectedProcedure
    .input(
      z.object({
        type: assessmentTypeEnum.optional(),
        teamId: z.string().optional(),
        isActive: z.boolean().optional().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        isActive: input?.isActive ?? true,
      }

      if (input?.type) {
        where.type = input.type
      }

      if (input?.teamId) {
        where.OR = [
          { teamId: input.teamId },
          { teamId: null }, // Include global templates
        ]
      }

      const templates = await ctx.prisma.assessmentTemplate.findMany({
        where,
        include: {
          workTrialTemplate: true,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      })

      return templates.map((template) => ({
        ...template,
        typeDisplayName: typeDisplayNames[template.type] || template.type,
      }))
    }),

  // Get a single template
  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.prisma.assessmentTemplate.findUnique({
        where: { id: input.id },
        include: {
          workTrialTemplate: true,
        },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment template not found',
        })
      }

      return {
        ...template,
        typeDisplayName: typeDisplayNames[template.type] || template.type,
      }
    }),

  // Create a new assessment template
  createTemplate: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        description: z.string().max(2000).optional(),
        type: assessmentTypeEnum,
        organizationId: z.string().optional(), // Will be set from context if not provided
        teamId: z.string().optional(),
        durationMinutes: z.number().optional(),
        passingScore: z.number().min(0).max(100).optional(),
        instructions: z.string().optional(),
        externalUrl: z.string().url().optional(),
        externalPlatform: z.string().optional(),
        emailSubject: z.string().optional(),
        emailBody: z.string().optional(),
        webhookUrl: z.string().url().optional(),
        webhookSecret: z.string().optional(),
        scoringRubric: z.any().optional(),
        sortOrder: z.number().optional(),
        // Work trial specific
        workTrial: z.object({
          tasks: z.array(z.object({
            name: z.string(),
            description: z.string().optional(),
            deliverables: z.string().optional(),
          })),
          durationDays: z.number().default(5),
          defaultBuddyId: z.string().optional(),
          checkInSchedule: z.any().optional(),
          dashboardTemplateUrl: z.string().optional(),
          dashboardMetrics: z.any().optional(),
          evaluationCriteria: z.any().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workTrial, ...templateData } = input

      // Get organization ID (would normally come from session/context)
      const orgId = templateData.organizationId || 'default-org'

      const template = await ctx.prisma.assessmentTemplate.create({
        data: {
          name: templateData.name.trim(),
          description: templateData.description?.trim(),
          type: templateData.type,
          organizationId: orgId,
          teamId: templateData.teamId,
          durationMinutes: templateData.durationMinutes,
          passingScore: templateData.passingScore,
          instructions: templateData.instructions,
          externalUrl: templateData.externalUrl,
          externalPlatform: templateData.externalPlatform,
          emailSubject: templateData.emailSubject,
          emailBody: templateData.emailBody,
          webhookUrl: templateData.webhookUrl,
          webhookSecret: templateData.webhookSecret,
          scoringRubric: templateData.scoringRubric,
          sortOrder: templateData.sortOrder || 0,
          ...(workTrial && templateData.type === 'WORK_TRIAL'
            ? {
                workTrialTemplate: {
                  create: {
                    tasks: workTrial.tasks,
                    durationDays: workTrial.durationDays,
                    defaultBuddyId: workTrial.defaultBuddyId,
                    checkInSchedule: workTrial.checkInSchedule,
                    dashboardTemplateUrl: workTrial.dashboardTemplateUrl,
                    dashboardMetrics: workTrial.dashboardMetrics,
                    evaluationCriteria: workTrial.evaluationCriteria,
                  },
                },
              }
            : {}),
        },
        include: {
          workTrialTemplate: true,
        },
      })

      return {
        ...template,
        typeDisplayName: typeDisplayNames[template.type] || template.type,
      }
    }),

  // Update an assessment template
  updateTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(200).optional(),
        description: z.string().max(2000).optional().nullable(),
        teamId: z.string().optional().nullable(),
        durationMinutes: z.number().optional().nullable(),
        passingScore: z.number().min(0).max(100).optional().nullable(),
        instructions: z.string().optional().nullable(),
        externalUrl: z.string().url().optional().nullable(),
        externalPlatform: z.string().optional().nullable(),
        emailSubject: z.string().optional().nullable(),
        emailBody: z.string().optional().nullable(),
        webhookUrl: z.string().url().optional().nullable(),
        webhookSecret: z.string().optional().nullable(),
        scoringRubric: z.any().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        // Work trial specific
        workTrial: z.object({
          tasks: z.array(z.object({
            name: z.string(),
            description: z.string().optional(),
            deliverables: z.string().optional(),
          })).optional(),
          durationDays: z.number().optional(),
          defaultBuddyId: z.string().optional().nullable(),
          checkInSchedule: z.any().optional(),
          dashboardTemplateUrl: z.string().optional().nullable(),
          dashboardMetrics: z.any().optional(),
          evaluationCriteria: z.any().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, workTrial, ...data } = input

      const existing = await ctx.prisma.assessmentTemplate.findUnique({
        where: { id },
        include: { workTrialTemplate: true },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment template not found',
        })
      }

      // Update work trial template if exists and data provided
      if (workTrial && existing.type === 'WORK_TRIAL') {
        if (existing.workTrialTemplate) {
          await ctx.prisma.workTrialTemplate.update({
            where: { id: existing.workTrialTemplate.id },
            data: {
              ...(workTrial.tasks && { tasks: workTrial.tasks }),
              ...(workTrial.durationDays !== undefined && { durationDays: workTrial.durationDays }),
              ...(workTrial.defaultBuddyId !== undefined && { defaultBuddyId: workTrial.defaultBuddyId }),
              ...(workTrial.checkInSchedule !== undefined && { checkInSchedule: workTrial.checkInSchedule }),
              ...(workTrial.dashboardTemplateUrl !== undefined && { dashboardTemplateUrl: workTrial.dashboardTemplateUrl }),
              ...(workTrial.dashboardMetrics !== undefined && { dashboardMetrics: workTrial.dashboardMetrics }),
              ...(workTrial.evaluationCriteria !== undefined && { evaluationCriteria: workTrial.evaluationCriteria }),
            },
          })
        } else {
          // Create work trial template if it doesn't exist
          await ctx.prisma.workTrialTemplate.create({
            data: {
              assessmentTemplateId: id,
              tasks: workTrial.tasks || [],
              durationDays: workTrial.durationDays || 5,
              defaultBuddyId: workTrial.defaultBuddyId,
              checkInSchedule: workTrial.checkInSchedule,
              dashboardTemplateUrl: workTrial.dashboardTemplateUrl,
              dashboardMetrics: workTrial.dashboardMetrics,
              evaluationCriteria: workTrial.evaluationCriteria,
            },
          })
        }
      }

      const template = await ctx.prisma.assessmentTemplate.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.teamId !== undefined && { teamId: data.teamId }),
          ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
          ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
          ...(data.instructions !== undefined && { instructions: data.instructions }),
          ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl }),
          ...(data.externalPlatform !== undefined && { externalPlatform: data.externalPlatform }),
          ...(data.emailSubject !== undefined && { emailSubject: data.emailSubject }),
          ...(data.emailBody !== undefined && { emailBody: data.emailBody }),
          ...(data.webhookUrl !== undefined && { webhookUrl: data.webhookUrl }),
          ...(data.webhookSecret !== undefined && { webhookSecret: data.webhookSecret }),
          ...(data.scoringRubric !== undefined && { scoringRubric: data.scoringRubric }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        include: {
          workTrialTemplate: true,
        },
      })

      return {
        ...template,
        typeDisplayName: typeDisplayNames[template.type] || template.type,
      }
    }),

  // Delete (soft delete) a template
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.assessmentTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // ============================================
  // CANDIDATE ASSESSMENTS
  // ============================================

  // List all candidate assessments
  list: protectedProcedure
    .input(
      z.object({
        type: assessmentTypeEnum.optional(),
        status: assessmentStatusEnum.optional(),
        search: z.string().optional(),
        jobId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}

      if (input?.type) {
        where.template = { type: input.type }
      }

      if (input?.status) {
        where.status = input.status
      }

      if (input?.search) {
        where.candidate = {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { email: { contains: input.search, mode: 'insensitive' } },
          ],
        }
      }

      if (input?.jobId) {
        where.candidate = {
          ...((where.candidate as Record<string, unknown>) || {}),
          jobId: input.jobId,
        }
      }

      const assessments = await ctx.prisma.candidateAssessment.findMany({
        where,
        include: {
          candidate: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                },
              },
            },
          },
          template: true,
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
      })

      return assessments.map((assessment) => ({
        ...assessment,
        typeDisplayName: typeDisplayNames[assessment.template.type] || assessment.template.type,
      }))
    }),

  // Get assessment counts by type and status
  getCounts: protectedProcedure.query(async ({ ctx }) => {
    const types = ['CODING_TEST', 'KANDI_IO', 'PERSONALITY_MBTI', 'PERSONALITY_BIG5', 'WORK_TRIAL', 'CUSTOM']
    const statuses = ['NOT_STARTED', 'INVITED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED']

    const counts: Record<string, number> = {
      all: 0,
    }

    // Count all assessments
    counts.all = await ctx.prisma.candidateAssessment.count()

    // Count by type
    for (const type of types) {
      counts[type] = await ctx.prisma.candidateAssessment.count({
        where: { template: { type: type as any } },
      })
    }

    // Count pending (not started + invited + in progress)
    counts.pending = await ctx.prisma.candidateAssessment.count({
      where: {
        status: { in: ['NOT_STARTED', 'INVITED', 'IN_PROGRESS'] },
      },
    })

    // Count by status
    for (const status of statuses) {
      counts[`status_${status}`] = await ctx.prisma.candidateAssessment.count({
        where: { status: status as any },
      })
    }

    return counts
  }),

  // Get a single assessment
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.candidateAssessment.findUnique({
        where: { id: input.id },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          template: {
            include: {
              workTrialTemplate: true,
            },
          },
        },
      })

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        })
      }

      return {
        ...assessment,
        typeDisplayName: typeDisplayNames[assessment.template.type] || assessment.template.type,
      }
    }),

  // Create an assessment for a candidate
  create: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        templateId: z.string(),
        expiresInDays: z.number().optional().default(7),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check candidate exists
      const candidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id: input.candidateId },
      })

      if (!candidate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidate not found',
        })
      }

      // Check template exists
      const template = await ctx.prisma.assessmentTemplate.findUnique({
        where: { id: input.templateId },
      })

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment template not found',
        })
      }

      // Check if assessment already exists for this candidate/template
      const existing = await ctx.prisma.candidateAssessment.findUnique({
        where: {
          candidateId_templateId: {
            candidateId: input.candidateId,
            templateId: input.templateId,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Assessment already exists for this candidate and template',
        })
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

      const assessment = await ctx.prisma.candidateAssessment.create({
        data: {
          candidateId: input.candidateId,
          templateId: input.templateId,
          status: 'NOT_STARTED',
          expiresAt,
          inviteToken: randomUUID(),
          notes: input.notes,
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          template: true,
        },
      })

      return {
        ...assessment,
        typeDisplayName: typeDisplayNames[assessment.template.type] || assessment.template.type,
      }
    }),

  // Send assessment invite (mark as invited and send email)
  sendInvite: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        sendEmail: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current assessment
      const existingAssessment = await ctx.prisma.candidateAssessment.findUnique({
        where: { id: input.id },
        include: {
          candidate: {
            include: { job: true },
          },
          template: true,
        },
      })

      if (!existingAssessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        })
      }

      // Generate new token
      const inviteToken = randomUUID()
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const assessmentUrl = existingAssessment.template.externalUrl
        || `${baseUrl}/assessment/${inviteToken}`

      const assessment = await ctx.prisma.candidateAssessment.update({
        where: { id: input.id },
        data: {
          status: 'INVITED',
          inviteSentAt: new Date(),
          inviteToken,
          externalUrl: assessmentUrl,
        },
        include: {
          candidate: {
            include: { job: true },
          },
          template: true,
        },
      })

      // Send email if requested
      if (input.sendEmail) {
        try {
          const { sendCandidateEmail } = await import('@/lib/email-service')

          // Use template email or default
          const subject = assessment.template.emailSubject
            || `Assessment Invitation: ${assessment.template.name}`

          const emailBody = assessment.template.emailBody
            ? replaceVariables(assessment.template.emailBody, {
                candidateName: assessment.candidate.name,
                assessmentName: assessment.template.name,
                jobTitle: assessment.candidate.job?.title || 'the position',
                assessmentUrl,
                expiresAt: assessment.expiresAt?.toLocaleDateString() || 'in 7 days',
                durationMinutes: assessment.template.durationMinutes?.toString() || 'untimed',
              })
            : generateDefaultEmailBody(
                assessment.candidate.name,
                assessment.template.name,
                assessment.candidate.job?.title || 'the position',
                assessmentUrl,
                assessment.expiresAt,
                assessment.template.durationMinutes,
                assessment.template.instructions
              )

          // Get the recruiter's email from session
          const recruiterEmail = ctx.session?.user?.email || 'recruiting@curacel.co'
          const recruiterName = ctx.session?.user?.name || 'Curacel Recruiting'

          await sendCandidateEmail({
            candidateId: assessment.candidateId,
            recruiterId: ctx.session?.user?.id || 'system',
            recruiterEmail,
            recruiterName,
            subject,
            htmlBody: emailBody,
          })
        } catch (emailError) {
          console.error('Failed to send assessment invite email:', emailError)
          // Don't fail the mutation if email fails, just log it
        }
      }

      return {
        ...assessment,
        typeDisplayName: typeDisplayNames[assessment.template.type] || assessment.template.type,
        assessmentUrl,
      }
    }),

  // Get shareable link for an assessment
  copyLink: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.candidateAssessment.findUnique({
        where: { id: input.id },
        include: {
          template: true,
        },
      })

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        })
      }

      // If external URL exists on template, return that
      if (assessment.template.externalUrl) {
        return {
          url: assessment.template.externalUrl,
          isExternal: true,
        }
      }

      // Otherwise, return internal assessment link
      // TODO: Generate actual assessment page URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      return {
        url: `${baseUrl}/assessment/${assessment.inviteToken}`,
        isExternal: false,
      }
    }),

  // ============================================
  // RESULT RECORDING
  // ============================================

  // Record assessment result manually
  recordResult: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        overallScore: z.number().min(0).max(100).optional(),
        scores: z.any().optional(), // { correctness: 7, codeQuality: 7, alignment: 7 }
        percentile: z.number().min(0).max(100).optional(),
        recommendation: recommendationEnum.optional(),
        summary: z.string().optional(),
        strengths: z.array(z.string()).optional(),
        risks: z.array(z.string()).optional(),
        questionsForCandidate: z.array(z.string()).optional(),
        resultUrl: z.string().url().optional(),
        resultData: z.any().optional(),
        notes: z.string().optional(),
        status: assessmentStatusEnum.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const assessment = await ctx.prisma.candidateAssessment.update({
        where: { id },
        data: {
          ...(data.overallScore !== undefined && { overallScore: data.overallScore }),
          ...(data.scores !== undefined && { scores: data.scores }),
          ...(data.percentile !== undefined && { percentile: data.percentile }),
          ...(data.recommendation !== undefined && { recommendation: data.recommendation }),
          ...(data.summary !== undefined && { summary: data.summary }),
          ...(data.strengths !== undefined && { strengths: data.strengths }),
          ...(data.risks !== undefined && { risks: data.risks }),
          ...(data.questionsForCandidate !== undefined && { questionsForCandidate: data.questionsForCandidate }),
          ...(data.resultUrl !== undefined && { resultUrl: data.resultUrl }),
          ...(data.resultData !== undefined && { resultData: data.resultData }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
          evaluatedBy: ctx.session?.user?.id,
          evaluatedAt: new Date(),
        },
        include: {
          candidate: {
            include: {
              job: true,
            },
          },
          template: true,
        },
      })

      return {
        ...assessment,
        typeDisplayName: typeDisplayNames[assessment.template.type] || assessment.template.type,
      }
    }),

  // Upload file result (PDF/image)
  uploadFile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        fileUrl: z.string().url(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.candidateAssessment.update({
        where: { id: input.id },
        data: {
          fileUrl: input.fileUrl,
          fileName: input.fileName,
        },
        include: {
          candidate: true,
          template: true,
        },
      })

      return {
        ...assessment,
        typeDisplayName: typeDisplayNames[assessment.template.type] || assessment.template.type,
      }
    }),

  // Extract data from uploaded file using AI
  extractFromFile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.candidateAssessment.findUnique({
        where: { id: input.id },
        include: {
          template: true,
        },
      })

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        })
      }

      if (!assessment.fileUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No file uploaded for this assessment',
        })
      }

      // TODO: Call OpenAI to extract data from file
      // For now, just mark as extracted with placeholder
      const updatedAssessment = await ctx.prisma.candidateAssessment.update({
        where: { id: input.id },
        data: {
          extractedData: {
            status: 'pending_extraction',
            fileUrl: assessment.fileUrl,
            fileName: assessment.fileName,
            extractedAt: new Date().toISOString(),
          },
        },
        include: {
          candidate: true,
          template: true,
        },
      })

      return {
        ...updatedAssessment,
        typeDisplayName: typeDisplayNames[updatedAssessment.template.type] || updatedAssessment.template.type,
      }
    }),

  // ============================================
  // WORK TRIAL SPECIFIC
  // ============================================

  // Create dashboard for work trial (clone Google Sheet template)
  createDashboard: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.candidateAssessment.findUnique({
        where: { id: input.id },
        include: {
          template: {
            include: {
              workTrialTemplate: true,
            },
          },
          candidate: true,
        },
      })

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        })
      }

      if (assessment.template.type !== 'WORK_TRIAL') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Dashboard can only be created for work trials',
        })
      }

      // TODO: Use Google Sheets API to clone template
      // For now, just store a placeholder URL
      const dashboardUrl = `https://docs.google.com/spreadsheets/d/placeholder-${input.id}`

      const updatedAssessment = await ctx.prisma.candidateAssessment.update({
        where: { id: input.id },
        data: {
          dashboardUrl,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
        include: {
          candidate: true,
          template: true,
        },
      })

      return {
        ...updatedAssessment,
        typeDisplayName: typeDisplayNames[updatedAssessment.template.type] || updatedAssessment.template.type,
      }
    }),

  // Sync dashboard data from Google Sheet
  syncDashboard: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.candidateAssessment.findUnique({
        where: { id: input.id },
      })

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        })
      }

      if (!assessment.dashboardUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No dashboard URL set for this assessment',
        })
      }

      // TODO: Use Google Sheets API to read dashboard data
      // For now, just update lastSyncedAt
      const updatedAssessment = await ctx.prisma.candidateAssessment.update({
        where: { id: input.id },
        data: {
          lastSyncedAt: new Date(),
          dashboardData: {
            syncedAt: new Date().toISOString(),
            // Placeholder data
            tasks: [],
            metrics: {},
          },
        },
        include: {
          candidate: true,
          template: true,
        },
      })

      return {
        ...updatedAssessment,
        typeDisplayName: typeDisplayNames[updatedAssessment.template.type] || updatedAssessment.template.type,
      }
    }),

  // Add daily update for work trial
  addDailyUpdate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        update: z.object({
          date: z.string(),
          notes: z.string(),
          blockers: z.string().optional(),
          completedTasks: z.array(z.string()).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.prisma.candidateAssessment.findUnique({
        where: { id: input.id },
      })

      if (!assessment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assessment not found',
        })
      }

      const dailyUpdates = (assessment.dailyUpdates as any[]) || []
      dailyUpdates.push({
        ...input.update,
        addedAt: new Date().toISOString(),
      })

      const updatedAssessment = await ctx.prisma.candidateAssessment.update({
        where: { id: input.id },
        data: {
          dailyUpdates,
        },
        include: {
          candidate: true,
          template: true,
        },
      })

      return {
        ...updatedAssessment,
        typeDisplayName: typeDisplayNames[updatedAssessment.template.type] || updatedAssessment.template.type,
      }
    }),

  // Update work trial progress
  updateProgress: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        completionPercent: z.number().min(0).max(100).optional(),
        qualityScore: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const updatedAssessment = await ctx.prisma.candidateAssessment.update({
        where: { id },
        data: {
          ...(data.completionPercent !== undefined && { completionPercent: data.completionPercent }),
          ...(data.qualityScore !== undefined && { qualityScore: data.qualityScore }),
        },
        include: {
          candidate: true,
          template: true,
        },
      })

      return {
        ...updatedAssessment,
        typeDisplayName: typeDisplayNames[updatedAssessment.template.type] || updatedAssessment.template.type,
      }
    }),

  // ============================================
  // JOB-BASED ASSESSMENTS
  // ============================================

  // Get assessments configured for a job
  getJobAssessments: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const jobAssessments = await ctx.prisma.jobAssessmentTemplate.findMany({
        where: { jobId: input.jobId },
        include: {
          template: true,
        },
        orderBy: { sortOrder: 'asc' },
      })

      return jobAssessments.map(ja => ({
        ...ja,
        typeDisplayName: typeDisplayNames[ja.template.type] || ja.template.type,
      }))
    }),

  // Add assessment to job
  addJobAssessment: adminProcedure
    .input(
      z.object({
        jobId: z.string(),
        templateId: z.string(),
        triggerStage: z.string().optional(),
        isRequired: z.boolean().optional().default(false),
        sortOrder: z.number().optional().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const jobAssessment = await ctx.prisma.jobAssessmentTemplate.create({
        data: {
          jobId: input.jobId,
          templateId: input.templateId,
          triggerStage: input.triggerStage,
          isRequired: input.isRequired,
          sortOrder: input.sortOrder,
        },
        include: {
          template: true,
        },
      })

      return {
        ...jobAssessment,
        typeDisplayName: typeDisplayNames[jobAssessment.template.type] || jobAssessment.template.type,
      }
    }),

  // Remove assessment from job
  removeJobAssessment: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.jobAssessmentTemplate.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  // Reorder job assessments
  reorderJobAssessments: adminProcedure
    .input(
      z.object({
        jobId: z.string(),
        templateIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates = input.templateIds.map((templateId, index) =>
        ctx.prisma.jobAssessmentTemplate.updateMany({
          where: { jobId: input.jobId, templateId },
          data: { sortOrder: index },
        })
      )

      await Promise.all(updates)
      return { success: true }
    }),

  // ============================================
  // AI-POWERED FEATURES
  // ============================================

  // Generate assessment questions using AI
  generateQuestions: protectedProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        templateId: z.string().optional(),
        type: z.enum(['technical', 'behavioral', 'cognitive', 'role_specific']),
        count: z.number().optional().default(10),
        difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional().default('mixed'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { generateAssessmentQuestions } = await import('@/lib/ai/recruiting/assessment-analysis')
      const questions = await generateAssessmentQuestions(input)
      return questions
    }),

  // Save generated questions to template
  saveGeneratedQuestions: adminProcedure
    .input(
      z.object({
        templateId: z.string(),
        questions: z.array(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.prisma.assessmentTemplate.update({
        where: { id: input.templateId },
        data: {
          questions: input.questions,
          aiGenerated: true,
        },
      })
      return template
    }),

  // Grade assessment responses using AI
  gradeResponses: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        responses: z.array(
          z.object({
            questionId: z.string(),
            response: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { gradeAssessmentResponses } = await import('@/lib/ai/recruiting/assessment-analysis')

      // Save responses first
      await ctx.prisma.candidateAssessment.update({
        where: { id: input.assessmentId },
        data: {
          responses: input.responses,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      })

      // Grade responses
      const gradedResponses = await gradeAssessmentResponses(input)

      // Calculate overall score
      const totalScore = gradedResponses.reduce((sum, r) => sum + r.score, 0)
      const maxPossible = gradedResponses.reduce((sum, r) => sum + r.maxScore, 0)
      const overallScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0

      // Update assessment with grades
      const assessment = await ctx.prisma.candidateAssessment.update({
        where: { id: input.assessmentId },
        data: {
          overallScore,
          scores: gradedResponses,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        include: {
          candidate: true,
          template: true,
        },
      })

      return {
        assessment,
        gradedResponses,
      }
    }),

  // Analyze assessment results and generate recommendations
  analyzeResults: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { analyzeAssessmentResults } = await import('@/lib/ai/recruiting/assessment-analysis')
      const analysis = await analyzeAssessmentResults(input.assessmentId)
      return analysis
    }),

  // Get AI recommendations for assessments to send
  getRecommendedAssessments: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        jobId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getRecommendedAssessments } = await import('@/lib/ai/recruiting/assessment-analysis')
      const recommendations = await getRecommendedAssessments(input)
      return recommendations
    }),

  // Predict job performance based on assessments
  predictPerformance: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { predictJobPerformance } = await import('@/lib/ai/recruiting/assessment-analysis')
      const insights = await predictJobPerformance(input.candidateId)
      return insights
    }),

  // Analyze team fit
  analyzeTeamFit: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        teamId: z.string().optional(),
        departmentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { analyzeTeamFit } = await import('@/lib/ai/recruiting/assessment-analysis')
      const analysis = await analyzeTeamFit(input)
      return analysis
    }),
})
