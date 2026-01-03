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
 * Fetch raw data from a Google Sheet tab using public API (no auth required for public sheets)
 */
export async function fetchSheetData(
  sheetUrl: string,
  tabName?: string
): Promise<SheetRow[]> {
  const sheetId = extractSpreadsheetId(sheetUrl)

  console.log(`[fetchSheetData] Fetching sheet: ${sheetId}, tab: ${tabName || 'default'}`)

  // Try to use Google Sheets public API first (for public sheets)
  try {
    // Determine the range to fetch
    const range = tabName ? `${tabName}!A:Z` : 'A:Z'
    const encodedRange = encodeURIComponent(range)

    const publicApiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodedRange}`

    console.log(`[fetchSheetData] Trying public API: ${publicApiUrl}`)

    const response = await fetch(publicApiUrl)
    const text = await response.text()

    // Google returns JSONP, need to extract JSON
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s)
    if (!jsonMatch) {
      throw new Error('Failed to parse Google Sheets response')
    }

    const data = JSON.parse(jsonMatch[1])

    if (data.status === 'error') {
      throw new Error(`Google Sheets API error: ${data.errors[0]?.detailed_message || 'Unknown error'}`)
    }

    const rows: SheetRow[] = []

    if (data.table && data.table.rows) {
      for (const row of data.table.rows) {
        const sheetRow: SheetRow = {}
        if (row.c) {
          row.c.forEach((cell: any, index: number) => {
            sheetRow[index] = cell?.v?.toString().trim() || cell?.f?.toString().trim() || ''
          })
        }
        rows.push(sheetRow)
      }
    }

    console.log(`[fetchSheetData] Fetched ${rows.length} rows via public API`)
    return rows
  } catch (publicApiError) {
    console.warn(`[fetchSheetData] Public API failed:`, publicApiError)

    // Fallback to authenticated Google Sheets API
    console.log(`[fetchSheetData] Falling back to authenticated API`)

    const service = getGoogleSheetsService({ spreadsheetId: sheetId })
    const getSheetsClient = (service as any).getSheetsClient.bind(service)
    const sheets = await getSheetsClient()

    const range = tabName ? `${tabName}!A:Z` : 'A:Z'
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    })

    const rows = response.data.values || []
    console.log(`[fetchSheetData] Fetched ${rows.length} rows via authenticated API`)

    return rows.map((row: any[]) => {
      const sheetRow: SheetRow = {}
      row.forEach((value, index) => {
        sheetRow[index] = value?.toString().trim() || ''
      })
      return sheetRow
    })
  }
}

/**
 * Detect the format type of a competency sheet based on headers
 */
export function detectSheetFormat(headers: SheetRow): SheetFormatType {
  const h = headers

  // Convert all headers to lowercase for comparison
  const headerValues = Object.values(h).map(v => v?.toLowerCase() || '')
  const allHeadersText = headerValues.join('|')

  console.log('[detectSheetFormat] Headers:', allHeadersText.substring(0, 200))

  // AI Behavioral format: has "Competency" and "Unacceptable" OR numbered levels like "0. unacceptable"
  const hasCompetency = allHeadersText.includes('competency')
  const hasUnacceptable = allHeadersText.includes('unacceptable')
  const hasNumberedLevels = allHeadersText.match(/\d+\.\s*(basic|intermediate|proficient|advanced)/i)

  if (hasCompetency && (hasUnacceptable || hasNumberedLevels)) {
    console.log('[detectSheetFormat] Detected AI_BEHAVIORAL')
    return 'AI_BEHAVIORAL'
  }

  // Values format: has "Values" AND "Value Definition" AND "Competency" columns
  const hasValues = allHeadersText.includes('value')
  const hasValueDef = allHeadersText.includes('value definition')
  const hasCompetencyCol = allHeadersText.includes('competenc')

  if (hasValues && hasValueDef && hasCompetencyCol) {
    console.log('[detectSheetFormat] Detected VALUES (EXTENDED_5_LEVEL)')
    return 'EXTENDED_5_LEVEL'
  }

  // Standard or Extended competency matrix: has "Function" OR "Function Objective" AND "Core Competencies"
  const hasFunction = allHeadersText.includes('function')
  const hasCoreComp = allHeadersText.includes('core competenc')

  if (hasFunction && hasCoreComp) {
    // Check for "Expert" column to detect 5-level variant
    const hasExpert = allHeadersText.includes('expert')

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
  const values = Object.values(row).map(v => v?.toLowerCase() || '')
  const allText = values.join(' ')

  return (
    allText.includes('function') ||
    allText.includes('competency') ||
    allText.includes('competenc') ||
    allText.includes('value') ||
    allText.includes('objective') ||
    allText.includes('definition') ||
    allText.includes('basic') ||
    allText.includes('intermediate') ||
    allText.includes('proficient') ||
    allText.includes('advanced')
  )
}

/**
 * Find the first row that contains headers
 * Some sheets have empty rows or extra content before the actual header row
 */
export function findHeaderRow(rows: SheetRow[]): { headerRow: SheetRow; startIndex: number } | null {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    if (isHeaderRow(row)) {
      console.log(`[findHeaderRow] Found header row at index ${i}`)
      return { headerRow: row, startIndex: i }
    }
  }

  console.warn('[findHeaderRow] No header row found in first 10 rows')
  return null
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

/**
 * Find column index by header keyword
 */
export function findColumnIndex(headers: SheetRow, keyword: string): number {
  const entries = Object.entries(headers)
  for (const [index, value] of entries) {
    if (value?.toLowerCase().includes(keyword.toLowerCase())) {
      return parseInt(index)
    }
  }
  return -1
}

/**
 * Find all columns matching a pattern (for level columns)
 */
export function findLevelColumns(headers: SheetRow): number[] {
  const levelKeywords = ['basic', 'intermediate', 'proficient', 'advanced', 'expert', 'unacceptable']
  const levelCols: number[] = []

  Object.entries(headers).forEach(([index, value]) => {
    const lowerValue = value?.toLowerCase() || ''
    // Check if this looks like a level column (starts with number or contains level keyword)
    if (levelKeywords.some(kw => lowerValue.includes(kw)) || lowerValue.match(/^\d+\.\s/)) {
      levelCols.push(parseInt(index))
    }
  })

  return levelCols.sort((a, b) => a - b)
}
