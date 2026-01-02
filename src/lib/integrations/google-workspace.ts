import { google, admin_directory_v1, admin_datatransfer_v1, calendar_v3 } from 'googleapis'
import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'
import { generateWorkEmail, generateTemporaryPassword } from '@/lib/utils'
import { sendAccountCredentialsEmail } from '@/lib/email'
import { getOrganizationName } from '@/lib/organization'
import type {
  IntegrationConnector,
  ProvisionResult,
  DeprovisionResult,
  DeprovisionOptions,
  GoogleWorkspaceConfig,
  GoogleProvisionData,
  ProvisioningCondition,
} from './types'

export class GoogleWorkspaceConnector implements IntegrationConnector {
  private config: GoogleWorkspaceConfig
  private admin: admin_directory_v1.Admin | null = null
  private dataTransfer: admin_datatransfer_v1.Admin | null = null
  private calendar: calendar_v3.Calendar | null = null
  private auth: InstanceType<typeof google.auth.JWT> | null = null

  constructor(config: GoogleWorkspaceConfig) {
    this.config = config
  }

  private async getAdminClient(): Promise<admin_directory_v1.Admin> {
    if (this.admin) return this.admin

    const serviceAccount = JSON.parse(this.config.serviceAccountKey)
    
    if (!this.auth) {
      this.auth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: [
          'https://www.googleapis.com/auth/admin.directory.user',
          'https://www.googleapis.com/auth/admin.directory.group',
          'https://www.googleapis.com/auth/admin.datatransfer',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
        subject: this.config.adminEmail, // Impersonate admin
      })
    }

