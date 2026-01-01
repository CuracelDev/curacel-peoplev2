import type { App, AppType, Employee, AppAccount, AppProvisioningRule } from '@prisma/client'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { logIntegrationEvent } from '@/lib/audit'
import { GoogleWorkspaceConnector } from './google-workspace'
import { SlackConnector } from './slack'
import { BitbucketConnector } from './bitbucket'
import { JiraConnector } from './jira'
import { HubSpotConnector } from './hubspot'
import { PassboltConnector, createPassboltConnector } from './passbolt'
import { FirefliesConnector } from './fireflies'
import { WebhookConnector, hasWebhookConfig } from './webhook'
import type { IntegrationConnector, ProvisionResult, DeprovisionResult, DeprovisionOptions } from './types'

export * from './types'
export { GoogleWorkspaceConnector, createGoogleWorkspaceConnector } from './google-workspace'
export { SlackConnector, createSlackConnector } from './slack'
export { BitbucketConnector } from './bitbucket'
export { JiraConnector } from './jira'
export { HubSpotConnector } from './hubspot'
export { PassboltConnector, createPassboltConnector } from './passbolt'
export { FirefliesConnector, getFirefliesConnector, isFirefliesConfigured } from './fireflies'
export { WebflowConnector, createWebflowConnector } from './webflow'

export async function getConnector(app: App): Promise<IntegrationConnector | null> {
  const connection = await prisma.appConnection.findFirst({
    where: { appId: app.id, isActive: true },
  })

  if (!connection) {
    return null
  }

  // Decrypt config
  let config: Record<string, unknown>
  try {
    config = JSON.parse(decrypt(connection.configEncrypted))
  } catch {
    // Config might be stored in plain for dev
    try {
      config = JSON.parse(connection.configEncrypted)
    } catch {
      // If config cannot be parsed, allow env-based fallbacks (e.g. Google Workspace).
      config = {}
    }
  }

  const webhook = hasWebhookConfig(config) ? new WebhookConnector(config) : null
  const webhookConfigured = Boolean(webhook?.isConfigured())
  if (app.type !== 'PASSBOLT' && webhookConfigured) {
    return webhook
  }

  switch (app.type) {
    case 'GOOGLE_WORKSPACE':
      return new GoogleWorkspaceConnector({
        domain: (config.domain as string) || process.env.GOOGLE_WORKSPACE_DOMAIN || '',
        adminEmail: (config.adminEmail as string) || process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL || '',
        serviceAccountKey: (config.serviceAccountKey as string) || process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
      })
    
    case 'SLACK':
      if (!config.botToken || typeof config.botToken !== 'string') return null
      return new SlackConnector({
        botToken: config.botToken as string,
        adminToken: config.adminToken as string | undefined,
        teamId: config.teamId as string | undefined,
        defaultChannels: Array.isArray(config.defaultChannels) ? (config.defaultChannels as string[]) : undefined,
        signingSecret: config.signingSecret as string | undefined,
      })

    case 'BITBUCKET':
      if (!config.workspace) return null
      if (!config.apiToken && !(config.username && config.appPassword)) return null
      return new BitbucketConnector({
        workspace: config.workspace as string,
        username: typeof config.username === 'string' ? (config.username as string) : undefined,
        appPassword: typeof config.appPassword === 'string' ? (config.appPassword as string) : undefined,
        apiToken: typeof config.apiToken === 'string' ? (config.apiToken as string) : undefined,
      })

    case 'JIRA':
      if (!config.baseUrl || !config.adminEmail || !config.apiToken) return null
      return new JiraConnector({
        baseUrl: config.baseUrl as string,
        adminEmail: config.adminEmail as string,
        apiToken: config.apiToken as string,
        products: Array.isArray(config.products) ? (config.products as string[]) : undefined,
        defaultGroups: Array.isArray(config.defaultGroups) ? (config.defaultGroups as string[]) : undefined,
        deleteOnDeprovision: Boolean(config.deleteOnDeprovision),
      })

    case 'HUBSPOT':
      if (!config.scimToken) return null
      return new HubSpotConnector({
        scimToken: config.scimToken as string,
        baseUrl: typeof config.baseUrl === 'string' ? (config.baseUrl as string) : undefined,
      })

    case 'PASSBOLT': {
      const connector = createPassboltConnector(config)
      if (connector) return connector
      return webhookConfigured ? webhook : null
    }

    case 'FIREFLIES':
      if (!config.apiKey || typeof config.apiKey !== 'string') return null
      return new FirefliesConnector(config.apiKey as string)

    case 'WEBFLOW': {
      if (!config.apiToken || typeof config.apiToken !== 'string') return null
      const { WebflowConnector } = await import('./webflow')
      return new WebflowConnector({
        apiToken: config.apiToken as string,
        siteId: (config.siteId as string) || '',
        collectionId: (config.collectionId as string) || '',
        autoPublish: config.autoPublish as boolean | undefined,
        autoSync: config.autoSync as boolean | undefined,
      })
    }

    default:
      return webhookConfigured ? webhook : null
  }
}

