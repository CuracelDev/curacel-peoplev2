/**
 * Base Assessment Integration Connector
 *
 * Defines the interface for external assessment platform integrations
 */

import type { CandidateAssessment, AssessmentTemplate, JobCandidate } from '@prisma/client'

export interface AssessmentInviteResult {
  success: boolean
  externalId?: string
  assessmentUrl?: string
  expiresAt?: Date
  error?: string
}

export interface AssessmentResults {
  externalId: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
  score?: number
  maxScore?: number
  percentile?: number
  completedAt?: Date
  timeSpentSeconds?: number
  dimensionScores?: Record<string, number>
  rawResults?: Record<string, unknown>
  reportUrl?: string
}

export interface WebhookValidation {
  isValid: boolean
  eventType?: string
  assessmentId?: string
  error?: string
}

export interface ConnectorConfig {
  apiKey?: string
  apiSecret?: string
  webhookSecret?: string
  baseUrl?: string
  organizationId?: string
  [key: string]: string | undefined
}

export interface AssessmentConnector {
  /** Unique name of the connector */
  name: string

  /** Display name for UI */
  displayName: string

  /** Supported assessment types */
  supportedTypes: string[]

  /** Initialize the connector with configuration */
  initialize(config: ConnectorConfig): void

  /** Check if the connector is properly configured */
  isConfigured(): boolean

  /** Test the connection to the external platform */
  testConnection(): Promise<{ success: boolean; message: string }>

  /** Send an assessment invitation to a candidate */
  sendInvite(
    assessment: CandidateAssessment & {
      template: AssessmentTemplate
      candidate: JobCandidate
    }
  ): Promise<AssessmentInviteResult>

  /** Get results from the external platform */
  getResults(externalId: string): Promise<AssessmentResults>

  /** Parse and validate an incoming webhook payload */
  validateWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): WebhookValidation

  /** Parse webhook payload into standardized results */
  parseWebhookPayload(payload: unknown): AssessmentResults | null

  /** Cancel an assessment invitation */
  cancelAssessment?(externalId: string): Promise<{ success: boolean; error?: string }>

  /** Extend the deadline for an assessment */
  extendDeadline?(externalId: string, newDeadline: Date): Promise<{ success: boolean; error?: string }>
}

/**
 * Base class with common functionality for assessment connectors
 */
export abstract class BaseAssessmentConnector implements AssessmentConnector {
  abstract name: string
  abstract displayName: string
  abstract supportedTypes: string[]

  protected config: ConnectorConfig = {}

  initialize(config: ConnectorConfig): void {
    this.config = config
  }

  abstract isConfigured(): boolean
  abstract testConnection(): Promise<{ success: boolean; message: string }>
  abstract sendInvite(
    assessment: CandidateAssessment & {
      template: AssessmentTemplate
      candidate: JobCandidate
    }
  ): Promise<AssessmentInviteResult>
  abstract getResults(externalId: string): Promise<AssessmentResults>
  abstract validateWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): WebhookValidation
  abstract parseWebhookPayload(payload: unknown): AssessmentResults | null

  /**
   * Default implementation for optional methods
   */
  async cancelAssessment(_externalId: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Not supported by this platform' }
  }

  async extendDeadline(_externalId: string, _newDeadline: Date): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Not supported by this platform' }
  }

  /**
   * Helper to make authenticated API requests
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API request failed: ${response.status} - ${error}`)
    }

    return response.json()
  }
}

/**
 * Registry for managing multiple assessment connectors
 */
export class AssessmentConnectorRegistry {
  private connectors: Map<string, AssessmentConnector> = new Map()

  register(connector: AssessmentConnector): void {
    this.connectors.set(connector.name, connector)
  }

  get(name: string): AssessmentConnector | undefined {
    return this.connectors.get(name)
  }

  getAll(): AssessmentConnector[] {
    return Array.from(this.connectors.values())
  }

  getConfigured(): AssessmentConnector[] {
    return this.getAll().filter(c => c.isConfigured())
  }

  getSupportingType(type: string): AssessmentConnector[] {
    return this.getAll().filter(c => c.supportedTypes.includes(type))
  }
}

// Global registry instance
export const assessmentConnectorRegistry = new AssessmentConnectorRegistry()
