import { google, sheets_v4 } from 'googleapis'

export interface OnboardingRosterRow {
  userId: string
  name: string
  location: string
  team: string
  startDate: string
  completionPercent: number
  lastReminder: string
  reminderCount: number
  lastUpdated: string
  status: 'Completed' | 'In Progress' | 'Not Started'
}

export interface TaskCatalogRow {
  id: string
  section: 'todo' | 'to_read' | 'to_watch'
  title: string
  url?: string
  notes?: string
  isConditional: boolean
  conditionalLabel?: string
  appliesTo: 'all' | 'full_time' | 'contract'
}

export interface TaskProgressRow {
  visId: string // Employee VIS ID or email
  taskId: string
  status: 'not_started' | 'in_progress' | 'completed'
  completedAt?: string
  notes?: string
}

export interface SheetConfig {
  spreadsheetId: string
  rosterRange: string // e.g., 'Status!A2:J' for the roster/overview tab
  taskCatalogRange: string // e.g., 'Task Catalog!A2:H' for task definitions
  taskProgressRange: string // e.g., 'Task Progress!A2:E' for task completion tracking
  refreshIntervalMs: number
}

// Default configuration - can be overridden via environment variables
export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  spreadsheetId: process.env.ONBOARDING_SHEET_ID || '1O2HGf186pgHLVpuZ1nMnI7OkJTEpIRxpT8dn8fJP_No',
  rosterRange: process.env.ONBOARDING_ROSTER_RANGE || 'Status!A2:J',
  taskCatalogRange: process.env.ONBOARDING_TASK_CATALOG_RANGE || 'Task Catalog!A2:H',
  taskProgressRange: process.env.ONBOARDING_TASK_PROGRESS_RANGE || 'Task Progress!A2:E',
  refreshIntervalMs: parseInt(process.env.ONBOARDING_REFRESH_INTERVAL || '30000', 10),
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null
  private config: SheetConfig

  constructor(config: Partial<SheetConfig> = {}) {
    this.config = { ...DEFAULT_SHEET_CONFIG, ...config }
  }

  private async getSheetsClient(): Promise<sheets_v4.Sheets> {
    if (this.sheets) return this.sheets

    // Use the same Google Workspace service account as the provisioning integration
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set. Configure Google Workspace integration in Settings.')
    }

    const serviceAccount = JSON.parse(serviceAccountKey)
    // Use the same admin email as Google Workspace integration
    const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL

    const auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      subject: adminEmail, // Impersonate admin for domain-wide access
    })

    this.sheets = google.sheets({ version: 'v4', auth })
    return this.sheets
  }

  async fetchOnboardingRoster(): Promise<OnboardingRosterRow[]> {
    const sheets = await this.getSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range: this.config.rosterRange,
    })

    const rows = response.data.values || []

    return rows.map((row): OnboardingRosterRow => {
      // Columns: User ID, Name, Location, Team, Start Date, Completion %, Last Reminder, Reminder Count, Last Updated, Status
      const completionRaw = row[5] || '0'
      const completionPercent = parseInt(String(completionRaw).replace('%', ''), 10) || 0
      const reminderCount = parseInt(row[7] || '0', 10) || 0

      let status: OnboardingRosterRow['status'] = 'Not Started'
      const statusRaw = (row[9] || '').toLowerCase()
      if (statusRaw.includes('completed')) status = 'Completed'
      else if (statusRaw.includes('progress')) status = 'In Progress'

      return {
        userId: row[0] || '',
        name: row[1] || '',
        location: row[2] || '',
        team: row[3] || '',
        startDate: row[4] || '',
        completionPercent,
        lastReminder: row[6] || '',
        reminderCount,
        lastUpdated: row[8] || '',
        status,
      }
    }).filter(row => row.userId && row.name) // Filter out empty rows
  }

  /**
   * Fetch task catalog from Google Sheet
   * Supports two formats:
   * 1. Each row has section in column B: ID, Section, Title, URL, Notes, Conditional, Label, AppliesTo
   * 2. Section headers as separate rows: "To do", "To Read", "To Watch" in column B with tasks below
   */
  async fetchTaskCatalog(): Promise<TaskCatalogRow[]> {
    const sheets = await this.getSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range: this.config.taskCatalogRange,
    })

    const rows = response.data.values || []
    const tasks: TaskCatalogRow[] = []
    let currentSection: TaskCatalogRow['section'] = 'todo'
    let taskCounter = 1

    for (const row of rows) {
      const colA = (row[0] || '').toString().trim()
      const colB = (row[1] || '').toString().trim()
      const colC = (row[2] || '').toString().trim()
      const colBLower = colB.toLowerCase()

      // Check if this row is a section header (column B has section name, column C is empty)
      const isSectionHeader = !colC && (
        colBLower === 'to do' || colBLower === 'todo' ||
        colBLower === 'to read' || colBLower === 'to_read' || colBLower === 'read' ||
        colBLower === 'to watch' || colBLower === 'to_watch' || colBLower === 'watch'
      )

      if (isSectionHeader) {
        // Update current section
        if (colBLower === 'to do' || colBLower === 'todo') {
          currentSection = 'todo'
        } else if (colBLower === 'to read' || colBLower === 'to_read' || colBLower === 'read') {
          currentSection = 'to_read'
        } else if (colBLower === 'to watch' || colBLower === 'to_watch' || colBLower === 'watch') {
          currentSection = 'to_watch'
        }
        continue // Skip section header rows
      }

      // Determine the title - could be in column B or C depending on format
      let title = colC
      let section = currentSection

      // If column C is empty but column B has content (and it's not a section), use column B as title
      if (!colC && colB && !isSectionHeader) {
        title = colB
      }

      // If column B has a valid section value, use it
      if (colBLower === 'todo' || colBLower === 'to do') {
        section = 'todo'
      } else if (colBLower === 'to_read' || colBLower === 'to read' || colBLower === 'read') {
        section = 'to_read'
      } else if (colBLower === 'to_watch' || colBLower === 'to watch' || colBLower === 'watch') {
        section = 'to_watch'
      }

      // Skip rows without a title
      if (!title) continue

      // Skip rows that look like category headers (e.g., "General Onboarding", "Onboarding / Induction")
      const titleLower = title.toLowerCase()
      if (titleLower.includes('onboarding') && !titleLower.includes('sign') && title.length < 30) {
        continue
      }

      const isConditionalRaw = (row[5] || '').toString().toLowerCase().trim()
      const isConditional = isConditionalRaw === 'true' || isConditionalRaw === 'yes' || isConditionalRaw === '1'

      const appliesToRaw = (row[7] || 'all').toString().toLowerCase().trim()
      let appliesTo: TaskCatalogRow['appliesTo'] = 'all'
      if (appliesToRaw === 'full_time' || appliesToRaw === 'full time' || appliesToRaw === 'fulltime') {
        appliesTo = 'full_time'
      } else if (appliesToRaw === 'contract' || appliesToRaw === 'contractor') {
        appliesTo = 'contract'
      }

      tasks.push({
        id: colA || `task_${String(taskCounter++).padStart(3, '0')}`,
        section,
        title,
        url: row[3] || undefined,
        notes: row[4] || undefined,
        isConditional,
        conditionalLabel: row[6] || undefined,
        appliesTo,
      })
    }

    return tasks
  }

  /**
   * Fetch all task progress from Google Sheet
   * Expected columns: VIS ID/Email, Task ID, Status, Completed At, Notes
   */
  async fetchAllTaskProgress(): Promise<TaskProgressRow[]> {
    const sheets = await this.getSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range: this.config.taskProgressRange,
    })

    const rows = response.data.values || []

    return rows.map((row): TaskProgressRow => {
      // Columns: VIS ID/Email, Task ID, Status, Completed At, Notes
      const statusRaw = (row[2] || 'not_started').toLowerCase().trim()
      let status: TaskProgressRow['status'] = 'not_started'
      if (statusRaw === 'completed' || statusRaw === 'done' || statusRaw === 'complete') {
        status = 'completed'
      } else if (statusRaw === 'in_progress' || statusRaw === 'in progress' || statusRaw === 'started') {
        status = 'in_progress'
      }

      return {
        visId: row[0] || '',
        taskId: row[1] || '',
        status,
        completedAt: row[3] || undefined,
        notes: row[4] || undefined,
      }
    }).filter(row => row.visId && row.taskId) // Filter out incomplete rows
  }

  /**
   * Fetch task progress for a specific employee
   */
  async fetchTaskProgress(visId: string): Promise<TaskProgressRow[]> {
    const allProgress = await this.fetchAllTaskProgress()
    const visIdLower = visId.toLowerCase().trim()
    return allProgress.filter(row =>
      row.visId.toLowerCase().trim() === visIdLower
    )
  }

  /**
   * Check if a specific sheet/tab exists in the spreadsheet
   */
  async sheetExists(sheetName: string): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient()
      const response = await sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
        fields: 'sheets.properties.title',
      })

      const sheetNames = response.data.sheets?.map(s => s.properties?.title) || []
      return sheetNames.includes(sheetName)
    } catch {
      return false
    }
  }
}