    this.admin = google.admin({ version: 'directory_v1', auth: this.auth })
    return this.admin
  }

  private async getDataTransferClient(): Promise<admin_datatransfer_v1.Admin> {
    if (this.dataTransfer) return this.dataTransfer
    await this.getAdminClient()
    this.dataTransfer = google.admin({ version: 'datatransfer_v1', auth: this.auth! })
    return this.dataTransfer
  }

  private async getCalendarClient(): Promise<calendar_v3.Calendar> {
    if (this.calendar) return this.calendar
    await this.getAdminClient() // Ensure auth is set up
    this.calendar = google.calendar({ version: 'v3', auth: this.auth! })
    return this.calendar
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const admin = await this.getAdminClient()
      // Try to list users (limited to 1)
      await admin.users.list({
        domain: this.config.domain,
        maxResults: 1,
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Google Workspace',
      }
    }
  }

  async listGroups(): Promise<Array<{ email: string; name: string }>> {
    const admin = await this.getAdminClient()
    const groups: Array<{ email: string; name: string }> = []
    let pageToken: string | undefined

    do {
      const response = await admin.groups.list({
        domain: this.config.domain,
        maxResults: 200,
        pageToken,
      })

      const batch = response.data.groups || []
      for (const group of batch) {
        if (!group.email) continue
        groups.push({
          email: group.email,
          name: group.name || group.email,
        })
      }

      pageToken = response.data.nextPageToken || undefined
    } while (pageToken)

    return groups
  }

  async listUsers(): Promise<Array<{ email: string; name: string }>> {
    const admin = await this.getAdminClient()
    const users: Array<{ email: string; name: string }> = []
    let pageToken: string | undefined

    do {
      const response = await admin.users.list({
        domain: this.config.domain,
        maxResults: 200,
        pageToken,
        orderBy: 'email',
      })
      const batch = response.data.users || []
      for (const user of batch) {
        if (!user.primaryEmail) continue
        const fullName = user.name?.fullName || user.primaryEmail
        users.push({ email: user.primaryEmail, name: fullName })
      }
      pageToken = response.data.nextPageToken || undefined
    } while (pageToken)

    return users
  }

  private matchesCondition(employee: Employee, condition: ProvisioningCondition): boolean {
    for (const [key, value] of Object.entries(condition)) {
      if (value === undefined || value === null) continue
      
      const employeeValue = (employee as Record<string, unknown>)[key]
      if (typeof employeeValue === 'string' && typeof value === 'string') {
        // Case-insensitive match
        if (employeeValue.toLowerCase() !== value.toLowerCase()) {
          return false
        }
      } else if (employeeValue !== value) {
        return false
      }
    }
    return true
  }

  private getProvisionDataForEmployee(
    employee: Employee,
    rules: AppProvisioningRule[]
  ): GoogleProvisionData {
    const result: GoogleProvisionData = {
      groups: [],
    }

    // Sort rules by priority (higher priority first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

    for (const rule of sortedRules) {
      if (!rule.isActive) continue
      
      const condition = rule.condition as ProvisioningCondition
      if (this.matchesCondition(employee, condition)) {
        const data = rule.provisionData as GoogleProvisionData
        
        if (data.orgUnitPath && !result.orgUnitPath) {
          result.orgUnitPath = data.orgUnitPath
        }
        
        if (data.groups) {
          result.groups = [...(result.groups || []), ...data.groups]
        }
      }
    }

    // Dedupe groups
    result.groups = [...new Set(result.groups)]
    
    return result
  }

  async provisionEmployee(
    employee: Employee,
    app: App,
    rules: AppProvisioningRule[],
    existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    try {
      const admin = await this.getAdminClient()
      const provisionData = this.getProvisionDataForEmployee(employee, rules)
      
      // Generate work email if not exists
      const workEmail = employee.workEmail || generateWorkEmail(employee.fullName, this.config.domain)
      const tempPassword = generateTemporaryPassword()
      
      // Split name
      const nameParts = employee.fullName.trim().split(/\s+/)
      const givenName = nameParts[0]
      const familyName = nameParts.slice(1).join(' ') || nameParts[0]

      let externalUserId: string

      // Check if user already exists (e.g., reactivating)
      if (existingAccount?.externalUserId) {
        try {
          // Try to reactivate existing user
          await admin.users.update({
            userKey: existingAccount.externalUserId,
            requestBody: {
              suspended: false,
            },
          })
          externalUserId = existingAccount.externalUserId
        } catch {
          // User doesn't exist, create new
          externalUserId = await this.createUser(admin, {
            workEmail,
            givenName,
            familyName,
            tempPassword,
            orgUnitPath: provisionData.orgUnitPath,
          })
        }
      } else {
        // Check if user exists by email
        try {
          const existingUser = await admin.users.get({ userKey: workEmail })
          if (existingUser.data.id) {
            // Reactivate if suspended
            if (existingUser.data.suspended) {
              await admin.users.update({
                userKey: workEmail,
                requestBody: { suspended: false },
              })
            }
            externalUserId = existingUser.data.id
          } else {
            throw new Error('User not found')
          }
        } catch {
          // Create new user
          externalUserId = await this.createUser(admin, {
            workEmail,
            givenName,
            familyName,
            tempPassword,
            orgUnitPath: provisionData.orgUnitPath,
          })
          
          // Send credentials email
          await sendAccountCredentialsEmail({
            employeeEmail: employee.personalEmail,
            employeeName: employee.fullName,
            workEmail,
            temporaryPassword: tempPassword,
            companyName: (await getOrganizationName()),
          })
        }
      }

      // Add to groups
      const addedGroups: string[] = []
      for (const groupEmail of provisionData.groups || []) {
        try {
          await admin.members.insert({
            groupKey: groupEmail,
            requestBody: {
              email: workEmail,
              role: 'MEMBER',
            },
          })
          addedGroups.push(groupEmail)
        } catch (error) {
          // Group might not exist or user already member - log but don't fail
          console.warn(`Failed to add user to group ${groupEmail}:`, error)
        }
      }

      return {
        success: true,
        externalUserId,
        externalEmail: workEmail,
        provisionedResources: {
          orgUnitPath: provisionData.orgUnitPath,
          groups: addedGroups,
        },
      }
    } catch (error) {
      console.error('Google Workspace provisioning error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to provision Google Workspace account',
      }
    }
  }

  private async createUser(
    admin: admin_directory_v1.Admin,
    params: {
      workEmail: string
      givenName: string
      familyName: string
      tempPassword: string
      orgUnitPath?: string
    }
  ): Promise<string> {
    const response = await admin.users.insert({
      requestBody: {
        primaryEmail: params.workEmail,
        name: {
          givenName: params.givenName,
          familyName: params.familyName,
        },
        password: params.tempPassword,
        changePasswordAtNextLogin: true,
        orgUnitPath: params.orgUnitPath || '/',
      },
    })

    if (!response.data.id) {
      throw new Error('Failed to create user - no ID returned')
    }

    return response.data.id
  }

  async deprovisionEmployee(
    employee: Employee,
    app: App,
    account: AppAccount,
    options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    try {
      const admin = await this.getAdminClient()
      
      const userKey = account.externalUserId || account.externalEmail || employee.workEmail
      if (!userKey) {
        return { success: false, error: 'No external user ID or email found' }
      }

      const deleteAccount = Boolean(options?.deleteAccount)
      const transferToEmail = options?.transferToEmail?.trim()
      const transferApps = options?.transferApps?.length ? options.transferApps : ['drive']
      const aliasToEmail = options?.aliasToEmail?.trim()
      const aliasEmail = account.externalEmail || employee.workEmail

      if (aliasToEmail && !deleteAccount) {
        return { success: false, error: 'Email alias mapping requires deleting the Google account.' }
      }
      if (aliasToEmail && !aliasEmail) {
        return { success: false, error: 'No source email available for alias mapping.' }
      }

      if (transferToEmail) {
        await this.transferDataOwnership(userKey, transferToEmail, transferApps)
      }

      if (deleteAccount) {
        await admin.users.delete({ userKey })
        if (aliasToEmail && aliasEmail) {
          await admin.users.aliases.insert({
            userKey: aliasToEmail,
            requestBody: { alias: aliasEmail },
          })
        }
      } else {
        // Suspend user (don't delete - preserves data)
        await admin.users.update({
          userKey,
          requestBody: {
            suspended: true,
          },
        })
      }

      return { success: true }
    } catch (error) {
      console.error('Google Workspace deprovisioning error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deprovision Google Workspace account',
      }
    }
  }

  private async transferDataOwnership(oldOwner: string, newOwner: string, apps: string[]) {
    const dataTransfer = await this.getDataTransferClient()
    const response = await dataTransfer.applications.list({ customerId: 'my_customer' })
    const availableApps = response.data.applications || []

    const applicationDataTransfers = apps
      .map((appName) => {
        const match = availableApps.find((app) =>
          (app.name || '').toLowerCase().includes(appName.toLowerCase())
        )
        if (!match?.id) {
          console.warn(`Google Workspace transfer app not found: ${appName}`)
          return null
        }
        return { applicationId: match.id }
      })
      .filter(Boolean) as Array<{ applicationId: string }>

    if (!applicationDataTransfers.length) {
      throw new Error('No valid Google apps selected for data transfer.')
    }

    await dataTransfer.transfers.insert({
      requestBody: {
        oldOwnerUserId: oldOwner,
        newOwnerUserId: newOwner,
        applicationDataTransfers,
      },
    })
  }

  // ============================================
  // Calendar Integration Methods
  // ============================================

  /**
   * Get free/busy information for a list of users
   * Returns both busy times and any errors for calendars we can't access
   */
  async getFreeBusy(params: {
    emails: string[]
    timeMin: Date
    timeMax: Date
  }): Promise<{
    busy: Record<string, Array<{ start: Date; end: Date }>>
    errors: Record<string, string>
  }> {
    const calendar = await this.getCalendarClient()

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString(),
        items: params.emails.map(email => ({ id: email })),
      },
    })

    const busy: Record<string, Array<{ start: Date; end: Date }>> = {}
    const errors: Record<string, string> = {}

    for (const email of params.emails) {
      const calendarData = response.data.calendars?.[email]

      // Check for errors (e.g., notFound for calendars we can't access)
      if (calendarData?.errors && calendarData.errors.length > 0) {
        const errorReasons = calendarData.errors.map(e => e.reason).join(', ')
        errors[email] = errorReasons || 'Unknown error'
        busy[email] = [] // No busy data available
      } else {
        busy[email] = (calendarData?.busy || []).map(slot => ({
          start: new Date(slot.start || ''),
          end: new Date(slot.end || ''),
        }))
      }
    }

    return { busy, errors }
  }

  /**
   * Find available time slots when all attendees are free
   * Returns slots and any calendar access errors
   */
  async findAvailableSlots(params: {
    requiredAttendees: string[]
    optionalAttendees?: string[]
    duration: number // minutes
    dateRange: { start: Date; end: Date }
    workingHours?: { start: number; end: number } // e.g., 9-17 for 9am-5pm
  }): Promise<{
    slots: Array<{ start: Date; end: Date; allAvailable: boolean }>
    calendarErrors: Record<string, string>
  }> {
    const { requiredAttendees, optionalAttendees = [], duration, dateRange, workingHours } = params
    const allAttendees = [...requiredAttendees, ...optionalAttendees]

    // Get free/busy info for all attendees
    const { busy: busyTimes, errors: calendarErrors } = await this.getFreeBusy({
      emails: allAttendees,
      timeMin: dateRange.start,
      timeMax: dateRange.end,
    })

    // Find available slots
    const slots: Array<{ start: Date; end: Date; allAvailable: boolean }> = []
    const slotDuration = duration * 60 * 1000 // Convert to milliseconds

    // Iterate through days in range
    const currentDate = new Date(dateRange.start)
    currentDate.setHours(0, 0, 0, 0)

    while (currentDate < dateRange.end) {
      // Set working hours for this day
      const dayStart = new Date(currentDate)
      dayStart.setHours(workingHours?.start || 9, 0, 0, 0)

      const dayEnd = new Date(currentDate)
      dayEnd.setHours(workingHours?.end || 17, 0, 0, 0)

      // Check each potential slot
      let slotStart = dayStart.getTime()
      while (slotStart + slotDuration <= dayEnd.getTime()) {
        const slotEnd = slotStart + slotDuration

        // Check if all required attendees are available
        let requiredAvailable = true
        for (const email of requiredAttendees) {
          const busy = busyTimes[email] || []
          for (const busySlot of busy) {
            if (
              (slotStart >= busySlot.start.getTime() && slotStart < busySlot.end.getTime()) ||
              (slotEnd > busySlot.start.getTime() && slotEnd <= busySlot.end.getTime()) ||
              (slotStart <= busySlot.start.getTime() && slotEnd >= busySlot.end.getTime())
            ) {
              requiredAvailable = false
              break
            }
          }
          if (!requiredAvailable) break
        }

        if (requiredAvailable) {
          // Check optional attendees
          let allAvailable = true
          for (const email of optionalAttendees) {
            const busy = busyTimes[email] || []
            for (const busySlot of busy) {
              if (
                (slotStart >= busySlot.start.getTime() && slotStart < busySlot.end.getTime()) ||
                (slotEnd > busySlot.start.getTime() && slotEnd <= busySlot.end.getTime())
              ) {
                allAvailable = false
                break
              }
            }
          }

          slots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
            allAvailable,
          })
        }

        // Move to next 30-minute slot
        slotStart += 30 * 60 * 1000
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return { slots, calendarErrors }
  }

  /**
   * Create a calendar event with optional Google Meet
   */
  async createCalendarEvent(event: {
    summary: string
    description?: string
    start: Date
    end: Date
    attendees: string[]
    createMeet?: boolean
    location?: string
  }): Promise<{ eventId: string; meetLink?: string; htmlLink?: string }> {
    const calendar = await this.getCalendarClient()

    const requestBody: calendar_v3.Schema$Event = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'UTC',
      },
      attendees: event.attendees.map(email => ({ email })),
      location: event.location,
    }

    // Add Google Meet if requested
    if (event.createMeet) {
      requestBody.conferenceData = {
        createRequest: {
          requestId: `interview-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody,
      conferenceDataVersion: event.createMeet ? 1 : 0,
      sendUpdates: 'all', // Send email invites to attendees
    })

    return {
      eventId: response.data.id || '',
      meetLink: response.data.hangoutLink ?? response.data.conferenceData?.entryPoints?.[0]?.uri ?? undefined,
      htmlLink: response.data.htmlLink ?? undefined,
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateCalendarEvent(
    eventId: string,
    updates: {
      summary?: string
      description?: string
      start?: Date
      end?: Date
      attendees?: string[]
      location?: string
    }
  ): Promise<void> {
    const calendar = await this.getCalendarClient()

    const requestBody: calendar_v3.Schema$Event = {}

    if (updates.summary !== undefined) {
      requestBody.summary = updates.summary
    }
    if (updates.description !== undefined) {
      requestBody.description = updates.description
    }
    if (updates.start !== undefined) {
      requestBody.start = {
        dateTime: updates.start.toISOString(),
        timeZone: 'UTC',
      }
    }
    if (updates.end !== undefined) {
      requestBody.end = {
        dateTime: updates.end.toISOString(),
        timeZone: 'UTC',
      }
    }
    if (updates.attendees !== undefined) {
      requestBody.attendees = updates.attendees.map(email => ({ email }))
    }
    if (updates.location !== undefined) {
      requestBody.location = updates.location
    }

    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody,
      sendUpdates: 'all',
    })
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(eventId: string): Promise<void> {
    const calendar = await this.getCalendarClient()

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    })
  }

  /**
   * Get a calendar event by ID
   */
  async getCalendarEvent(eventId: string): Promise<{
    id: string
    summary: string
    start: Date
    end: Date
    attendees: string[]
    meetLink?: string
    htmlLink?: string
  } | null> {
    const calendar = await this.getCalendarClient()

    try {
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      })

      return {
        id: response.data.id || '',
        summary: response.data.summary || '',
        start: new Date(response.data.start?.dateTime || response.data.start?.date || ''),
        end: new Date(response.data.end?.dateTime || response.data.end?.date || ''),
        attendees: (response.data.attendees || []).map(a => a.email || '').filter(Boolean),
        meetLink: response.data.hangoutLink ?? response.data.conferenceData?.entryPoints?.[0]?.uri ?? undefined,
        htmlLink: response.data.htmlLink ?? undefined,
      }
    } catch {
      return null
    }
  }
}

export function createGoogleWorkspaceConnector(): GoogleWorkspaceConnector | null {
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!domain || !adminEmail || !serviceAccountKey) {
    console.warn('Google Workspace integration not configured via environment variables')
    return null
  }

  return new GoogleWorkspaceConnector({
    domain,
    adminEmail,
    serviceAccountKey,
  })
}

// Get Google Workspace connector from database AppConnection
export async function getGoogleWorkspaceConnector(): Promise<GoogleWorkspaceConnector | null> {
  // First try environment variables (for backwards compatibility)
  const envConnector = createGoogleWorkspaceConnector()
  if (envConnector) {
    return envConnector
  }

  // Fall back to database-stored credentials
  try {
    const { prisma } = await import('@/lib/prisma')
    const { decrypt } = await import('@/lib/encryption')

    // Find Google Workspace app and its active connection
    const app = await prisma.app.findFirst({
      where: { type: 'GOOGLE_WORKSPACE' },
    })

    if (!app) {
      console.warn('Google Workspace app not found in database')
      return null
    }

    const connection = await prisma.appConnection.findFirst({
      where: { appId: app.id, isActive: true },
    })

    if (!connection) {
      console.warn('No active Google Workspace connection found')
      return null
    }

    // Parse and decrypt the config
    let config: Record<string, unknown>
    try {
      config = JSON.parse(decrypt(connection.configEncrypted)) as Record<string, unknown>
    } catch {
      try {
        config = JSON.parse(connection.configEncrypted) as Record<string, unknown>
      } catch {
        console.warn('Failed to parse Google Workspace config')
        return null
      }
    }

    const domain = typeof config.domain === 'string' ? config.domain : ''
    const adminEmail = typeof config.adminEmail === 'string' ? config.adminEmail : ''
    const serviceAccountKey = typeof config.serviceAccountKey === 'string' ? config.serviceAccountKey : ''

    if (!domain || !adminEmail || !serviceAccountKey) {
      console.warn('Google Workspace connection is missing required configuration')
      return null
    }

    return new GoogleWorkspaceConnector({ domain, adminEmail, serviceAccountKey })
  } catch (error) {
    console.error('Error getting Google Workspace connector from database:', error)
    return null
  }
}
