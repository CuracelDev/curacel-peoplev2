/**
 * Base parser utilities for competency framework Google Sheets
 */

import { getGoogleSheetsService, extractSpreadsheetId } from '@/lib/google-sheets'
import type {
  SheetFormatType,
  SheetRow,
  SheetMetadata,
} from './types'

/**
 * Fetch raw data from a Google Sheet tab
 */
export async function fetchSheetData(
  sheetUrl: string,
  tabName?: string
): Promise<SheetRow[]> {
  const sheetId = extractSpreadsheetId(sheetUrl)

  console.log(`[fetchSheetData] Fetching sheet: ${sheetId}, tab: ${tabName || 'default'}`)

  const service = getGoogleSheetsService({ spreadsheetId: sheetId })

  // Access the private method using type assertion
  const getSheetsClient = (service as any).getSheetsClient.bind(service)
  const sheets = await getSheetsClient()

  // Determine the range to fetch
  const range = tabName ? `${tabName}!A:Z` : 'A:Z'

  console.log(`[fetchSheetData] Fetching range: ${range}`)

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })

  const rows = response.data.values || []
  console.log(`[fetchSheetData] Fetched ${rows.length} rows`)

  // Convert to SheetRow format (array of column values)
  return rows.map((row: any[]) => {
    const sheetRow: SheetRow = {}
    row.forEach((value, index) => {
      sheetRow[index] = value?.toString().trim() || ''
    })
    return sheetRow
  })
}

/**
 * Detect the format type of a competency sheet based on headers
 */
export function detectSheetFormat(headers: SheetRow): SheetFormatType {
  const h = headers

  // Convert all headers to lowercase for comparison
  const headerValues = Object.values(h).map(v => v?.toLowerCase() || '')
  const firstFewHeaders = headerValues.slice(0, 10).join('|')

  console.log('[detectSheetFormat] Headers:', firstFewHeaders)

  // AI Behavioral format: has "Competency" in first column and "Unacceptable" in second
  if (
    headerValues[0]?.includes('competency') &&
    headerValues[1]?.includes('unacceptable')
  ) {
    console.log('[detectSheetFormat] Detected AI_BEHAVIORAL')
    return 'AI_BEHAVIORAL'
  }

  // Values format: Column A has "Values", Column C has "Competency" (not Column B)
  if (
    headerValues[0]?.includes('value') &&
    !headerValues[0]?.includes('values') && // Singular "value"
    headerValues[2]?.includes('competenc')
  ) {
    console.log('[detectSheetFormat] Detected VALUES (EXTENDED_5_LEVEL)')
    return 'EXTENDED_5_LEVEL'
  }

  // Standard or Extended competency matrix: has "Function" in first column
  if (headerValues[0]?.includes('function')) {
    // Check for "Expert" column to detect 5-level variant
    const hasExpert = headerValues.some(val => val?.includes('expert'))

    console.log('[detectSheetFormat] Detected', hasExpert ? 'EXTENDED_5_LEVEL' : 'STANDARD_4_LEVEL')
    return hasExpert ? 'EXTENDED_5_LEVEL' : 'STANDARD_4_LEVEL'
  }

  console.error('[detectSheetFormat] Unknown format. Headers:', headers)
  throw new Error(`Unknown sheet format. Headers: ${JSON.stringify(headers)}`)
}

/**
 * Extract level names from headers based on format type
 */
export function extractLevelNames(
  headers: SheetRow,
  formatType: SheetFormatType
): string[] {
  switch (formatType) {
    case 'STANDARD_4_LEVEL':
      return ['Basic', 'Intermediate', 'Proficient', 'Advanced']

    case 'EXTENDED_5_LEVEL':
      return ['Basic', 'Intermediate', 'Proficient', 'Advanced', 'Expert']

    case 'AI_BEHAVIORAL':
      return ['Unacceptable', 'Basic', 'Intermediate', 'Proficient', 'Advanced']

    default:
      throw new Error(`Unknown format type: ${formatType}`)
  }
}

/**
 * Get min and max level numbers for a format type
 */
export function getLevelBounds(formatType: SheetFormatType): { min: number; max: number } {
  switch (formatType) {
    case 'STANDARD_4_LEVEL':
      return { min: 1, max: 4 }

    case 'EXTENDED_5_LEVEL':
      return { min: 1, max: 5 }

    case 'AI_BEHAVIORAL':
      return { min: 0, max: 4 } // 0 = Unacceptable

    default:
      throw new Error(`Unknown format type: ${formatType}`)
  }
}

/**
 * Clean and normalize cell value
 */
export function cleanCellValue(value: string | undefined): string {
  if (!value) return ''
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Check if a row is empty (all cells are empty or whitespace)
 */
export function isEmptyRow(row: SheetRow): boolean {
  return Object.values(row).every(cell => !cell || !cell.trim())
}

/**
 * Check if a row is a header row (contains common header keywords)
 */
export function isHeaderRow(row: SheetRow): boolean {
  const firstCell = row[0]?.toLowerCase() || ''
  const secondCell = row[1]?.toLowerCase() || ''

  return (
    firstCell.includes('function') ||
    firstCell.includes('competency') ||
    firstCell.includes('value') ||
    secondCell.includes('objective') ||
    secondCell.includes('definition')
  )
}

/**
 * Parse metadata from sheet URL
 */
export function parseSheetMetadata(sheetUrl: string, tabName?: string): Pick<SheetMetadata, 'sheetUrl' | 'sheetId' | 'tabName'> {
  const sheetId = extractSpreadsheetId(sheetUrl)

  return {
    sheetUrl,
    sheetId,
    tabName,
  }
}

/**
 * Calculate normalized score (0-100) from raw level
 */
export function calculateNormalizedScore(rawLevel: number, formatType: SheetFormatType): number {
  const { min, max } = getLevelBounds(formatType)

  // Normalize to 0-100 scale
  const range = max - min
  const normalized = ((rawLevel - min) / range) * 100

  return Math.round(normalized)
}
