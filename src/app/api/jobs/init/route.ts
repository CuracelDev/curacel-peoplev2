/**
 * Worker Initialization API Route
 *
 * Call this endpoint to initialize the pg-boss worker and start
 * processing background jobs. This should be called on app startup
 * or via a cron/health check.
 *
 * GET /api/jobs/init - Initialize worker and return status
 */

import { NextResponse } from 'next/server'
import { initializeWorker, getWorker, getQueueStats } from '@/lib/jobs/worker'

export async function GET() {
  try {
    // Check if already initialized
    const existingWorker = getWorker()
    if (existingWorker) {
      const stats = await getQueueStats()
      return NextResponse.json({
        status: 'already_running',
        message: 'Worker is already initialized and running',
        stats,
      })
    }

    // Initialize the worker
    await initializeWorker()
    const stats = await getQueueStats()

    return NextResponse.json({
      status: 'initialized',
      message: 'Worker initialized successfully',
      stats,
    })
  } catch (error) {
    console.error('[API/jobs/init] Failed to initialize worker:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to initialize worker',
      },
      { status: 500 }
    )
  }
}
