import { z } from 'zod'
import { router, itAdminProcedure, adminProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'
import { decrypt, encrypt } from '@/lib/encryption'
import { createAuditLog } from '@/lib/audit'
import { getConnector, BitbucketConnector, GoogleWorkspaceConnector } from '@/lib/integrations'
import { hasWebhookConfig } from '@/lib/integrations/webhook'
import { Prisma } from '@prisma/client'

function safeParseConfig(configEncrypted: string): Record<string, unknown> {
  try {
    return JSON.parse(decrypt(configEncrypted)) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(configEncrypted) as Record<string, unknown>
    } catch {
      return {}
    }
  }
}

function encryptConfigOrThrow(config: Record<string, unknown>): string {
  try {
    return encrypt(JSON.stringify(config))
  } catch (e) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'Unable to save connection settings because ENCRYPTION_KEY is not configured on the server.',
      cause: e,
    })
  }
}

function normalizeConfigInput(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue
      out[key] = trimmed
      continue
    }
    out[key] = value
  }
  return out
}

function jiraAuthHeader(adminEmail: string, apiToken: string) {
  return `Basic ${Buffer.from(`${adminEmail}:${apiToken}`).toString('base64')}`
}

async function resolveJiraConnection(ctx: { prisma: any }, appId?: string) {
  const app = appId
    ? await ctx.prisma.app.findUnique({ where: { id: appId } })
    : await ctx.prisma.app.findFirst({ where: { type: 'JIRA' } })

  if (!app) {
    return { error: 'Jira app is not configured.' }
  }

  const connection = await ctx.prisma.appConnection.findFirst({
    where: { appId: app.id, isActive: true },
  })

  if (!connection) {
    return { error: 'No active Jira connection configured.' }
  }

  const config = safeParseConfig(connection.configEncrypted)
  const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl.replace(/\/+$/, '') : ''
  const adminEmail = typeof config.adminEmail === 'string' ? config.adminEmail : ''
  const apiToken = typeof config.apiToken === 'string' ? config.apiToken : ''

  if (!baseUrl || !adminEmail || !apiToken) {
    return { error: 'Jira connection is missing required configuration.' }
  }

  return {
    baseUrl,
    authHeader: jiraAuthHeader(adminEmail, apiToken),
    appId: app.id,
  }
}

async function jiraRequestJson<T>(url: string, authHeader: string, okStatuses: number[] = [200]) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: authHeader, Accept: 'application/json' },
  })
  if (!okStatuses.includes(res.status)) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }
  return (await res.json()) as T
}

function formatJiraError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  if (typeof message === 'string' && /<html|<!doctype/i.test(message)) {
    return fallback
  }
  return message
}

function validateConnectionConfig(appType: string, config: Record<string, unknown>) {
  switch (appType) {
    case 'GOOGLE_WORKSPACE': {
      if (!config.domain || typeof config.domain !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Google Workspace domain is required' })
      }
      if (!config.adminEmail || typeof config.adminEmail !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Google Workspace admin email is required' })
      }
      if (!config.serviceAccountKey || typeof config.serviceAccountKey !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Google service account key JSON is required' })
      }
      return
    }
    case 'SLACK': {
      if (!config.botToken || typeof config.botToken !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Slack bot token is required' })
      }
      return
    }
    case 'BITBUCKET': {
      if (!config.workspace || typeof config.workspace !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bitbucket workspace is required' })
      }
      const hasApiToken = typeof config.apiToken === 'string' && config.apiToken.length > 0
      const hasAppPassword = typeof config.appPassword === 'string' && config.appPassword.length > 0
      if (!hasApiToken && !hasAppPassword) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bitbucket API token is required' })
      }
      // Bitbucket API tokens require Basic Auth with email:token
      if (!config.username || typeof config.username !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Atlassian account email is required for Bitbucket API tokens' })
      }
      return
    }
    case 'JIRA': {
      if (!config.baseUrl || typeof config.baseUrl !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Jira base URL is required' })
      }
      if (!config.adminEmail || typeof config.adminEmail !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Jira admin email is required' })
      }
      if (!config.apiToken || typeof config.apiToken !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Jira API token is required' })
      }
      return
    }
    case 'HUBSPOT': {
      if (!config.scimToken || typeof config.scimToken !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'HubSpot private app token is required' })
      }
      return
    }
    case 'PASSBOLT': {
      const mode = typeof config.mode === 'string' ? config.mode : ''
      const normalizedMode = mode === 'API' || mode === 'CLI' ? mode : ''
      const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl : ''
      const apiToken = typeof config.apiToken === 'string' ? config.apiToken : ''
      const cliPath = typeof config.cliPath === 'string' ? config.cliPath : ''
      const defaultRole = typeof config.defaultRole === 'string' ? config.defaultRole : ''
      const hasWebhook = hasWebhookConfig(config)

      if (!normalizedMode && !baseUrl && !cliPath && !hasWebhook) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Passbolt configuration is required (API, CLI, or webhook).',
        })
      }

      if (normalizedMode === 'API' || (!normalizedMode && baseUrl)) {
        if (!baseUrl) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passbolt base URL is required' })
        }
        if (!apiToken) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passbolt API token is required' })
        }
      }

      if (normalizedMode === 'CLI' || (!normalizedMode && cliPath)) {
        if (!cliPath) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passbolt CLI path is required' })
        }
      }

      if (defaultRole && !['admin', 'user'].includes(defaultRole)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passbolt default role must be user or admin' })
      }

      return
    }
    case 'FIREFLIES': {
      if (!config.apiKey || typeof config.apiKey !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Fireflies API key is required' })
      }
      return
    }
    case 'WEBFLOW': {
      if (!config.apiToken || typeof config.apiToken !== 'string') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Webflow API token is required' })
      }
      return
    }
    default:
      return
  }
}

