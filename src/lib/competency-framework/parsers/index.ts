/**
 * Main export file for competency framework parsers
 */

import type {
  ParsedCompetencyFramework,
  SheetMetadata,
  SheetFormatType,
} from './types'
import { fetchSheetData, detectSheetFormat } from './base-parser'
import { parseStandard4LevelSheet } from './standard-4-level-parser'
import { parseExtended5LevelSheet } from './extended-5-level-parser'
import { parseAIBehavioralSheet } from './ai-behavioral-parser'

// Re-export types
export * from './types'

// Re-export base utilities
export * from './base-parser'

// Re-export individual parsers
export { parseStandard4LevelSheet } from './standard-4-level-parser'
export { parseExtended5LevelSheet } from './extended-5-level-parser'
export { parseAIBehavioralSheet } from './ai-behavioral-parser'

/**
 * Parse a competency framework sheet automatically detecting the format
 */
export async function parseCompetencyFrameworkSheet(
  metadata: SheetMetadata
): Promise<ParsedCompetencyFramework> {
  const { sheetUrl, tabName } = metadata

  // Fetch first row to detect format
  const rows = await fetchSheetData(sheetUrl, tabName)

  if (rows.length === 0) {
    throw new Error('Sheet is empty')
  }

  const formatType = detectSheetFormat(rows[0])

  console.log(`[parseCompetencyFrameworkSheet] Detected format: ${formatType} for ${metadata.name}`)

  // Route to appropriate parser based on format
  switch (formatType) {
    case 'STANDARD_4_LEVEL':
      return parseStandard4LevelSheet(metadata)

    case 'EXTENDED_5_LEVEL':
      return parseExtended5LevelSheet(metadata)

    case 'AI_BEHAVIORAL':
      return parseAIBehavioralSheet(metadata)

    default:
      throw new Error(`Unsupported format type: ${formatType}`)
  }
}

/**
 * Batch parse multiple competency framework sheets
 */
export async function parseBulkCompetencyFrameworks(
  metadataList: SheetMetadata[]
): Promise<ParsedCompetencyFramework[]> {
  const results = await Promise.allSettled(
    metadataList.map(metadata => parseCompetencyFrameworkSheet(metadata))
  )

  const successful: ParsedCompetencyFramework[] = []
  const failed: Array<{ metadata: SheetMetadata; error: string }> = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value)
    } else {
      failed.push({
        metadata: metadataList[index],
        error: result.reason?.message || String(result.reason),
      })
    }
  })

  if (failed.length > 0) {
    console.error('[parseBulkCompetencyFrameworks] Failed to parse some frameworks:', failed)
  }

  console.log(`[parseBulkCompetencyFrameworks] Successfully parsed ${successful.length}/${metadataList.length} frameworks`)

  return successful
}
