import type { App, AppAccount, AppProvisioningRule, Employee } from '@prisma/client'
import type { DeprovisionOptions, DeprovisionResult, IntegrationConnector, ProvisionResult } from './types'

export class StandupNinjaConnector implements IntegrationConnector {
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor(config: { apiUrl: string; apiKey: string }) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        return { success: false, error: text || `HTTP ${response.status}` }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to connect' }
    }
  }

  async provisionEmployee(
    _employee: Employee,
    _app: App,
    _rules: AppProvisioningRule[],
    _existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    return {
      success: false,
      error: 'StandupNinja provisioning is handled via Standup Sync, not the generic integrations engine.',
    }
  }

  async deprovisionEmployee(
    _employee: Employee,
    _app: App,
    _account: AppAccount,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    return {
      success: false,
      error: 'StandupNinja deprovisioning is handled via Standup Sync, not the generic integrations engine.',
    }
  }
}
