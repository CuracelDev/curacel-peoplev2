/**
 * Seed Default Hiring Flows
 *
 * This script creates the default hiring flows and their initial snapshots.
 * Run with: npx tsx scripts/seed-hiring-flows.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_FLOWS = [
  {
    name: 'Standard',
    description: 'General hiring flow for most roles',
    stages: ['Apply', 'Short Listed', 'People Chat', 'Assessment', 'Team Chat', 'Trial', 'CEO Chat', 'Offer'],
    isDefault: true,
  },
  {
    name: 'Engineering',
    description: 'Engineering flow with technical assessments',
    stages: ['Apply', 'Short Listed', 'Assessment (Kand.io)', 'Assessment (Coding Test)', 'Trial', 'Team Chat', 'CEO Chat', 'Offer'],
    isDefault: false,
  },
  {
    name: 'Sales',
    description: 'Sales flow with advisor chat',
    stages: ['Apply', 'Short Listed', 'People Chat', 'Assessment', 'Team Chat', 'Advisor Chat', 'Trial', 'CEO Chat', 'Offer'],
    isDefault: false,
  },
]

async function main() {
  console.log('🚀 Seeding hiring flows...')

  for (const flowData of DEFAULT_FLOWS) {
    // Check if flow already exists
    const existingFlow = await prisma.hiringFlow.findUnique({
      where: { name: flowData.name },
      include: { snapshots: true },
    })

    if (existingFlow) {
      const existingStages = (existingFlow.stages as string[]) || []
      if (!existingStages.includes('Short Listed') && flowData.stages.includes('Short Listed')) {
        const insertIndex = Math.min(1, existingStages.length)
        const nextStages = [...existingStages]
        nextStages.splice(insertIndex, 0, 'Short Listed')

        const latestVersion = existingFlow.snapshots.reduce(
          (max, snapshot) => Math.max(max, snapshot.version),
          0
        )

        await prisma.hiringFlow.update({
          where: { id: existingFlow.id },
          data: {
            stages: nextStages,
            snapshots: {
              create: {
                version: latestVersion + 1,
                stages: nextStages,
              },
            },
          },
        })

        console.log(`✅ Updated flow "${flowData.name}" to include Short Listed (snapshot v${latestVersion + 1})`)
      } else {
        console.log(`⏭️  Flow "${flowData.name}" already exists (${existingFlow.snapshots.length} snapshots)`)
      }
      continue
    }

    // Create the flow with its first snapshot
    const flow = await prisma.hiringFlow.create({
      data: {
        name: flowData.name,
        description: flowData.description,
        stages: flowData.stages,
        isDefault: flowData.isDefault,
        isActive: true,
        snapshots: {
          create: {
            version: 1,
            stages: flowData.stages,
          },
        },
      },
      include: { snapshots: true },
    })

    console.log(`✅ Created flow "${flow.name}" with snapshot v1`)
  }

  // Backfill existing jobs with hiringFlowId
  const jobsWithLegacyFlow = await prisma.job.findMany({
    where: {
      hiringFlowId: { not: null },
      hiringFlowSnapshotId: null,
    },
  })

  if (jobsWithLegacyFlow.length > 0) {
    console.log(`\n📋 Found ${jobsWithLegacyFlow.length} jobs with legacy hiringFlowId to migrate...`)

    // Get all flows with their latest snapshots
    const flows = await prisma.hiringFlow.findMany({
      include: {
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    const flowMap = new Map<string, string>()
    for (const flow of flows) {
      if (flow.snapshots[0]) {
        // Map by flow name (lowercase for matching)
        flowMap.set(flow.name.toLowerCase(), flow.snapshots[0].id)
      }
    }

    for (const job of jobsWithLegacyFlow) {
      // Try to match by legacy hiringFlowId (which was the flow name)
      const snapshotId = flowMap.get(job.hiringFlowId!.toLowerCase())

      if (snapshotId) {
        await prisma.job.update({
          where: { id: job.id },
          data: { hiringFlowSnapshotId: snapshotId },
        })
        console.log(`  ✅ Migrated job "${job.title}" to snapshot`)
      } else {
        console.log(`  ⚠️  Could not find matching flow for job "${job.title}" (hiringFlowId: ${job.hiringFlowId})`)
      }
    }
  }

  console.log('\n✨ Done!')
}

main()
  .catch((e) => {
    console.error('Error seeding hiring flows:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
