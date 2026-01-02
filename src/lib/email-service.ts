/**
 * Email Service
 *
 * Business logic for sending and managing candidate emails
 */

import { prisma } from './prisma'
import { getGmailConnector, type SendEmailParams as GmailSendParams } from './integrations/gmail'
import { addEmailTracking } from './email-tracking'
import type { Job, JobCandidate, CandidateEmailThread, CandidateEmail, EmailTemplate, EmailReminder } from '@prisma/client'

export interface SendEmailOptions {
  candidateId: string
  recruiterId: string
  recruiterEmail: string
  recruiterName?: string
  subject: string
  htmlBody: string
  textBody?: string
  templateId?: string
  attachments?: Array<{
    filename: string
    mimeType: string
    content: Buffer | string
  }>
  replyToEmailId?: string
  scheduledFor?: Date
}

export interface SendEmailResult {
  success: boolean
  emailId?: string
  threadId?: string
  error?: string
}

/**
 * Get or create an email thread for a candidate
 */
export async function getOrCreateThread(
  candidateId: string,
  recruiterId: string,
  recruiterEmail: string,
  subject: string
): Promise<CandidateEmailThread> {
  // Check for existing thread with same subject
  const existingThread = await prisma.candidateEmailThread.findFirst({
    where: {
      candidateId,
      subject: {
        contains: cleanSubjectForThreading(subject),
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  if (existingThread) {
    return existingThread
  }

  // Get default CC email from settings or env
  const defaultCc = process.env.GMAIL_DEFAULT_CC || 'peopleops@curacel.ai'

  // Create new thread
  return prisma.candidateEmailThread.create({
    data: {
      candidateId,
      subject: cleanSubjectForThreading(subject),
      recruiterEmail,
      recruiterId,
      ccEmails: [defaultCc],
      lastMessageAt: new Date(),
    },
  })
}

/**
 * Clean subject line for threading (remove Re:, Fwd:, etc.)
 */
function cleanSubjectForThreading(subject: string): string {
  return subject
    .replace(/^(Re|Fwd|Fw):\s*/gi, '')
    .replace(/^(Re|Fwd|Fw)\[\d+\]:\s*/gi, '')
    .trim()
}

/**
 * Send an email to a candidate
 */
export async function sendCandidateEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const gmail = await getGmailConnector()
  if (!gmail) {
    return { success: false, error: 'Gmail not configured. Please configure Google Workspace integration.' }
  }

  try {
    // Get candidate with job info
    const candidate = await prisma.jobCandidate.findUnique({
      where: { id: options.candidateId },
      include: { job: true },
    })

    if (!candidate) {
      return { success: false, error: 'Candidate not found' }
    }

    // Get or create thread
    const thread = await getOrCreateThread(
      options.candidateId,
      options.recruiterId,
      options.recruiterEmail,
      options.subject
    )

    // Get the last email in thread for reply threading
    let inReplyTo: string | undefined
    let references: string | undefined
    let gmailThreadId: string | undefined

    if (options.replyToEmailId) {
      const replyToEmail = await prisma.candidateEmail.findUnique({
        where: { id: options.replyToEmailId },
      })
      if (replyToEmail) {
        inReplyTo = replyToEmail.messageIdHeader || undefined
        references = replyToEmail.references
          ? `${replyToEmail.references} ${replyToEmail.messageIdHeader}`
          : replyToEmail.messageIdHeader || undefined
      }
    } else if (thread.gmailThreadId) {
      // Get last message in thread for proper threading
      const lastMessage = await prisma.candidateEmail.findFirst({
        where: { threadId: thread.id },
        orderBy: { sentAt: 'desc' },
      })
      if (lastMessage) {
        inReplyTo = lastMessage.messageIdHeader || undefined
        references = lastMessage.references
          ? `${lastMessage.references} ${lastMessage.messageIdHeader}`
          : lastMessage.messageIdHeader || undefined
        gmailThreadId = thread.gmailThreadId || undefined
      }
    }

    // Create email record first (for tracking)
    const email = await prisma.candidateEmail.create({
      data: {
        threadId: thread.id,
        direction: 'OUTBOUND',
        fromEmail: options.recruiterEmail,
        fromName: options.recruiterName,
        toEmails: [candidate.email],
        ccEmails: thread.ccEmails,
        subject: options.subject,
        htmlBody: options.htmlBody,
        textBody: options.textBody,
        status: options.scheduledFor ? 'QUEUED' : 'SENT',
        templateId: options.templateId,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: typeof a.content === 'string' ? a.content.length : a.content.length,
        })) || [],
        inReplyTo,
        references,
      },
    })

    // Add tracking to HTML
    const trackedHtml = addEmailTracking(email.id, options.htmlBody)

    // If scheduled for later, don't send now
    if (options.scheduledFor && options.scheduledFor > new Date()) {
      return {
        success: true,
        emailId: email.id,
        threadId: thread.id,
      }
    }

    // Send via Gmail
    const sendParams: GmailSendParams = {
      senderEmail: options.recruiterEmail,
      senderName: options.recruiterName,
      to: [candidate.email],
      cc: thread.ccEmails.length > 0 ? thread.ccEmails : undefined,
      subject: options.subject,
      htmlBody: trackedHtml,
      textBody: options.textBody,
      attachments: options.attachments,
      inReplyTo,
      references,
      threadId: gmailThreadId,
    }

    const result = await gmail.sendEmail(sendParams)

    if (!result.success) {
      // Update email with error
      await prisma.candidateEmail.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
        },
      })
      return { success: false, error: result.error, emailId: email.id }
    }

    // Update email with Gmail IDs
    await prisma.candidateEmail.update({
      where: { id: email.id },
      data: {
        gmailMessageId: result.messageId,
        messageIdHeader: result.messageIdHeader,
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    // Update thread with Gmail thread ID if new
    if (result.threadId && !thread.gmailThreadId) {
      await prisma.candidateEmailThread.update({
        where: { id: thread.id },
        data: {
          gmailThreadId: result.threadId,
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      })
    } else {
      await prisma.candidateEmailThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 1 },
        },
      })
    }

    // Create reminder for candidate response
    await createEmailReminder(email.id, 'candidate_no_response', 72) // 3 days

    return {
      success: true,
      emailId: email.id,
      threadId: thread.id,
    }
  } catch (error) {
    console.error('Failed to send candidate email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

/**
 * Save email as draft
 */
export async function saveDraft(options: Omit<SendEmailOptions, 'scheduledFor'>): Promise<SendEmailResult> {
  try {
    const candidate = await prisma.jobCandidate.findUnique({
      where: { id: options.candidateId },
    })

    if (!candidate) {
      return { success: false, error: 'Candidate not found' }
    }

    const thread = await getOrCreateThread(
      options.candidateId,
      options.recruiterId,
      options.recruiterEmail,
      options.subject
    )

    const email = await prisma.candidateEmail.create({
      data: {
        threadId: thread.id,
        direction: 'OUTBOUND',
        fromEmail: options.recruiterEmail,
        fromName: options.recruiterName,
        toEmails: [candidate.email],
        ccEmails: thread.ccEmails,
        subject: options.subject,
        htmlBody: options.htmlBody,
        textBody: options.textBody,
        status: 'DRAFT',
        templateId: options.templateId,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: typeof a.content === 'string' ? a.content.length : a.content.length,
        })) || [],
      },
    })

    return {
      success: true,
      emailId: email.id,
      threadId: thread.id,
    }
  } catch (error) {
    console.error('Failed to save draft:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save draft',
    }
  }
}

