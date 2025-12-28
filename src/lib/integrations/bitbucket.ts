import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'
import type {
  IntegrationConnector,
  ProvisionResult,
  DeprovisionResult,
  DeprovisionOptions,
  BitbucketConfig,
  BitbucketProvisionData,
  ProvisioningCondition,
} from './types'

const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0'
const BITBUCKET_API_V1_BASE = 'https://api.bitbucket.org/1.0'

function basicAuth(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64')
}

function matchesCondition(employee: Employee, condition: ProvisioningCondition): boolean {
  for (const [key, value] of Object.entries(condition)) {
    if (value === undefined || value === null) continue
    const employeeValue = (employee as Record<string, unknown>)[key]
    if (typeof employeeValue === 'string' && typeof value === 'string') {
      if (employeeValue.toLowerCase() !== value.toLowerCase()) return false
    } else if (employeeValue !== value) {
      return false
    }
  }
  return true
}

function mergeProvisionData(employee: Employee, rules: AppProvisioningRule[]): BitbucketProvisionData {
  const result: BitbucketProvisionData = { repositories: [], groups: [] }
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (!rule.isActive) continue
    const condition = rule.condition as ProvisioningCondition
    if (!matchesCondition(employee, condition)) continue
    const data = rule.provisionData as BitbucketProvisionData
    if (data.groups?.length) {
      result.groups = [...(result.groups || []), ...data.groups]
    }
    if (data.repositories?.length) {
      result.repositories = [...(result.repositories || []), ...data.repositories]
    }
  }

  // Dedupe groups while keeping order
  result.groups = result.groups ? Array.from(new Set(result.groups.filter(Boolean))) : []

  // Dedupe by repoSlug (keep highest permission if duplicates, order matters)
  const byRepo = new Map<string, { repoSlug: string; permission: 'read' | 'write' | 'admin' }>()
  const rank: Record<string, number> = { read: 1, write: 2, admin: 3 }
  for (const r of result.repositories || []) {
    if (!r?.repoSlug) continue
    const prev = byRepo.get(r.repoSlug)
    if (!prev || rank[r.permission] > rank[prev.permission]) byRepo.set(r.repoSlug, r)
  }
  result.repositories = Array.from(byRepo.values())
  return result
}

async function requestJsonWithAuth<T>(
  url: string,
  init: RequestInit,
  expectedOk: number[] = [200],
  authHeaders: string[] = []
): Promise<T> {
  if (authHeaders.length === 0) {
    throw new Error('Bitbucket credentials are not configured.')
  }

  let lastError: Error | null = null
  for (const authHeader of authHeaders) {
    const res = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: authHeader },
    })
    if (expectedOk.includes(res.status)) {
      if (res.status === 204) return {} as T
      return (await res.json()) as T
    }
    const text = await res.text().catch(() => '')
    const error = new Error(`Bitbucket API error (${res.status}): ${text || res.statusText}`)
    if (res.status === 401 || res.status === 403) {
      lastError = error
      continue
    }
    throw error
  }

  throw lastError || new Error('Bitbucket API error (401): Unauthorized')
}

async function requestPaginatedWithAuth<T>(
  url: string,
  init: RequestInit,
  maxPages: number,
  authHeaders: string[]
): Promise<T[]> {
  const items: T[] = []
  let nextUrl: string | null = url
  let page = 0

  while (nextUrl && page < maxPages) {
    const data = await requestJsonWithAuth<{ values?: T[]; next?: string }>(
      nextUrl,
      init,
      [200],
      authHeaders
    )
    if (Array.isArray(data.values)) {
      items.push(...data.values)
    }
    nextUrl = typeof data.next === 'string' ? data.next : null
    page += 1
  }

  return items
}

export class BitbucketConnector implements IntegrationConnector {
  private config: BitbucketConfig
  private authHeaders: string[]

  constructor(config: BitbucketConfig) {
    this.config = config
    const headers: string[] = []
    // Bitbucket has two types of tokens:
    // 1. Account-level API tokens: Basic Auth with email:token
    // 2. Repository/Workspace Access Tokens: Bearer auth
    // We try both methods to support either token type.
    if (config.apiToken) {
      // Try Bearer auth for Repository/Workspace Access Tokens
      headers.push(`Bearer ${config.apiToken}`)
    }
    if (config.username && config.apiToken) {
      // Try Basic Auth for Account-level API tokens (email:token)
      headers.push(`Basic ${basicAuth(config.username, config.apiToken)}`)
    }
    if (config.username && config.appPassword) {
      headers.push(`Basic ${basicAuth(config.username, config.appPassword)}`)
    }
    this.authHeaders = Array.from(new Set(headers))
  }

  async listGroups(): Promise<Array<{ slug: string; name: string }>> {
    // Bitbucket Cloud uses 1.0 API for groups (2.0 doesn't have groups endpoint yet)
    const url = `${BITBUCKET_API_V1_BASE}/groups/${encodeURIComponent(this.config.workspace)}`
    const data = await requestJsonWithAuth<Array<{ slug?: string; name?: string }>>(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      [200],
      this.authHeaders
    )
    const groups = Array.isArray(data) ? data : []
    return groups
      .filter((group) => typeof group.slug === 'string' && group.slug.length > 0)
      .map((group) => ({
        slug: group.slug as string,
        name: typeof group.name === 'string' && group.name.length > 0 ? group.name : (group.slug as string),
      }))
  }

