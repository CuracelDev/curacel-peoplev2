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
   * Expected columns: ID, Section, Title, URL, Notes, Is Conditional, Conditional Label, Applies To
   */
  async fetchTaskCatalog(): Promise<TaskCatalogRow[]> {
    const sheets = await this.getSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range: this.config.taskCatalogRange,
    })

    const rows = response.data.values || []

    return rows.map((row): TaskCatalogRow => {
      // Columns: ID, Section, Title, URL, Notes, Is Conditional, Conditional Label, Applies To
      const sectionRaw = (row[1] || 'todo').toLowerCase().trim()
      let section: TaskCatalogRow['section'] = 'todo'
      if (sectionRaw === 'to_read' || sectionRaw === 'to read' || sectionRaw === 'read') {
        section = 'to_read'
      } else if (sectionRaw === 'to_watch' || sectionRaw === 'to watch' || sectionRaw === 'watch') {
        section = 'to_watch'
      }

      const isConditionalRaw = (row[5] || '').toLowerCase().trim()
      const isConditional = isConditionalRaw === 'true' || isConditionalRaw === 'yes' || isConditionalRaw === '1'

      const appliesToRaw = (row[7] || 'all').toLowerCase().trim()
      let appliesTo: TaskCatalogRow['appliesTo'] = 'all'
      if (appliesToRaw === 'full_time' || appliesToRaw === 'full time' || appliesToRaw === 'fulltime') {
        appliesTo = 'full_time'
      } else if (appliesToRaw === 'contract' || appliesToRaw === 'contractor') {
        appliesTo = 'contract'
      }

      return {
        id: row[0] || `task_${Math.random().toString(36).substr(2, 9)}`,
        section,
        title: row[2] || '',
        url: row[3] || undefined,
        notes: row[4] || undefined,
        isConditional,
        conditionalLabel: row[6] || undefined,
        appliesTo,
      }
    }).filter(task => task.title) // Filter out rows without titles
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

export function getGoogleSheetsService(config?: Partial<SheetConfig>): GoogleSheetsService {
  // If custom config is provided, create a new instance (don't use singleton)
  if (config?.spreadsheetId) {
    return new GoogleSheetsService(config)
  }
  // Use singleton for default config
  if (!sheetsService) {
    sheetsService = new GoogleSheetsService()
  }
  return sheetsService
}
