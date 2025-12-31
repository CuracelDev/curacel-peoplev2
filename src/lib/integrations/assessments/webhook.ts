/**
 * Generic Webhook Assessment Connector
 *
 * Handles assessments from any platform that supports webhooks
 */

import crypto from 'crypto'
import {
  BaseAssessmentConnector,
  type AssessmentInviteResult,
  type AssessmentResults,
  type WebhookValidation,
  type ConnectorConfig,
} from './base'
import type { CandidateAssessment, AssessmentTemplate, JobCandidate } from '@prisma/client'

interface WebhookPayload {
  event: string
  assessmentId: string
  externalId?: string
  candidateEmail?: string
  status?: string
  score?: number
  maxScore?: number
  completedAt?: string
  results?: Record<string, unknown>
  [key: string]: unknown
}

export class WebhookAssessmentConnector extends BaseAssessmentConnector {
  name = 'webhook'
  displayName = 'Generic Webhook'
  supportedTypes = ['CODING', 'PERSONALITY', 'COGNITIVE', 'SKILLS', 'CUSTOM']

  isConfigured(): boolean {
    return !!this.config.webhookSecret
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.webhookSecret) {
      return { success: false, message: 'Webhook secret not configured' }
    }
    return { success: true, message: 'Webhook connector is ready to receive events' }
  }

  async sendInvite(
    assessment: CandidateAssessment & {
      template: AssessmentTemplate
      candidate: JobCandidate
    }
  ): Promise<AssessmentInviteResult> {
    // For webhook connector, we don't actively send invites
    // Instead, we generate a tracking ID for the external platform to use
    const trackingId = `webhook_${assessment.id}_${Date.now()}`

    return {
      success: true,
      externalId: trackingId,
      assessmentUrl: undefined, // External platform provides the URL
    }
  }

  async getResults(externalId: string): Promise<AssessmentResults> {
    // Webhook connector relies on incoming webhooks for results
    // This is a placeholder that returns pending status
    return {
      externalId,
      status: 'PENDING',
    }
  }

  validateWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): WebhookValidation {
    if (!this.config.webhookSecret) {
      return { isValid: false, error: 'Webhook secret not configured' }
    }

    // Check for signature header (common patterns)
    const signature =
      headers['x-webhook-signature'] ||
      headers['x-signature'] ||
      headers['x-hub-signature-256']

    if (!signature) {
      return { isValid: false, error: 'Missing signature header' }
    }

    // Validate HMAC signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payloadString)
      .digest('hex')

    const signatureToCompare = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signatureToCompare, 'hex')
    )

    if (!isValid) {
      return { isValid: false, error: 'Invalid signature' }
    }

    const data = payload as WebhookPayload
    return {
      isValid: true,
      eventType: data.event,
      assessmentId: data.assessmentId || data.externalId,
    }
  }

  parseWebhookPayload(payload: unknown): AssessmentResults | null {
    const data = payload as WebhookPayload

    if (!data.assessmentId && !data.externalId) {
      return null
    }

    // Map common status values
    let status: AssessmentResults['status'] = 'PENDING'
    const rawStatus = (data.status || '').toLowerCase()

    if (['completed', 'done', 'finished', 'submitted'].includes(rawStatus)) {
      status = 'COMPLETED'
    } else if (['in_progress', 'started', 'active'].includes(rawStatus)) {
      status = 'IN_PROGRESS'
    } else if (['expired', 'timeout'].includes(rawStatus)) {
      status = 'EXPIRED'
    } else if (['cancelled', 'canceled', 'withdrawn'].includes(rawStatus)) {
      status = 'CANCELLED'
    }

    return {
      externalId: data.externalId || data.assessmentId,
      status,
      score: data.score,
      maxScore: data.maxScore,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      rawResults: data.results,
    }
  }
}

// Export singleton instance
export const webhookConnector = new WebhookAssessmentConnector()
