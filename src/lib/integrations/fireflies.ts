/**
 * Fireflies.ai Integration
 *
 * Provides integration with Fireflies.ai for meeting transcripts.
 * Used to attach interview recordings and transcripts to candidate interviews.
 *
 * API Documentation: https://docs.fireflies.ai/
 */

import type { Employee, App, AppAccount, AppProvisioningRule } from '@prisma/client'
import type { IntegrationConnector, ProvisionResult, DeprovisionResult, DeprovisionOptions } from './types'

// Fireflies GraphQL endpoint
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql'

interface FirefliesMeeting {
  id: string
  title: string
  date: string
  duration: number // in minutes
  participants: string[]
  organizer_email: string
  transcript_url?: string
  video_url?: string
  audio_url?: string
  summary?: {
    keywords: string[]
    action_items: string[]
    outline: string[]
    shorthand_bullet: string[]
    overview: string
  }
  transcript?: {
    sentences: Array<{
      index: number
      speaker_id: number
      speaker_name: string
      text: string
      raw_text: string
      start_time: number
      end_time: number
    }>
  }
}

interface FirefliesUser {
  id: string
  email: string
  name: string
  integrations: string[]
  recent_meeting?: string
  minutes_consumed: number
  is_admin: boolean
}

interface SearchParams {
  title?: string
  participant_email?: string
  from_date?: string // ISO date
  to_date?: string // ISO date
  limit?: number
  skip?: number
}

export class FirefliesConnector implements IntegrationConnector {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Fireflies doesn't provision users - this is a no-op
   */
  async provisionEmployee(
    _employee: Employee,
    _app: App,
    _rules: AppProvisioningRule[],
    _existingAccount?: AppAccount | null
  ): Promise<ProvisionResult> {
    return { success: true, error: 'Fireflies does not support user provisioning' }
  }

  /**
   * Fireflies doesn't deprovision users - this is a no-op
   */
  async deprovisionEmployee(
    _employee: Employee,
    _app: App,
    _account: AppAccount,
    _options?: DeprovisionOptions
  ): Promise<DeprovisionResult> {
    return { success: true }
  }

  /**
   * Execute a GraphQL query against the Fireflies API
   */
  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Fireflies API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()

    if (result.errors) {
      throw new Error(`Fireflies GraphQL error: ${JSON.stringify(result.errors)}`)
    }

