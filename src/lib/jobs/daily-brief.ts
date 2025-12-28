/**
 * Daily Brief Job - V3 Blue AI
 *
 * This pg-boss job computes daily brief summaries for each organization.
 * Run this job once daily (e.g., at 6 AM) to pre-compute briefs.
 *
 * Usage:
 * - Import and call `initDailyBriefJob(boss)` with your pg-boss instance
 * - Schedule the job using boss.schedule() or a cron trigger
 */

import PgBoss from 'pg-boss'
import { prisma } from '@/lib/prisma'

export const DAILY_BRIEF_JOB_NAME = 'daily-brief-compute'

interface DailyBriefJobData {
  orgId?: string // Optional: compute for specific org, otherwise all orgs
}

export async function computeDailyBrief(orgId: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  // Get pending contracts (DRAFT or SENT for more than 3 days)
  const pendingContracts = await prisma.offer.findMany({
    where: {
      status: { in: ['DRAFT', 'SENT', 'VIEWED'] },
      createdAt: { lt: threeDaysAgo },
    },
    select: {
      id: true,
      candidateName: true,
      candidateEmail: true,
      status: true,
      createdAt: true,
    },
    take: 20,
    orderBy: { createdAt: 'asc' },
  })

  // Get upcoming starts (employees starting in next 7 days)
  const upcomingStarts = await prisma.employee.findMany({
    where: {
      status: 'HIRED_PENDING_START',
      startDate: { gte: today, lte: weekFromNow },
    },
    select: {
      id: true,
      fullName: true,
      startDate: true,
      jobTitle: true,
    },
    take: 20,
    orderBy: { startDate: 'asc' },
  })

  // Get stuck workflows (onboarding/offboarding with failed tasks)
  const stuckOnboarding = await prisma.onboardingWorkflow.count({
    where: {
      status: 'IN_PROGRESS',
      tasks: { some: { status: 'FAILED' } },
    },
  })

  const stuckOffboarding = await prisma.offboardingWorkflow.count({
    where: {
      status: 'IN_PROGRESS',
      tasks: { some: { status: 'FAILED' } },
    },
  })

  const summary = {
    pendingContracts: pendingContracts.map((c) => ({
      id: c.id,
      name: c.candidateName,
      email: c.candidateEmail,
      status: c.status,
      daysOld: Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
    })),
    pendingContractsCount: pendingContracts.length,
    upcomingStarts: upcomingStarts.map((e) => ({
      id: e.id,
      name: e.fullName,
      role: e.jobTitle,
      startDate: e.startDate?.toISOString().split('T')[0],
    })),
    upcomingStartsCount: upcomingStarts.length,
    stuckOnboardingCount: stuckOnboarding,
    stuckOffboardingCount: stuckOffboarding,
    stuckWorkflowsCount: stuckOnboarding + stuckOffboarding,
    computedAt: new Date().toISOString(),
  }

  // Upsert the daily brief
  await prisma.dailyBrief.upsert({
    where: {
      orgId_date: { orgId, date: today },
    },
    create: {
      orgId,
      date: today,
      summary,
    },
    update: {
      summary,
    },
  })

  console.log(`[DailyBrief] Computed brief for org ${orgId}:`, {
    pendingContracts: pendingContracts.length,
    upcomingStarts: upcomingStarts.length,
    stuckWorkflows: stuckOnboarding + stuckOffboarding,
  })
}

export async function dailyBriefHandler(job: PgBoss.Job<DailyBriefJobData>): Promise<void> {
  console.log('[DailyBrief] Job started:', job.id)

  try {
    if (job.data?.orgId) {
      // Compute for specific org
      await computeDailyBrief(job.data.orgId)
    } else {
      // Compute for all orgs
      const orgs = await prisma.organization.findMany({
        select: { id: true },
      })

      for (const org of orgs) {
        try {
          await computeDailyBrief(org.id)
        } catch (error) {
          console.error(`[DailyBrief] Failed for org ${org.id}:`, error)
          // Continue with other orgs even if one fails
        }
      }
    }

    console.log('[DailyBrief] Job completed:', job.id)
  } catch (error) {
    console.error('[DailyBrief] Job failed:', error)
    throw error // Re-throw to mark job as failed
  }
}

/**
 * Initialize the daily brief job handler with pg-boss
 */
export function initDailyBriefJob(boss: PgBoss): void {
  boss.work(DAILY_BRIEF_JOB_NAME, dailyBriefHandler)
  console.log(`[DailyBrief] Job handler registered: ${DAILY_BRIEF_JOB_NAME}`)
}

/**
 * Schedule the daily brief job to run at 6 AM daily
 */
export async function scheduleDailyBrief(boss: PgBoss): Promise<void> {
  await boss.schedule(DAILY_BRIEF_JOB_NAME, '0 6 * * *', {})
  console.log('[DailyBrief] Scheduled to run at 6 AM daily')
}

/**
 * Manually trigger a daily brief computation
 */
export async function triggerDailyBrief(boss: PgBoss, orgId?: string): Promise<string | null> {
  return boss.send(DAILY_BRIEF_JOB_NAME, { orgId })
}
