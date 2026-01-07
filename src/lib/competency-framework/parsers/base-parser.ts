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
    // Extract gid from URL if present (more reliable than tab name for public API)
    const gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/)
    const gid = gidMatch ? gidMatch[1] : undefined

    let publicApiUrl: string

    if (gid) {
      // Use gid parameter for more reliable tab selection
      publicApiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`
      console.log(`[fetchSheetData] Using gid ${gid} from URL`)
    } else if (tabName) {
      // Use tab name if no gid in URL
      publicApiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`
      console.log(`[fetchSheetData] Using tab name: ${tabName}`)
    } else {
      // Default to first sheet
      publicApiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`
    }

    console.log(`[fetchSheetData] Trying public API: ${publicApiUrl}`)

    const response = await fetch(publicApiUrl)
    const text = await response.text()

    // Google returns JSONP, need to extract JSON
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/)
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

  // AI Behavioral format: has "Competency" (solo or with tools) and numbered levels like "0.", "1.", "2."
  // OR has "unacceptable" keyword
  const hasCompetencyKeyword = allHeadersText.match(/\b(competency|competenc)\b/)
  const hasUnacceptable = allHeadersText.includes('unacceptable')
  const hasNumberedLevels = allHeadersText.match(/\b[0-4]\.\s*(unacceptable|basic|intermediate|proficient|advanced)/i)

  // AI format is identified by numbered levels (0., 1., 2., etc.) or presence of "unacceptable"
  if (hasNumberedLevels || (hasCompetencyKeyword && hasUnacceptable)) {
    console.log('[detectSheetFormat] Detected AI_BEHAVIORAL')
    return 'AI_BEHAVIORAL'
  }

  // Values format: has "Values" AND ("Value Definition" OR "Definitions") AND "Competency" columns
  const hasValues = allHeadersText.match(/\bvalue(s)?\b/)
  const hasValueDef = allHeadersText.includes('value definition') || allHeadersText.includes('definitions')
  const hasCompetencyCol = allHeadersText.includes('competenc')

  if (hasValues && hasValueDef && hasCompetencyCol) {
    console.log('[detectSheetFormat] Detected VALUES (EXTENDED_5_LEVEL)')
    return 'EXTENDED_5_LEVEL'
  }

  // Standard or Extended competency matrix:
  // Has ("Function" OR "Function Objective" OR "Role") AND ("Core Competencies" OR "Competencies")
  const hasFunction = allHeadersText.includes('function') || allHeadersText.includes('role')
  const hasCoreComp = allHeadersText.includes('core competenc') ||
    (allHeadersText.includes('competenc') && !allHeadersText.includes('value definition'))

  if ((hasFunction || hasCoreComp) && !hasValues) {
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

  // Headers are typically short labels, not long descriptions
  // If any cell is very long (>150 chars), it's likely data, not headers
  const hasLongContent = values.some(v => v && v.length > 150)
  if (hasLongContent) {
    return false
  }

  const allText = values.join(' ')

  // Very specific header patterns that are unlikely to appear in data rows
  // These are exact matches for common header combinations
  const specificHeaderPatterns = [
    // Standard format headers
    /\bfunction\s*(objective)?\b.*\bcore\s*competenc/i,
    /\bcore\s*competenc.*\bsub\s*competenc/i,
    // Values format headers
    /\bvalue(s)?\b.*\bvalue\s*definition/i,
    /\bcompetenc.*\bdefinition/i,
    // AI format - numbered levels
    /\b0\.\s*unacceptable/i,
    /\b1\.\s*basic/i,
  ]

  if (specificHeaderPatterns.some(pattern => pattern.test(allText))) {
    return true
  }

  // Level keywords as standalone short cells (not embedded in long text)
  const levelKeywords = ['basic', 'intermediate', 'proficient', 'advanced', 'expert', 'unacceptable']
  const hasMultipleLevelKeywords = values.filter(v => {
    // Must be a short cell (< 50 chars) that exactly matches or starts with a level keyword
    if (!v || v.length > 50) return false
    return levelKeywords.some(kw => v === kw || v.startsWith(kw))
  }).length >= 2

  if (hasMultipleLevelKeywords) {
    return true
  }

  // Count structural header keywords (must be in short cells)
  let keywordCount = 0
  values.forEach(v => {
    if (!v || v.length > 50) return // Skip long cells
    if (v.includes('function')) keywordCount++
    if (v.match(/\bcompetenc/)) keywordCount++
    if (v.match(/\bvalue(s)?\b/)) keywordCount++
    if (v.includes('objective')) keywordCount++
    if (v.includes('definition')) keywordCount++
    if (v.match(/\bsub\b/)) keywordCount++
  })

  // Need at least 2 structural keywords in short cells to be a header
  return keywordCount >= 2
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
