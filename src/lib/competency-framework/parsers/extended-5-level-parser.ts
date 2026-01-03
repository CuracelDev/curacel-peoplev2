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

  // Find the header row, or construct it if not found (some sheets don't return headers via public API)
  let headerResult = findHeaderRow(rows)
  let startIndex = 0

  if (!headerResult) {
    console.log('[extended-5-level] Header row not found, checking if this is Values format')
    // Check if first row looks like Values format data (has Value name, competency, etc.)
    const firstRow = rows[0]
    const hasValueData = Object.values(firstRow).some(v => v && v.length > 20) // Long descriptions

    if (hasValueData) {
      console.log('[extended-5-level] Constructing expected headers for Values format')
      // Construct expected headers for Values format
      const constructedHeader: SheetRow = {
        0: '', // Empty column A
        1: 'Values',
        2: 'Value Definition',
        3: '',
        4: 'Competency',
        5: 'Definitions',
        6: '',
        7: '1. Basic',
        8: '2. Intermediate',
        9: '3. Proficient',
        10: '4. Advanced',
        11: '5. Expert',
      }
      headerResult = { headerRow: constructedHeader, startIndex: -1 }
      startIndex = -1 // Data starts at row 0, so set startIndex to -1 so loop starts at 0
    } else {
      // Try standard competency format headers
      console.log('[extended-5-level] Constructing expected headers for standard format')
      const constructedHeader: SheetRow = {
        0: '', // Empty column A
        1: 'Function Objective',
        2: 'Core Competencies',
        3: 'Sub competencies',
        4: 'Basic',
        5: 'Intermediate',
        6: 'Proficient',
        7: 'Advanced',
        8: 'Expert',
      }
      headerResult = { headerRow: constructedHeader, startIndex: -1 }
      startIndex = -1 // Data starts at row 0, so set startIndex to -1 so loop starts at 0
    }
  } else {
    startIndex = headerResult.startIndex
  }

  const { headerRow } = headerResult
  // We're already in the extended-5-level parser, so format is known
  const formatType = 'EXTENDED_5_LEVEL'

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
      // HealthOps uses "Role" and "Competencies" instead of "Function" and "Core Competencies"
      let functionCol = findColumnIndex(headerRow, 'function')
      if (functionCol < 0) {
        functionCol = findColumnIndex(headerRow, 'role')
      }

      const objCol = findColumnIndex(headerRow, 'objective')

      let coreCompCol = findColumnIndex(headerRow, 'core competenc')
      if (coreCompCol < 0) {
        // Try just "competenc" but make sure it's not "sub competenc"
        const entries = Object.entries(headerRow)
        for (const [index, value] of entries) {
          const lowerValue = value?.toLowerCase() || ''
          if (lowerValue.includes('competenc') && !lowerValue.includes('sub')) {
            coreCompCol = parseInt(index)
            break
          }
        }
      }

      let subCompCol = findColumnIndex(headerRow, 'sub competenc')

      // HealthOps doesn't have a "sub competenc" column, just "competencies"
      // In this case, we'll treat "competencies" as the sub-competency column
      // and create a core competency for each role
      const hasSubCompCol = subCompCol >= 0

      // Function/Role column
      if (functionCol >= 0) {
        const functionValue = cleanCellValue(row[functionCol])
        if (functionValue) {
          currentFunction = functionValue

          // If no sub-competency column, create a core competency for each role
          if (!hasSubCompCol) {
            if (currentCoreComp && currentCoreComp.subCompetencies.length > 0) {
              coreCompetencies.push(currentCoreComp)
            }

            currentCoreComp = {
              name: functionValue, // Use role as core competency name
              description: undefined,
              subCompetencies: [],
            }
          }
        }
      }

      // Function Objective
      const functionObjective = objCol >= 0 ? cleanCellValue(row[objCol]) : ''

      // Core Competency (only if we have a sub-competency column)
      if (hasSubCompCol && coreCompCol >= 0) {
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
      let subCompName = ''
      if (hasSubCompCol) {
        subCompName = subCompCol >= 0 ? cleanCellValue(row[subCompCol]) : ''
      } else {
        // Use "competencies" column as sub-competency
        subCompName = coreCompCol >= 0 ? cleanCellValue(row[coreCompCol]) : ''
      }

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
