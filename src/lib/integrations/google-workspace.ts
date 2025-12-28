import { google, admin_directory_v1, admin_datatransfer_v1 } from 'googleapis'
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
}

export function createGoogleWorkspaceConnector(): GoogleWorkspaceConnector | null {
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!domain || !adminEmail || !serviceAccountKey) {
    console.warn('Google Workspace integration not configured')
    return null
  }

  return new GoogleWorkspaceConnector({
    domain,
    adminEmail,
    serviceAccountKey,
  })
}
