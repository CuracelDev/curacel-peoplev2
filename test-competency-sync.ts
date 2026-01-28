/**
 * Test script to trigger competency framework sync
 * Run with: npx tsx test-competency-sync.ts
 */

import { PrismaClient } from '@prisma/client'
import { CompetencyFrameworkSyncService } from './src/lib/competency-framework/sync-service'

const prisma = new PrismaClient()

async function testSync() {
  console.log('🔄 Starting competency framework sync test...\n')

  const syncService = new CompetencyFrameworkSyncService(prisma)

  try {
    // Get all sources
    const sources = await prisma.competencyFrameworkSource.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    console.log(`Found ${sources.length} framework sources\n`)

    // Sync each source individually to see detailed results
    for (const source of sources) {
      console.log(`\n📊 Syncing: ${source.name} (${source.type})`)
      console.log(`   Sheet: ${source.sheetUrl}`)
      if (source.gidOrTabName) {
        console.log(`   Tab: ${source.gidOrTabName}`)
      }

      try {
        const result = await syncService.syncSource(source.id, { forceRefresh: true })

        if (result.success) {
          console.log(`   ✅ Success! Synced ${result.recordsSynced} records in ${result.syncDuration}ms`)
        } else {
          console.log(`   ❌ Failed: ${result.error}`)
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    console.log('\n\n📈 Final Results:')
    const updated = await prisma.competencyFrameworkSource.findMany({
      where: { isActive: true },
      select: {
        name: true,
        lastSyncStatus: true,
        lastSyncError: true,
        _count: {
          select: { coreCompetencies: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    for (const source of updated) {
      const status = source.lastSyncStatus === 'SUCCESS' ? '✅' : '❌'
      console.log(`${status} ${source.name}: ${source._count.coreCompetencies} core competencies`)
      if (source.lastSyncError) {
        console.log(`   Error: ${source.lastSyncError.substring(0, 100)}...`)
      }
    }
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSync()
