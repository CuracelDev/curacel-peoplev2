/**
 * Parser for AI competency framework with behavioral indicators
 * Used by: AI Framework
 */

import type {
  ParsedCompetencyFramework,
  ParsedCoreCompetency,
  ParsedSubCompetency,
  ParsedLevel,
  ParsedBehavioralIndicator,
  SheetRow,
  SheetMetadata,
} from './types'
import {
  fetchSheetData,
  detectSheetFormat,
  extractLevelNames,
  getLevelBounds,
  cleanCellValue,
  isEmptyRow,
  isHeaderRow,
  findHeaderRow,
  findColumnIndex,
  findLevelColumns,
} from './base-parser'

/**
 * Parse behavioral indicators from a cell
 * Each level cell can contain multiple behavioral indicators separated by newlines or bullet points
 */
function parseBehavioralIndicators(cellValue: string): string[] {
  if (!cellValue) return []

  // Split by newlines or bullet points
  const indicators = cellValue
    .split(/\n|•|☑|☐/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter(s => !s.match(/^(level|basic|intermediate|proficient|advanced|unacceptable)/i))

  return indicators
}

/**
 * Parse an AI behavioral competency framework sheet
 */
export async function parseAIBehavioralSheet(
  metadata: SheetMetadata
): Promise<ParsedCompetencyFramework> {
  const { sheetUrl, tabName } = metadata

  // Fetch raw data
  const rows = await fetchSheetData(sheetUrl, tabName)

  if (rows.length === 0) {
    throw new Error('Sheet is empty')
  }

  // Find the header row
  const headerResult = findHeaderRow(rows)
  if (!headerResult) {
    throw new Error('Could not find header row in sheet')
  }

  const { headerRow, startIndex } = headerResult
  const formatType = detectSheetFormat(headerRow)

  if (formatType !== 'AI_BEHAVIORAL') {
    throw new Error(`Expected AI_BEHAVIORAL format, got ${formatType}`)
  }

  const levelNames = extractLevelNames(headerRow, formatType)
  const { min, max } = getLevelBounds(formatType)

  // Find column indices dynamically
  const compCol = findColumnIndex(headerRow, 'competency')
  const levelCols = findLevelColumns(headerRow)

  console.log(`[ai-behavioral] compCol=${compCol}, levelCols=${levelCols.join(',')}`)

  // Parse core competencies
  const coreCompetencies: ParsedCoreCompetency[] = []

  // Skip header row, start from the row after the header
  for (let i = startIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty rows
    if (isEmptyRow(row)) continue

    // Skip any additional header rows
    if (isHeaderRow(row)) continue

    // Competency name column
    const competencyName = compCol >= 0 ? cleanCellValue(row[compCol]) : cleanCellValue(row[0])
    if (!competencyName) continue

    // In AI format, each row is a separate core competency with embedded levels
    // Level columns are in levelCols array (should be 5 columns: Unacceptable, Basic, Intermediate, Proficient, Advanced)
    const levelDescriptions: string[] = []
    const levelIndicators: string[][] = []

    for (const colIdx of levelCols) {
      const desc = cleanCellValue(row[colIdx])
      const indicators = parseBehavioralIndicators(row[colIdx] || '')
      levelDescriptions.push(desc)
      levelIndicators.push(indicators)
    }

    // Build level descriptions dynamically
    const levelNamesArray = ['Unacceptable', 'Basic', 'Intermediate', 'Proficient', 'Advanced']
    const levels: ParsedLevel[] = []
    const behavioralIndicators: ParsedBehavioralIndicator[] = []

    for (let levelIdx = 0; levelIdx < levelDescriptions.length && levelIdx < 5; levelIdx++) {
      const desc = levelDescriptions[levelIdx]
      const indicators = levelIndicators[levelIdx]

      if (desc) {
        levels.push({
          level: levelIdx, // AI format starts at 0
          name: levelNamesArray[levelIdx] || `Level ${levelIdx}`,
          description: desc,
        })
      }

      if (indicators.length > 0) {
        behavioralIndicators.push({
          level: levelIdx,
          levelName: levelNamesArray[levelIdx] || `Level ${levelIdx}`,
          indicators,
        })
      }
    }

    // Create sub-competency with behavioral indicators
    const subComp: ParsedSubCompetency = {
      name: competencyName,
      levels,
      hasBehavioralIndicators: true,
      behavioralIndicators,
    }

    // Create core competency (in AI format, core = sub)
    const coreComp: ParsedCoreCompetency = {
      name: competencyName,
      category: 'AI Competencies',
      subCompetencies: [subComp],
    }

    coreCompetencies.push(coreComp)
  }

  return {
    metadata,
    formatType: 'AI_BEHAVIORAL',
    levelNames,
    minLevel: min,
    maxLevel: max,
    coreCompetencies,
  }
}
