/**
 * Standup Sync Service
 *
 * Syncs employees to standup_mate for daily standup management.
 * Automatically adds employees to standup teams when hired and removes them when terminated.
 */

import prisma from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

interface StandupSyncConfig {
  apiUrl: string
  apiKey: string
}

interface SyncEmployeeRequest {
  email: string
  team_name: string
}

interface SyncResponse {
  success: boolean
  message?: string
  error?: string
  apiConfirmation?: Record<string, unknown>
}

/**
 * Get standup sync configuration
 */
export async function getStandupSyncConfig(): Promise<StandupSyncConfig | null> {
  // Find the StandupNinja app
  const app = await prisma.app.findFirst({
    where: { type: 'STANDUPNINJA', isEnabled: true },
    include: {
      connections: {
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!app || app.connections.length === 0) {
    console.log('StandupNinja app not configured or not enabled')
    return null
  }

  const connection = app.connections[0]

  // Decrypt config
  let config: Record<string, unknown>
  try {
    const { decrypt } = await import('@/lib/encryption')
    config = JSON.parse(decrypt(connection.configEncrypted))
  } catch (error) {
    console.error('Failed to decrypt StandupNinja config:', error)
    return null
  }

  const apiUrl = typeof config.apiUrl === 'string' ? config.apiUrl : ''
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey : ''

  if (!apiUrl || !apiKey) {
    console.log('StandupNinja connection missing apiUrl or apiKey')
    return null
  }

  return { apiUrl, apiKey }
}

/**
 * Test standup sync connection
 */
export async function testStandupSyncConnection(
  apiUrl: string,
  apiKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const fullUrl = `${apiUrl}/api/health`
    console.log(`Testing StandupNinja connection to: ${fullUrl}`)

    // Call health check endpoint to verify connection
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    })

    console.log(`StandupNinja response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`StandupNinja connection failed: ${response.status} ${errorText}`)
      return {
        success: false,
        message: `Connection failed: ${response.status} ${errorText}`,
      }
    }

    const data = await response.json()
    console.log('StandupNinja connection successful:', data)

    return {
      success: true,
      message: 'Successfully connected to standup_mate',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`StandupNinja connection error:`, error)
    return {
      success: false,
      message: `Connection error: ${errorMessage}. Please verify the API URL is correct and standup_mate is running.`,
    }
  }
}

/**
 * Add employee to standup team
 */
export async function addEmployeeToStandup(
  email: string,
  department: string | null,
  userId?: string
): Promise<SyncResponse> {
  try {
    const config = await getStandupSyncConfig()

    if (!config) {
      console.log('Standup sync is disabled, skipping employee add')
      return { success: true, message: 'Sync disabled' }
    }

    // Get team mapping for department
    const teamName = await getStandupTeamForDepartment(department)

    if (!teamName) {
      console.log(`No standup team mapping found for department: ${department}`)
      return { success: true, message: 'No team mapping' }
    }

    // Call standup_mate API
    const response = await fetch(`${config.apiUrl}/api/teams/members`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        team_name: teamName,
      } as SyncEmployeeRequest),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }

    // Update last sync time on AppConnection
    const app = await prisma.app.findFirst({ where: { type: 'STANDUPNINJA' } })
    if (app) {
      await prisma.appConnection.updateMany({
        where: { appId: app.id, isActive: true },
        data: { lastSyncAt: new Date() },
      })
    }

    console.log(`Successfully added ${email} to standup team: ${teamName}`)

    return {
      success: true,
      message: `Added to standup team: ${teamName}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to add employee to standup: ${errorMessage}`, { email, department })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Remove employee from standup teams
 */
export async function removeEmployeeFromStandup(
  email: string,
  userId?: string
): Promise<SyncResponse> {
  try {
    const config = await getStandupSyncConfig()

    if (!config) {
      console.log('Standup sync is disabled, skipping employee removal')
      return { success: true, message: 'Sync disabled' }
    }

    // Call standup_mate API
    const response = await fetch(`${config.apiUrl}/api/teams/members`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }

    // Update last sync time on AppConnection
    const app = await prisma.app.findFirst({ where: { type: 'STANDUPNINJA' } })
    if (app) {
      await prisma.appConnection.updateMany({
        where: { appId: app.id, isActive: true },
        data: { lastSyncAt: new Date() },
      })
    }

    console.log(`Successfully removed ${email} from standup teams`)

    return {
      success: true,
      message: 'Removed from standup teams',
      apiConfirmation: {
        provider: 'standup_ninja',
        action: 'removed_from_teams',
        email,
        method: 'api',
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to remove employee from standup: ${errorMessage}`, { email })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Get standup team name for a department
 */
async function getStandupTeamForDepartment(department: string | null): Promise<string | null> {
  if (!department) {
    return null
  }

  const mapping = await prisma.standupTeamMapping.findUnique({
    where: {
      department,
      isActive: true,
    },
  })

  return mapping?.standupTeamName || null
}

/**
 * Sync employee based on status change
 */
export async function syncEmployeeOnStatusChange(
  employeeId: string,
  newStatus: string,
  userId?: string
): Promise<void> {
  // Check if StandupNinja app is enabled and configured
  const app = await prisma.app.findFirst({
    where: { type: 'STANDUPNINJA', isEnabled: true },
    include: {
      connections: {
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!app || app.connections.length === 0) {
    return
  }

  // Get sync settings from connection config
  let config: Record<string, unknown>
  try {
    const { decrypt } = await import('@/lib/encryption')
    config = JSON.parse(decrypt(app.connections[0].configEncrypted))
  } catch (error) {
    console.error('Failed to decrypt StandupNinja config:', error)
    return
  }

  const syncOnHire = config.syncOnHire !== false // default to true
  const syncOnTermination = config.syncOnTermination !== false // default to true

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      workEmail: true,
      personalEmail: true,
      department: true,
    },
  })

  if (!employee) {
    console.error(`Employee not found: ${employeeId}`)
    return
  }

  const email = employee.workEmail || employee.personalEmail

  if (!email) {
    console.error(`Employee has no email: ${employeeId}`)
    return
  }

  // Add to standup when hired/activated
  if (syncOnHire && newStatus === 'ACTIVE') {
    await addEmployeeToStandup(email, employee.department, userId)
  }

  // Remove from standup when terminated
  if (syncOnTermination && (newStatus === 'EXITED' || newStatus === 'OFFBOARDING')) {
    await removeEmployeeFromStandup(email, userId)
  }
}
