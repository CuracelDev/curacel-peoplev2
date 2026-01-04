/**
 * AI Email Categorization Service
 *
 * Uses Claude API to categorize recruitment emails
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import type { CandidateEmail, JobCandidate, Job, EmailCategory } from '@prisma/client'

interface CategoryResult {
  category: EmailCategory
  confidence: number
  reasoning: string
}

interface BatchCategoryResult extends CategoryResult {
  emailId: string
}

/**
 * Get AI settings from database
 */
async function getAISettings() {
  const settings = await prisma.aISettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (!settings) {
    throw new Error('AI settings not configured')
  }

  // We use Anthropic per CLAUDE.md requirements
  if (settings.provider !== 'ANTHROPIC' || !settings.anthropicKeyEncrypted) {
    throw new Error('Anthropic AI provider not configured. Email categorization requires Claude API.')
  }

  return {
    provider: settings.provider,
    model: settings.anthropicModel,
    apiKey: decrypt(settings.anthropicKeyEncrypted),
  }
}

/**
 * Build categorization prompt for an email
 */
function buildCategorizationPrompt(
  email: CandidateEmail,
  candidate: JobCandidate & { job?: Job | null }
): string {
  const job = candidate.job

  return `You are an AI assistant helping categorize recruitment emails for a hiring workflow.

Context:
- Candidate: ${candidate.name}
- Position: ${job?.title || 'Unknown'}
- Current Stage: ${candidate.stage}
- Email Date: ${email.sentAt?.toISOString() || 'Unknown'}

Email Details:
- Subject: ${email.subject}
- From: ${email.fromEmail}${email.fromName ? ` (${email.fromName})` : ''}
- To: ${email.toEmails.join(', ')}
${email.ccEmails.length > 0 ? `- CC: ${email.ccEmails.join(', ')}` : ''}
- Direction: ${email.direction === 'OUTBOUND' ? 'Sent by company' : 'Received from candidate'}
${email.textBody ? `- Body Preview: ${email.textBody.substring(0, 500)}...` : ''}

Categorize this email into exactly ONE of these categories:

1. **APPLICATION** - Application/initial contact
   - First contact from or to candidate
   - Application submission
   - Resume/CV sharing
   - Initial interest expression

2. **INTERVIEW_SCHEDULING** - Interview scheduling
   - Scheduling interview times
   - Rescheduling interviews
   - Calendar invites
   - Availability requests/responses
   - Interview confirmations

3. **INTERVIEW_FOLLOWUP** - Interview follow-up
   - Thank you notes after interviews
   - Next steps after interviews
   - Interview feedback requests
   - Post-interview check-ins

4. **ASSESSMENT** - Assessment/test
   - Technical assessment invitations
   - Test instructions
   - Assignment submissions
   - Assessment results/feedback
   - Coding challenges

5. **OFFER** - Offer
   - Offer letters
   - Salary negotiations
   - Offer acceptance/decline
   - Contract discussions
   - Start date coordination

6. **ONBOARDING** - Onboarding
   - Paperwork requests
   - First day information
   - Onboarding tasks
   - Equipment setup
   - Team introductions

7. **GENERAL_FOLLOWUP** - General follow-up
   - Status check-ins
   - General updates
   - Timeline questions
   - Application status inquiries

8. **OTHER** - Other
   - Anything that doesn't clearly fit the above categories
   - Administrative messages
   - Unrelated communications

Analyze the email content carefully, considering:
- The subject line keywords
- The timing and context
- The sender and recipients
- The email body content (if available)
- The candidate's current stage

Respond ONLY with valid JSON in this exact format:
{
  "category": "CATEGORY_NAME",
  "confidence": 0.95,
  "reasoning": "Brief 1-sentence explanation of why this category was chosen"
}

The category must be one of: APPLICATION, INTERVIEW_SCHEDULING, INTERVIEW_FOLLOWUP, ASSESSMENT, OFFER, ONBOARDING, GENERAL_FOLLOWUP, OTHER
The confidence must be a number between 0 and 1 (e.g., 0.95 for 95% confidence)
`
}

/**
 * Categorize a single email using AI
 */
