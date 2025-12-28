import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'
import type {
  IntegrationConnector,
  ProvisionResult,
  DeprovisionResult,
  DeprovisionOptions,
  JiraConfig,
  JiraProvisionData,
  JiraProjectRoleAssignment,
  ProvisioningCondition,
} from './types'

function basicAuth(email: string, apiToken: string) {
  return Buffer.from(`${email}:${apiToken}`).toString('base64')
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '')
}

function matchesCondition(employee: Employee, condition: ProvisioningCondition): boolean {
  const meta = (employee.meta ?? {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(condition)) {
    if (value === undefined || value === null) continue
    const employeeValue =
      (employee as Record<string, unknown>)[key] !== undefined
        ? (employee as Record<string, unknown>)[key]
        : meta[key]
    if (typeof employeeValue === 'string' && typeof value === 'string') {
      if (employeeValue.toLowerCase() !== value.toLowerCase()) return false
    } else if (employeeValue !== value) {
      return false
    }
  }
  return true
}

function mergeProvisionData(employee: Employee, rules: AppProvisioningRule[]): JiraProvisionData {
  const result: JiraProvisionData = { groups: [], projectRoles: [] }
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)
  for (const rule of sortedRules) {
    if (!rule.isActive) continue
    const condition = rule.condition as ProvisioningCondition
    if (!matchesCondition(employee, condition)) continue
    const data = rule.provisionData as JiraProvisionData
    if (data.groups?.length) result.groups = [...(result.groups || []), ...data.groups]
    if (data.projectRoles?.length) {
      result.projectRoles = [...(result.projectRoles || []), ...data.projectRoles]
    }
  }
  result.groups = [...new Set((result.groups || []).filter(Boolean))]
  const dedupedRoles = new Map<string, JiraProjectRoleAssignment>()
  for (const role of result.projectRoles || []) {
    if (!role?.projectId || !role.roleId) continue
    dedupedRoles.set(`${role.projectId}:${role.roleId}`, role)
  }
  result.projectRoles = [...dedupedRoles.values()]
  return result
}

async function requestJson<T>(url: string, init: RequestInit, okStatuses: number[] = [200]) {
  const res = await fetch(url, init)
  if (!okStatuses.includes(res.status)) {
    const text = await res.text().catch(() => '')
    throw new Error(`Jira API error (${res.status}): ${text || res.statusText}`)
  }
  if (res.status === 204) return {} as T
  return (await res.json()) as T
}

export class JiraConnector implements IntegrationConnector {
  private config: JiraConfig
  private baseUrl: string
  private authHeader: string

