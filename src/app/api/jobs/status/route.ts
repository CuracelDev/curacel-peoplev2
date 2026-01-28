/**
 * Job Queue Status API Route
 *
 * GET /api/jobs/status - Get current queue statistics
 */

import { NextResponse } from 'next/server'
import { getWorker, getQueueStats } from '@/lib/jobs/worker'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const worker = getWorker()
    const isRunning = worker !== null

    // Get queue stats from pg-boss
    const pgBossStats = isRunning ? await getQueueStats() : null

    // Get database stats for queued emails
    const [pendingEmails, processingEmails, sentEmails, failedEmails, cancelledEmails] =
      await Promise.all([
        prisma.queuedStageEmail.count({ where: { status: 'PENDING' } }),
        prisma.queuedStageEmail.count({ where: { status: 'PROCESSING' } }),
        prisma.queuedStageEmail.count({ where: { status: 'SENT' } }),
        prisma.queuedStageEmail.count({ where: { status: 'FAILED' } }),
        prisma.queuedStageEmail.count({ where: { status: 'CANCELLED' } }),
      ])

    // Get reminder stats
    const [pendingReminders, sentReminders, cancelledReminders] = await Promise.all([
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

    // Get recent job executions
    const recentJobs = await prisma.jobExecution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      worker: {
        running: isRunning,
        pgBossStats,
      },
      queuedEmails: {
        pending: pendingEmails,
        processing: processingEmails,
        sent: sentEmails,
        failed: failedEmails,
        cancelled: cancelledEmails,
        total: pendingEmails + processingEmails + sentEmails + failedEmails + cancelledEmails,
      },
      reminders: {
        pending: pendingReminders,
        sent: sentReminders,
        cancelled: cancelledReminders,
      },
      recentJobs,
    })
  } catch (error) {
    console.error('[API/jobs/status] Failed to get status:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    )
  }
}