// Singleton instance for server-side usage
let sheetsService: GoogleSheetsService | null = null

/**
 * Extract the spreadsheet ID from a Google Sheets URL or ID string
 * Handles various formats:
 * - Full URL: https://docs.google.com/spreadsheets/d/1O2HGf186pg.../edit#gid=0
 * - Partial URL: 1O2HGf186pg.../edit?gid=0#gid=0
 * - Just ID: 1O2HGf186pg...
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return input

  // If it looks like a full URL, extract the ID
  const urlMatch = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (urlMatch) {
    return urlMatch[1]
  }

  // If it contains /edit or other URL parts, take only the first segment
  const slashIndex = input.indexOf('/')
  if (slashIndex > 0) {
    return input.substring(0, slashIndex)
  }

  // If it contains query params or hash, strip them
  const cleanId = input.split(/[?#]/)[0]

  return cleanId.trim()
}

export function getGoogleSheetsService(config?: Partial<SheetConfig>): GoogleSheetsService {
  // If custom config is provided, create a new instance (don't use singleton)
  if (config?.spreadsheetId) {
    // Clean the spreadsheet ID in case user pasted a URL
    const cleanedConfig = {
      ...config,
      spreadsheetId: extractSpreadsheetId(config.spreadsheetId),
    }
    return new GoogleSheetsService(cleanedConfig)
  }
  // Use singleton for default config
  if (!sheetsService) {
    sheetsService = new GoogleSheetsService()
  }
  return sheetsService
}