    return result.data
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; user?: FirefliesUser; error?: string }> {
    try {
      const data = await this.query<{ user: FirefliesUser }>(`
        query {
          user {
            id
            email
            name
            integrations
            minutes_consumed
            is_admin
          }
        }
      `)

      return { success: true, user: data.user }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get the current user's information
   */
  async getCurrentUser(): Promise<FirefliesUser> {
    const data = await this.query<{ user: FirefliesUser }>(`
      query {
        user {
          id
          email
          name
          integrations
          recent_meeting
          minutes_consumed
          is_admin
        }
      }
    `)

    return data.user
  }

  /**
   * Search for meetings with optional filters
   */
  async searchMeetings(params: SearchParams = {}): Promise<FirefliesMeeting[]> {
    const { title, participant_email, from_date, to_date, limit = 10, skip = 0 } = params

    const data = await this.query<{ transcripts: FirefliesMeeting[] }>(
      `
      query SearchTranscripts($title: String, $participant_email: String, $from_date: String, $to_date: String, $limit: Int, $skip: Int) {
        transcripts(
          title: $title
          participant_email: $participant_email
          from_date: $from_date
          to_date: $to_date
          limit: $limit
          skip: $skip
        ) {
          id
          title
          date
          duration
          participants
          organizer_email
          transcript_url
        }
      }
    `,
      { title, participant_email, from_date, to_date, limit, skip }
    )

    return data.transcripts || []
  }

  /**
   * Get a specific meeting by ID
   */
  async getMeeting(id: string): Promise<FirefliesMeeting | null> {
    const data = await this.query<{ transcript: FirefliesMeeting | null }>(
      `
      query GetTranscript($id: String!) {
        transcript(id: $id) {
          id
          title
          date
          duration
          participants
          organizer_email
          transcript_url
          video_url
          audio_url
        }
      }
    `,
      { id }
    )

    return data.transcript
  }

  /**
   * Get meeting with full transcript
   */
  async getMeetingWithTranscript(id: string): Promise<FirefliesMeeting | null> {
    const data = await this.query<{ transcript: FirefliesMeeting | null }>(
      `
      query GetTranscriptWithDetails($id: String!) {
        transcript(id: $id) {
          id
          title
          date
          duration
          participants
          organizer_email
          transcript_url
          video_url
          audio_url
          transcript {
            sentences {
              index
              speaker_id
              speaker_name
              text
              raw_text
              start_time
              end_time
            }
          }
        }
      }
    `,
      { id }
    )

    return data.transcript
  }

  /**
   * Get meeting with AI-generated summary
   */
  async getMeetingWithSummary(id: string): Promise<FirefliesMeeting | null> {
    const data = await this.query<{ transcript: FirefliesMeeting | null }>(
      `
      query GetTranscriptWithSummary($id: String!) {
        transcript(id: $id) {
          id
          title
          date
          duration
          participants
          organizer_email
          transcript_url
          video_url
          audio_url
          summary {
            keywords
            action_items
            outline
            shorthand_bullet
            overview
          }
        }
      }
    `,
      { id }
    )

    return data.transcript
  }

  /**
   * Get the full transcript text for a meeting
   */
  async getTranscriptText(id: string): Promise<string> {
    const meeting = await this.getMeetingWithTranscript(id)

    if (!meeting?.transcript?.sentences) {
      return ''
    }

    // Format transcript with speaker labels
    const lines = meeting.transcript.sentences.map((s) => {
      const minutes = Math.floor(s.start_time / 60)
      const seconds = Math.floor(s.start_time % 60)
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      return `[${timestamp}] ${s.speaker_name}: ${s.text}`
    })

    return lines.join('\n')
  }

  /**
   * Search for meetings by candidate name or email
   */
  async searchMeetingsByCandidate(
    candidateName: string,
    candidateEmail?: string
  ): Promise<FirefliesMeeting[]> {
    // Search by email if provided
    if (candidateEmail) {
      const byEmail = await this.searchMeetings({
        participant_email: candidateEmail,
        limit: 20,
      })
      if (byEmail.length > 0) return byEmail
    }

    // Fall back to title search with candidate name
    const byName = await this.searchMeetings({
      title: candidateName,
      limit: 20,
    })

    return byName
  }

  /**
   * Extract interview highlights from a meeting
   */
  async extractHighlights(
    id: string
  ): Promise<Array<{ timestamp: string; text: string; speaker: string }>> {
    const meeting = await this.getMeetingWithTranscript(id)

    if (!meeting?.transcript?.sentences) {
      return []
    }

    // Simple highlight extraction based on keywords
    const highlightKeywords = [
      'challenge',
      'achievement',
      'proud',
      'difficult',
      'learned',
      'experience',
      'team',
      'leadership',
      'problem',
      'solution',
      'example',
      'success',
      'failure',
      'growth',
    ]

    const highlights = meeting.transcript.sentences
      .filter((s) => {
        const lowerText = s.text.toLowerCase()
        return highlightKeywords.some((kw) => lowerText.includes(kw))
      })
      .slice(0, 10)
      .map((s) => {
        const minutes = Math.floor(s.start_time / 60)
        const seconds = Math.floor(s.start_time % 60)
        return {
          timestamp: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          text: s.text,
          speaker: s.speaker_name,
        }
      })

    return highlights
  }
}

/**
 * Get Fireflies connector from environment
 */
export async function getFirefliesConnector(): Promise<FirefliesConnector | null> {
  const apiKey = process.env.FIREFLIES_API_KEY

  if (!apiKey) {
    return null
  }

  return new FirefliesConnector(apiKey)
}

/**
 * Check if Fireflies integration is configured
 */
export function isFirefliesConfigured(): boolean {
  return !!process.env.FIREFLIES_API_KEY
}
