import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { router, adminProcedure } from '@/lib/trpc'
import prisma from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { WebflowConnector } from '@/lib/integrations/webflow'
import {
  syncJobToWebflow,
  unpublishJobFromWebflow,
  deleteJobFromWebflow,
  syncAllJobsToWebflow,
  getJobWebflowStatus,
  isWebflowConfigured,
} from '@/lib/integrations/webflow-sync'
import type { WebflowConfig } from '@/lib/integrations/types'

// Available CuracelPeople job fields for mapping
export const CURACEL_JOB_FIELDS = [
  { key: 'title', label: 'Job Title', type: 'PlainText', required: true },
  { key: 'department', label: 'Department', type: 'PlainText', required: false },
  { key: 'employmentType', label: 'Employment Type', type: 'PlainText', required: false },
  { key: 'salaryMin', label: 'Salary Min', type: 'Number', required: false },
  { key: 'salaryMax', label: 'Salary Max', type: 'Number', required: false },
  { key: 'salaryCurrency', label: 'Salary Currency', type: 'PlainText', required: false },
  { key: 'salaryFrequency', label: 'Salary Frequency', type: 'PlainText', required: false },
  { key: 'locationsText', label: 'Locations', type: 'PlainText', required: false },
  { key: 'jobDescriptionContent', label: 'Job Description (HTML)', type: 'RichText', required: false },
  { key: 'slug', label: 'URL Slug', type: 'PlainText', required: false },
  { key: 'priority', label: 'Priority', type: 'Number', required: false },
  { key: 'deadline', label: 'Application Deadline', type: 'DateTime', required: false },
] as const

async function getWebflowConfigFromConnection(): Promise<{
  config: WebflowConfig
  connectionId: string
  appId: string
} | null> {
  const app = await prisma.app.findFirst({
    where: { type: 'WEBFLOW', isEnabled: true, archivedAt: null },
  })

  if (!app) return null

  const connection = await prisma.appConnection.findFirst({
    where: { appId: app.id, isActive: true },
  })

  if (!connection) return null

  let config: WebflowConfig
  try {
    config = JSON.parse(decrypt(connection.configEncrypted)) as WebflowConfig
  } catch {
    try {
      config = JSON.parse(connection.configEncrypted) as WebflowConfig
    } catch {
      return null
    }
  }

  return { config, connectionId: connection.id, appId: app.id }
}

