import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { WebflowConnector } from './webflow'
import type { WebflowConfig } from './types'
import type { Job, JobStatus } from '@prisma/client'

export type WebflowSyncStatus = 'synced' | 'pending' | 'failed' | 'not_synced'

export interface SyncResult {
  success: boolean
  webflowItemId?: string
  error?: string
  published?: boolean
}

export interface JobFieldData {
  title: string
  department: string | null
  employmentType: string
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryFrequency: string | null
  locationsText: string
  jobDescriptionContent: string
  slug: string | null
  priority: number
  deadline: string | null
  status: string
}

// Get Webflow connection for the organization
async function getWebflowConnection(): Promise<{
  connector: WebflowConnector
  config: WebflowConfig
  connectionId: string
  fieldMappings: Record<string, string>
} | null> {
  const app = await prisma.app.findFirst({
    where: { type: 'WEBFLOW', isEnabled: true, archivedAt: null },
  })

  if (!app) {
    return null
  }

  const connection = await prisma.appConnection.findFirst({
    where: { appId: app.id, isActive: true },
    include: { webflowFieldMapping: true },
  })

  if (!connection) {
    return null
  }

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

  if (!config.apiToken || !config.siteId || !config.collectionId) {
    return null
  }

  const fieldMappings = (connection.webflowFieldMapping?.fieldMappings as Record<string, string>) || {}

  return {
    connector: new WebflowConnector(config),
    config,
    connectionId: connection.id,
    fieldMappings,
  }
}

// Extract job fields for syncing
function extractJobFields(job: Job & { jobDescription?: { content: string } | null }): JobFieldData {
  const locations = (job.locations as string[]) || []

  return {
    title: job.title,
    department: job.department,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryFrequency: job.salaryFrequency,
    locationsText: locations.join(', '),
    jobDescriptionContent: job.jobDescription?.content || '',
    slug: job.slug,
    priority: job.priority,
    deadline: job.deadline?.toISOString() || null,
    status: job.status,
  }
}

// Build Webflow item data from job fields using field mappings
function buildWebflowItemData(
  jobFields: JobFieldData,
  mappings: Record<string, string>
): Record<string, unknown> {
  const fieldData: Record<string, unknown> = {}

  // Map each configured field
  for (const [curacelField, webflowField] of Object.entries(mappings)) {
    if (!webflowField) continue

    const value = jobFields[curacelField as keyof JobFieldData]
    if (value !== null && value !== undefined && value !== '') {
      fieldData[webflowField] = value
    }
  }

  // Always include the slug if available (required by Webflow for URL generation)
  if (jobFields.slug && !fieldData['slug']) {
    fieldData['slug'] = jobFields.slug
  }

  return fieldData
}

// Sync a single job to Webflow
export async function syncJobToWebflow(
  jobId: string,
  options: { publish?: boolean; force?: boolean } = {}
): Promise<SyncResult> {
  const connection = await getWebflowConnection()

  if (!connection) {
    return { success: false, error: 'Webflow integration not configured' }
  }

  const { connector, config, fieldMappings } = connection

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { jobDescription: true },
  })

  if (!job) {
    return { success: false, error: 'Job not found' }
  }

  // Only sync active, public jobs (unless forced)
  if (!options.force && (job.status !== 'ACTIVE' || !job.isPublic)) {
    // If job was previously synced but is now inactive/private, archive it
    if (job.webflowItemId) {
      try {
        await connector.archiveItem(config.collectionId, job.webflowItemId)
        await prisma.job.update({
          where: { id: jobId },
          data: {
            webflowSyncStatus: 'synced',
            webflowLastSyncAt: new Date(),
          },
        })
        return { success: true, webflowItemId: job.webflowItemId }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to archive item'
        await prisma.job.update({
          where: { id: jobId },
          data: {
            webflowSyncStatus: 'failed',
            webflowSyncError: errorMessage,
          },
        })
        return { success: false, error: errorMessage }
      }
    }
    return { success: false, error: 'Job is not active or public' }
  }

  const jobFields = extractJobFields(job)
  const fieldData = buildWebflowItemData(jobFields, fieldMappings)

  try {
    let webflowItemId = job.webflowItemId
    let item

    if (webflowItemId) {
      // Update existing item
      item = await connector.updateItem(config.collectionId, webflowItemId, fieldData, {
        isArchived: false,
        isDraft: false,
      })
    } else {
      // Create new item
      item = await connector.createItem(config.collectionId, fieldData, {
        isDraft: false,
      })
      webflowItemId = item.id
    }

    // Publish if auto-publish is enabled or explicitly requested
    let published = false
    if (config.autoPublish || options.publish) {
      try {
        await connector.publishItems(config.collectionId, [webflowItemId])
        published = true
      } catch (publishError) {
        console.error('Failed to publish to Webflow:', publishError)
        // Don't fail the sync if publishing fails
      }
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        webflowItemId,
        webflowSyncStatus: 'synced',
        webflowSyncError: null,
        webflowLastSyncAt: new Date(),
        webflowPublishedAt: published ? new Date() : job.webflowPublishedAt,
      },
    })

    return { success: true, webflowItemId, published }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync to Webflow'
    await prisma.job.update({
      where: { id: jobId },
      data: {
        webflowSyncStatus: 'failed',
        webflowSyncError: errorMessage,
      },
    })
    return { success: false, error: errorMessage }
  }
}

