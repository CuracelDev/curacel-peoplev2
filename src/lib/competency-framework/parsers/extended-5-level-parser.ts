/**
 * Parser for extended 5-level competency framework format
 * Used by: HealthOps, Company Values
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
  findHeaderRow,
  findColumnIndex,
  findLevelColumns,
} from './base-parser'

/**
 * Parse an extended 5-level competency framework sheet
 */
export async function parseExtended5LevelSheet(
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

  if (formatType !== 'EXTENDED_5_LEVEL') {
    throw new Error(`Expected EXTENDED_5_LEVEL format, got ${formatType}`)
  }

  const levelNames = extractLevelNames(headerRow, formatType)
  const { min, max } = getLevelBounds(formatType)

  // Determine if this is Values format or standard competency format
  const allHeadersText = Object.values(headerRow).join('|').toLowerCase()
  const isValuesFormat = allHeadersText.includes('value definition')

  // Find column indices dynamically
  const levelCols = findLevelColumns(headerRow)
  console.log(`[extended-5-level] isValuesFormat=${isValuesFormat}, levelCols=${levelCols.join(',')}`)

  // Parse core competencies
  const coreCompetencies: ParsedCoreCompetency[] = []
  let currentFunction = '' // Or "Value" for Values format
  let currentCoreComp: ParsedCoreCompetency | null = null

  // Skip header row, start from the row after the header
  for (let i = startIndex + 1; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty rows
    if (isEmptyRow(row)) continue

    // Skip any additional header rows
    if (isHeaderRow(row)) continue

    if (isValuesFormat) {
      const valueCol = findColumnIndex(headerRow, 'value')
      const valueDefCol = findColumnIndex(headerRow, 'value definition')
      const compCol = findColumnIndex(headerRow, 'competency')
      const defCol = findColumnIndex(headerRow, 'definitions')

      // Values format: dynamic columns
      const valueName = valueCol >= 0 ? cleanCellValue(row[valueCol]) : ''
      const valueDefinition = valueDefCol >= 0 ? cleanCellValue(row[valueDefCol]) : ''
      const competencyName = compCol >= 0 ? cleanCellValue(row[compCol]) : ''
      const competencyDefinition = defCol >= 0 ? cleanCellValue(row[defCol]) : ''

      // Update current value if set
      if (valueName) {
        currentFunction = valueName
      }

      // New core competency when competency name is set
      if (competencyName) {
        // Save previous core competency if it exists
        if (currentCoreComp && currentCoreComp.subCompetencies.length > 0) {
          coreCompetencies.push(currentCoreComp)
        }

        // In Values format, the "competency" is actually the sub-competency
        // We'll use the Value as the core competency
        currentCoreComp = {
          name: currentFunction,
          description: valueDefinition || undefined,
          category: 'Company Values',
          subCompetencies: [],
        }
      }

      // Sub-competency (the competency from competency column)
      if (!competencyName || !currentCoreComp) {
        continue
      }

      // Level descriptions from dynamic columns
      const levels: ParsedLevel[] = []
      const levelNamesArray = ['Basic', 'Intermediate', 'Proficient', 'Advanced', 'Expert']

      for (let levelIdx = 0; levelIdx < Math.min(levelCols.length, 5); levelIdx++) {
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

      const subComp: ParsedSubCompetency = {
        name: competencyName,
        description: competencyDefinition || undefined,
        levels,
        hasBehavioralIndicators: false,
      }

      currentCoreComp.subCompetencies.push(subComp)
    } else {
      // Standard competency format with 5 levels (HealthOps)
      const functionCol = findColumnIndex(headerRow, 'function')
      const objCol = findColumnIndex(headerRow, 'objective')
      const coreCompCol = findColumnIndex(headerRow, 'core competenc')
      const subCompCol = findColumnIndex(headerRow, 'sub competenc')

      // Function column
      if (functionCol >= 0) {
        const functionValue = cleanCellValue(row[functionCol])
        if (functionValue) {
          currentFunction = functionValue
        }
      }

      // Function Objective
      const functionObjective = objCol >= 0 ? cleanCellValue(row[objCol]) : ''

      // Core Competency
      if (coreCompCol >= 0) {
        const coreCompName = cleanCellValue(row[coreCompCol])
        if (coreCompName) {
          if (currentCoreComp && currentCoreComp.subCompetencies.length > 0) {
            coreCompetencies.push(currentCoreComp)
          }

          currentCoreComp = {
            name: coreCompName,
            description: functionObjective || undefined,
            functionArea: currentFunction || undefined,
            subCompetencies: [],
          }
        }
      }

      // Sub-competency
      const subCompName = subCompCol >= 0 ? cleanCellValue(row[subCompCol]) : ''
      if (!subCompName || !currentCoreComp) {
        continue
      }

      // Level descriptions from dynamic columns
      const levels: ParsedLevel[] = []
      const levelNamesArray = ['Basic', 'Intermediate', 'Proficient', 'Advanced', 'Expert']

      for (let levelIdx = 0; levelIdx < Math.min(levelCols.length, 5); levelIdx++) {
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

      const subComp: ParsedSubCompetency = {
        name: subCompName,
        levels,
        hasBehavioralIndicators: false,
      }

      currentCoreComp.subCompetencies.push(subComp)
    }
  }

  // Don't forget the last core competency
  if (currentCoreComp && currentCoreComp.subCompetencies.length > 0) {
    coreCompetencies.push(currentCoreComp)
  }

  return {
    metadata,
    formatType: 'EXTENDED_5_LEVEL',
    levelNames,
    minLevel: min,
    maxLevel: max,
    coreCompetencies,
  }
}
