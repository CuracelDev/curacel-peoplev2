/**
 * Competency Framework Sync Service
 * Handles syncing data from Google Sheets to database
 */

import { PrismaClient } from '@prisma/client'
import type {
  ParsedCompetencyFramework,
  ParsedCoreCompetency,
  ParsedSubCompetency,
  SheetMetadata,
} from './parsers/types'
import { parseCompetencyFrameworkSheet } from './parsers'

interface SyncOptions {
  forceRefresh?: boolean // Ignore cache and force sync
}

interface SyncResult {
  success: boolean
  recordsSynced: number
  recordsFailed: number
  error?: string
  syncDuration: number
}

export class CompetencyFrameworkSyncService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Sync a single competency framework source from Google Sheets
   */
  async syncSource(
    sourceId: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now()
    let recordsSynced = 0
    let recordsFailed = 0

    try {
      // Fetch the source configuration
      const source = await this.prisma.competencyFrameworkSource.findUnique({
        where: { id: sourceId },
      })

      if (!source) {
        throw new Error(`Competency framework source ${sourceId} not found`)
      }

      // Check cache validity
      if (!options.forceRefresh && source.cacheValidUntil) {
        const now = new Date()
        if (source.cacheValidUntil > now) {
          console.log(`[CompetencyFrameworkSync] Cache valid until ${source.cacheValidUntil}, skipping sync`)
          return {
            success: true,
            recordsSynced: 0,
            recordsFailed: 0,
            syncDuration: Date.now() - startTime,
          }
        }
      }

      // Parse the Google Sheet
      const metadata: SheetMetadata = {
        type: source.type as any,
        name: source.name,
        department: source.department || undefined,
        sheetUrl: source.sheetUrl,
        sheetId: source.sheetId,
        tabName: source.gidOrTabName || undefined,
      }

      console.log(`[CompetencyFrameworkSync] Syncing ${source.name} from ${source.sheetUrl}`)

      const parsed = await parseCompetencyFrameworkSheet(metadata)

      // Begin transaction to update database
      await this.prisma.$transaction(async (tx) => {
        // Delete existing core competencies and their children (cascading delete)
        await tx.coreCompetency.deleteMany({
          where: { sourceId },
        })

        // Create new core competencies
        for (const coreComp of parsed.coreCompetencies) {
          const createdCoreComp = await tx.coreCompetency.create({
            data: {
              sourceId,
              name: coreComp.name,
              description: coreComp.description,
              functionArea: coreComp.functionArea,
              category: coreComp.category,
              sortOrder: recordsSynced++,
            },
          })

          // Create sub-competencies
          for (const subComp of coreComp.subCompetencies) {
            const levelDescriptions = subComp.levels.reduce(
              (acc, level) => {
                acc[level.level.toString()] = level.description
                return acc
              },
              {} as Record<string, string>
            )

            const behavioralIndicators = subComp.hasBehavioralIndicators && subComp.behavioralIndicators
              ? subComp.behavioralIndicators.reduce(
                  (acc, bi) => {
                    acc[bi.level.toString()] = bi.indicators
                    return acc
                  },
                  {} as Record<string, string[]>
                )
              : undefined

            await tx.subCompetency.create({
              data: {
                coreCompetencyId: createdCoreComp.id,
                name: subComp.name,
                description: subComp.description,
                levelDescriptions,
                hasBehavioralIndicators: subComp.hasBehavioralIndicators,
                behavioralIndicators: behavioralIndicators || undefined,
                sortOrder: recordsSynced++,
              },
            })
          }
        }

        // Update source metadata
        const cacheValidUntil = new Date()
        cacheValidUntil.setDate(cacheValidUntil.getDate() + 30) // 30 day cache

        await tx.competencyFrameworkSource.update({
          where: { id: sourceId },
          data: {
            formatType: parsed.formatType,
            levelNames: parsed.levelNames,
            minLevel: parsed.minLevel,
            maxLevel: parsed.maxLevel,
            lastSyncedAt: new Date(),
            lastSyncStatus: 'SUCCESS',
            lastSyncError: null,
            cacheValidUntil,
          },
        })
      })

      // Log sync success
      await this.prisma.competencySyncLog.create({
        data: {
          sourceId,
          status: 'SUCCESS',
          recordsSynced,
          recordsFailed: 0,
          syncDuration: Date.now() - startTime,
        },
      })

      return {
        success: true,
        recordsSynced,
        recordsFailed: 0,
        syncDuration: Date.now() - startTime,
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      console.error(`[CompetencyFrameworkSync] Error syncing source ${sourceId}:`, errorMessage)

      // Update source with error
      await this.prisma.competencyFrameworkSource.update({
        where: { id: sourceId },
        data: {
          lastSyncStatus: 'FAILED',
          lastSyncError: errorMessage,
          lastSyncedAt: new Date(),
        },
      })

      // Log sync failure
      await this.prisma.competencySyncLog.create({
        data: {
          sourceId,
          status: 'FAILED',
          recordsSynced,
          recordsFailed: 1,
          errorMessage,
          syncDuration: Date.now() - startTime,
        },
      })

      return {
        success: false,
        recordsSynced,
        recordsFailed: 1,
        error: errorMessage,
        syncDuration: Date.now() - startTime,
      }
    }
  }

  /**
   * Sync all active competency framework sources
   */
  async syncAllSources(options: SyncOptions = {}): Promise<{
    totalSynced: number
    totalFailed: number
    results: Array<{ sourceId: string; sourceName: string; result: SyncResult }>
  }> {
    const sources = await this.prisma.competencyFrameworkSource.findMany({
      where: { isActive: true },
    })

    const results = await Promise.allSettled(
      sources.map(async (source) => ({
        sourceId: source.id,
        sourceName: source.name,
        result: await this.syncSource(source.id, options),
      }))
    )

    let totalSynced = 0
    let totalFailed = 0
    const successfulResults: Array<{ sourceId: string; sourceName: string; result: SyncResult }> = []

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value)
        totalSynced += result.value.result.recordsSynced
        if (!result.value.result.success) {
          totalFailed++
        }
      } else {
        totalFailed++
      }
    })

    return {
      totalSynced,
      totalFailed,
      results: successfulResults,
    }
  }

  /**
   * Initialize framework sources from a list of metadata
   * Creates CompetencyFrameworkSource records if they don't exist
   */
  async initializeSources(metadataList: SheetMetadata[]): Promise<void> {
    for (const metadata of metadataList) {
      await this.prisma.competencyFrameworkSource.upsert({
        where: {
          type_department: {
            type: metadata.type,
            department: metadata.department || '',
          },
        },
        create: {
          type: metadata.type,
          name: metadata.name,
          department: metadata.department,
          sheetUrl: metadata.sheetUrl,
          sheetId: metadata.sheetId,
          gidOrTabName: metadata.tabName,
          formatType: 'STANDARD_4_LEVEL', // Will be updated on first sync
          levelNames: [],
          minLevel: 1,
          maxLevel: 4,
        },
        update: {
          name: metadata.name,
          sheetUrl: metadata.sheetUrl,
          sheetId: metadata.sheetId,
          gidOrTabName: metadata.tabName,
        },
      })
    }

    console.log(`[CompetencyFrameworkSync] Initialized ${metadataList.length} framework sources`)
  }
}
