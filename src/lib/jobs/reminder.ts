/**
 * Reminder Job
 *
 * Processes pending email reminders and sends follow-ups when
 * candidates haven't responded within the configured time.
 *
 * Runs every 15 minutes via pg-boss schedule.
 */

import PgBoss from 'pg-boss'
import { prisma } from '@/lib/prisma'
import { sendCandidateEmail, applyTemplateVariables } from '@/lib/email-service'

export const REMINDER_JOB_NAME = 'reminder-processor'

/**
 * Process pending reminders
 */
export async function reminderHandler(job: PgBoss.Job): Promise<void> {
  console.log('[Reminder] Processing reminders...', job.id)

  // Find pending reminders that are due
  const pendingReminders = await prisma.emailReminder.findMany({
    where: {
      sentAt: null,
      isCancelled: false,
      scheduledFor: { lte: new Date() },
      reminderType: 'candidate_no_response',
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

  console.log(`[Reminder] Found ${pendingReminders.length} pending reminders`)

  let processed = 0
  let failed = 0

  for (const reminder of pendingReminders) {
    try {
      // Skip if thread or candidate not found
      if (!reminder.email?.thread?.candidate) {
        console.log('[Reminder] Missing thread or candidate, skipping:', reminder.id)
        continue
      }

      const thread = reminder.email.thread
      const candidate = thread.candidate

      // Check if candidate has replied since original email
      const hasReplied = await prisma.candidateEmail.findFirst({
        where: {
          threadId: reminder.email.threadId,
          direction: 'INBOUND',
          sentAt: { gt: reminder.email.sentAt || undefined },
        },
      })

      if (hasReplied) {
        await prisma.emailReminder.update({
          where: { id: reminder.id },
          data: { isCancelled: true },
        })
        console.log('[Reminder] Candidate replied, cancelling reminder:', reminder.id)
        continue
      }

      // Get reminder template
      const template = await prisma.emailTemplate.findFirst({
        where: {
          category: 'reminder',
          isActive: true,
          isDefault: true,
        },
      })

      if (!template) {
        console.log('[Reminder] No reminder template found, skipping')
        continue
      }

      // Apply variables
      const content = await applyTemplateVariables(template, candidate, {
        name: reminder.email.fromName || 'Recruiting Team',
        email: reminder.email.fromEmail,
      })

      // Send reminder email
      const result = await sendCandidateEmail({
        candidateId: candidate.id,
        recruiterId: thread.recruiterId || '',
        recruiterEmail: reminder.email.fromEmail,
        recruiterName: reminder.email.fromName || undefined,
        subject: `Re: ${reminder.email.subject}`,
        htmlBody: content.htmlBody,
        textBody: content.textBody,
        templateId: template.id,
        replyToEmailId: reminder.email.id,
      })

      if (result.success) {
        // Mark reminder as sent
        await prisma.emailReminder.update({
          where: { id: reminder.id },
          data: { sentAt: new Date() },
        })
        processed++
        console.log(`[Reminder] Sent reminder for email: ${reminder.emailId}`)
      } else {
        failed++
        console.error(`[Reminder] Failed to send reminder: ${result.error}`)
      }
    } catch (error) {
      failed++
      console.error(`[Reminder] Failed to process reminder ${reminder.id}:`, error)
    }
  }

  console.log(`[Reminder] Completed: ${processed} sent, ${failed} failed`)
}

/**
 * Initialize the reminder job handler
 */
export function initReminderJob(boss: PgBoss): void {
  boss.work(REMINDER_JOB_NAME, reminderHandler)
  console.log(`[Reminder] Job handler registered: ${REMINDER_JOB_NAME}`)
}

/**
 * Manually trigger reminder processing
 */
export async function triggerReminderProcessor(boss: PgBoss): Promise<string | null> {
  return boss.send(REMINDER_JOB_NAME, {})
}

/**
 * Get stats for pending reminders
 */
export async function getReminderStats() {
  const [pending, sent, cancelled] = await Promise.all([
    prisma.emailReminder.count({
      where: { sentAt: null, isCancelled: false },
    }),
    prisma.emailReminder.count({
      where: { sentAt: { not: null } },
    }),
    prisma.emailReminder.count({
      where: { isCancelled: true },
    }),
  ])

  return { pending, sent, cancelled }
}
