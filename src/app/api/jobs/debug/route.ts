/**
 * Debug API endpoint for job worker
 * Call this to see why jobs might not be running
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseUrlSet: !!process.env.DATABASE_URL,
    openaiKeySet: !!process.env.OPENAI_API_KEY,
    nextRuntime: process.env.NEXT_RUNTIME,
  }

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    results.error = 'DATABASE_URL is not set'
    return NextResponse.json(results)
  }

  // Try to initialize the worker
  try {
    const { initializeWorker, getWorker } = await import('@/lib/jobs/worker')
    
    // Check if already initialized
    const existingWorker = getWorker()
    results.workerAlreadyInitialized = !!existingWorker

    // Try to initialize
    console.log('[Debug API] Attempting to initialize worker...')
    const boss = await initializeWorker()
    results.workerInitialized = !!boss
    results.workerState = boss ? 'started' : 'failed'

    // Check job counts
    if (boss) {
      try {
        // Get count of jobs by state
        const { prisma } = await import('@/lib/prisma')
        const jobCounts = await prisma.$queryRaw`
          SELECT name, state, COUNT(*) as count 
          FROM pgboss.job 
          WHERE name NOT LIKE '__pgboss%'
          GROUP BY name, state
        `
        results.jobCounts = jobCounts
      } catch (e) {
        results.jobCountError = e instanceof Error ? e.message : 'Unknown error'
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    results.initError = error instanceof Error ? error.message : 'Unknown error'
    results.initStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(results, { status: 500 })
  }
}

export async function POST() {
  // Force re-initialization
  try {
    const { initializeWorker } = await import('@/lib/jobs/worker')
    console.log('[Debug API] Force initializing worker...')
    const boss = await initializeWorker()
    
    return NextResponse.json({
      success: true,
      workerState: boss ? 'started' : 'failed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}
