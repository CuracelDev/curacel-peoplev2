/**
 * Export all competency frameworks to a markdown file
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function exportCompetencies() {
  console.log('📊 Exporting competency frameworks...')

  // Fetch all sources
  const sources = await prisma.competencyFrameworkSource.findMany({
    where: { isActive: true },
    include: {
      coreCompetencies: {
        include: {
          subCompetencies: true,
        },
      },
    },
    orderBy: [
      { type: 'asc' },
      { department: 'asc' },
    ],
  })

  let markdown = `# Curacel Competency Frameworks\n\n`
  markdown += `*Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*\n\n`
  markdown += `## Overview\n\n`
  markdown += `This document contains all ${sources.length} competency frameworks used across Curacel.\n\n`

  // Summary table
  markdown += `### Framework Summary\n\n`
  markdown += `| Framework | Type | Department | Core Competencies | Sub-Competencies | Format |\n`
  markdown += `|-----------|------|------------|-------------------|------------------|--------|\n`

  for (const source of sources) {
    const subCompCount = source.coreCompetencies.reduce(
      (sum, cc) => sum + cc.subCompetencies.length,
      0
    )
    markdown += `| ${source.name} | ${source.type} | ${source.department || 'N/A'} | ${source.coreCompetencies.length} | ${subCompCount} | ${source.formatType} |\n`
  }

  markdown += `\n---\n\n`

  // Detailed sections
  for (const source of sources) {
    markdown += `## ${source.name}\n\n`
    markdown += `**Type:** ${source.type}\n\n`
    if (source.department) {
      markdown += `**Department:** ${source.department}\n\n`
    }
    markdown += `**Format:** ${source.formatType}\n\n`
    markdown += `**Levels:** ${(source.levelNames as string[])?.join(', ') || 'N/A'}\n\n`
    markdown += `**Sheet:** [View Source](${source.sheetUrl})\n\n`
    markdown += `**Last Synced:** ${source.lastSyncedAt ? new Date(source.lastSyncedAt).toLocaleDateString() : 'Never'}\n\n`

    if (source.coreCompetencies.length === 0) {
      markdown += `*No competencies synced yet*\n\n`
      continue
    }

    for (const coreComp of source.coreCompetencies) {
      markdown += `### ${coreComp.name}\n\n`

      if (coreComp.description) {
        markdown += `*${coreComp.description}*\n\n`
      }

      if (coreComp.functionArea) {
        markdown += `**Function Area:** ${coreComp.functionArea}\n\n`
      }

      if (coreComp.category) {
        markdown += `**Category:** ${coreComp.category}\n\n`
      }

      for (const subComp of coreComp.subCompetencies) {
        markdown += `#### ${subComp.name}\n\n`

        if (subComp.description) {
          markdown += `${subComp.description}\n\n`
        }

        // Parse level descriptions from JSON
        const levelDescriptions = subComp.levelDescriptions as Record<string, string>
        if (levelDescriptions && Object.keys(levelDescriptions).length > 0) {
          markdown += `**Level Definitions:**\n\n`

          const levelNames = (source.levelNames as string[]) || []
          const sortedLevels = Object.entries(levelDescriptions).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))

          for (const [levelNum, description] of sortedLevels) {
            const levelIndex = parseInt(levelNum) - (source.minLevel || 1)
            const levelName = levelNames[levelIndex] || `Level ${levelNum}`
            markdown += `- **${levelName} (Level ${levelNum}):** ${description}\n`
          }
          markdown += `\n`
        }
      }

      markdown += `\n`
    }

    markdown += `---\n\n`
  }

  // Statistics
  markdown += `## Statistics\n\n`
  const totalCoreComp = sources.reduce((sum, s) => sum + s.coreCompetencies.length, 0)
  const totalSubComp = sources.reduce(
    (sum, s) => sum + s.coreCompetencies.reduce((s2, cc) => s2 + cc.subCompetencies.length, 0),
    0
  )
  const totalLevels = sources.reduce(
    (sum, s) => sum + s.coreCompetencies.reduce(
      (s2, cc) => s2 + cc.subCompetencies.reduce((s3, sc) => {
        const levels = sc.levelDescriptions as Record<string, string>
        return s3 + (levels ? Object.keys(levels).length : 0)
      }, 0),
      0
    ),
    0
  )

  markdown += `- **Total Frameworks:** ${sources.length}\n`
  markdown += `- **Total Core Competencies:** ${totalCoreComp}\n`
  markdown += `- **Total Sub-Competencies:** ${totalSubComp}\n`
  markdown += `- **Total Level Definitions:** ${totalLevels}\n\n`

  markdown += `### By Department\n\n`
  const byDept = sources
    .filter(s => s.department)
    .reduce((acc, s) => {
      const dept = s.department!
      if (!acc[dept]) {
        acc[dept] = { sources: 0, coreComp: 0, subComp: 0 }
      }
      acc[dept].sources++
      acc[dept].coreComp += s.coreCompetencies.length
      acc[dept].subComp += s.coreCompetencies.reduce((sum, cc) => sum + cc.subCompetencies.length, 0)
      return acc
    }, {} as Record<string, { sources: number; coreComp: number; subComp: number }>)

  for (const [dept, stats] of Object.entries(byDept)) {
    markdown += `- **${dept}:** ${stats.coreComp} core competencies, ${stats.subComp} sub-competencies\n`
  }

  const outputPath = join(process.cwd(), 'curacel-competencies.md')
  writeFileSync(outputPath, markdown, 'utf-8')

  console.log(`✅ Exported to: ${outputPath}`)
  console.log(`📊 Total: ${sources.length} frameworks, ${totalCoreComp} core competencies, ${totalSubComp} sub-competencies`)
}

exportCompetencies()
  .catch((error) => {
    console.error('Error exporting competencies:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
