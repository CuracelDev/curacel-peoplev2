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

export interface SheetConfig {
  spreadsheetId: string
  rosterRange: string // e.g., 'Status!A2:J' for the roster/overview tab
  refreshIntervalMs: number
}

// Default configuration - can be overridden via environment variables
export const DEFAULT_SHEET_CONFIG: SheetConfig = {
  spreadsheetId: process.env.ONBOARDING_SHEET_ID || '1O2HGf186pgHLVpuZ1nMnI7OkJTEpIRxpT8dn8fJP_No',
  rosterRange: process.env.ONBOARDING_ROSTER_RANGE || 'Status!A2:J',
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

  // Phase 2: Fetch task catalog from sheet (when available)
  // async fetchTaskCatalog(): Promise<TaskCatalogRow[]> {
  //   const sheets = await this.getSheetsClient()
  //   const response = await sheets.spreadsheets.values.get({
  //     spreadsheetId: this.config.spreadsheetId,
  //     range: 'Task Catalog!A2:H',
  //   })
  //   // Parse and return task catalog
  // }

  // Phase 2: Fetch task progress from sheet (when available)
  // async fetchTaskProgress(userId: string): Promise<TaskProgressRow[]> {
  //   const sheets = await this.getSheetsClient()
  //   const response = await sheets.spreadsheets.values.get({
  //     spreadsheetId: this.config.spreadsheetId,
  //     range: 'Task Progress!A2:D',
  //   })
  //   // Filter by userId and return progress
  // }
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