/**
 * Create email reminder
 */
export async function createEmailReminder(
  emailId: string,
  reminderType: 'candidate_no_response' | 'recruiter_followup',
  triggerAfterHours: number,
  escalateAfterHours?: number
): Promise<EmailReminder> {
  const scheduledFor = new Date()
  scheduledFor.setHours(scheduledFor.getHours() + triggerAfterHours)

  return prisma.emailReminder.create({
    data: {
      emailId,
      reminderType,
      triggerAfterHours,
      scheduledFor,
      escalateAfterHours,
    },
  })
}

/**
 * Apply template variables to email content
 */
export async function applyTemplateVariables(
  template: EmailTemplate,
  candidate: JobCandidate & { job?: Job | null },
  recruiter: { name: string; email: string },
  customVars?: Record<string, string>
): Promise<{ subject: string; htmlBody: string; textBody: string }> {
  const job = candidate.job

  // Build variables map
  const variables: Record<string, string> = {
    'candidate.name': candidate.name,
    'candidate.email': candidate.email,
    'candidate.phone': candidate.phone || '',
    'candidate.currentRole': candidate.currentRole || '',
    'candidate.currentCompany': candidate.currentCompany || '',
    'job.title': job?.title || '',
    'job.department': job?.department || '',
    'stage.name': candidate.stage || '',
    'company.name': 'Curacel',
    'recruiter.name': recruiter.name,
    'recruiter.email': recruiter.email,
    // Links - these would typically come from settings or job config
    'links.calendar': customVars?.['links.calendar'] || '',
    'links.assessment': customVars?.['links.assessment'] || '',
    'links.form': customVars?.['links.form'] || '',
    'links.interestForm': customVars?.['links.interestForm'] || '',
    'links.peopleChatCalendar': customVars?.['links.peopleChatCalendar'] || 'https://calendly.com/curacel-people',
    'links.teamChatCalendar': customVars?.['links.teamChatCalendar'] || '',
    'links.advisorChatCalendar': customVars?.['links.advisorChatCalendar'] || '',
    'links.ceoChatCalendar': customVars?.['links.ceoChatCalendar'] || '',
    ...customVars,
  }

  // Replace variables in content
  const replaceVariables = (content: string): string => {
    return content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedName = varName.trim()
      return variables[trimmedName] || match
    })
  }

  return {
    subject: replaceVariables(template.subject),
    htmlBody: replaceVariables(template.htmlBody),
    textBody: replaceVariables(template.textBody || template.htmlBody.replace(/<[^>]*>/g, '')),
  }
}

