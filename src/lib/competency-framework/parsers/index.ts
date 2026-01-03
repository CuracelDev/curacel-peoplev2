/**
 * Main export file for competency framework parsers
 */

import type {
  ParsedCompetencyFramework,
  SheetMetadata,
  SheetFormatType,
} from './types'
import { fetchSheetData, detectSheetFormat, findHeaderRow } from './base-parser'
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

  // Fetch all rows to detect format
  const rows = await fetchSheetData(sheetUrl, tabName)

  if (rows.length === 0) {
    throw new Error('Sheet is empty')
  }

  // Try to find the actual header row (some sheets have empty rows or titles before headers)
  // If not found, each parser will construct expected headers based on data structure
  const headerResult = findHeaderRow(rows)

  let formatType: SheetFormatType

  if (headerResult) {
    formatType = detectSheetFormat(headerResult.headerRow)
  } else {
    // No header found - check if we have a known format type in metadata
    // Or try to infer from the data structure
    console.log('[parseCompetencyFrameworkSheet] No header row found, inferring format from metadata or data')

    // Check first row for format hints
    const firstRow = rows[0]
    const firstRowText = Object.values(firstRow).join(' ').toLowerCase()

    // AI format: typically starts with competency names like "AI Tool Proficiency"
    if (firstRowText.includes('ai ') || firstRowText.includes('tool') || firstRowText.includes('workflow')) {
      formatType = 'AI_BEHAVIORAL'
    }
    // Values format: has long value definitions
    else if (Object.values(firstRow).some(v => v && v.length > 100)) {
      formatType = 'EXTENDED_5_LEVEL' // Values use extended format
    }
    // Has "expert" keyword or 5+ columns with content
    else if (firstRowText.includes('expert') || Object.keys(firstRow).length >= 8) {
      formatType = 'EXTENDED_5_LEVEL'
    }
    // Default to standard 4-level
    else {
      formatType = 'STANDARD_4_LEVEL'
    }

    console.log(`[parseCompetencyFrameworkSheet] Inferred format: ${formatType}`)
  }

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
