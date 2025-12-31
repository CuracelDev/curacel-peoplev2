/**
 * Assessment Webhook Receiver
 *
 * Receives webhook events from external assessment platforms
 * and updates candidate assessments accordingly
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getConnector } from '@/lib/integrations/assessments'
import { analyzeAssessmentResults } from '@/lib/ai/recruiting/assessment-analysis'
import { decrypt } from '@/lib/encryption'

interface RouteParams {
  params: Promise<{ platform: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { platform } = await params

  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    let payload: unknown

    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Get connector for this platform
    const connector = getConnector(platform)
    if (!connector) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      )
    }

    // Get integration settings from database
    const integrationSettings = await prisma.integrationSettings.findFirst({
      where: { platform: platform.toUpperCase() },
    })

    if (!integrationSettings) {
      return NextResponse.json(
        { error: `No integration settings found for ${platform}` },
        { status: 404 }
      )
    }

    // Initialize connector with decrypted config
    const config: Record<string, string> = {}
    if (integrationSettings.apiKeyEncrypted) {
      config.apiKey = decrypt(integrationSettings.apiKeyEncrypted)
    }
    if (integrationSettings.webhookSecretEncrypted) {
      config.webhookSecret = decrypt(integrationSettings.webhookSecretEncrypted)
    }
    if (integrationSettings.config) {
      const additionalConfig = integrationSettings.config as Record<string, string>
      Object.assign(config, additionalConfig)
    }

    connector.initialize(config)

    // Convert headers to plain object
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    // Validate webhook signature
    const validation = connector.validateWebhook(rawBody, headers)
    if (!validation.isValid) {
      console.error(`Webhook validation failed for ${platform}:`, validation.error)
      return NextResponse.json(
        { error: validation.error || 'Invalid webhook signature' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const results = connector.parseWebhookPayload(payload)
    if (!results) {
      console.error(`Failed to parse webhook payload for ${platform}`)
      return NextResponse.json(
        { error: 'Failed to parse webhook payload' },
        { status: 400 }
      )
    }

    // Find the assessment by external ID
    const assessment = await prisma.candidateAssessment.findFirst({
      where: { externalId: results.externalId },
      include: {
        template: true,
        candidate: {
          include: { job: true },
        },
      },
    })

    if (!assessment) {
      console.warn(`Assessment not found for external ID: ${results.externalId}`)
      // Return 200 to prevent retries - assessment may have been deleted
      return NextResponse.json({
        success: true,
        message: 'Assessment not found, webhook acknowledged',
      })
    }

    // Map status to our enum
    const statusMap: Record<string, string> = {
      PENDING: 'PENDING',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      EXPIRED: 'EXPIRED',
      CANCELLED: 'CANCELLED',
    }

    // Update assessment with results
    const updatedAssessment = await prisma.candidateAssessment.update({
      where: { id: assessment.id },
      data: {
        status: statusMap[results.status] || assessment.status,
        score: results.score ?? assessment.score,
        completedAt: results.completedAt ?? assessment.completedAt,
        dimensionScores: results.dimensionScores ?? assessment.dimensionScores,
        resultData: results.rawResults ?? assessment.resultData,
        updatedAt: new Date(),
      },
    })

    // If assessment is completed, trigger AI analysis
    if (results.status === 'COMPLETED' && results.score !== undefined) {
      try {
        const aiAnalysis = await analyzeAssessmentResults(assessment.id)

        // Update assessment with AI analysis
        await prisma.candidateAssessment.update({
          where: { id: assessment.id },
          data: {
            aiAnalysis: aiAnalysis as unknown as Record<string, unknown>,
            aiRecommendation: aiAnalysis.recommendation,
            aiConfidence: aiAnalysis.confidence,
          },
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            actorType: 'system',
            action: 'CREATE',
            resourceType: 'assessment_analysis',
            resourceId: assessment.id,
            metadata: {
              event: 'AI_ANALYSIS_GENERATED',
              assessmentName: assessment.template.name,
              candidateName: assessment.candidate.name,
              recommendation: aiAnalysis.recommendation,
              confidence: aiAnalysis.confidence,
              score: results.score,
            },
          },
        })
      } catch (aiError) {
        console.error('Failed to generate AI analysis:', aiError)
        // Don't fail the webhook if AI analysis fails
      }
    }

    // Log the webhook event
    await prisma.webhookLog.create({
      data: {
        source: platform,
        eventType: validation.eventType || 'unknown',
        payload: payload as Record<string, unknown>,
        status: 'SUCCESS',
        processedAt: new Date(),
      },
    })

    // Send notification if assessment is completed
    if (results.status === 'COMPLETED') {
      // TODO: Send notification to recruiters
      console.log(`Assessment completed: ${assessment.id}`)
    }

    return NextResponse.json({
      success: true,
      assessmentId: assessment.id,
      status: updatedAssessment.status,
    })
  } catch (error) {
    console.error(`Webhook error for ${platform}:`, error)

    // Log the failed webhook
    try {
      await prisma.webhookLog.create({
        data: {
          source: platform,
          eventType: 'error',
          payload: { error: error instanceof Error ? error.message : 'Unknown error' },
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date(),
        },
      })
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { platform } = await params

  const connector = getConnector(platform)
  if (!connector) {
    return NextResponse.json(
      { error: `Unknown platform: ${platform}` },
      { status: 400 }
    )
  }

  return NextResponse.json({
    platform,
    displayName: connector.displayName,
    supportedTypes: connector.supportedTypes,
    webhookUrl: `${request.nextUrl.origin}/api/webhooks/assessments/${platform}`,
    status: 'ready',
  })
}