/**
 * Get template for a specific stage
 */
export async function getTemplateForStage(
  stage: string,
  jobId?: string
): Promise<EmailTemplate | null> {
  // First try to find job-specific template
  if (jobId) {
    const jobTemplate = await prisma.emailTemplate.findFirst({
      where: {
        stage,
        jobId,
        isActive: true,
      },
    })
    if (jobTemplate) return jobTemplate
  }

  // Fall back to global template
  return prisma.emailTemplate.findFirst({
    where: {
      stage,
      jobId: null,
      isActive: true,
      isDefault: true,
    },
  })
}

/**
 * Sync inbound emails from Gmail thread
 */
export async function syncInboundEmails(threadId: string): Promise<CandidateEmail[]> {
  const gmail = await getGmailConnector()
  if (!gmail) {
    return []
  }

  const thread = await prisma.candidateEmailThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!thread?.gmailThreadId) {
    return []
  }

  const lastMessageId = thread.messages[0]?.gmailMessageId

  try {
    const newMessages = lastMessageId
      ? await gmail.getNewMessages(thread.recruiterEmail, thread.gmailThreadId, lastMessageId)
      : await gmail.listThreadMessages(thread.recruiterEmail, thread.gmailThreadId)

    const createdEmails: CandidateEmail[] = []

    for (const message of newMessages) {
      // Check if we already have this message
      const existing = await prisma.candidateEmail.findFirst({
        where: { gmailMessageId: message.id },
      })

      if (existing) continue

      // Determine direction based on sender
      const isFromRecruiter = message.from.email.toLowerCase() === thread.recruiterEmail.toLowerCase()

      const email = await prisma.candidateEmail.create({
        data: {
          threadId: thread.id,
          gmailMessageId: message.id,
          messageIdHeader: message.messageIdHeader,
          inReplyTo: message.inReplyTo,
          references: message.references,
          direction: isFromRecruiter ? 'OUTBOUND' : 'INBOUND',
          fromEmail: message.from.email,
          fromName: message.from.name,
          toEmails: message.to.map(t => t.email),
          ccEmails: message.cc.map(c => c.email),
          subject: message.subject,
          htmlBody: message.htmlBody || '',
          textBody: message.textBody,
          status: 'DELIVERED',
          sentAt: message.date,
          attachments: message.attachments.map(a => ({
            id: a.id,
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
          })),
        },
      })

      createdEmails.push(email)

      // If inbound, update unread count
      if (!isFromRecruiter) {
        await prisma.candidateEmailThread.update({
          where: { id: thread.id },
          data: {
            unreadCount: { increment: 1 },
            lastMessageAt: message.date,
            messageCount: { increment: 1 },
          },
        })

        // Cancel any pending reminders since candidate replied
        await prisma.emailReminder.updateMany({
          where: {
            email: { threadId: thread.id },
            sentAt: null,
            isCancelled: false,
          },
          data: { isCancelled: true },
        })
      }
    }

    return createdEmails
  } catch (error) {
    console.error('Failed to sync inbound emails:', error)
    return []
  }
}

