import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { App, AppAccount, AppProvisioningRule, Employee } from '@prisma/client'
import type {
  DeprovisionOptions,
  DeprovisionResult,
  IntegrationConnector,
  PassboltConfig,
  ProvisionResult,
  ProvisioningCondition,
} from './types'

const execFileAsync = promisify(execFile)

type PassboltRole = 'user' | 'admin'

type PassboltCliConfig = {
  cliPath: string
  cliUser?: string
  defaultRole: PassboltRole
}

type PassboltApiConfig = {
  baseUrl: string
  apiToken: string
  defaultRole: PassboltRole
}

function normalizeRole(value?: string): PassboltRole | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'admin') return 'admin'
  if (normalized === 'user') return 'user'
  return null
}

function splitName(fullName: string | null | undefined, fallbackEmail?: string) {
  const cleaned = (fullName || '').trim()
  if (cleaned) {
    const parts = cleaned.split(/\s+/).filter(Boolean)
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: parts[0] }
    }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }
  const emailPrefix = (fallbackEmail || '').split('@')[0]
  if (emailPrefix) {
    return { firstName: emailPrefix, lastName: emailPrefix }
  }
  return { firstName: 'New', lastName: 'User' }
}

function parseInviteUrl(output: string) {
  const match = output.match(/https?:\/\/\S+/i)
  return match ? match[0] : null
}

function matchesCondition(employee: Employee, condition: ProvisioningCondition): boolean {
  for (const [key, value] of Object.entries(condition)) {
    if (value === undefined || value === null) continue
    const employeeValue = (employee as Record<string, unknown>)[key]
    if (typeof employeeValue === 'string' && typeof value === 'string') {
      if (employeeValue.toLowerCase() !== value.toLowerCase()) {
        return false
      }
    } else if (employeeValue !== value) {
      return false
    }
  }
  return true
}

function resolveRoleFromRules(
  employee: Employee,
  rules: AppProvisioningRule[],
  fallback: PassboltRole
) {
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)
  for (const rule of sortedRules) {
    if (!rule.isActive) continue
    const condition = (rule.condition || {}) as ProvisioningCondition
    if (!matchesCondition(employee, condition)) continue
    const data = (rule.provisionData || {}) as Record<string, unknown>
    const role =
      normalizeRole(typeof data.role === 'string' ? data.role : undefined) ||
      (data.isAdmin === true ? 'admin' : null)
    if (role) return role
  }
  return fallback
}

async function runPassboltCli(config: PassboltCliConfig, args: string[]) {
  const command = './bin/cake'
  const commandArgs = ['passbolt', ...args]
  const options = { cwd: config.cliPath }
  if (config.cliUser && config.cliUser.trim()) {
    return execFileAsync('sudo', ['-u', config.cliUser.trim(), command, ...commandArgs], options)
  }
  return execFileAsync(command, commandArgs, options)
}