export const webflowRouter = router({
  // Get Webflow connection status and config
  getStatus: adminProcedure.query(async () => {
    const isConfigured = await isWebflowConfigured()
    const result = await getWebflowConfigFromConnection()

    if (!result) {
      return {
        isConfigured: false,
        isConnected: false,
        siteId: null,
        collectionId: null,
        autoPublish: false,
        autoSync: false,
      }
    }

    return {
      isConfigured: true,
      isConnected: true,
      siteId: result.config.siteId,
      collectionId: result.config.collectionId,
      autoPublish: result.config.autoPublish ?? false,
      autoSync: result.config.autoSync ?? false,
    }
  }),

  // List available Webflow sites
  listSites: adminProcedure.query(async () => {
    const result = await getWebflowConfigFromConnection()
    if (!result || !result.config.apiToken) {
      return []
    }

    const connector = new WebflowConnector(result.config)
    return connector.listSites()
  }),

  // List collections for a site
  listCollections: adminProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ input }) => {
      const result = await getWebflowConfigFromConnection()
      if (!result || !result.config.apiToken) {
        return []
      }

      const connector = new WebflowConnector(result.config)
      return connector.listCollections(input.siteId)
    }),

  // Get collection schema (fields) for mapping
  getCollectionSchema: adminProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ input }) => {
      const result = await getWebflowConfigFromConnection()
      if (!result || !result.config.apiToken) {
        throw new Error('Webflow not configured')
      }

      const connector = new WebflowConnector(result.config)
      const schema = await connector.getCollectionSchema(input.collectionId)

      // Cache the schema
      await prisma.webflowFieldMapping.upsert({
        where: { appConnectionId: result.connectionId },
        create: {
          appConnectionId: result.connectionId,
          fieldMappings: {},
          collectionSchema: JSON.parse(JSON.stringify(schema)) as Prisma.InputJsonValue,
          schemaFetchedAt: new Date(),
        },
        update: {
          collectionSchema: JSON.parse(JSON.stringify(schema)) as Prisma.InputJsonValue,
          schemaFetchedAt: new Date(),
        },
      })

      return schema
    }),

  // Get current field mappings
  getFieldMappings: adminProcedure.query(async () => {
    const result = await getWebflowConfigFromConnection()
    if (!result) {
      return { mappings: {}, curacelFields: CURACEL_JOB_FIELDS, webflowFields: [] }
    }

    const mapping = await prisma.webflowFieldMapping.findUnique({
      where: { appConnectionId: result.connectionId },
    })

    return {
      mappings: (mapping?.fieldMappings as Record<string, string>) || {},
      curacelFields: CURACEL_JOB_FIELDS,
      webflowFields: (mapping?.collectionSchema as { fields: Array<{ id: string; slug: string; displayName: string; type: string }> })?.fields || [],
    }
  }),

  // Save field mappings
  saveFieldMappings: adminProcedure
    .input(z.object({
      mappings: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input }) => {
      const result = await getWebflowConfigFromConnection()
      if (!result) {
        throw new Error('Webflow not configured')
      }

      await prisma.webflowFieldMapping.upsert({
        where: { appConnectionId: result.connectionId },
        create: {
          appConnectionId: result.connectionId,
          fieldMappings: input.mappings,
        },
        update: {
          fieldMappings: input.mappings,
        },
      })

      return { success: true }
    }),

  // Update Webflow settings (siteId, collectionId, autoPublish, autoSync)
  updateSettings: adminProcedure
    .input(z.object({
      siteId: z.string().optional(),
      collectionId: z.string().optional(),
      autoPublish: z.boolean().optional(),
      autoSync: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await getWebflowConfigFromConnection()
      if (!result) {
        throw new Error('Webflow not configured')
      }

      const newConfig: WebflowConfig = {
        ...result.config,
        siteId: input.siteId ?? result.config.siteId,
        collectionId: input.collectionId ?? result.config.collectionId,
        autoPublish: input.autoPublish ?? result.config.autoPublish,
        autoSync: input.autoSync ?? result.config.autoSync,
      }

      await prisma.appConnection.update({
        where: { id: result.connectionId },
        data: {
          configEncrypted: encrypt(JSON.stringify(newConfig)),
        },
      })

      return { success: true }
    }),

  // Sync a single job to Webflow
  syncJob: adminProcedure
    .input(z.object({
      jobId: z.string(),
      publish: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return syncJobToWebflow(input.jobId, { publish: input.publish })
    }),

  // Unpublish/archive a job from Webflow
  unpublishJob: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input }) => {
      return unpublishJobFromWebflow(input.jobId)
    }),

  // Delete a job from Webflow
  deleteJob: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input }) => {
      return deleteJobFromWebflow(input.jobId)
    }),

  // Sync all active public jobs
  syncAllJobs: adminProcedure.mutation(async () => {
    return syncAllJobsToWebflow()
  }),

  // Get sync status for a specific job
  getJobSyncStatus: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return getJobWebflowStatus(input.jobId)
    }),

  // Get sync status for all jobs (for dashboard)
  getAllJobsSyncStatus: adminProcedure.query(async () => {
    const jobs = await prisma.job.findMany({
      where: { status: 'ACTIVE', isPublic: true },
      select: {
        id: true,
        title: true,
        webflowItemId: true,
        webflowSyncStatus: true,
        webflowSyncError: true,
        webflowLastSyncAt: true,
        webflowPublishedAt: true,
      },
    })

    const synced = jobs.filter(j => j.webflowSyncStatus === 'synced').length
    const pending = jobs.filter(j => j.webflowSyncStatus === 'pending').length
    const failed = jobs.filter(j => j.webflowSyncStatus === 'failed').length
    const notSynced = jobs.filter(j => !j.webflowSyncStatus || j.webflowSyncStatus === 'not_synced').length

    return {
      jobs,
      summary: { synced, pending, failed, notSynced, total: jobs.length },
    }
  }),

  // Test Webflow connection
  testConnection: adminProcedure.mutation(async () => {
    const result = await getWebflowConfigFromConnection()
    if (!result || !result.config.apiToken) {
      return { success: false, error: 'Webflow not configured' }
    }

    const connector = new WebflowConnector(result.config)
    return connector.testConnection()
  }),

  // Get available job fields for mapping UI
  getAvailableFields: adminProcedure.query(() => {
    return CURACEL_JOB_FIELDS
  }),
})
