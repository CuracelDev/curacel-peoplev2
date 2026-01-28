/**
 * Email Sync Service
 *
 * Syncs all emails between Curacel domain and candidates from Gmail
 */

import { prisma } from './prisma'
import { getGmailConnector, type ParsedEmail } from './integrations/gmail'
import type { JobCandidate, Employee } from '@prisma/client'

export interface DateRange {
  from: Date
  to: Date
}

export interface SyncResult {
  success: boolean
  emailsFound: number
  emailsNew: number
  emailsFailed: number
  syncId?: string
  error?: string
}

// Curacel email domains to filter
const CURACEL_DOMAINS = [
  '@curacel.co',
  '@curacel.ai',
  '@curacelgroup.com',
  '@curacel.com',
]

/**
 * Get hiring period date range for a candidate
 */
export async function getCandidateHiringPeriod(candidateId: string): Promise<DateRange | null> {
  const candidate = await prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: {
      employee: {
        select: { startDate: true },
      },
    },
  })

  if (!candidate) {
    return null
  }

  const fromDate = candidate.appliedAt

  // End date: employee start date if hired, otherwise current date
  let toDate = new Date()
  if (candidate.employee?.startDate) {
    toDate = candidate.employee.startDate
  }

  return { from: fromDate, to: toDate }
}

/**
 * Check if an email involves any Curacel domain
 */
function involvesAnyCuracelDomain(
  fromEmail: string,
  toEmails: Array<{ email: string }>,
  ccEmails: Array<{ email: string }>
): boolean {
  const allEmails = [
    fromEmail,
    ...toEmails.map(e => e.email),
    ...ccEmails.map(e => e.email),
  ]

  return allEmails.some(email =>
    CURACEL_DOMAINS.some(domain => email.toLowerCase().includes(domain.toLowerCase()))
  )
}

/**
 * Filter emails to only those involving Curacel domains
 */
export function filterByCuracelDomains(emails: ParsedEmail[]): ParsedEmail[] {
  return emails.filter(email =>
    involvesAnyCuracelDomain(email.from.email, email.to, email.cc)
  )
}

/**
 * Format date for Gmail search query
 */
function formatGmailDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * Query Gmail for all candidate emails within date range
 */
export async function queryCandidateEmailsFromGmail(
  candidateEmail: string,
  dateRange: DateRange,
  serviceAccountEmail: string
): Promise<ParsedEmail[]> {
  const gmail = await getGmailConnector()
  if (!gmail) {
    throw new Error('Gmail connector not configured')
  }

  // Build Gmail search query
  const query = `(from:${candidateEmail} OR to:${candidateEmail}) after:${formatGmailDate(dateRange.from)} before:${formatGmailDate(dateRange.to)}`

  console.log(`Searching Gmail with query: ${query}`)

  // Search messages
  const allMessages = await gmail.searchMessages(serviceAccountEmail, query)

  console.log(`Found ${allMessages.length} total messages for ${candidateEmail}`)

  // Filter to only Curacel domain emails
  const curacelMessages = filterByCuracelDomains(allMessages)

  console.log(`Filtered to ${curacelMessages.length} messages involving Curacel domains`)

  return curacelMessages
}

/**
 * Store synced emails in database
 */
export async function storeSyncedEmails(
  emails: ParsedEmail[],
  candidateId: string,
  syncId: string
): Promise<{ created: number; failed: number }> {
  let created = 0
  let failed = 0

  for (const email of emails) {
    try {
      // Check if email already exists
      const existing = await prisma.candidateEmail.findUnique({
        where: { gmailMessageId: email.id },
      })

      if (existing) {
        // Email already in database, skip
        continue
      }

      // Find or create thread
      const thread = await findOrCreateThread(candidateId, email)

      // Extract all participants
      const participants = [
        email.from.email,
        ...email.to.map(e => e.email),
        ...email.cc.map(e => e.email),
      ]

      // Determine direction (INBOUND if from candidate, OUTBOUND if from Curacel)
      const candidate = await prisma.jobCandidate.findUnique({
        where: { id: candidateId },
        select: { email: true, appliedAt: true, employee: { select: { startDate: true } } },
      })

      const direction = email.from.email.toLowerCase() === candidate?.email.toLowerCase()
        ? 'INBOUND'
        : 'OUTBOUND'

      // Determine if in hiring period
      const emailDate = email.date
      const isInHiringPeriod = candidate
        ? emailDate >= candidate.appliedAt &&
          emailDate <= (candidate.employee?.startDate || new Date())
        : false

      // Create email record
      await prisma.candidateEmail.create({
        data: {
          threadId: thread.id,
          gmailMessageId: email.id,
          messageIdHeader: email.messageIdHeader,
          inReplyTo: email.inReplyTo,
          references: email.references,
          direction,
          fromEmail: email.from.email,
          fromName: email.from.name,
          toEmails: email.to.map(e => e.email),
          ccEmails: email.cc.map(e => e.email),
          subject: email.subject,
          htmlBody: email.htmlBody || '',
          textBody: email.textBody,
          attachments: email.attachments,
          status: 'DELIVERED', // Already delivered since we're syncing from Gmail
          sentAt: email.date,
          deliveredAt: email.date,
          isInHiringPeriod,
          participants,
        },
      })

      created++
    } catch (error) {
      console.error(`Failed to store email ${email.id}:`, error)
      failed++
    }
  }

  return { created, failed }
}