  constructor(config: JiraConfig) {
    this.config = config
    this.baseUrl = normalizeBaseUrl(config.baseUrl)
    this.authHeader = `Basic ${basicAuth(config.adminEmail, config.apiToken)}`
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await requestJson(`${this.baseUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to connect to Jira' }
    }
  }

  private async findUserAccountIdByEmail(email: string): Promise<string | null> {
    const params = new URLSearchParams()
    params.set('query', email)
    params.set('maxResults', '5')
    const url = `${this.baseUrl}/rest/api/3/user/search?${params.toString()}`
    const users = await requestJson<Array<{ accountId?: string; emailAddress?: string }>>(url, {
      method: 'GET',
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    })
    const match = users.find((u) => u.emailAddress?.toLowerCase?.() === email.toLowerCase())
    return (match?.accountId || users[0]?.accountId) ?? null
  }

  private async ensureUser(email: string, displayName: string): Promise<string> {
    const existing = await this.findUserAccountIdByEmail(email)
    if (existing) return existing

    const products =
      (Array.isArray(this.config.products) && this.config.products.length > 0
        ? this.config.products
        : ['jira-software']) as string[]

    const created = await requestJson<{ accountId?: string }>(
      `${this.baseUrl}/rest/api/3/user`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailAddress: email,
          products,
          displayName,
        }),
      },
      [201, 200]
    )
    if (!created.accountId) throw new Error('Jira user creation did not return accountId')
    return created.accountId
  }

  async provisionEmployee(
    employee: Employee,
    app: App,
    rules: AppProvisioningRule[],
    existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    try {
      const email = employee.workEmail || employee.personalEmail
      if (!email) return { success: false, error: 'Email is required for Jira provisioning' }

      const displayName = employee.fullName || email
      const accountId = existingAccount?.externalUserId || (await this.ensureUser(email, displayName))

      const provisionData = mergeProvisionData(employee, rules)
      const groups = [
        ...(Array.isArray(this.config.defaultGroups) ? this.config.defaultGroups : []),
        ...(provisionData.groups || []),
      ]
        .map((g) => g.trim())
        .filter(Boolean)

      const addedGroups: string[] = []
      for (const group of [...new Set(groups)]) {
        const url = `${this.baseUrl}/rest/api/3/group/user?${new URLSearchParams({ groupname: group }).toString()}`
        await requestJson(
          url,
          {
            method: 'POST',
            headers: {
              Authorization: this.authHeader,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accountId }),
          },
          [201, 200]
        )
        addedGroups.push(group)
      }

      const roleAssignments = (provisionData.projectRoles || []).filter(
        (role) => role.projectId && role.roleId
      )
      const addedRoles: JiraProjectRoleAssignment[] = []
      for (const assignment of roleAssignments) {
        const url = `${this.baseUrl}/rest/api/3/project/${assignment.projectId}/role/${assignment.roleId}`
        await requestJson(
          url,
          {
            method: 'POST',
            headers: {
              Authorization: this.authHeader,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user: [accountId] }),
          },
          [200, 201, 204]
        )
        addedRoles.push(assignment)
      }

      return {
        success: true,
        externalUserId: accountId,
        externalEmail: email,
        provisionedResources: { groups: addedGroups, projectRoles: addedRoles },
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to provision Jira access' }
    }
  }

  async deprovisionEmployee(
    employee: Employee,
    app: App,
    account: AppAccount,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    try {
      const accountId = account.externalUserId
      if (!accountId) return { success: false, error: 'No Jira accountId found' }

      const resources = (account.provisionedResources as any) || {}
      const groups: string[] = [
        ...(Array.isArray(this.config.defaultGroups) ? this.config.defaultGroups : []),
        ...(Array.isArray(resources.groups) ? resources.groups : []),
      ]
        .map((g) => (typeof g === 'string' ? g.trim() : ''))
        .filter(Boolean)

      for (const group of [...new Set(groups)]) {
        const params = new URLSearchParams({ groupname: group, accountId })
        const url = `${this.baseUrl}/rest/api/3/group/user?${params.toString()}`
        await requestJson(
          url,
          {
            method: 'DELETE',
            headers: { Authorization: this.authHeader, Accept: 'application/json' },
          },
          [200, 204]
        )
      }

      const projectRoles = Array.isArray(resources.projectRoles)
        ? (resources.projectRoles as JiraProjectRoleAssignment[])
        : []
      for (const assignment of projectRoles) {
        if (!assignment?.projectId || !assignment.roleId) continue
        const params = new URLSearchParams({ userAccountId: accountId })
        const url = `${this.baseUrl}/rest/api/3/project/${assignment.projectId}/role/${assignment.roleId}?${params.toString()}`
        await requestJson(
          url,
          {
            method: 'DELETE',
            headers: { Authorization: this.authHeader, Accept: 'application/json' },
          },
          [200, 204]
        )
      }

      if (this.config.deleteOnDeprovision) {
        const url = `${this.baseUrl}/rest/api/3/user?${new URLSearchParams({ accountId }).toString()}`
        await requestJson(
          url,
          {
            method: 'DELETE',
            headers: { Authorization: this.authHeader, Accept: 'application/json' },
          },
          [204]
        )
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to deprovision Jira access' }
    }
  }
}