const appConnectionSchema = z.object({
  appId: z.string(),
  config: z.record(z.unknown()),
  domain: z.string().optional(),
})

const provisioningRuleSchema = z.object({
  appId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  condition: z.record(z.unknown()),
  provisionData: z.record(z.unknown()),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
})

export const integrationRouter = router({
  // Apps
  listApps: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.app.findMany({
        where: { archivedAt: null },
        include: {
          connections: { where: { isActive: true } },
          _count: {
            select: { 
              provisioningRules: true,
              accounts: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy: { name: 'asc' },
      })
    }),

  listArchivedApps: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.app.findMany({
        where: { archivedAt: { not: null } },
        include: {
          connections: { where: { isActive: true } },
          _count: {
            select: {
              provisioningRules: true,
              accounts: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }),

  createCustomApp: itAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(280).optional(),
        iconUrl: z.string().url().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const name = input.name.trim()
      if (!name) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Name is required' })
      }

      try {
        const app = await ctx.prisma.app.create({
          data: {
            type: 'CUSTOM',
            name,
            description: input.description?.trim() ? input.description.trim() : null,
            iconUrl: input.iconUrl?.trim() ? input.iconUrl.trim() : null,
            // Must be connected before it can be enabled.
            isEnabled: false,
            archivedAt: null,
          },
        })

        await createAuditLog({
          actorId: (ctx.user as { id: string }).id,
          action: 'APP_CREATED',
          resourceType: 'app',
          resourceId: app.id,
          metadata: { type: app.type, name: app.name },
        })

        return app
      } catch (e) {
        // Unique constraint conflict (type+name)
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An application with this name already exists',
          cause: e,
        })
      }
    }),

  archiveApp: itAdminProcedure
    .input(z.object({ appId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id: input.appId },
        select: { id: true, type: true, name: true },
      })
      if (!app) throw new TRPCError({ code: 'NOT_FOUND' })
      if (app.type !== 'CUSTOM') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only custom applications can be archived' })
      }

      const updated = await ctx.prisma.app.update({
        where: { id: input.appId },
        data: { archivedAt: new Date(), isEnabled: false },
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'APP_ARCHIVED',
        resourceType: 'app',
        resourceId: updated.id,
        metadata: { archived: true, type: updated.type, name: updated.name },
      })

      return updated
    }),

  restoreApp: itAdminProcedure
    .input(z.object({ appId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id: input.appId },
        select: { id: true },
      })
      if (!app) throw new TRPCError({ code: 'NOT_FOUND' })

      const updated = await ctx.prisma.app.update({
        where: { id: input.appId },
        data: { archivedAt: null },
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'APP_RESTORED',
        resourceType: 'app',
        resourceId: updated.id,
        metadata: { restored: true, type: updated.type, name: updated.name },
      })

      return updated
    }),

  getApp: adminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id },
        include: {
          connections: true,
          provisioningRules: { orderBy: { priority: 'desc' } },
          _count: {
            select: {
              provisioningRules: true,
              accounts: { where: { status: 'ACTIVE' } },
            },
          },
          accounts: {
            take: 20,
            orderBy: { updatedAt: 'desc' },
            include: {
              employee: { select: { id: true, fullName: true, status: true } },
            },
          },
        },
      })

      if (!app) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return app
    }),

  getConnectionSummary: adminProcedure
    .input(z.string())
    .query(async ({ ctx, input: appId }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id: appId },
        select: { id: true, type: true, archivedAt: true },
      })
      if (!app) throw new TRPCError({ code: 'NOT_FOUND' })
      if (app.archivedAt) {
        return { hasConnection: false, connectionId: null as string | null, domain: null as string | null, config: {}, secrets: {} }
      }

      const connection = await ctx.prisma.appConnection.findFirst({
        where: { appId, isActive: true },
        orderBy: { updatedAt: 'desc' },
      })

      if (!connection) {
        return { hasConnection: false, connectionId: null as string | null, domain: null as string | null, config: {}, secrets: {} }
      }

      const raw = safeParseConfig(connection.configEncrypted)
      const baseSummary = {
        hasConnection: true,
        connectionId: connection.id,
        domain: connection.domain ?? null,
        lastTestStatus: connection.lastTestStatus,
        lastTestedAt: connection.lastTestedAt,
        lastTestError: connection.lastTestError,
      }

      if (app.type === 'GOOGLE_WORKSPACE') {
        return {
          ...baseSummary,
          domain: connection.domain ?? (typeof raw.domain === 'string' ? raw.domain : null),
          config: {
            domain: typeof raw.domain === 'string' ? raw.domain : undefined,
            adminEmail: typeof raw.adminEmail === 'string' ? raw.adminEmail : undefined,
          },
          secrets: {
            serviceAccountKeySet: typeof raw.serviceAccountKey === 'string' && raw.serviceAccountKey.length > 0,
          },
        }
      }

      // Never return secret values; only flags + safe fields.
      if (app.type === 'SLACK') {
        return {
          ...baseSummary,
          config: {
            teamId: typeof raw.teamId === 'string' ? raw.teamId : undefined,
            defaultChannels: Array.isArray(raw.defaultChannels) ? raw.defaultChannels : [],
          },
          secrets: {
            botTokenSet: typeof raw.botToken === 'string' && raw.botToken.length > 0,
            adminTokenSet: typeof raw.adminToken === 'string' && raw.adminToken.length > 0,
            signingSecretSet: typeof raw.signingSecret === 'string' && raw.signingSecret.length > 0,
          },
        }
      }

      if (app.type === 'BITBUCKET') {
        return {
          ...baseSummary,
          config: {
            workspace: typeof raw.workspace === 'string' ? raw.workspace : undefined,
            username: typeof raw.username === 'string' ? raw.username : undefined,
          },
          secrets: {
            appPasswordSet: typeof raw.appPassword === 'string' && raw.appPassword.length > 0,
            apiTokenSet: typeof raw.apiToken === 'string' && raw.apiToken.length > 0,
          },
        }
      }

      if (app.type === 'JIRA') {
        return {
          ...baseSummary,
          config: {
            baseUrl: typeof raw.baseUrl === 'string' ? raw.baseUrl : undefined,
            adminEmail: typeof raw.adminEmail === 'string' ? raw.adminEmail : undefined,
            products: Array.isArray(raw.products) ? raw.products : [],
            defaultGroups: Array.isArray(raw.defaultGroups) ? raw.defaultGroups : [],
          },
          secrets: {
            apiTokenSet: typeof raw.apiToken === 'string' && raw.apiToken.length > 0,
          },
        }
      }

      if (app.type === 'HUBSPOT') {
        return {
          ...baseSummary,
          config: {},
          secrets: {
            scimTokenSet: typeof raw.scimToken === 'string' && raw.scimToken.length > 0,
          },
        }
      }

      if (app.type === 'PASSBOLT') {
        return {
          ...baseSummary,
          domain: connection.domain ?? (typeof raw.baseUrl === 'string' ? raw.baseUrl : null),
          config: {
            mode: typeof raw.mode === 'string' ? raw.mode : undefined,
            baseUrl: typeof raw.baseUrl === 'string' ? raw.baseUrl : undefined,
            cliPath: typeof raw.cliPath === 'string' ? raw.cliPath : undefined,
            cliUser: typeof raw.cliUser === 'string' ? raw.cliUser : undefined,
            defaultRole: typeof raw.defaultRole === 'string' ? raw.defaultRole : undefined,
          },
          secrets: {
            apiTokenSet: typeof raw.apiToken === 'string' && raw.apiToken.length > 0,
          },
        }
      }

      if (app.type === 'FIREFLIES') {
        return {
          ...baseSummary,
          config: {},
          secrets: {
            apiKeySet: typeof raw.apiKey === 'string' && raw.apiKey.length > 0,
          },
        }
      }

      if (app.type === 'WEBFLOW') {
        return {
          ...baseSummary,
          config: {
            siteId: typeof raw.siteId === 'string' ? raw.siteId : undefined,
            collectionId: typeof raw.collectionId === 'string' ? raw.collectionId : undefined,
            autoPublish: typeof raw.autoPublish === 'boolean' ? raw.autoPublish : false,
            autoSync: typeof raw.autoSync === 'boolean' ? raw.autoSync : false,
          },
          secrets: {
            apiTokenSet: typeof raw.apiToken === 'string' && raw.apiToken.length > 0,
          },
        }
      }

      // Default: only indicate there's a connection.
      return { ...baseSummary, config: {}, secrets: {} }
    }),

  upsertConnectionConfig: itAdminProcedure
    .input(
      z.object({
        appId: z.string(),
        domain: z.string().optional(),
        config: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id: input.appId },
        select: { id: true, type: true, archivedAt: true },
      })
      if (!app) throw new TRPCError({ code: 'NOT_FOUND', message: 'App not found' })
      if (app.archivedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Restore this application before connecting it' })

      const connection = await ctx.prisma.appConnection.findFirst({
        where: { appId: input.appId, isActive: true },
        orderBy: { updatedAt: 'desc' },
      })

      const inputCfg = normalizeConfigInput(input.config)
      const merged = connection ? { ...safeParseConfig(connection.configEncrypted), ...inputCfg } : inputCfg

      // Allow callers to explicitly clear arrays.
      for (const [key, value] of Object.entries(input.config)) {
        if (Array.isArray(value)) merged[key] = value
      }

      validateConnectionConfig(app.type, merged)

      const configEncrypted = encryptConfigOrThrow(merged)

      if (!connection) {
        const created = await ctx.prisma.appConnection.create({
          data: {
            appId: input.appId,
            configEncrypted,
            domain: input.domain,
            isActive: true,
          },
        })

        // Auto-enable on first connection for a smoother UX.
        const activeConnections = await ctx.prisma.appConnection.count({
          where: { appId: input.appId, isActive: true },
        })
        if (activeConnections === 1) {
          await ctx.prisma.app.update({
            where: { id: input.appId },
            data: { isEnabled: true },
          })
        }

        await createAuditLog({
          actorId: (ctx.user as { id: string }).id,
          action: 'APP_CONNECTED',
          resourceType: 'app_connection',
          resourceId: created.id,
          metadata: { appType: app.type, domain: input.domain },
        })

        return created
      }

      return ctx.prisma.appConnection.update({
        where: { id: connection.id },
        data: {
          configEncrypted,
          domain: input.domain ?? connection.domain,
        },
      })
    }),

  // Default app definitions - shared between initialize and sync
  // When adding a new app, add it here and it will automatically sync to the database

  // Initialize default apps (admin only, creates all apps)
  initializeApps: adminProcedure
    .mutation(async ({ ctx }) => {
      const defaultApps = [
        { type: 'GOOGLE_WORKSPACE' as const, name: 'Google Workspace', description: 'Provision Google Workspace accounts, groups, and organizational units' },
        { type: 'SLACK' as const, name: 'Slack', description: 'Provision Slack workspace access and channel memberships' },
        { type: 'BITBUCKET' as const, name: 'Bitbucket', description: 'Provision Bitbucket repository access and permissions' },
        { type: 'JIRA' as const, name: 'Jira', description: 'Provision Jira project access and issue management' },
        { type: 'PASSBOLT' as const, name: 'Passbolt', description: 'Provision Passbolt password management and secure sharing' },
        { type: 'HUBSPOT' as const, name: 'HubSpot', description: 'Provision HubSpot CRM access and marketing automation' },
        { type: 'STANDUPNINJA' as const, name: 'StandupNinja', description: 'Provision StandupNinja team standup and status management' },
        { type: 'FIREFLIES' as const, name: 'Fireflies.ai', description: 'Automatically attach meeting transcripts to interviews' },
        { type: 'WEBFLOW' as const, name: 'Webflow', description: 'Publish job postings to your Webflow CMS career page' },
      ]

      for (const app of defaultApps) {
        await ctx.prisma.app.upsert({
          where: { type_name: { type: app.type, name: app.name } },
          create: app,
          update: {
            description: app.description,
          },
        })
      }

      return { success: true }
    }),

  // Sync apps - runs on page load to add any new apps defined in code
  // This ensures new apps are automatically added without manual intervention
  syncApps: itAdminProcedure
    .mutation(async ({ ctx }) => {
      const defaultApps = [
        { type: 'GOOGLE_WORKSPACE' as const, name: 'Google Workspace', description: 'Provision Google Workspace accounts, groups, and organizational units' },
        { type: 'SLACK' as const, name: 'Slack', description: 'Provision Slack workspace access and channel memberships' },
        { type: 'BITBUCKET' as const, name: 'Bitbucket', description: 'Provision Bitbucket repository access and permissions' },
        { type: 'JIRA' as const, name: 'Jira', description: 'Provision Jira project access and issue management' },
        { type: 'PASSBOLT' as const, name: 'Passbolt', description: 'Provision Passbolt password management and secure sharing' },
        { type: 'HUBSPOT' as const, name: 'HubSpot', description: 'Provision HubSpot CRM access and marketing automation' },
        { type: 'STANDUPNINJA' as const, name: 'StandupNinja', description: 'Provision StandupNinja team standup and status management' },
        { type: 'FIREFLIES' as const, name: 'Fireflies.ai', description: 'Automatically attach meeting transcripts to interviews' },
        { type: 'WEBFLOW' as const, name: 'Webflow', description: 'Publish job postings to your Webflow CMS career page' },
      ]

      // Get existing app types
      const existingApps = await ctx.prisma.app.findMany({
        select: { type: true },
      })
      const existingTypes = new Set(existingApps.map(a => a.type))

      // Only upsert apps that don't exist yet (faster than upserting all)
      const newApps = defaultApps.filter(app => !existingTypes.has(app.type))

      for (const app of newApps) {
        await ctx.prisma.app.upsert({
          where: { type_name: { type: app.type, name: app.name } },
          create: { ...app, isEnabled: true },
          update: {},
        })
      }

      return { added: newApps.length }
    }),

  toggleApp: itAdminProcedure
    .input(z.object({
      appId: z.string(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id: input.appId },
        select: { id: true, archivedAt: true, type: true },
      })
      if (!app) throw new TRPCError({ code: 'NOT_FOUND' })
      if (app.archivedAt && input.isEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Restore this application before enabling it' })
      }
      if (input.isEnabled) {
        const hasConnection = await ctx.prisma.appConnection.findFirst({
          where: { appId: input.appId, isActive: true },
          select: { id: true },
        })
        if (!hasConnection) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Connect this application before enabling it' })
        }
        const fullApp = await ctx.prisma.app.findUnique({ where: { id: input.appId } })
        if (fullApp) {
          const connector = await getConnector(fullApp)
          if (!connector) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'This application is connected but not configured. Configure it in Settings first.',
            })
          }
        }
      }
      return ctx.prisma.app.update({
        where: { id: input.appId },
        data: { isEnabled: input.isEnabled },
      })
    }),

  // Connections
  createConnection: itAdminProcedure
    .input(appConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id: input.appId },
      })

      if (!app) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'App not found' })
      }
      if (app.archivedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Restore this application before connecting it' })
      }

      // Encrypt config
      const configEncrypted = encryptConfigOrThrow(input.config)

      const connection = await ctx.prisma.appConnection.create({
        data: {
          appId: input.appId,
          configEncrypted,
          domain: input.domain,
          isActive: true,
        },
      })

      // Auto-enable on first connection for a smoother UX.
      const activeConnections = await ctx.prisma.appConnection.count({
        where: { appId: input.appId, isActive: true },
      })
      if (activeConnections === 1) {
        await ctx.prisma.app.update({
          where: { id: input.appId },
          data: { isEnabled: true },
        })
      }

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'APP_CONNECTED',
        resourceType: 'app_connection',
        resourceId: connection.id,
        metadata: { appType: app.type, domain: input.domain },
      })

      return connection
    }),

  updateConnection: itAdminProcedure
    .input(z.object({
      connectionId: z.string(),
      config: z.record(z.unknown()),
      domain: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const configEncrypted = encryptConfigOrThrow(input.config)

      return ctx.prisma.appConnection.update({
        where: { id: input.connectionId },
        data: {
          configEncrypted,
          domain: input.domain,
        },
      })
    }),

  deleteConnection: itAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: connectionId }) => {
      const connection = await ctx.prisma.appConnection.findUnique({
        where: { id: connectionId },
        include: { app: true },
      })

      if (!connection) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.appConnection.delete({
        where: { id: connectionId },
      })

      const remaining = await ctx.prisma.appConnection.count({
        where: { appId: connection.appId, isActive: true },
      })
      if (remaining === 0) {
        await ctx.prisma.app.update({
          where: { id: connection.appId },
          data: { isEnabled: false },
        })
      }

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'APP_DISCONNECTED',
        resourceType: 'app_connection',
        resourceId: connectionId,
        metadata: { appType: connection.app.type },
      })

      return { success: true }
    }),

  testConnection: itAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: appId }) => {
      const app = await ctx.prisma.app.findUnique({
        where: { id: appId },
      })

      if (!app) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      if (app.archivedAt) {
        return { success: false, error: 'This application is archived. Restore it to test the connection.' }
      }

      const connection = await ctx.prisma.appConnection.findFirst({
        where: { appId: app.id, isActive: true },
        orderBy: { updatedAt: 'desc' },
      })
      if (!connection) {
        return { success: false, error: 'No active connection configured' }
      }

      const connector = await getConnector(app)
      if (!connector) {
        const result = { success: false, error: 'No active connection configured' }
        await ctx.prisma.appConnection.update({
          where: { id: connection.id },
          data: {
            lastTestStatus: 'FAILED',
            lastTestError: result.error,
            lastTestedAt: new Date(),
          },
        })
        return result
      }

      let result: { success: boolean; error?: string }
      try {
        result = await connector.testConnection()
      } catch (error) {
        result = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to connect',
        }
      }

      await ctx.prisma.appConnection.update({
        where: { id: connection.id },
        data: {
          lastTestStatus: result.success ? 'SUCCESS' : 'FAILED',
          lastTestError: result.success ? null : result.error || 'Connection failed',
          lastTestedAt: new Date(),
        },
      })

      return result
    }),

  listBitbucketOptions: adminProcedure
    .input(z.string())
    .query(async ({ ctx, input: appId }) => {
      const app = await ctx.prisma.app.findUnique({ where: { id: appId } })
      if (!app) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      if (app.type !== 'BITBUCKET') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'App is not Bitbucket' })
      }

      const connection = await ctx.prisma.appConnection.findFirst({
        where: { appId, isActive: true },
      })
      if (!connection) {
        return { groups: [], repositories: [], error: 'No active Bitbucket connection configured.' }
      }

      const config = safeParseConfig(connection.configEncrypted)
      const workspace = typeof config.workspace === 'string' ? config.workspace : ''
      const apiToken = typeof config.apiToken === 'string' ? config.apiToken : undefined
      const username = typeof config.username === 'string' ? config.username : undefined
      const appPassword = typeof config.appPassword === 'string' ? config.appPassword : undefined

      if (!workspace) {
        return { groups: [], repositories: [], error: 'Bitbucket workspace is not configured.' }
      }
      if (!apiToken && !(username && appPassword)) {
        return { groups: [], repositories: [], error: 'Bitbucket credentials are not configured.' }
      }

      const connector = new BitbucketConnector({ workspace, username, appPassword, apiToken })
      try {
        const [groups, repositories] = await Promise.all([
          connector.listGroups(),
          connector.listRepositories(),
        ])
        return { groups, repositories }
      } catch (error) {
        return {
          groups: [],
          repositories: [],
          error: error instanceof Error ? error.message : 'Failed to load Bitbucket data',
        }
      }
    }),

  listJiraGroups: adminProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input: appId }) => {
      const connection = await resolveJiraConnection(ctx, appId)
      if ('error' in connection) {
        return { groups: [], error: connection.error }
      }

      const groups: Array<{ name: string }> = []
      let startAt = 0
      const maxResults = 50
      let total = Number.POSITIVE_INFINITY

      try {
        while (startAt < total) {
          const url = `${connection.baseUrl}/rest/api/3/groups/picker?startAt=${startAt}&maxResults=${maxResults}&query=`
          const data = await jiraRequestJson<{ groups?: Array<{ name?: string }>; total?: number }>(
            url,
            connection.authHeader
          )
          const page = (data.groups || [])
            .map((group) => (group.name ? { name: group.name } : null))
            .filter(Boolean) as Array<{ name: string }>
          groups.push(...page)
          total = typeof data.total === 'number' ? data.total : groups.length
          if (page.length < maxResults) break
          startAt += maxResults
          if (startAt > 5000) break
        }
        return { groups }
      } catch (error) {
        return {
          groups: [],
          error: formatJiraError(
            error,
            'Failed to load Jira groups. Ensure the admin user has Browse users and groups permission and the API token includes read:group:jira scope.'
          ),
        }
      }
    }),

  listJiraProducts: adminProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input: appId }) => {
      const connection = await resolveJiraConnection(ctx, appId)
      if ('error' in connection) {
        return { products: [], error: connection.error }
      }

      try {
        const url = `${connection.baseUrl}/rest/api/3/applicationrole`
        const data = await jiraRequestJson<
          Array<{ key?: string; name?: string; userCount?: number; numberOfSeats?: number }>
        >(url, connection.authHeader)
        const products = (data || [])
          .map((role) => {
            if (!role.key) return null
            return {
              key: role.key,
              name: role.name || role.key,
              userCount: typeof role.userCount === 'number' ? role.userCount : role.numberOfSeats,
            }
          })
          .filter(Boolean) as Array<{ key: string; name: string; userCount?: number }>
        return { products }
      } catch (error) {
        return {
          products: [],
          error: error instanceof Error ? error.message : 'Failed to load Jira products',
        }
      }
    }),

  listJiraBoards: adminProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input: appId }) => {
      const connection = await resolveJiraConnection(ctx, appId)
      if ('error' in connection) {
        return { boards: [], error: connection.error }
      }

      const boards: Array<{
        id: number
        name: string
        type?: string
        projectId?: string
        projectKey?: string
        projectName?: string
      }> = []
      let startAt = 0
      const maxResults = 50
      let isLast = false

      try {
        while (!isLast) {
          const url = `${connection.baseUrl}/rest/agile/1.0/board?startAt=${startAt}&maxResults=${maxResults}`
          const data = await jiraRequestJson<{ values?: any[]; isLast?: boolean }>(url, connection.authHeader)
          const page = (data.values || []).map((board) => {
            const location = board.location || {}
            return {
              id: Number(board.id),
              name: board.name as string,
              type: board.type as string,
              projectId: location.projectId ? String(location.projectId) : undefined,
              projectKey: location.projectKey as string | undefined,
              projectName: location.projectName as string | undefined,
            }
          })
          boards.push(...page)
          isLast = Boolean(data.isLast) || page.length < maxResults
          startAt += maxResults
          if (startAt > 5000) break
        }
        return { boards }
      } catch (error) {
        return {
          boards: [],
          error: error instanceof Error ? error.message : 'Failed to load Jira boards',
        }
      }
    }),

  listJiraProjectRoles: adminProcedure
    .input(z.object({ appId: z.string().optional(), projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connection = await resolveJiraConnection(ctx, input.appId)
      if ('error' in connection) {
        return { roles: [], error: connection.error }
      }

      try {
        const url = `${connection.baseUrl}/rest/api/3/project/${input.projectId}/role`
        const data = await jiraRequestJson<Record<string, string>>(url, connection.authHeader)
        const roles = Object.entries(data || {})
          .map(([name, roleUrl]) => {
            const id = roleUrl.split('/').pop() || ''
            return id ? { id, name } : null
          })
          .filter(Boolean) as Array<{ id: string; name: string }>
        return { roles }
      } catch (error) {
        return {
          roles: [],
          error: error instanceof Error ? error.message : 'Failed to load Jira project roles',
        }
      }
    }),

  listGoogleWorkspaceGroups: adminProcedure
    .input(z.string())
    .query(async ({ ctx, input: appId }) => {
      const app = await ctx.prisma.app.findUnique({ where: { id: appId } })
      if (!app) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      if (app.type !== 'GOOGLE_WORKSPACE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'App is not Google Workspace' })
      }

      const connection = await ctx.prisma.appConnection.findFirst({
        where: { appId, isActive: true },
      })
      if (!connection) {
        return { groups: [], error: 'No active Google Workspace connection configured.' }
      }

      const config = safeParseConfig(connection.configEncrypted)
      const domain = typeof config.domain === 'string' ? config.domain : ''
      const adminEmail = typeof config.adminEmail === 'string' ? config.adminEmail : ''
      const serviceAccountKey = typeof config.serviceAccountKey === 'string' ? config.serviceAccountKey : ''

      if (!domain || !adminEmail || !serviceAccountKey) {
        return { groups: [], error: 'Google Workspace connection is missing required configuration.' }
      }

      const connector = new GoogleWorkspaceConnector({ domain, adminEmail, serviceAccountKey })
      try {
        const groups = await connector.listGroups()
        return { groups }
      } catch (error) {
        return {
          groups: [],
          error: error instanceof Error ? error.message : 'Failed to load Google Workspace groups',
        }
      }
    }),

  listGoogleWorkspaceUsers: adminProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input: appId }) => {
      const app = appId
        ? await ctx.prisma.app.findUnique({ where: { id: appId } })
        : await ctx.prisma.app.findFirst({ where: { type: 'GOOGLE_WORKSPACE' } })
      if (!app) {
        return { users: [], error: 'Google Workspace app is not configured.' }
      }
      if (app.type !== 'GOOGLE_WORKSPACE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'App is not Google Workspace' })
      }

      const connection = await ctx.prisma.appConnection.findFirst({
        where: { appId: app.id, isActive: true },
      })
      if (!connection) {
        return { users: [], error: 'No active Google Workspace connection configured.' }
      }

      const config = safeParseConfig(connection.configEncrypted)
      const domain = typeof config.domain === 'string' ? config.domain : ''
      const adminEmail = typeof config.adminEmail === 'string' ? config.adminEmail : ''
      const serviceAccountKey = typeof config.serviceAccountKey === 'string' ? config.serviceAccountKey : ''

      if (!domain || !adminEmail || !serviceAccountKey) {
        return { users: [], error: 'Google Workspace connection is missing required configuration.' }
      }

      const connector = new GoogleWorkspaceConnector({ domain, adminEmail, serviceAccountKey })
      try {
        const users = await connector.listUsers()
        return { users }
      } catch (error) {
        return {
          users: [],
          error: error instanceof Error ? error.message : 'Failed to load Google Workspace users',
        }
      }
    }),

  // Provisioning Rules
  listRules: adminProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input: appId }) => {
      const where = appId ? { appId } : {}
      
      return ctx.prisma.appProvisioningRule.findMany({
        where,
        include: { app: { select: { id: true, name: true, type: true } } },
        orderBy: [{ appId: 'asc' }, { priority: 'desc' }],
      })
    }),

  createRule: itAdminProcedure
    .input(provisioningRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.appProvisioningRule.create({
        data: {
          appId: input.appId,
          name: input.name,
          description: input.description,
          condition: input.condition as Prisma.InputJsonValue,
          provisionData: input.provisionData as Prisma.InputJsonValue,
          priority: input.priority,
          isActive: input.isActive,
        },
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'PROVISIONING_RULE_CREATED',
        resourceType: 'provisioning_rule',
        resourceId: rule.id,
        metadata: { name: rule.name, appId: rule.appId },
      })

      return rule
    }),

  updateRule: itAdminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      condition: z.record(z.unknown()).optional(),
      provisionData: z.record(z.unknown()).optional(),
      priority: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const { condition, provisionData, ...rest } = data

      const rule = await ctx.prisma.appProvisioningRule.update({
        where: { id },
        data: {
          ...rest,
          ...(condition ? { condition: condition as Prisma.InputJsonValue } : {}),
          ...(provisionData ? { provisionData: provisionData as Prisma.InputJsonValue } : {}),
        },
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'PROVISIONING_RULE_UPDATED',
        resourceType: 'provisioning_rule',
        resourceId: id,
        metadata: { updatedFields: Object.keys(data) },
      })

      return rule
    }),

  deleteRule: itAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      await ctx.prisma.appProvisioningRule.delete({
        where: { id },
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'PROVISIONING_RULE_DELETED',
        resourceType: 'provisioning_rule',
        resourceId: id,
      })

      return { success: true }
    }),

  // App Accounts
  listAccounts: adminProcedure
    .input(z.object({
      appId: z.string().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { appId, status, page = 1, limit = 20 } = input || {}
      
      const where: Record<string, unknown> = {}
      if (appId) where.appId = appId
      if (status) where.status = status

      const [accounts, total] = await Promise.all([
        ctx.prisma.appAccount.findMany({
          where,
          include: {
            app: { select: { id: true, name: true, type: true } },
            employee: { select: { id: true, fullName: true, status: true, workEmail: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.appAccount.count({ where }),
      ])

      return {
        accounts,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  getEmployeeAccounts: adminProcedure
    .input(z.string())
    .query(async ({ ctx, input: employeeId }) => {
      return ctx.prisma.appAccount.findMany({
        where: { employeeId },
        include: {
          app: { select: { id: true, name: true, type: true } },
        },
        orderBy: { app: { name: 'asc' } },
      })
    }),
})