/**
 * Find or create email thread for candidate
 */
async function findOrCreateThread(candidateId: string, email: ParsedEmail) {
  // Try to find existing thread by Gmail thread ID
  if (email.threadId) {
    const existingThread = await prisma.candidateEmailThread.findUnique({
      where: { gmailThreadId: email.threadId },
    })

    if (existingThread) {
      // Update last message time
      await prisma.candidateEmailThread.update({
        where: { id: existingThread.id },
        data: {
          lastMessageAt: email.date > existingThread.lastMessageAt ? email.date : existingThread.lastMessageAt,
          messageCount: { increment: 1 },
        },
      })
      return existingThread
    }
  }

  // Try to find by subject (clean it first)
  const cleanSubject = email.subject
    .replace(/^(Re|Fwd|Fw):\s*/gi, '')
    .replace(/^(Re|Fwd|Fw)\[\d+\]:\s*/gi, '')
    .trim()

  const threadBySubject = await prisma.candidateEmailThread.findFirst({
    where: {
      candidateId,
      subject: { contains: cleanSubject },
    },
  })

  if (threadBySubject) {
    // Update with Gmail thread ID if we found it
    await prisma.candidateEmailThread.update({
      where: { id: threadBySubject.id },
      data: {
        gmailThreadId: email.threadId,
        lastMessageAt: email.date > threadBySubject.lastMessageAt ? email.date : threadBySubject.lastMessageAt,
        messageCount: { increment: 1 },
      },
    })
    return threadBySubject
  }

  // Create new thread
  // Determine recruiter email (first Curacel email in participants)
  const curacelEmail = [email.from.email, ...email.to.map(e => e.email), ...email.cc.map(e => e.email)]
    .find(e => CURACEL_DOMAINS.some(domain => e.toLowerCase().includes(domain.toLowerCase())))

  return prisma.candidateEmailThread.create({
    data: {
      candidateId,
      gmailThreadId: email.threadId,
      subject: cleanSubject,
      recruiterEmail: curacelEmail || 'peopleops@curacel.ai',
      ccEmails: email.cc.map(e => e.email),
      lastMessageAt: email.date,
      messageCount: 1,
      unreadCount: 0, // Synced emails are considered read
    },
  })
}

/**
 * Main sync function: sync all candidate emails from Gmail
 */
export async function syncAllCandidateEmails(candidateId: string): Promise<SyncResult> {
  try {
    // Get candidate
    const candidate = await prisma.jobCandidate.findUnique({
      where: { id: candidateId },
      select: { email: true },
    })

    if (!candidate) {
      return {
        success: false,
        emailsFound: 0,
        emailsNew: 0,
        emailsFailed: 0,
        error: 'Candidate not found',
      }
    }

    // Get hiring period
    const dateRange = await getCandidateHiringPeriod(candidateId)
    if (!dateRange) {
      return {
        success: false,
        emailsFound: 0,
        emailsNew: 0,
        emailsFailed: 0,
        error: 'Could not determine hiring period',
      }
    }

    // Create sync record
    const sync = await prisma.candidateEmailSync.create({
      data: {
        candidateId,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        syncStatus: 'IN_PROGRESS',
      },
    })

    // Get service account email (use admin email from Gmail connector)
    const gmail = await getGmailConnector()
    if (!gmail) {
      await prisma.candidateEmailSync.update({
        where: { id: sync.id },
        data: {
          syncStatus: 'FAILED',
          errorMessage: 'Gmail connector not configured',
        },
      })
      return {
        success: false,
        emailsFound: 0,
        emailsNew: 0,
        emailsFailed: 0,
        error: 'Gmail connector not configured',
      }
    }

    // Get admin email from env or config
    const serviceAccountEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || process.env.GMAIL_DELEGATED_USER || 'peopleops@curacel.ai'

    // Query Gmail
    const emails = await queryCandidateEmailsFromGmail(
      candidate.email,
      dateRange,
      serviceAccountEmail
    )

    // Store emails
    const { created, failed } = await storeSyncedEmails(emails, candidateId, sync.id)

    // Update sync record
    await prisma.candidateEmailSync.update({
      where: { id: sync.id },
      data: {
        syncStatus: 'COMPLETED',
        emailsFound: emails.length,
        emailsNew: created,
        emailsFailed: failed,
      },
    })

    return {
      success: true,
      emailsFound: emails.length,
      emailsNew: created,
      emailsFailed: failed,
      syncId: sync.id,
    }
  } catch (error) {
    console.error('syncAllCandidateEmails error:', error)
    return {
      success: false,
      emailsFound: 0,
      emailsNew: 0,
      emailsFailed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