/**
 * Get threads for a candidate
 */
export async function getCandidateThreads(candidateId: string) {
  return prisma.candidateEmailThread.findMany({
    where: { candidateId },
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  })
}

/**
 * Get all messages in a thread
 */
export async function getThreadMessages(threadId: string) {
  return prisma.candidateEmail.findMany({
    where: { threadId },
    orderBy: { sentAt: 'asc' },
    include: {
      template: true,
    },
  })
}

/**
 * Mark thread as read
 */
export async function markThreadAsRead(threadId: string) {
  return prisma.candidateEmailThread.update({
    where: { id: threadId },
    data: { unreadCount: 0 },
  })
}

/**
 * Bulk send rejection emails
 */
export async function bulkSendRejection(
  candidateIds: string[],
  recruiterId: string,
  recruiterEmail: string,
  recruiterName: string,
  templateId?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  // Get rejection template
  let template: EmailTemplate | null = null
  if (templateId) {
    template = await prisma.emailTemplate.findUnique({ where: { id: templateId } })
  } else {
    template = await prisma.emailTemplate.findFirst({
      where: {
        category: 'rejection',
        isDefault: true,
        isActive: true,
      },
    })
  }

  if (!template) {
    return { ...results, errors: ['No rejection template found'] }
  }

  for (const candidateId of candidateIds) {
    try {
      const candidate = await prisma.jobCandidate.findUnique({
        where: { id: candidateId },
        include: { job: true },
      })

      if (!candidate) {
        results.failed++
        results.errors.push(`Candidate ${candidateId} not found`)
        continue
      }

      // Apply template variables
      const content = await applyTemplateVariables(
        template,
        candidate,
        { name: recruiterName, email: recruiterEmail }
      )

      // Send email
      const result = await sendCandidateEmail({
        candidateId,
        recruiterId,
        recruiterEmail,
        recruiterName,
        subject: content.subject,
        htmlBody: content.htmlBody,
        textBody: content.textBody,
        templateId: template.id,
      })

      if (result.success) {
        results.success++

        // Update candidate status
        await prisma.jobCandidate.update({
          where: { id: candidateId },
          data: { stage: 'REJECTED' },
        })
      } else {
        results.failed++
        results.errors.push(`${candidate.email}: ${result.error}`)
      }
    } catch (error) {
      results.failed++
      results.errors.push(`${candidateId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}
