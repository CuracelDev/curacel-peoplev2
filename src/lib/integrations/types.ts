import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'

export interface ProvisionResult {
  success: boolean
  externalUserId?: string
  externalEmail?: string
  externalUsername?: string
  provisionedResources?: Record<string, unknown>
  error?: string
}

export interface DeprovisionResult {
  success: boolean
  error?: string
}

export interface IntegrationConnector {
  provisionEmployee(
    employee: Employee,
    app: App,
    rules: AppProvisioningRule[],
    existingAccount?: AppAccount | null
  ): Promise<ProvisionResult>
  
  deprovisionEmployee(
    employee: Employee,
    app: App,
    account: AppAccount,
    options?: DeprovisionOptions
  ): Promise<DeprovisionResult>
  
  testConnection(): Promise<{ success: boolean; error?: string }>
}

export interface DeprovisionOptions {
  deleteAccount?: boolean
  transferToEmail?: string
  transferApps?: string[]
  aliasToEmail?: string
}

export interface GoogleWorkspaceConfig {
  domain: string
  adminEmail: string
  serviceAccountKey: string
}

export interface SlackConfig {
  botToken: string
  adminToken?: string
  teamId?: string
  defaultChannels?: string[]
  signingSecret?: string
}

export interface BitbucketConfig {
  workspace: string
  username?: string
  appPassword?: string
  apiToken?: string
}

export interface JiraConfig {
  baseUrl: string
  adminEmail: string
  apiToken: string
  products?: string[]
  defaultGroups?: string[]
  deleteOnDeprovision?: boolean
}

export interface HubSpotConfig {
  scimToken: string
  baseUrl?: string
}

export type PassboltMode = 'API' | 'CLI'

export interface PassboltConfig {
  mode?: PassboltMode
  baseUrl?: string
  apiToken?: string
  defaultRole?: 'user' | 'admin'
  cliPath?: string
  cliUser?: string
}

export interface WebflowConfig {
  apiToken: string
  siteId: string
  collectionId: string
  autoPublish?: boolean  // Publish to live site automatically
  autoSync?: boolean     // Sync on job status change
}

// Webflow API types
export interface WebflowSite {
  id: string
  displayName: string  // Webflow API v2 uses displayName
  shortName: string
  previewUrl: string
  createdOn: string
  lastUpdated: string
}

export interface WebflowCollection {
  id: string
  displayName: string
  singularName: string
  slug: string
  createdOn: string
  lastUpdated: string
}

export interface WebflowField {
  id: string
  slug: string
  displayName: string
  type: string
  isRequired: boolean
  isEditable: boolean
  validations?: {
    singleLine?: boolean
    maxLength?: number
  }
}

export interface WebflowCollectionSchema {
  id: string
  displayName: string
  slug: string
  fields: WebflowField[]
}

export interface WebflowItem {
  id: string
  cmsLocaleId?: string
  lastPublished?: string
  lastUpdated: string
  createdOn: string
  isArchived: boolean
  isDraft: boolean
  fieldData: Record<string, unknown>
}

export interface ProvisioningCondition {
  department?: string
  location?: string
  employmentType?: string
  jobTitle?: string
  jiraBoardId?: string
  jiraManager?: boolean
  [key: string]: string | boolean | undefined
}

export interface GoogleProvisionData {
  orgUnitPath?: string
  groups?: string[]
}

export interface SlackProvisionData {
  channels?: string[]
  userGroups?: string[]
}

export interface BitbucketProvisionData {
  groups?: string[]
  repositories?: Array<{
    repoSlug: string
    permission: 'read' | 'write' | 'admin'
  }>
}

export interface JiraProvisionData {
  groups?: string[]
  projectRoles?: JiraProjectRoleAssignment[]
}

export interface JiraProjectRoleAssignment {
  projectId: string
  projectKey?: string
  projectName?: string
  boardId?: string
  boardName?: string
  roleId: string
  roleName?: string
}
