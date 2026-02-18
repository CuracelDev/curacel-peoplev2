/**
 * Stage Email Job
 *
 * Processes queued stage transition emails with configurable delays.
 * Emails are queued when candidates move between stages and sent
 * after the configured delay (if any).
 */

import PgBoss from 'pg-boss'
import { prisma } from '@/lib/prisma'
import {
  sendCandidateEmail,
  getTemplateForStage,
  applyTemplateVariables,
  createEmailReminder,
} from '@/lib/email-service'

export const STAGE_EMAIL_JOB_NAME = 'stage-email-send'

interface StageEmailJobData {
  queuedEmailId: string
}

interface AutoSendStageConfig {
  enabled: boolean
  delayMinutes: number
  templateId?: string
  reminderEnabled?: boolean
  reminderDelayHours?: number
}

/**
 * Process a queued stage email
 */
export async function stageEmailHandler(job: any): Promise<void> {
  console.log('[StageEmail] Processing job:', job?.id, 'data:', job?.data)

  if (!job?.data?.queuedEmailId) {
    console.error('[StageEmail] Job data or queuedEmailId is missing, skipping job:', job?.id)
    return
  }

  const queuedEmail = await prisma.queuedStageEmail.findUnique({
    where: { id: job.data.queuedEmailId },
    include: {
      candidate: {
        include: { job: true },
      },
    },
  })

  if (!queuedEmail) {
    console.log('[StageEmail] Queued email not found, skipping:', job.data.queuedEmailId)
    return
  }

  if (queuedEmail.status !== 'PENDING') {
    console.log('[StageEmail] Email already processed, status:', queuedEmail.status)
    return
  }

  if (queuedEmail.skipAutoEmail) {
    await prisma.queuedStageEmail.update({
      where: { id: queuedEmail.id },
      data: { status: 'CANCELLED', processedAt: new Date() },
    })
    console.log('[StageEmail] Skipped by user preference')
    return
  }

  // Mark as processing
  await prisma.queuedStageEmail.update({
    where: { id: queuedEmail.id },
    data: { status: 'PROCESSING' },
  })

  try {
    // Get template for stage
    const template = queuedEmail.templateId
      ? await prisma.emailTemplate.findUnique({ where: { id: queuedEmail.templateId } })
      : await getTemplateForStage(queuedEmail.toStage, queuedEmail.candidate.jobId)

    if (!template) {
      console.log('[StageEmail] No template found for stage:', queuedEmail.toStage)
      await prisma.queuedStageEmail.update({
        where: { id: queuedEmail.id },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          error: `No email template found for stage: ${queuedEmail.toStage}`,
        },
      })
      return
    }

    // Apply template variables
    const content = await applyTemplateVariables(template, queuedEmail.candidate, {
      name: queuedEmail.recruiterName || 'Recruiting Team',
      email: queuedEmail.recruiterEmail,
    })

    // Send email
    const result = await sendCandidateEmail({
      candidateId: queuedEmail.candidateId,
      recruiterId: queuedEmail.recruiterId,
      recruiterEmail: queuedEmail.recruiterEmail,
      recruiterName: queuedEmail.recruiterName || undefined,
      subject: content.subject,
      htmlBody: content.htmlBody,
      textBody: content.textBody,
      templateId: template.id,
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email')
    }

    // Update queued email status
    await prisma.queuedStageEmail.update({
      where: { id: queuedEmail.id },
      data: {
        status: 'SENT',
        processedAt: new Date(),
        emailId: result.emailId,
      },
    })

    // Create reminder if enabled in settings
    const emailSettings = await prisma.emailSettings.findFirst()
    const autoSendStages = emailSettings?.autoSendStages as unknown as Record<string, AutoSendStageConfig> | null
    const stageConfig = autoSendStages?.[queuedEmail.toStage]

    if (stageConfig?.reminderEnabled && result.emailId) {
      await createEmailReminder(
        result.emailId,
        'candidate_no_response',
        stageConfig.reminderDelayHours || 72,
        168 // Escalate after 7 days
      )
      console.log('[StageEmail] Created follow-up reminder for email:', result.emailId)
    }

    console.log('[StageEmail] Email sent successfully:', result.emailId)
  } catch (error) {
    console.error('[StageEmail] Failed to send:', error)

    await prisma.queuedStageEmail.update({
      where: { id: queuedEmail.id },
      data: {
        status: 'FAILED',
        processedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    throw error // Re-throw for pg-boss retry
  }
}

/**
 * Initialize the stage email job handler
 */
export function initStageEmailJob(boss: PgBoss): void {
  boss.work(STAGE_EMAIL_JOB_NAME, stageEmailHandler)
  console.log(`[StageEmail] Job handler registered: ${STAGE_EMAIL_JOB_NAME}`)
}

/**
 * Queue a stage email for sending
 *
 * This function is called when a candidate's stage changes.
 * It checks if auto-send is enabled for the new stage and queues
 * the email with the configured delay.
 */
export async function queueStageEmail(
  boss: PgBoss,
  data: {
    candidateId: string
    fromStage: string | null
    toStage: string
    recruiterId: string
    recruiterEmail: string
    recruiterName?: string
    templateId?: string
    skipAutoEmail?: boolean
  }
): Promise<string | null> {
  // If user explicitly skipped, still create record for tracking but mark as skipped
  if (data.skipAutoEmail) {
    await prisma.queuedStageEmail.create({
      data: {
        candidateId: data.candidateId,
        fromStage: data.fromStage,
        toStage: data.toStage,
        recruiterId: data.recruiterId,
        recruiterEmail: data.recruiterEmail,
        recruiterName: data.recruiterName,
        templateId: data.templateId,
        scheduledFor: new Date(),
        skipAutoEmail: true,
        status: 'CANCELLED',
        processedAt: new Date(),
      },
    })
    console.log(`[StageEmail] User skipped auto-email for stage: ${data.toStage}`)
    return null
  }

  // Get email settings for delay and enabled status
  const emailSettings = await prisma.emailSettings.findFirst()

  if (!emailSettings) {
    console.warn('[StageEmail] No organization email settings found. Skipping auto-email.')
    return null
  }

  const autoSendStages = emailSettings.autoSendStages as unknown as Record<string, AutoSendStageConfig> | null
  const stageConfig = autoSendStages?.[data.toStage]

  // Check if auto-send is enabled for this stage
  if (!stageConfig?.enabled) {
    console.log(`[StageEmail] Auto-send disabled for stage: ${data.toStage}. Check email settings.`)
    return null
  }

  const delayMinutes = stageConfig.delayMinutes || 0
  const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000)

  // Create queued email record
  const queuedEmail = await prisma.queuedStageEmail.create({
    data: {
      candidateId: data.candidateId,
      fromStage: data.fromStage,
      toStage: data.toStage,
      recruiterId: data.recruiterId,
      recruiterEmail: data.recruiterEmail,
      recruiterName: data.recruiterName,
      templateId: data.templateId || stageConfig.templateId,
      scheduledFor,
      skipAutoEmail: false,
    },
  })

  console.log(
    `[StageEmail] Queued email for stage ${data.toStage}, scheduled for: ${scheduledFor.toISOString()}`
  )

  // Schedule the job
  const startAfter = delayMinutes > 0 ? scheduledFor : undefined

  const jobId = await boss.send(
    STAGE_EMAIL_JOB_NAME,
    { queuedEmailId: queuedEmail.id },
    {
      startAfter,
      retryLimit: 3,
      retryDelay: 60000, // 1 minute
    }
  )

  return jobId
}

/**
 * Cancel a queued stage email
 */
export async function cancelQueuedEmail(queuedEmailId: string): Promise<void> {
  await prisma.queuedStageEmail.update({
    where: { id: queuedEmailId },
    data: {
      status: 'CANCELLED',
      processedAt: new Date(),
    },
  })
}

/**
 * Get pending queued emails for a candidate
 */
export async function getPendingQueuedEmails(candidateId: string) {
  return prisma.queuedStageEmail.findMany({
    where: {
      candidateId,
      status: 'PENDING',
    },
    orderBy: { scheduledFor: 'desc' },
  })
}