export async function categorizeEmail(
  emailId: string
): Promise<CategoryResult | null> {
  try {
    // Get email with related data
    const email = await prisma.candidateEmail.findUnique({
      where: { id: emailId },
      include: {
        thread: {
          include: {
            candidate: {
              include: {
                job: true,
              },
            },
          },
        },
      },
    })

    if (!email || !email.thread.candidate) {
      console.error(`Email ${emailId} not found or missing candidate`)
      return null
    }

    // Get AI settings
    const settings = await getAISettings()

    // Build prompt
    const prompt = buildCategorizationPrompt(email, email.thread.candidate)

    // Call Anthropic API
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: settings.apiKey })

    const response = await client.messages.create({
      model: settings.model,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Anthropic')
    }

    // Parse JSON response
    const result: CategoryResult = JSON.parse(textContent.text)

    // Update email with category
    await prisma.candidateEmail.update({
      where: { id: emailId },
      data: {
        category: result.category,
        categoryConfidence: result.confidence,
        categorizedAt: new Date(),
        categorizedBy: 'AI',
      },
    })

    console.log(`Categorized email ${emailId} as ${result.category} (confidence: ${result.confidence})`)

    return result
  } catch (error) {
    console.error(`Failed to categorize email ${emailId}:`, error)
    return null
  }
}

/**
 * Categorize multiple emails in batch
 * Processes emails sequentially to avoid rate limiting
 */
export async function categorizeBatch(
  emailIds: string[]
): Promise<BatchCategoryResult[]> {
  const results: BatchCategoryResult[] = []

  for (const emailId of emailIds) {
    try {
      const result = await categorizeEmail(emailId)
      if (result) {
        results.push({ emailId, ...result })
      }

      // Small delay to respect rate limits (250ms between requests)
      await new Promise(resolve => setTimeout(resolve, 250))
    } catch (error) {
      console.error(`Batch categorization failed for email ${emailId}:`, error)
    }
  }

  return results
}

/**
 * Categorize all uncategorized emails for a candidate
 */
export async function categorizeAllForCandidate(candidateId: string): Promise<{
  total: number
  categorized: number
  failed: number
}> {
  // Get all uncategorized emails for this candidate
  const uncategorizedEmails = await prisma.candidateEmail.findMany({
    where: {
      thread: {
        candidateId,
      },
      category: null,
    },
    select: { id: true },
  })

  console.log(`Found ${uncategorizedEmails.length} uncategorized emails for candidate ${candidateId}`)

  const total = uncategorizedEmails.length
  let categorized = 0
  let failed = 0

  // Update sync status to IN_PROGRESS
  const sync = await prisma.candidateEmailSync.findFirst({
    where: { candidateId },
    orderBy: { createdAt: 'desc' },
  })

  if (sync) {
    await prisma.candidateEmailSync.update({
      where: { id: sync.id },
      data: {
        categorizationStatus: 'IN_PROGRESS',
      },
    })
  }

  // Process in batches of 20
  const batchSize = 20
  for (let i = 0; i < uncategorizedEmails.length; i += batchSize) {
    const batch = uncategorizedEmails.slice(i, i + batchSize)
    const results = await categorizeBatch(batch.map(e => e.id))

    categorized += results.length
    failed += batch.length - results.length

    // Update sync progress
    if (sync) {
      await prisma.candidateEmailSync.update({
        where: { id: sync.id },
        data: {
          categorizedCount: categorized,
        },
      })
    }

    console.log(`Categorized batch ${Math.floor(i / batchSize) + 1}: ${results.length}/${batch.length} successful`)
  }

  // Update sync status to COMPLETED
  if (sync) {
    await prisma.candidateEmailSync.update({
      where: { id: sync.id },
      data: {
        categorizationStatus: 'COMPLETED',
      },
    })
  }

  return { total, categorized, failed }
}

/**
 * Re-categorize a single email with manual override
 */
export async function recategorizeEmail(
  emailId: string,
  category: EmailCategory,
  userId?: string
): Promise<boolean> {
  try {
    await prisma.candidateEmail.update({
      where: { id: emailId },
      data: {
        category,
        categoryConfidence: 1.0, // Manual categorization is 100% confident
        categorizedAt: new Date(),
        categorizedBy: userId || 'MANUAL',
      },
    })

    console.log(`Manually recategorized email ${emailId} to ${category}`)
    return true
  } catch (error) {
    console.error(`Failed to recategorize email ${emailId}:`, error)
    return false
  }
}
