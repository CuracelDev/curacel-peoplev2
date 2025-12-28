import type { App, Employee, AppAccount, AppProvisioningRule } from '@prisma/client'
import type { IntegrationConnector, ProvisionResult, DeprovisionResult, DeprovisionOptions } from './types'

type WebhookConfig = {
  provisionUrl?: string
  deprovisionUrl?: string
  testUrl?: string
  apiKey?: string
}

function pickWebhookConfig(config: Record<string, unknown>) {
  const webhook = (config.webhook ?? {}) as Record<string, unknown>
  const provisionUrl = typeof webhook.provisionUrl === 'string' ? webhook.provisionUrl : undefined
  const deprovisionUrl = typeof webhook.deprovisionUrl === 'string' ? webhook.deprovisionUrl : undefined
  const testUrl = typeof webhook.testUrl === 'string' ? webhook.testUrl : undefined
  const apiKey = typeof webhook.apiKey === 'string' ? webhook.apiKey : undefined

  return { provisionUrl, deprovisionUrl, testUrl, apiKey } satisfies WebhookConfig
}

function buildHeaders(apiKey?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (apiKey) headers.authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
  return headers
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export class WebhookConnector implements IntegrationConnector {
  private config: WebhookConfig

  constructor(config: Record<string, unknown>) {
    this.config = pickWebhookConfig(config)
  }

  isConfigured(): boolean {
    return Boolean(this.config.provisionUrl || this.config.deprovisionUrl || this.config.testUrl)
  }

  async testConnection() {
    if (!this.config.testUrl && !this.config.provisionUrl && !this.config.deprovisionUrl) {
      return { success: false, error: 'No webhook URL configured' }
    }

    const url = this.config.testUrl || this.config.provisionUrl || this.config.deprovisionUrl
    if (!url) return { success: false, error: 'No webhook URL configured' }

    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(this.config.apiKey),
    }).catch((e) => e as Error)

    if (res instanceof Error) {
      return { success: false, error: res.message }
    }

    if (!res.ok) {
      const body = await safeJson(res)
      return { success: false, error: body?.error || `HTTP ${res.status}` }
    }

    return { success: true }
  }

  async provisionEmployee(
    employee: Employee,
    app: App,
    rules: AppProvisioningRule[],
    _existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    if (!this.config.provisionUrl) {
      return { success: false, error: 'No provision URL configured' }
    }

    const payload = {
      action: 'provision',
      app: { id: app.id, type: app.type, name: app.name },
      employee,
      rules,
    }

    const res = await fetch(this.config.provisionUrl, {
      method: 'POST',
      headers: buildHeaders(this.config.apiKey),
      body: JSON.stringify(payload),
    }).catch((e) => e as Error)

    if (res instanceof Error) {
      return { success: false, error: res.message }
    }

    const body = await safeJson(res)
    if (!res.ok) {
      return { success: false, error: body?.error || `HTTP ${res.status}` }
    }

    if (body && typeof body.success === 'boolean') {
      if (!body.success) return { success: false, error: body.error || 'Provision failed' }
      return {
        success: true,
        externalUserId: typeof body.externalUserId === 'string' ? body.externalUserId : undefined,
        externalEmail: typeof body.externalEmail === 'string' ? body.externalEmail : undefined,
        externalUsername: typeof body.externalUsername === 'string' ? body.externalUsername : undefined,
        provisionedResources: body.provisionedResources ?? undefined,
      }
    }

    return { success: true }
  }

  async deprovisionEmployee(
    employee: Employee,
    app: App,
    account?: AppAccount | null,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    if (!this.config.deprovisionUrl) {
      return { success: false, error: 'No deprovision URL configured' }
    }

    const payload = {
      action: 'deprovision',
      app: { id: app.id, type: app.type, name: app.name },
      employee,
      account,
    }

    const res = await fetch(this.config.deprovisionUrl, {
      method: 'POST',
      headers: buildHeaders(this.config.apiKey),
      body: JSON.stringify(payload),
    }).catch((e) => e as Error)

    if (res instanceof Error) {
      return { success: false, error: res.message }
    }

    const body = await safeJson(res)
    if (!res.ok) {
      return { success: false, error: body?.error || `HTTP ${res.status}` }
    }

    if (body && typeof body.success === 'boolean') {
      if (!body.success) return { success: false, error: body.error || 'Deprovision failed' }
      return { success: true }
    }

    return { success: true }
  }
}

export function hasWebhookConfig(config: Record<string, unknown>) {
  const webhook = (config.webhook ?? {}) as Record<string, unknown>
  return (
    typeof webhook.provisionUrl === 'string' ||
    typeof webhook.deprovisionUrl === 'string' ||
    typeof webhook.testUrl === 'string'
  )
}