async function passboltApiRequest(
  config: PassboltApiConfig,
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, unknown>
) {
  const url = `${config.baseUrl.replace(/\/+$/, '')}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Passbolt API error (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json().catch(() => null)
}

async function lookupPassboltUserId(config: PassboltApiConfig, email: string) {
  const query = encodeURIComponent(email)
  const data = await passboltApiRequest(config, `/users.json?search=${query}`, 'GET')
  const users = (data as any)?.users || (data as any)?.body || data
  if (Array.isArray(users) && users.length > 0) {
    return users[0]?.id as string | undefined
  }
  return undefined
}

export class PassboltConnector implements IntegrationConnector {
  private cliConfig?: PassboltCliConfig
  private apiConfig?: PassboltApiConfig

  constructor(config: PassboltConfig) {
    const defaultRole = normalizeRole(config.defaultRole) || 'user'
    if (config.cliPath) {
      this.cliConfig = {
        cliPath: config.cliPath,
        cliUser: config.cliUser,
        defaultRole,
      }
    }
    if (config.baseUrl && config.apiToken) {
      this.apiConfig = {
        baseUrl: config.baseUrl,
        apiToken: config.apiToken,
        defaultRole,
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (this.apiConfig) {
      try {
        await passboltApiRequest(this.apiConfig, '/healthcheck.json', 'GET')
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to reach Passbolt API',
        }
      }
    }

    if (this.cliConfig) {
      try {
        await runPassboltCli(this.cliConfig, ['-h'])
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to run Passbolt CLI',
        }
      }
    }

    return { success: false, error: 'Passbolt connection is not configured' }
  }

  async provisionEmployee(
    employee: Employee,
    _app: App,
    rules: AppProvisioningRule[]
  ): Promise<ProvisionResult> {
    const email = employee.workEmail || employee.personalEmail
    if (!email) {
      return { success: false, error: 'An email address is required for Passbolt provisioning.' }
    }

    const { firstName, lastName } = splitName(employee.fullName, email)
    const defaultRole =
      (this.apiConfig?.defaultRole || this.cliConfig?.defaultRole || 'user') as PassboltRole
    const role = resolveRoleFromRules(employee, rules, defaultRole)

    if (this.apiConfig) {
      try {
        const payload = {
          username: email,
          first_name: firstName,
          last_name: lastName,
          role,
        }
        const response = await passboltApiRequest(this.apiConfig, '/users.json', 'POST', payload)
        const externalId = (response as any)?.id || (response as any)?.user?.id
        return {
          success: true,
          externalUserId: typeof externalId === 'string' ? externalId : undefined,
          externalEmail: email,
          provisionedResources: response ? { response } : undefined,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Passbolt API provisioning failed',
        }
      }
    }

    if (this.cliConfig) {
      try {
        const { stdout, stderr } = await runPassboltCli(this.cliConfig, [
          'register_user',
          '-u',
          email,
          '-f',
          firstName,
          '-l',
          lastName,
          '-r',
          role,
        ])
        const inviteUrl = parseInviteUrl(`${stdout}\n${stderr}`)
        return {
          success: true,
          externalEmail: email,
          externalUsername: email,
          provisionedResources: inviteUrl ? { inviteUrl } : undefined,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Passbolt CLI provisioning failed',
        }
      }
    }

    return { success: false, error: 'Passbolt connection is not configured' }
  }

  async deprovisionEmployee(
    employee: Employee,
    _app: App,
    _account: AppAccount,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    const email = employee.workEmail || employee.personalEmail
    if (!email) {
      return { success: false, error: 'An email address is required to deprovision Passbolt users.' }
    }

    if (this.apiConfig) {
      try {
        const userId = await lookupPassboltUserId(this.apiConfig, email)
        if (!userId) {
          return { success: true }
        }
        await passboltApiRequest(this.apiConfig, `/users/${userId}.json`, 'DELETE')
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Passbolt API deprovisioning failed',
        }
      }
    }

    if (this.cliConfig) {
      try {
        await runPassboltCli(this.cliConfig, ['delete_user', '-u', email])
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Passbolt CLI deprovisioning failed',
        }
      }
    }

    return { success: false, error: 'Passbolt connection is not configured' }
  }
}

export function createPassboltConnector(config: Record<string, unknown>) {
  const mode = typeof config.mode === 'string' ? config.mode : undefined
  const normalizedMode = mode === 'API' || mode === 'CLI' ? mode : undefined
  const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl : undefined
  const apiToken = typeof config.apiToken === 'string' ? config.apiToken : undefined
  const cliPath = typeof config.cliPath === 'string' ? config.cliPath : undefined
  const cliUser = typeof config.cliUser === 'string' ? config.cliUser : undefined
  const defaultRole = normalizeRole(typeof config.defaultRole === 'string' ? config.defaultRole : undefined) || 'user'

  const apiReady = Boolean(baseUrl && apiToken)
  const cliReady = Boolean(cliPath)

  if (normalizedMode === 'API' && !apiReady) return null
  if (normalizedMode === 'CLI' && !cliReady) return null

  if (!apiReady && !cliReady) return null

  return new PassboltConnector({
    mode: normalizedMode,
    baseUrl,
    apiToken,
    cliPath,
    cliUser,
    defaultRole,
  })
}
