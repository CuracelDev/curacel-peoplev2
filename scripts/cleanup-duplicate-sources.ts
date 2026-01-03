/**
 * Cleanup duplicate competency framework sources
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate competency framework sources...\n')

  // Find all sources
  const allSources = await prisma.competencyFrameworkSource.findMany({
    orderBy: [
      { type: 'asc' },
      { department: 'asc' },
      { createdAt: 'asc' }, // Keep the oldest one
    ],
  })

  console.log(`Found ${allSources.length} total sources\n`)

  // Group by type + department
  const grouped = new Map<string, typeof allSources>()

  for (const source of allSources) {
    const key = `${source.type}::${source.department || 'NULL'}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(source)
  }

  // Find and delete duplicates
  let deletedCount = 0

  for (const [key, sources] of grouped.entries()) {
    if (sources.length > 1) {
      console.log(`📋 Found ${sources.length} duplicates for: ${key}`)

      // Keep the first one (oldest), delete the rest
      const toKeep = sources[0]
      const toDelete = sources.slice(1)

      console.log(`   ✅ Keeping: ${toKeep.name} (${toKeep.id}) created ${toKeep.createdAt.toISOString()}`)

      for (const duplicate of toDelete) {
        console.log(`   ❌ Deleting: ${duplicate.name} (${duplicate.id}) created ${duplicate.createdAt.toISOString()}`)

        // Delete associated core competencies first (cascade should handle this, but being explicit)
        await prisma.competencyFrameworkSource.delete({
          where: { id: duplicate.id },
        })

        deletedCount++
      }

      console.log('')
    }
  }

  if (deletedCount === 0) {
    console.log('✨ No duplicates found!')
  } else {
    console.log(`\n✅ Deleted ${deletedCount} duplicate sources`)
  }

  // Show final count
  const finalCount = await prisma.competencyFrameworkSource.count()
  console.log(`\n📊 Final count: ${finalCount} unique sources`)
}

cleanupDuplicates()
  .catch((error) => {
    console.error('Error cleaning up duplicates:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
