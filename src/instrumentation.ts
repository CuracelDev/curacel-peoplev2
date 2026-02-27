/**
 * Next.js Instrumentation
 * 
 * This file runs once when the server starts.
 * We use it to initialize the background job worker.
 */

export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Server starting, initializing worker...')
    
    try {
      const { initializeWorker } = await import('./lib/jobs/worker')
      await initializeWorker()
      console.log('[Instrumentation] Worker initialized successfully')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize worker:', error)
      // Don't crash the server - jobs will work when manually triggered
    }
  }
}
