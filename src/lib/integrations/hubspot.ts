import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'
import type {
  IntegrationConnector,
  ProvisionResult,
  DeprovisionResult,
  DeprovisionOptions,
  HubSpotConfig,
} from './types'

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '')
}

async function requestHubSpot<T>(url: string, init: RequestInit, okStatuses: number[] = [200]) {
  const res = await fetch(url, init)
  if (!okStatuses.includes(res.status)) {
    const text = await res.text().catch(() => '')
    throw new Error(`HubSpot API error (${res.status}): ${text || res.statusText}`)
  }
  if (res.status === 204) return {} as T
  return (await res.json()) as T
}

type HubSpotUser = {
  id?: string | number
  email?: string
  userId?: string | number
}

export class HubSpotConnector implements IntegrationConnector {
  private config: HubSpotConfig
  private baseUrl: string
  private authHeader: string

  constructor(config: HubSpotConfig) {
    this.config = config
    this.baseUrl = normalizeBaseUrl(config.baseUrl || 'https://api.hubapi.com')
    this.authHeader = `Bearer ${config.scimToken}`
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await requestHubSpot(`${this.baseUrl}/settings/v3/users/?limit=1`, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to connect to HubSpot' }
    }
  }

  private async findUserIdByEmail(email: string): Promise<string | null> {
    const url = `${this.baseUrl}/settings/v3/users/?${new URLSearchParams({ email }).toString()}`
    try {
      const data = await requestHubSpot<{ results?: HubSpotUser[]; users?: HubSpotUser[] }>(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      })
      const users = data.results || data.users || []
      const match = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
      const candidate = match || users[0]
      const id = candidate?.id ?? candidate?.userId
      return id ? String(id) : null
    } catch {
      return null
    }
  }

  async provisionEmployee(
    employee: Employee,
    app: App,
    rules: AppProvisioningRule[],
    existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    try {
      const email = employee.workEmail || employee.personalEmail
      if (!email) return { success: false, error: 'Email is required for HubSpot provisioning' }

      const existingId = existingAccount?.externalUserId || (await this.findUserIdByEmail(email))
      if (existingId) {
        return { success: true, externalUserId: existingId, externalEmail: email }
      }

      const created = await requestHubSpot<HubSpotUser>(
        `${this.baseUrl}/settings/v3/users/`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            sendWelcomeEmail: true,
          }),
        },
        [201, 200]
      )
      const createdId = created.id ?? created.userId
      if (!createdId) {
        return { success: true, externalEmail: email }
      }
      return { success: true, externalUserId: String(createdId), externalEmail: email }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to provision HubSpot user'
      if (message.includes('(409)')) {
        const fallbackId = await this.findUserIdByEmail(employee.workEmail || employee.personalEmail || '')
        return { success: true, externalUserId: fallbackId ?? undefined, externalEmail: employee.workEmail || employee.personalEmail || undefined }
      }
      return { success: false, error: message }
    }
  }

  async deprovisionEmployee(
    employee: Employee,
    app: App,
    account: AppAccount,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    try {
      const email = employee.workEmail || employee.personalEmail || account.externalEmail
      const userId = account.externalUserId || (email ? await this.findUserIdByEmail(email) : null)
      if (!userId && !email) return { success: false, error: 'HubSpot user not found' }
      const target = userId ?? email!
      const url = userId
        ? `${this.baseUrl}/settings/v3/users/${encodeURIComponent(target)}`
        : `${this.baseUrl}/settings/v3/users/${encodeURIComponent(target)}?idProperty=EMAIL`
      await requestHubSpot(
        url,
        {
          method: 'DELETE',
          headers: { Authorization: this.authHeader, Accept: 'application/json' },
        },
        [204, 200]
      )
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to deprovision HubSpot user' }
    }
  }
}
