/**
 * Kandi.io Assessment Connector
 *
 * Integration with Kandi.io for technical coding assessments
 */

import crypto from 'crypto'
import {
  BaseAssessmentConnector,
  type AssessmentInviteResult,
  type AssessmentResults,
  type WebhookValidation,
} from './base'
import type { CandidateAssessment, AssessmentTemplate, JobCandidate } from '@prisma/client'

interface KandiAssessment {
  id: string
  candidate_email: string
  candidate_name: string
  test_id: string
  status: 'pending' | 'started' | 'submitted' | 'evaluated' | 'expired'
  score?: number
  max_score?: number
  percentile?: number
  report_url?: string
  started_at?: string
  submitted_at?: string
  time_spent_seconds?: number
  section_scores?: {
    section_name: string
    score: number
    max_score: number
  }[]
}

interface KandiWebhookPayload {
  event: 'assessment.started' | 'assessment.submitted' | 'assessment.evaluated' | 'assessment.expired'
  assessment_id: string
  test_id: string
  candidate_email: string
  data: KandiAssessment
  timestamp: string
}

export class KandiConnector extends BaseAssessmentConnector {
  name = 'kandi'
  displayName = 'Kandi.io'
  supportedTypes = ['CODING', 'TECHNICAL', 'SKILLS']

  private baseUrl = 'https://api.kandi.io/v1'

  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.organizationId)
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'API key or Organization ID not configured' }
    }

    try {
      await this.makeRequest<{ success: boolean }>(`${this.baseUrl}/ping`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Organization-Id': this.config.organizationId!,
        },
      })
      return { success: true, message: 'Successfully connected to Kandi.io' }
    } catch (error) {
      return { success: false, message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  async sendInvite(
    assessment: CandidateAssessment & {
      template: AssessmentTemplate
      candidate: JobCandidate
    }
  ): Promise<AssessmentInviteResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Kandi.io not configured' }
    }

    try {
      // Get test ID from template integration config
      const integrationConfig = assessment.template.integrationConfig as Record<string, unknown> | null
      const testId = integrationConfig?.kandiTestId as string

      if (!testId) {
        return { success: false, error: 'No Kandi test ID configured for this template' }
      }

      const response = await this.makeRequest<{
        assessment_id: string
        assessment_url: string
        expires_at: string
      }>(`${this.baseUrl}/assessments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Organization-Id': this.config.organizationId!,
        },
        body: JSON.stringify({
          test_id: testId,
          candidate_email: assessment.candidate.email,
          candidate_name: assessment.candidate.name,
          expires_in_days: 7,
          metadata: {
            curacel_assessment_id: assessment.id,
            curacel_candidate_id: assessment.candidateId,
          },
        }),
      })

      return {
        success: true,
        externalId: response.assessment_id,
        assessmentUrl: response.assessment_url,
        expiresAt: new Date(response.expires_at),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send Kandi assessment',
      }
    }
  }

  async getResults(externalId: string): Promise<AssessmentResults> {
    if (!this.isConfigured()) {
      throw new Error('Kandi.io not configured')
    }

    const response = await this.makeRequest<KandiAssessment>(
      `${this.baseUrl}/assessments/${externalId}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Organization-Id': this.config.organizationId!,
        },
      }
    )

    return this.mapKandiAssessment(response)
  }

  validateWebhook(
    payload: unknown,
    headers: Record<string, string>
  ): WebhookValidation {
    if (!this.config.webhookSecret) {
      return { isValid: false, error: 'Webhook secret not configured' }
    }

    const signature = headers['x-kandi-signature']
    if (!signature) {
      return { isValid: false, error: 'Missing Kandi signature header' }
    }

    // Validate HMAC-SHA256 signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payloadString)
      .digest('hex')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    )

    if (!isValid) {
      return { isValid: false, error: 'Invalid Kandi signature' }
    }

    const data = payload as KandiWebhookPayload
    return {
      isValid: true,
      eventType: data.event,
      assessmentId: data.assessment_id,
    }
  }

  parseWebhookPayload(payload: unknown): AssessmentResults | null {
    const data = payload as KandiWebhookPayload

    if (!data.assessment_id || !data.data) {
      return null
    }

    return this.mapKandiAssessment(data.data)
  }

  async cancelAssessment(externalId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Kandi.io not configured' }
    }

    try {
      await this.makeRequest(`${this.baseUrl}/assessments/${externalId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Organization-Id': this.config.organizationId!,
        },
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel assessment',
      }
    }
  }

  async extendDeadline(externalId: string, newDeadline: Date): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Kandi.io not configured' }
    }

    try {
      await this.makeRequest(`${this.baseUrl}/assessments/${externalId}/extend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Organization-Id': this.config.organizationId!,
        },
        body: JSON.stringify({
          expires_at: newDeadline.toISOString(),
        }),
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extend deadline',
      }
    }
  }

  private mapKandiAssessment(assessment: KandiAssessment): AssessmentResults {
    const statusMap: Record<KandiAssessment['status'], AssessmentResults['status']> = {
      pending: 'PENDING',
      started: 'IN_PROGRESS',
      submitted: 'COMPLETED',
      evaluated: 'COMPLETED',
      expired: 'EXPIRED',
    }

    // Convert section scores to dimension scores
    const dimensionScores: Record<string, number> = {}
    if (assessment.section_scores) {
      for (const section of assessment.section_scores) {
        const percentage = (section.score / section.max_score) * 100
        dimensionScores[section.section_name] = Math.round(percentage)
      }
    }

    return {
      externalId: assessment.id,
      status: statusMap[assessment.status] || 'PENDING',
      score: assessment.score,
      maxScore: assessment.max_score,
      percentile: assessment.percentile,
      completedAt: assessment.submitted_at ? new Date(assessment.submitted_at) : undefined,
      timeSpentSeconds: assessment.time_spent_seconds,
      dimensionScores,
      reportUrl: assessment.report_url,
      rawResults: assessment as unknown as Record<string, unknown>,
    }
  }
}

// Export singleton instance
export const kandiConnector = new KandiConnector()