// Unpublish/archive a job from Webflow
export async function unpublishJobFromWebflow(jobId: string): Promise<SyncResult> {
  const connection = await getWebflowConnection()

  if (!connection) {
    return { success: false, error: 'Webflow integration not configured' }
  }

  const { connector, config } = connection

  const job = await prisma.job.findUnique({
    where: { id: jobId },
  })

  if (!job || !job.webflowItemId) {
    return { success: false, error: 'Job not found or not synced to Webflow' }
  }

  try {
    await connector.archiveItem(config.collectionId, job.webflowItemId)

    // Publish the archive change
    if (config.autoPublish) {
      try {
        await connector.publishItems(config.collectionId, [job.webflowItemId])
      } catch {
        // Ignore publish errors for archive
      }
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        webflowSyncStatus: 'synced',
        webflowSyncError: null,
        webflowLastSyncAt: new Date(),
      },
    })

    return { success: true, webflowItemId: job.webflowItemId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to archive in Webflow'
    await prisma.job.update({
      where: { id: jobId },
      data: {
        webflowSyncStatus: 'failed',
        webflowSyncError: errorMessage,
      },
    })
    return { success: false, error: errorMessage }
  }
}

// Delete a job from Webflow completely
export async function deleteJobFromWebflow(jobId: string): Promise<SyncResult> {
  const connection = await getWebflowConnection()

  if (!connection) {
    return { success: false, error: 'Webflow integration not configured' }
  }

  const { connector, config } = connection

  const job = await prisma.job.findUnique({
    where: { id: jobId },
  })

  if (!job || !job.webflowItemId) {
    return { success: false, error: 'Job not found or not synced to Webflow' }
  }

  try {
    await connector.deleteItem(config.collectionId, job.webflowItemId)

    await prisma.job.update({
      where: { id: jobId },
      data: {
        webflowItemId: null,
        webflowSyncStatus: 'not_synced',
        webflowSyncError: null,
        webflowLastSyncAt: null,
        webflowPublishedAt: null,
      },
    })

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete from Webflow'
    return { success: false, error: errorMessage }
  }
}

// Sync all active public jobs to Webflow
export async function syncAllJobsToWebflow(): Promise<{
  success: boolean
  synced: number
  failed: number
  errors: Array<{ jobId: string; error: string }>
}> {
  const connection = await getWebflowConnection()

  if (!connection) {
    return { success: false, synced: 0, failed: 0, errors: [{ jobId: 'N/A', error: 'Webflow not configured' }] }
  }

  const jobs = await prisma.job.findMany({
    where: { status: 'ACTIVE', isPublic: true },
    select: { id: true },
  })

  let synced = 0
  let failed = 0
  const errors: Array<{ jobId: string; error: string }> = []

  for (const job of jobs) {
    const result = await syncJobToWebflow(job.id)
    if (result.success) {
      synced++
    } else {
      failed++
      errors.push({ jobId: job.id, error: result.error || 'Unknown error' })
    }
  }

  return { success: failed === 0, synced, failed, errors }
}

// Auto-sync trigger for job status changes
export async function onJobStatusChange(
  jobId: string,
  oldStatus: JobStatus,
  newStatus: JobStatus
): Promise<void> {
  const connection = await getWebflowConnection()

  if (!connection || !connection.config.autoSync) {
    return
  }

  // If job becomes active, sync it
  if (newStatus === 'ACTIVE' && oldStatus !== 'ACTIVE') {
    await syncJobToWebflow(jobId)
    return
  }

  // If job becomes inactive (PAUSED, HIRED, DRAFT), archive it
  if (oldStatus === 'ACTIVE' && newStatus !== 'ACTIVE') {
    await unpublishJobFromWebflow(jobId)
    return
  }
}

// Check if Webflow is configured
export async function isWebflowConfigured(): Promise<boolean> {
  const connection = await getWebflowConnection()
  return connection !== null
}

// Get Webflow sync status for a job
export async function getJobWebflowStatus(jobId: string): Promise<{
  isSynced: boolean
  webflowItemId: string | null
  syncStatus: WebflowSyncStatus | null
  syncError: string | null
  lastSyncAt: Date | null
  publishedAt: Date | null
}> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      webflowItemId: true,
      webflowSyncStatus: true,
      webflowSyncError: true,
      webflowLastSyncAt: true,
      webflowPublishedAt: true,
    },
  })

  if (!job) {
    return {
      isSynced: false,
      webflowItemId: null,
      syncStatus: null,
      syncError: null,
      lastSyncAt: null,
      publishedAt: null,
    }
  }

  return {
    isSynced: job.webflowSyncStatus === 'synced',
    webflowItemId: job.webflowItemId,
    syncStatus: job.webflowSyncStatus as WebflowSyncStatus | null,
    syncError: job.webflowSyncError,
    lastSyncAt: job.webflowLastSyncAt,
    publishedAt: job.webflowPublishedAt,
  }
}
