/**
 * Work Email Sync Job
 *
 * This pg-boss job syncs workEmail fields from Google Workspace AppAccounts.
 * Runs periodically (e.g., every 6 hours) to ensure email consistency.
 *
 * Usage:
 * - Import and call `initWorkEmailSyncJob(boss)` with your pg-boss instance
 * - The job auto-schedules itself on initialization
 */

import PgBoss from 'pg-boss'
import { syncAllWorkEmails, getWorkEmailMismatches } from '@/lib/sync-work-email'

export const WORK_EMAIL_SYNC_JOB_NAME = 'work-email-sync'

interface WorkEmailSyncJobData {
  triggeredBy?: string // 'scheduled' | 'manual' | user ID
}

/**
 * Handler for the work email sync job
 */
export async function workEmailSyncHandler(
  job: PgBoss.Job<WorkEmailSyncJobData>
): Promise<void> {
  console.log(`[WorkEmailSync] Starting sync job ${job.id}`)
  
  const startTime = Date.now()
  const result = await syncAllWorkEmails(job.data?.triggeredBy)
  const duration = Date.now() - startTime

  console.log(`[WorkEmailSync] Completed in ${duration}ms:`, {
    success: result.success,
    updated: result.updated,
    errors: result.errors.length,
  })

  if (result.details.length > 0) {
    console.log('[WorkEmailSync] Updated employees:', result.details.map(d => ({
      name: d.employeeName,
      oldEmail: d.oldEmail,
      newEmail: d.newEmail,
    })))
  }

  if (result.errors.length > 0) {
    console.warn('[WorkEmailSync] Errors:', result.errors)
  }
}

/**
 * Initialize the work email sync job handler
 */
export async function initWorkEmailSyncJob(boss: PgBoss): Promise<void> {
  await boss.work(
    WORK_EMAIL_SYNC_JOB_NAME,
    { teamSize: 1, teamConcurrency: 1 },
    workEmailSyncHandler
  )
  console.log(`[Worker] Job handler registered: ${WORK_EMAIL_SYNC_JOB_NAME}`)
}

/**
 * Schedule the work email sync job to run every 6 hours
 */
export async function scheduleWorkEmailSync(boss: PgBoss): Promise<void> {
  // Run every 6 hours: at 00:00, 06:00, 12:00, 18:00
  const cronExpression = '0 0,6,12,18 * * *'
  
  await boss.schedule(
    WORK_EMAIL_SYNC_JOB_NAME,
    cronExpression,
    { triggeredBy: 'scheduled' },
    {
      tz: 'UTC',
    }
  )
  
  console.log(`[Worker] Scheduled ${WORK_EMAIL_SYNC_JOB_NAME} with cron: ${cronExpression}`)
}

/**
 * Manually trigger a work email sync
 */
export async function triggerWorkEmailSync(
  boss: PgBoss,
  triggeredBy?: string
): Promise<string | null> {
  const jobId = await boss.send(WORK_EMAIL_SYNC_JOB_NAME, {
    triggeredBy: triggeredBy || 'manual',
  })
  console.log(`[WorkEmailSync] Manually triggered job: ${jobId}`)
  return jobId
}

/**
 * Get preview of employees that would be updated by sync
 */
export async function previewWorkEmailSync(): Promise<{
  count: number
  employees: Array<{
    id: string
    fullName: string
    currentWorkEmail: string | null
    googleWorkspaceEmail: string | null
  }>
}> {
  const mismatches = await getWorkEmailMismatches()
  
  return {
    count: mismatches.length,
    employees: mismatches.map(emp => ({
      id: emp.id,
      fullName: emp.fullName,
      currentWorkEmail: emp.workEmail,
      googleWorkspaceEmail: emp.googleWorkspaceEmail,
    })),
  }
}
