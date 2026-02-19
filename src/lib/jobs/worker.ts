/**
 * Background Job Worker
 *
 * Initializes pg-boss and registers all job handlers.
 * Call initializeWorker() on application startup.
 */

import PgBoss from 'pg-boss'
import { initDailyBriefJob, scheduleDailyBrief } from './daily-brief'
import { initStageEmailJob, STAGE_EMAIL_JOB_NAME } from './stage-email'
import { initReminderJob, REMINDER_JOB_NAME } from './reminder'
import { initEscalationJob, ESCALATION_JOB_NAME } from './escalation'
import { hireFlowHandler, HIRE_FLOW_JOB_NAME } from './hire-flow'
import { initResumeProcessJob, RESUME_PROCESS_JOB_NAME } from './resume-process'
import { initAutoActivateJob, scheduleAutoActivate } from './auto-activate'
import { initWorkEmailSyncJob, scheduleWorkEmailSync, WORK_EMAIL_SYNC_JOB_NAME } from './work-email-sync'

// No global SSL bypass - use local config instead


let boss: PgBoss | null = null
let isInitializing = false

/**
 * Initialize the pg-boss worker and register all job handlers
 */
export async function initializeWorker(): Promise<PgBoss> {
  if (boss) {
    console.log('[Worker] Already initialized, returning existing instance')
    return boss
  }

  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (boss) return boss
  }

  isInitializing = true

  try {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    console.log('[Worker] Parsing DATABASE_URL...')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { parse } = require('pg-connection-string')
    const dbConfig = parse(connectionString)
    console.log(`[Worker] Database config: host=${dbConfig.host}, database=${dbConfig.database}, user=${dbConfig.user}`)

    // Only use SSL for non-localhost/docker connections (cloud databases)
    const isLocal =
      dbConfig.host === 'localhost' ||
      dbConfig.host === '127.0.0.1' ||
      dbConfig.host === 'postgres' ||
      dbConfig.host === 'db' ||
      process.env.PGSSLMODE === 'no-verify' ||
      process.env.PGSSLMODE === 'disable'

    const sslConfig = isLocal ? false : { rejectUnauthorized: false }
    console.log(`[Worker] SSL config: ${isLocal ? 'disabled' : 'enabled'}`)

    // For pg-boss, we explicitly set the schema to 'pgboss'
    const schema = 'pgboss'

    try {
      boss = new PgBoss({
        host: dbConfig.host,
        port: parseInt(dbConfig.port || '5432'),
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        schema: schema,
        ssl: sslConfig,
        retryLimit: 3,
        retryDelay: 60000,
        monitorStateIntervalSeconds: 30,
        archiveCompletedAfterSeconds: 86400,
        deleteAfterDays: 7,
      })

      boss.on('error', (error) => {
        console.error('[Worker] pg-boss error:', error)
      })

      await boss.start()
      console.log('[Worker] pg-boss started')

      // Initialize jobs
      await initStageEmailJob(boss)
      await initReminderJob(boss)
      await initEscalationJob(boss)
      await scheduleReminderProcessor(boss)
      await scheduleEscalationProcessor(boss)

      // Schedule daily brief
      await initDailyBriefJob(boss)
      await scheduleDailyBrief(boss)

      // Register hire flow job handler
      await boss.work(HIRE_FLOW_JOB_NAME, hireFlowHandler)

      // Initialize resume processing
      await initResumeProcessJob(boss)

      // Auto-activation
      await initAutoActivateJob(boss)
      await scheduleAutoActivate(boss)

      // Initialize work email sync (syncs workEmail from Google Workspace)
      await initWorkEmailSyncJob(boss)
      await scheduleWorkEmailSync(boss)

      console.log('[Worker] All job handlers registered and scheduled')

      return boss
    } catch (error) {
      console.error('[Worker] Failed to initialize:', error)
      boss = null // Important: reset boss on failure so we can retry
      throw error
    }
  } finally {
    isInitializing = false
  }
}

/**
 * Get the current worker instance (returns null if not initialized)
 */
export function getWorker(): PgBoss | null {
  return boss
}

/**
 * Gracefully stop the worker
 */
export async function stopWorker(): Promise<void> {
  if (boss) {
    console.log('[Worker] Stopping pg-boss...')
    await boss.stop({ graceful: true, timeout: 30000 })
    boss = null
    console.log('[Worker] pg-boss stopped')
  }
}

/**
 * Schedule the reminder processor to run every 15 minutes
 */
async function scheduleReminderProcessor(boss: PgBoss): Promise<void> {
  await boss.schedule(REMINDER_JOB_NAME, '*/15 * * * *', {})
  console.log('[Worker] Reminder processor scheduled every 15 minutes')
}

/**
 * Schedule the escalation processor to run every hour
 */
async function scheduleEscalationProcessor(boss: PgBoss): Promise<void> {
  await boss.schedule(ESCALATION_JOB_NAME, '0 * * * *', {})
  console.log('[Worker] Escalation processor scheduled every hour')
}

/**
 * Get job queue statistics
 */
export async function getQueueStats(): Promise<{
  stageEmails: { pending: number; failed: number }
  reminders: { pending: number }
  dailyBrief: { pending: number }
  hireFlow: { pending: number; failed: number }
  resumeProcess: { pending: number; failed: number }
  workEmailSync: { pending: number; failed: number }
} | null> {
  if (!boss) return null

  const [
    stageEmailPending,
    stageEmailFailed,
    remindersPending,
    dailyBriefPending,
    hireFlowPending,
    hireFlowFailed,
    resumeProcessPending,
    resumeProcessFailed,
    workEmailSyncPending,
    workEmailSyncFailed,
  ] = await Promise.all([
    boss.getQueueSize(STAGE_EMAIL_JOB_NAME, { state: 'created' }),
    boss.getQueueSize(STAGE_EMAIL_JOB_NAME, { state: 'failed' }),
    boss.getQueueSize(REMINDER_JOB_NAME, { state: 'created' }),
    boss.getQueueSize('daily-brief-compute', { state: 'created' }),
    boss.getQueueSize(HIRE_FLOW_JOB_NAME, { state: 'created' }),
    boss.getQueueSize(HIRE_FLOW_JOB_NAME, { state: 'failed' }),
    boss.getQueueSize(RESUME_PROCESS_JOB_NAME, { state: 'created' }),
    boss.getQueueSize(RESUME_PROCESS_JOB_NAME, { state: 'failed' }),
    boss.getQueueSize(WORK_EMAIL_SYNC_JOB_NAME, { state: 'created' }),
    boss.getQueueSize(WORK_EMAIL_SYNC_JOB_NAME, { state: 'failed' }),
  ])

  return {
    stageEmails: { pending: stageEmailPending, failed: stageEmailFailed },
    reminders: { pending: remindersPending },
    dailyBrief: { pending: dailyBriefPending },
    hireFlow: { pending: hireFlowPending, failed: hireFlowFailed },
    resumeProcess: { pending: resumeProcessPending, failed: resumeProcessFailed },
    workEmailSync: { pending: workEmailSyncPending, failed: workEmailSyncFailed },
  }
}
