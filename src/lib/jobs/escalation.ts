/**
 * Escalation Job
 *
 * Notifies recruiters when candidates haven't responded within
 * the escalation period after reminders have been sent.
 *
 * Runs every hour via pg-boss schedule.
 */

import PgBoss from 'pg-boss'
import { prisma } from '@/lib/prisma'

export const ESCALATION_JOB_NAME = 'escalation-processor'

/**
 * Process pending escalations
 */
export async function escalationHandler(job: PgBoss.Job): Promise<void> {
  console.log('[Escalation] Processing escalations...', job.id)

  // Get escalation settings
  const reminderSettings = await prisma.reminderSettings.findFirst()
  const escalationHours = reminderSettings?.daysBeforeEscalation
    ? reminderSettings.daysBeforeEscalation * 24
    : 168 // 7 days default

  const escalationThreshold = new Date(Date.now() - escalationHours * 60 * 60 * 1000)

  // Find reminders that were sent but haven't been escalated yet
  const pendingEscalations = await prisma.emailReminder.findMany({
    where: {
      sentAt: { not: null }, // Reminder was sent
      escalatedAt: null, // Not yet escalated
      isCancelled: false,
      escalateAfterHours: { not: null },
      scheduledFor: { lte: escalationThreshold },
    },
    include: {
      email: {
        include: {
          thread: {
            include: {
              candidate: {
                include: { job: true },
              },
            },
          },
        },
      },
    },
    take: 50, // Process in batches
  })

  console.log(`[Escalation] Found ${pendingEscalations.length} pending escalations`)

  let escalated = 0
  let skipped = 0

  for (const reminder of pendingEscalations) {
    try {
      if (!reminder.email?.thread?.candidate) {
        console.log('[Escalation] Missing data, skipping:', reminder.id)
        continue
      }

      const thread = reminder.email.thread
      const candidate = thread.candidate

      // Check if candidate has replied since reminder was sent
      const hasReplied = await prisma.candidateEmail.findFirst({
        where: {
          threadId: reminder.email.threadId,
          direction: 'INBOUND',
          sentAt: { gt: reminder.sentAt || undefined },
        },
      })

      if (hasReplied) {
        await prisma.emailReminder.update({
          where: { id: reminder.id },
          data: { isCancelled: true },
        })
        skipped++
        console.log('[Escalation] Candidate replied, skipping escalation:', reminder.id)
        continue
      }

      const recruiterId = thread.recruiterId

      // Create in-app notification for recruiter
      if (recruiterId) {
        const recruiterUser = await prisma.user.findFirst({
          where: { employeeId: recruiterId },
        })

        if (recruiterUser) {
          await prisma.notification.create({
            data: {
              userId: recruiterUser.id,
              action: 'ASSISTANT_ACTION',
              resourceType: 'candidate',
              resourceId: candidate.id,
              actorName: 'Email Automation',
              actorEmail: 'system@curacel.ai',
            },
          })
          console.log(`[Escalation] Created notification for recruiter: ${recruiterUser.id}`)
        }
      }

      // Mark as escalated
      await prisma.emailReminder.update({
        where: { id: reminder.id },
        data: {
          escalatedAt: new Date(),
          escalatedToId: recruiterId,
        },
      })

      escalated++
      console.log(`[Escalation] Escalated for candidate: ${candidate.name}`)
    } catch (error) {
      console.error(`[Escalation] Failed to process escalation ${reminder.id}:`, error)
    }
  }

  console.log(`[Escalation] Completed: ${escalated} escalated, ${skipped} skipped (replied)`)
}

/**
 * Initialize the escalation job handler
 */
export function initEscalationJob(boss: PgBoss): void {
  boss.work(ESCALATION_JOB_NAME, escalationHandler)
  console.log(`[Escalation] Job handler registered: ${ESCALATION_JOB_NAME}`)
}

/**
 * Manually trigger escalation processing
 */
export async function triggerEscalationProcessor(boss: PgBoss): Promise<string | null> {
  return boss.send(ESCALATION_JOB_NAME, {})
}

/**
 * Get stats for escalations
 */
export async function getEscalationStats() {
  const [pending, escalated] = await Promise.all([
    prisma.emailReminder.count({
      where: {
        sentAt: { not: null },
        escalatedAt: null,
        isCancelled: false,
        escalateAfterHours: { not: null },
      },
    }),
    prisma.emailReminder.count({
      where: { escalatedAt: { not: null } },
    }),
  ])

  return { pending, escalated }
}
