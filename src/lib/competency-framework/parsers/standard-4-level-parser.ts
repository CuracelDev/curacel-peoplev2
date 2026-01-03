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
  findHeaderRow,
  findColumnIndex,
  findLevelColumns,
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

  // Find the header row
  const headerResult = findHeaderRow(rows)
  if (!headerResult) {
    throw new Error('Could not find header row in sheet')
  }

  const { headerRow, startIndex } = headerResult
  // We're already in the standard-4-level parser, so format is known
  const formatType = 'STANDARD_4_LEVEL'

  const levelNames = extractLevelNames(headerRow, formatType)
  const { min, max } = getLevelBounds(formatType)

  // Find column indices dynamically
  const functionCol = findColumnIndex(headerRow, 'function')
  const objCol = findColumnIndex(headerRow, 'objective')
  const coreCompCol = findColumnIndex(headerRow, 'core competenc')
  const subCompCol = findColumnIndex(headerRow, 'sub competenc')
  const levelCols = findLevelColumns(headerRow)

  console.log(`[standard-4-level] Column mapping: function=${functionCol}, obj=${objCol}, core=${coreCompCol}, sub=${subCompCol}, levels=${levelCols.join(',')}`)

  // Parse core competencies
  const coreCompetencies: ParsedCoreCompetency[] = []
  let currentFunction = ''
  let currentCoreComp: ParsedCoreCompetency | null = null

  // Skip header row, start from the row after the header
  for (let i = startIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty rows
    if (isEmptyRow(row)) continue

    // Skip any additional header rows
    if (isHeaderRow(row)) continue

    // Function column (if found, only set on first row of each function group)
    if (functionCol >= 0) {
      const functionValue = cleanCellValue(row[functionCol])
      if (functionValue) {
        currentFunction = functionValue
      }
    }

    // Function Objective column (optional, we store in description)
    const functionObjective = objCol >= 0 ? cleanCellValue(row[objCol]) : ''

    // Core Competency column (only set on first row of each core competency group)
    if (coreCompCol >= 0) {
      const coreCompName = cleanCellValue(row[coreCompCol])
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
    }

    // Sub-competency column (required)
    const subCompName = subCompCol >= 0 ? cleanCellValue(row[subCompCol]) : ''
    if (!subCompName || !currentCoreComp) {
      // If we have no sub-competency name, skip this row
      continue
    }

    // Level descriptions from dynamic columns
    const levels: ParsedLevel[] = []
    const levelNamesArray = ['Basic', 'Intermediate', 'Proficient', 'Advanced']

    for (let levelIdx = 0; levelIdx < Math.min(levelCols.length, 4); levelIdx++) {
      const colIdx = levelCols[levelIdx]
      const description = cleanCellValue(row[colIdx]) || ''
      if (description) {
        levels.push({
          level: levelIdx + 1,
          name: levelNamesArray[levelIdx],
          description,
        })
      }
    }

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
