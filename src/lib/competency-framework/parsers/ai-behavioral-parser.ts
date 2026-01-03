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

  // First row should be headers
  const headerRow = rows[0]
  const formatType = detectSheetFormat(headerRow)

  if (formatType !== 'AI_BEHAVIORAL') {
    throw new Error(`Expected AI_BEHAVIORAL format, got ${formatType}`)
  }

  const levelNames = extractLevelNames(headerRow, formatType)
  const { min, max } = getLevelBounds(formatType)

  // Parse core competencies
  const coreCompetencies: ParsedCoreCompetency[] = []

  // Skip header row, start from row 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty rows
    if (isEmptyRow(row)) continue

    // Skip any additional header rows
    if (isHeaderRow(row)) continue

    // Column A: Competency name
    const competencyName = cleanCellValue(row[0])
    if (!competencyName) continue

    // In AI format, each row is a separate core competency with embedded levels
    // We'll create a single sub-competency for each core competency

    // Column B: Level 0 - Unacceptable
    const unacceptableDesc = cleanCellValue(row[1])
    const unacceptableIndicators = parseBehavioralIndicators(row[1] || '')

    // Column C: Level 1 - Basic
    const basicDesc = cleanCellValue(row[2])
    const basicIndicators = parseBehavioralIndicators(row[2] || '')

    // Column D: Level 2 - Intermediate
    const intermediateDesc = cleanCellValue(row[3])
    const intermediateIndicators = parseBehavioralIndicators(row[3] || '')

    // Column E: Level 3 - Proficient
    const proficientDesc = cleanCellValue(row[4])
    const proficientIndicators = parseBehavioralIndicators(row[4] || '')

    // Column F: Level 4 - Advanced
    const advancedDesc = cleanCellValue(row[5])
    const advancedIndicators = parseBehavioralIndicators(row[5] || '')

    // Build level descriptions
    const levels: ParsedLevel[] = [
      {
        level: 0,
        name: 'Unacceptable',
        description: unacceptableDesc,
      },
      {
        level: 1,
        name: 'Basic',
        description: basicDesc,
      },
      {
        level: 2,
        name: 'Intermediate',
        description: intermediateDesc,
      },
      {
        level: 3,
        name: 'Proficient',
        description: proficientDesc,
      },
      {
        level: 4,
        name: 'Advanced',
        description: advancedDesc,
      },
    ].filter(level => level.description)

    // Build behavioral indicators
    const behavioralIndicators: ParsedBehavioralIndicator[] = [
      {
        level: 0,
        levelName: 'Unacceptable',
        indicators: unacceptableIndicators,
      },
      {
        level: 1,
        levelName: 'Basic',
        indicators: basicIndicators,
      },
      {
        level: 2,
        levelName: 'Intermediate',
        indicators: intermediateIndicators,
      },
      {
        level: 3,
        levelName: 'Proficient',
        indicators: proficientIndicators,
      },
      {
        level: 4,
        levelName: 'Advanced',
        indicators: advancedIndicators,
      },
    ].filter(bi => bi.indicators.length > 0)

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