  async listRepositories(): Promise<Array<{ slug: string; name: string }>> {
    const url = `${BITBUCKET_API_BASE}/repositories/${encodeURIComponent(this.config.workspace)}?pagelen=100`
    const values = await requestPaginatedWithAuth<{ slug?: string; name?: string }>(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      10,
      this.authHeaders
    )
    return values
      .filter((repo) => typeof repo.slug === 'string' && repo.slug.length > 0)
      .map((repo) => ({
        slug: repo.slug as string,
        name: typeof repo.name === 'string' && repo.name.length > 0 ? repo.name : (repo.slug as string),
      }))
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.config.workspace) {
        await requestJsonWithAuth(
          `${BITBUCKET_API_BASE}/repositories/${encodeURIComponent(this.config.workspace)}?pagelen=1`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
          [200],
          this.authHeaders
        )
      } else {
        await requestJsonWithAuth(
          `${BITBUCKET_API_BASE}/user`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
          [200],
          this.authHeaders
        )
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to connect to Bitbucket' }
    }
  }

  private async lookupWorkspaceMemberAccountId(email: string): Promise<string | null> {
    const params = new URLSearchParams()
    params.set('q', `user.email IN ("${email}")`)
    params.set('fields', 'values.user.account_id,values.user.email')
    const url = `${BITBUCKET_API_BASE}/workspaces/${encodeURIComponent(this.config.workspace)}/members?${params.toString()}`
    const data = await requestJsonWithAuth<{ values?: Array<{ user?: { account_id?: string; email?: string } }> }>(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      [200],
      this.authHeaders
    )
    const accountId = data.values?.find((v) => v.user?.account_id)?.user?.account_id
    return accountId ?? null
  }

  async provisionEmployee(
    employee: Employee,
    app: App,
    rules: AppProvisioningRule[],
    existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    try {
      const email = employee.workEmail || employee.personalEmail
      if (!email) return { success: false, error: 'Email is required to provision Bitbucket' }

      const provisionData = mergeProvisionData(employee, rules)
      const hasGroups = Boolean(provisionData.groups && provisionData.groups.length > 0)
      const hasRepos = Boolean(provisionData.repositories && provisionData.repositories.length > 0)
      if (!hasGroups && !hasRepos) {
        return {
          success: false,
          error: 'No Bitbucket provisioning rules found. Add rules with groups or repositories + permissions.',
        }
      }

      const accountId =
        existingAccount?.externalUserId || (await this.lookupWorkspaceMemberAccountId(email))
      if (!accountId) {
        return {
          success: false,
          error: `Bitbucket user not found in workspace "${this.config.workspace}". Invite them to the workspace first, then retry.`,
        }
      }

      const appliedGroups: string[] = []
      for (const groupSlug of provisionData.groups || []) {
        const url = `${BITBUCKET_API_BASE}/workspaces/${encodeURIComponent(this.config.workspace)}/permissions-config/groups/${encodeURIComponent(
          groupSlug
        )}/members/${encodeURIComponent(accountId)}`
        await requestJsonWithAuth(
          url,
          {
            method: 'PUT',
            headers: { Accept: 'application/json' },
          },
          [200, 204],
          this.authHeaders
        )
        appliedGroups.push(groupSlug)
      }

      const applied: Array<{ repoSlug: string; permission: string }> = []
      for (const repo of provisionData.repositories || []) {
        const url = `${BITBUCKET_API_BASE}/repositories/${encodeURIComponent(this.config.workspace)}/${encodeURIComponent(
          repo.repoSlug
        )}/permissions-config/users/${encodeURIComponent(accountId)}`
        await requestJsonWithAuth(
          url,
          {
            method: 'PUT',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ permission: repo.permission }),
          },
          [200],
          this.authHeaders
        )
        applied.push({ repoSlug: repo.repoSlug, permission: repo.permission })
      }

      return {
        success: true,
        externalUserId: accountId,
        externalEmail: email,
        provisionedResources: { repositories: applied, groups: appliedGroups },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to provision Bitbucket access',
      }
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
      if (!accountId) return { success: false, error: 'No Bitbucket user id found' }

      const resources = (account.provisionedResources as any) || {}
      const groups: string[] = resources.groups || []
      const repos: Array<{ repoSlug: string }> = resources.repositories || []
      if (!groups.length && !repos.length) return { success: true }

      for (const groupSlug of groups) {
        if (!groupSlug) continue
        const url = `${BITBUCKET_API_BASE}/workspaces/${encodeURIComponent(this.config.workspace)}/permissions-config/groups/${encodeURIComponent(
          groupSlug
        )}/members/${encodeURIComponent(accountId)}`
        await requestJsonWithAuth(
          url,
          {
            method: 'DELETE',
            headers: { Accept: 'application/json' },
          },
          [204],
          this.authHeaders
        )
      }

      for (const repo of repos) {
        if (!repo.repoSlug) continue
        const url = `${BITBUCKET_API_BASE}/repositories/${encodeURIComponent(this.config.workspace)}/${encodeURIComponent(
          repo.repoSlug
        )}/permissions-config/users/${encodeURIComponent(accountId)}`
        await requestJsonWithAuth(
          url,
          {
            method: 'DELETE',
            headers: { Accept: 'application/json' },
          },
          [204],
          this.authHeaders
        )
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deprovision Bitbucket access',
      }
    }
  }
}
