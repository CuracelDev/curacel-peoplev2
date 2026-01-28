/**
 * Hire Flow Job
 *
 * Automatically creates Employee records and draft Offers when candidates
 * move to the OFFER stage. Handles data mapping from candidate to employee/offer,
 * duplicate prevention, and error handling.
 */

import PgBoss from 'pg-boss'
import { prisma } from '@/lib/prisma'
import { EmploymentType } from '@prisma/client'
import { logEmployeeEvent, logOfferEvent } from '@/lib/audit'
import { renderTemplate } from '@/lib/utils'

export const HIRE_FLOW_JOB_NAME = 'hire-flow'

interface HireFlowJobData {
  candidateId: string
  jobId: string
}

interface EmployeeData {
  fullName: string
  personalEmail: string
  phone?: string | null
  status: 'CANDIDATE'
  jobTitle?: string
  department?: string
  location?: string
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN'
  candidateId: string
  salaryAmount?: number
  salaryCurrency?: string
  startDate?: Date
}

/**
 * Calculate estimated start date based on notice period
 */
function calculateEstimatedStartDate(noticePeriod: string | null): Date {
  const now = new Date()

  if (!noticePeriod) {
    // Default to 30 days
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  // Parse notice period (e.g., "30 days", "2 weeks", "1 month", "Immediate")
  const match = noticePeriod.match(/(\d+)\s*(day|week|month)/i)

  if (!match) {
    if (noticePeriod.toLowerCase().includes('immediate')) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
    }
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
  }

  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()

  let daysToAdd = 0
  if (unit === 'day') daysToAdd = value
  else if (unit === 'week') daysToAdd = value * 7
  else if (unit === 'month') daysToAdd = value * 30

  return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
}

/**
 * Map candidate data to employee data
 */
function mapCandidateToEmployee(candidate: {
  id: string
  name: string
  email: string
  phone?: string | null
  location?: string | null
  salaryExpMax?: number | null
  salaryExpCurrency?: string | null
  noticePeriod?: string | null
  job: {
    title: string
    department: string | null
    locations: string[]
    employmentType: string | null
  }
}): EmployeeData {
  const estimatedStartDate = calculateEstimatedStartDate(candidate.noticePeriod || null)

  return {
    fullName: candidate.name,
    personalEmail: candidate.email,
    phone: candidate.phone,
    status: 'CANDIDATE',
    jobTitle: candidate.job.title,
    department: candidate.job.department || undefined,
    location: candidate.location || candidate.job.locations[0] || undefined,
    employmentType: (candidate.job.employmentType as 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN') || 'FULL_TIME',
    candidateId: candidate.id,
    salaryAmount: candidate.salaryExpMax || undefined,
    salaryCurrency: candidate.salaryExpCurrency || 'USD',
    startDate: estimatedStartDate,
  }
}

/**
 * Map candidate data to offer variables
 */
function mapCandidateToOfferVariables(candidate: {
  name: string
  email: string
  location?: string | null
  salaryExpMax?: number | null
  salaryExpCurrency?: string | null
  noticePeriod?: string | null
  job: {
    title: string
    department: string | null
    locations: string[]
    employmentType: string | null
  }
}, estimatedStartDate: Date): Record<string, string> {
  return {
    role: candidate.job.title,
    candidate_name: candidate.name,
    job_title: candidate.job.title,
    department: candidate.job.department || '',
    salary: candidate.salaryExpMax?.toString() || '',
    currency: candidate.salaryExpCurrency || 'USD',
    location: candidate.location || candidate.job.locations[0] || '',
    start_date: estimatedStartDate.toISOString().split('T')[0],
    employment_type: candidate.job.employmentType || 'Full-Time',
  }
}

/**
 * Get default offer template for job
 */
async function getDefaultOfferTemplate(job: {
  id: string
  defaultOfferTemplateId?: string | null
  employmentType: string | null
}): Promise<{ id: string; bodyHtml: string } | null> {
  // First, try job's default template
  if (job.defaultOfferTemplateId) {
    const template = await prisma.offerTemplate.findUnique({
      where: { id: job.defaultOfferTemplateId },
      select: { id: true, bodyHtml: true },
    })
    if (template) return template
  }

  // Second, try template matching employment type
  if (job.employmentType) {
    const template = await prisma.offerTemplate.findFirst({
      where: { employmentType: job.employmentType as EmploymentType },
      select: { id: true, bodyHtml: true },
    })
    if (template) return template
  }

  // Finally, get first active template
  const template = await prisma.offerTemplate.findFirst({
    select: { id: true, bodyHtml: true },
  })

  return template
}

/**
 * Create or update employee from candidate data
 */
async function createOrUpdateEmployee(
  candidate: {
    id: string
    name: string
    email: string
    phone?: string | null
    location?: string | null
    salaryExpMax?: number | null
    salaryExpCurrency?: string | null
    noticePeriod?: string | null
    employee?: { id: string } | null
    job: {
      title: string
      department: string | null
      locations: string[]
      employmentType: string | null
    }
  }
) {
  const employeeData = mapCandidateToEmployee(candidate)

  // Check if employee already exists via candidateId link
  if (candidate.employee) {
    console.log('[HireFlow] Updating existing employee:', candidate.employee.id)

    const updatedEmployee = await prisma.employee.update({
      where: { id: candidate.employee.id },
      data: employeeData,
    })

    await logEmployeeEvent({
      actorType: 'system',
      action: 'EMPLOYEE_UPDATED',
      employeeId: updatedEmployee.id,
      metadata: {
        source: 'hire_flow',
        candidateId: candidate.id,
        autoUpdated: true,
      },
    })

    return updatedEmployee
  }

  // Check if employee exists by email (but not linked to candidate)
  const existingEmployee = await prisma.employee.findUnique({
    where: { personalEmail: candidate.email },
  })

  if (existingEmployee) {
    console.log('[HireFlow] Found existing employee by email, linking to candidate')

    const updatedEmployee = await prisma.employee.update({
      where: { id: existingEmployee.id },
      data: employeeData,
    })

    await logEmployeeEvent({
      actorType: 'system',
      action: 'EMPLOYEE_UPDATED',
      employeeId: updatedEmployee.id,
      metadata: {
        source: 'hire_flow',
        candidateId: candidate.id,
        autoLinked: true,
      },
    })

    return updatedEmployee
  }

  // Create new employee
  console.log('[HireFlow] Creating new employee for candidate:', candidate.id)

  const newEmployee = await prisma.employee.create({
    data: employeeData,
  })

  await logEmployeeEvent({
    actorType: 'system',
    action: 'EMPLOYEE_CREATED',
    employeeId: newEmployee.id,
    metadata: {
      source: 'hire_flow',
      candidateId: candidate.id,
      autoCreated: true,
    },
  })

  return newEmployee
}

/**
 * Create draft offer if needed
 */
async function createOfferIfNeeded(
  employee: { id: string },
  candidate: {
    id: string
    name: string
    email: string
    location?: string | null
    salaryExpMax?: number | null
    salaryExpCurrency?: string | null
    noticePeriod?: string | null
    job: {
      id: string
      title: string
      department: string | null
      locations: string[]
      employmentType: string | null
      defaultOfferTemplateId?: string | null
    }
  },
  template: { id: string; bodyHtml: string } | null
): Promise<{ id: string } | null> {
  // Check if offer already exists for this employee
  const existingOffer = await prisma.offer.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ['DRAFT', 'SENT', 'SIGNED'] },
    },
  })

  if (existingOffer) {
    console.log('[HireFlow] Offer already exists for employee, skipping creation:', existingOffer.id)
    return null
  }

  if (!template) {
    console.error('[HireFlow] No offer template found, skipping offer creation')
    return null
  }

  const estimatedStartDate = calculateEstimatedStartDate(candidate.noticePeriod || null)
  const variables = mapCandidateToOfferVariables(candidate, estimatedStartDate)

  // Render the offer HTML
  const renderedHtml = renderTemplate(template.bodyHtml, variables)

  console.log('[HireFlow] Creating draft offer for employee:', employee.id)

  const offer = await prisma.offer.create({
    data: {
      employeeId: employee.id,
      candidateEmail: candidate.email,
      candidateName: candidate.name,
      templateId: template.id,
      variables,
      renderedHtml,
      status: 'DRAFT',
    },
  })

  // Create offer event
  await prisma.offerEvent.create({
    data: {
      offerId: offer.id,
      type: 'created',
      description: 'Offer created automatically from hire flow',
    },
  })

  await logOfferEvent({
    actorType: 'system',
    action: 'OFFER_CREATED',
    offerId: offer.id,
    metadata: {
      source: 'hire_flow',
      candidateId: candidate.id,
      autoCreated: true,
    },
  })

  return offer
}

