/**
 * Parser for standard 4-level competency framework format
 * Used by: People Ops, Sales, Finance, Product, Marketing, Success, Engineering
 */

import type {
  ParsedCompetencyFramework,
  ParsedCoreCompetency,
  ParsedSubCompetency,
  ParsedLevel,
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
  parseSheetMetadata,
} from './base-parser'

/**
 * Parse a standard 4-level competency framework sheet
 */
export async function parseStandard4LevelSheet(
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

  if (formatType !== 'STANDARD_4_LEVEL') {
    throw new Error(`Expected STANDARD_4_LEVEL format, got ${formatType}`)
  }

  const levelNames = extractLevelNames(headerRow, formatType)
  const { min, max } = getLevelBounds(formatType)

  // Parse core competencies
  const coreCompetencies: ParsedCoreCompetency[] = []
  let currentFunction = ''
  let currentCoreComp: ParsedCoreCompetency | null = null

  // Skip header row, start from row 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty rows
    if (isEmptyRow(row)) continue

    // Skip any additional header rows
    if (isHeaderRow(row)) continue

    // Column A: Function (only set on first row of each function group)
    const functionValue = cleanCellValue(row[0])
    if (functionValue) {
      currentFunction = functionValue
    }

    // Column B: Function Objective (optional, we store in description)
    const functionObjective = cleanCellValue(row[1])

    // Column C: Core Competency (only set on first row of each core competency group)
    const coreCompName = cleanCellValue(row[2])
    if (coreCompName) {
      // Save previous core competency if it exists
      if (currentCoreComp && currentCoreComp.subCompetencies.length > 0) {
        coreCompetencies.push(currentCoreComp)
      }

      // Start new core competency
      currentCoreComp = {
        name: coreCompName,
        description: functionObjective || undefined,
        functionArea: currentFunction || undefined,
        subCompetencies: [],
      }
    }

    // Column D: Sub-competency (required)
    const subCompName = cleanCellValue(row[3])
    if (!subCompName || !currentCoreComp) {
      // If we have no sub-competency name, skip this row
      continue
    }

    // Columns E-H: Level descriptions
    const levels: ParsedLevel[] = [
      {
        level: 1,
        name: 'Basic',
        description: cleanCellValue(row[4]) || '',
      },
      {
        level: 2,
        name: 'Intermediate',
        description: cleanCellValue(row[5]) || '',
      },
      {
        level: 3,
        name: 'Proficient',
        description: cleanCellValue(row[6]) || '',
      },
      {
        level: 4,
        name: 'Advanced',
        description: cleanCellValue(row[7]) || '',
      },
    ].filter(level => level.description) // Only include levels with descriptions

    // Create sub-competency
    const subComp: ParsedSubCompetency = {
      name: subCompName,
      levels,
      hasBehavioralIndicators: false,
    }

    currentCoreComp.subCompetencies.push(subComp)
  }

  // Don't forget the last core competency
  if (currentCoreComp && currentCoreComp.subCompetencies.length > 0) {
    coreCompetencies.push(currentCoreComp)
  }

  return {
    metadata,
    formatType: 'STANDARD_4_LEVEL',
    levelNames,
    minLevel: min,
    maxLevel: max,
    coreCompetencies,
  }
}
