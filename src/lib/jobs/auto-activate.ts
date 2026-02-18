
import PgBoss from 'pg-boss'
import { autoActivateEmployees } from '../employee-status'
import { prisma } from '../prisma'

export const AUTO_ACTIVATE_JOB_NAME = 'auto-activate-employees'

export async function initAutoActivateJob(boss: PgBoss) {
    await boss.work(AUTO_ACTIVATE_JOB_NAME, async () => {
        console.log('[Worker] Running auto-activation of employees...')
        const count = await autoActivateEmployees(prisma)
        console.log(`[Worker] Auto-activated ${count} employees`)
        return { count }
    })
}

export async function scheduleAutoActivate(boss: PgBoss) {
    await boss.schedule(AUTO_ACTIVATE_JOB_NAME, '0 * * * *', {}) // Every hour
    console.log('[Worker] Auto-activation job scheduled every hour')
}