/**
 * Process hire flow job
 */
export async function hireFlowHandler(job: PgBoss.Job<HireFlowJobData>): Promise<void> {
  console.log('[HireFlow] Processing job:', job.id, 'data:', job.data)

  const { candidateId, jobId } = job.data

  try {
    // Fetch candidate with full data
    const candidate = await prisma.jobCandidate.findUnique({
      where: { id: candidateId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            locations: true,
            employmentType: true,
            defaultOfferTemplateId: true,
          },
        },
        employee: {
          select: { id: true },
        },
      },
    })

    if (!candidate) {
      console.error('[HireFlow] Candidate not found:', candidateId)
      return
    }

    if (candidate.stage !== 'OFFER') {
      console.log('[HireFlow] Candidate no longer in OFFER stage, skipping:', candidate.stage)
      return
    }

    // Get default offer template
    const template = await getDefaultOfferTemplate(candidate.job)

    // Create or update employee
    const employee = await createOrUpdateEmployee({
      ...candidate,
      job: {
        ...candidate.job,
        locations: candidate.job.locations as string[],
      },
    })

    // Create offer if needed
    const offer = await createOfferIfNeeded(employee, {
      ...candidate,
      job: {
        ...candidate.job,
        locations: candidate.job.locations as string[],
      },
    }, template)

    console.log('[HireFlow] Hire flow completed successfully', {
      candidateId,
      employeeId: employee.id,
      offerId: offer?.id,
      offerCreated: !!offer,
    })
  } catch (error) {
    console.error('[HireFlow] Failed to process hire flow:', error)
    throw error // Re-throw for pg-boss retry
  }
}

/**
 * Queue hire flow job
 */
export async function queueHireFlow(
  boss: PgBoss,
  data: HireFlowJobData
): Promise<string> {
  console.log('[HireFlow] Queuing hire flow for candidate:', data.candidateId)

  const jobId = await boss.send(
    HIRE_FLOW_JOB_NAME,
    data,
    {
      retryLimit: 3,
      retryDelay: 60000, // 1 minute
      retryBackoff: true,
    }
  )

  return jobId!
}
