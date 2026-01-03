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
  const isValuesFormat = Object.values(headerRow).some(v => v?.toLowerCase().includes('value'))

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
      // Values format: Column A = Value, Column B = Value Definition, Column C = Competency, Column D = Definition
      const valueName = cleanCellValue(row[0])
      const valueDefinition = cleanCellValue(row[1])
      const competencyName = cleanCellValue(row[2])
      const competencyDefinition = cleanCellValue(row[3])

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

      // Sub-competency (the competency in column C)
      if (!competencyName || !currentCoreComp) {
        continue
      }

      // Columns E-I: Level descriptions (1-5)
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
        {
          level: 5,
          name: 'Expert',
          description: cleanCellValue(row[8]) || '',
        },
      ].filter(level => level.description)

      const subComp: ParsedSubCompetency = {
        name: competencyName,
        description: competencyDefinition || undefined,
        levels,
        hasBehavioralIndicators: false,
      }

      currentCoreComp.subCompetencies.push(subComp)
    } else {
      // Standard competency format with 5 levels (HealthOps)
      // Column A: Function
      const functionValue = cleanCellValue(row[0])
      if (functionValue) {
        currentFunction = functionValue
      }

      // Column B: Function Objective
      const functionObjective = cleanCellValue(row[1])

      // Column C: Core Competency
      const coreCompName = cleanCellValue(row[2])
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

      // Column D: Sub-competency
      const subCompName = cleanCellValue(row[3])
      if (!subCompName || !currentCoreComp) {
        continue
      }

      // Columns E-I: Level descriptions (1-5)
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
        {
          level: 5,
          name: 'Expert',
          description: cleanCellValue(row[8]) || '',
        },
      ].filter(level => level.description)

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
