import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'
import type {
  WebflowConfig,
  WebflowSite,
  WebflowCollection,
  WebflowCollectionSchema,
  WebflowItem,
  WebflowField,
  IntegrationConnector,
  ProvisionResult,
  DeprovisionResult,
  DeprovisionOptions,
} from './types'

const WEBFLOW_API_BASE = 'https://api.webflow.com/v2'

interface WebflowApiError {
  message?: string
  code?: string
  externalReference?: string
}

async function webflowRequest<T>(
  endpoint: string,
  apiToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${WEBFLOW_API_BASE}${endpoint}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    let errorMessage = `Webflow API error (${res.status})`
    try {
      const errorData = await res.json() as WebflowApiError
      errorMessage = errorData.message || errorMessage
    } catch {
      errorMessage = `${errorMessage}: ${res.statusText}`
    }
    throw new Error(errorMessage)
  }

  if (res.status === 204) {
    return {} as T
  }

  return res.json() as Promise<T>
}

export class WebflowConnector implements IntegrationConnector {
  private config: WebflowConfig

  constructor(config: WebflowConfig) {
    this.config = config
  }

  /**
   * Webflow doesn't provision users - this is a no-op
   */
  async provisionEmployee(
    _employee: Employee,
    _app: App,
    _rules: AppProvisioningRule[],
    _existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    return { success: true, error: 'Webflow does not support user provisioning' }
  }

  /**
   * Webflow doesn't deprovision users - this is a no-op
   */
  async deprovisionEmployee(
    _employee: Employee,
    _app: App,
    _account: AppAccount,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    return { success: true }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Use /sites endpoint which works with both site tokens (ws-) and workspace tokens
      const response = await webflowRequest<{ sites: WebflowSite[] }>('/sites', this.config.apiToken)
      if (!response.sites || response.sites.length === 0) {
        return { success: false, error: 'No sites found. Check your API token permissions.' }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Webflow',
      }
    }
  }

  async listSites(): Promise<WebflowSite[]> {
    const response = await webflowRequest<{ sites: WebflowSite[] }>(
      '/sites',
      this.config.apiToken
    )
    return response.sites || []
  }

  async listCollections(siteId: string): Promise<WebflowCollection[]> {
    const response = await webflowRequest<{ collections: WebflowCollection[] }>(
      `/sites/${siteId}/collections`,
      this.config.apiToken
    )
    return response.collections || []
  }

  async getCollectionSchema(collectionId: string): Promise<WebflowCollectionSchema> {
    const response = await webflowRequest<{
      id: string
      displayName: string
      slug: string
      fields: WebflowField[]
    }>(
      `/collections/${collectionId}`,
      this.config.apiToken
    )
    return {
      id: response.id,
      displayName: response.displayName,
      slug: response.slug,
      fields: response.fields || [],
    }
  }

  async createItem(
    collectionId: string,
    fieldData: Record<string, unknown>,
    options: { isDraft?: boolean; isArchived?: boolean } = {}
  ): Promise<WebflowItem> {
    const response = await webflowRequest<WebflowItem>(
      `/collections/${collectionId}/items`,
      this.config.apiToken,
      {
        method: 'POST',
        body: JSON.stringify({
          isArchived: options.isArchived ?? false,
          isDraft: options.isDraft ?? false,
          fieldData,
        }),
      }
    )
    return response
  }

  async updateItem(
    collectionId: string,
    itemId: string,
    fieldData: Record<string, unknown>,
    options: { isDraft?: boolean; isArchived?: boolean } = {}
  ): Promise<WebflowItem> {
    const response = await webflowRequest<WebflowItem>(
      `/collections/${collectionId}/items/${itemId}`,
      this.config.apiToken,
      {
        method: 'PATCH',
        body: JSON.stringify({
          isArchived: options.isArchived,
          isDraft: options.isDraft,
          fieldData,
        }),
      }
    )
    return response
  }

  async publishItems(collectionId: string, itemIds: string[]): Promise<{ publishedItemIds: string[] }> {
    const response = await webflowRequest<{ publishedItemIds: string[] }>(
      `/collections/${collectionId}/items/publish`,
      this.config.apiToken,
      {
        method: 'POST',
        body: JSON.stringify({ itemIds }),
      }
    )
    return response
  }

  async deleteItem(collectionId: string, itemId: string): Promise<void> {
    await webflowRequest<void>(
      `/collections/${collectionId}/items/${itemId}`,
      this.config.apiToken,
      { method: 'DELETE' }
    )
  }

  async getItem(collectionId: string, itemId: string): Promise<WebflowItem | null> {
    try {
      const response = await webflowRequest<WebflowItem>(
        `/collections/${collectionId}/items/${itemId}`,
        this.config.apiToken
      )
      return response
    } catch {
      return null
    }
  }

  async archiveItem(collectionId: string, itemId: string): Promise<WebflowItem> {
    return this.updateItem(collectionId, itemId, {}, { isArchived: true })
  }

  async unarchiveItem(collectionId: string, itemId: string): Promise<WebflowItem> {
    return this.updateItem(collectionId, itemId, {}, { isArchived: false })
  }
}

export async function createWebflowConnector(
  config: Partial<WebflowConfig>
): Promise<WebflowConnector | null> {
  if (!config.apiToken) {
    return null
  }
  return new WebflowConnector({
    apiToken: config.apiToken,
    siteId: config.siteId || '',
    collectionId: config.collectionId || '',
    autoPublish: config.autoPublish,
    autoSync: config.autoSync,
  })
}
