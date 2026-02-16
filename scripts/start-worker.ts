/**
 * Start the background job worker
 * 
 * Usage: npx tsx scripts/start-worker.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env file manually
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  })
}

import { initializeWorker, stopWorker } from '../src/lib/jobs/worker'

async function main() {
  console.log('Starting background job worker...')
  
  try {
    const boss = await initializeWorker()
    console.log('Worker started successfully. Press Ctrl+C to stop.')
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down gracefully...')
      await stopWorker()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...')
      await stopWorker()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('Failed to start worker:', error)
    process.exit(1)
  }
}

main()