async function provisionEmployeeWithApp(
  employee: Employee,
  app: App,
  actorId?: string
): Promise<ProvisionResult & { appAccountId?: string }> {
  if (!app.isEnabled) {
    return { success: false, error: `App ${app.name} is not enabled` }
  }

  const connector = await getConnector(app)
  if (!connector) {
    return { success: false, error: `No active connection for ${app.name}` }
  }

  const rules = await prisma.appProvisioningRule.findMany({
    where: { appId: app.id, isActive: true },
    orderBy: { priority: 'desc' },
  })

  const existingAccount = await prisma.appAccount.findUnique({
    where: {
      employeeId_appId: {
        employeeId: employee.id,
        appId: app.id,
      },
    },
  })

  const account = await prisma.appAccount.upsert({
    where: {
      employeeId_appId: {
        employeeId: employee.id,
        appId: app.id,
      },
    },
    create: {
      employeeId: employee.id,
      appId: app.id,
      status: 'PROVISIONING',
    },
    update: {
      status: 'PROVISIONING',
      statusMessage: null,
    },
  })

  const result = await connector.provisionEmployee(employee, app, rules, existingAccount)

  await prisma.appAccount.update({
    where: { id: account.id },
    data: {
      status: result.success ? (app.type === 'SLACK' && !result.externalUserId ? 'PENDING' : 'ACTIVE') : 'FAILED',
      statusMessage: result.error,
      externalUserId: result.externalUserId,
      externalEmail: result.externalEmail,
      externalUsername: result.externalUsername,
      provisionedResources: result.provisionedResources as object,
      provisionedAt: result.success ? new Date() : undefined,
      lastSyncAt: new Date(),
    },
  })

  if (result.success && app.type === 'GOOGLE_WORKSPACE' && result.externalEmail) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: { workEmail: result.externalEmail },
    })
  }

  const auditAction =
    app.type === 'GOOGLE_WORKSPACE'
      ? 'GOOGLE_USER_CREATED'
      : app.type === 'SLACK'
        ? 'SLACK_USER_CREATED'
        : 'APP_ACCOUNT_PROVISIONED'

  await logIntegrationEvent({
    actorId,
    actorType: 'system',
    action: auditAction,
    appAccountId: account.id,
    employeeId: employee.id,
    metadata: {
      app: app.type,
      appId: app.id,
      success: result.success,
      error: result.error,
      externalUserId: result.externalUserId,
      externalEmail: result.externalEmail,
    },
  })

  return { ...result, appAccountId: account.id }
}

export async function provisionEmployeeInApp(
  employee: Employee,
  appType: AppType,
  actorId?: string
): Promise<ProvisionResult & { appAccountId?: string }> {
  const app = await prisma.app.findFirst({ where: { type: appType } })
  if (!app) {
    return { success: false, error: `App ${appType} is not configured or enabled` }
  }
  return provisionEmployeeWithApp(employee, app, actorId)
}

export async function provisionEmployeeInAppById(
  employee: Employee,
  appId: string,
  actorId?: string
): Promise<ProvisionResult & { appAccountId?: string }> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) return { success: false, error: 'App not found' }
  if (app.archivedAt) return { success: false, error: 'App is archived' }
  return provisionEmployeeWithApp(employee, app, actorId)
}

export async function deprovisionEmployeeInApp(
  employee: Employee,
  appType: AppType,
  actorId?: string,
  options?: DeprovisionOptions
): Promise<DeprovisionResult> {
  const app = await prisma.app.findFirst({ where: { type: appType } })
  if (!app) return { success: false, error: `App ${appType} not found` }
  return deprovisionEmployeeInAppById(employee, app.id, actorId, options)
}

export async function deprovisionEmployeeInAppById(
  employee: Employee,
  appId: string,
  actorId?: string,
  options?: DeprovisionOptions
): Promise<DeprovisionResult> {
  const app = await prisma.app.findUnique({ where: { id: appId } })
  if (!app) return { success: false, error: 'App not found' }
  if (app.archivedAt) return { success: false, error: 'App is archived' }

  const account = await prisma.appAccount.findUnique({
    where: {
      employeeId_appId: {
        employeeId: employee.id,
        appId: app.id,
      },
    },
  })

  if (!account) {
    return { success: true } // Nothing to deprovision
  }

  if (account.status === 'DEPROVISIONED' || account.status === 'DISABLED') {
    return { success: true } // Already deprovisioned
  }

  const connector = await getConnector(app)
  if (!connector) {
    // No connector but we still want to mark as disabled
    await prisma.appAccount.update({
      where: { id: account.id },
      data: {
        status: 'DISABLED',
        statusMessage: 'No connector available - marked as disabled',
        deprovisionedAt: new Date(),
      },
    })
    return { success: true }
  }

  // Deprovision
  const result = await connector.deprovisionEmployee(employee, app, account, options)

  // Update account
  await prisma.appAccount.update({
    where: { id: account.id },
    data: {
      status: result.success ? 'DEPROVISIONED' : 'FAILED',
      statusMessage: result.error,
      deprovisionedAt: result.success ? new Date() : undefined,
      lastSyncAt: new Date(),
    },
  })

  // Audit log
  const auditAction =
    app.type === 'GOOGLE_WORKSPACE'
      ? 'GOOGLE_USER_DISABLED'
      : app.type === 'SLACK'
        ? 'SLACK_USER_DISABLED'
        : 'APP_ACCOUNT_DEPROVISIONED'

  await logIntegrationEvent({
    actorId,
    actorType: 'system',
    action: auditAction,
    appAccountId: account.id,
    employeeId: employee.id,
    metadata: {
      app: app.type,
      appId: app.id,
      success: result.success,
      error: result.error,
    },
  })

  return result
}

export async function deprovisionEmployeeFromAllApps(
  employee: Employee,
  actorId?: string
): Promise<Record<string, DeprovisionResult>> {
  const accounts = await prisma.appAccount.findMany({
    where: { 
      employeeId: employee.id,
      status: { in: ['ACTIVE', 'PENDING', 'PROVISIONING'] },
    },
    include: { app: true },
  })

  const results: Record<string, DeprovisionResult> = {}

  for (const account of accounts) {
    results[account.appId] = await deprovisionEmployeeInAppById(employee, account.appId, actorId)
  }

  return results
}
