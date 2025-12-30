import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

// Generate HMAC signature for webhook payload
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

// POST - Trigger webhook push for a job
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = params.id

    // Get job with webhook settings
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        jobDescription: {
          select: { id: true, name: true, content: true },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.webhookUrl) {
      return NextResponse.json(
        { error: 'No webhook URL configured for this job' },
        { status: 400 }
      )
    }

    // Build the webhook payload
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const publicLink = job.isPublic ? `${baseUrl}/careers/${job.id}` : null

    const payload = {
      event: 'job.published',
      timestamp: new Date().toISOString(),
      job: {
        id: job.id,
        title: job.title,
        department: job.department,
        employmentType: job.employmentType,
        status: job.status,
        locations: job.locations,
        description: job.jobDescription?.content || null,
        requirements: null, // Could be parsed from description if structured
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        salaryFrequency: job.salaryFrequency,
        equityMin: job.equityMin,
        equityMax: job.equityMax,
        publicLink,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      },
    }

    const payloadString = JSON.stringify(payload)

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'PeopleOS-Webhook/1.0',
      'X-Webhook-Event': 'job.published',
      'X-Webhook-Timestamp': payload.timestamp,
    }

    // Add HMAC signature if secret is configured
    if (job.webhookSecret) {
      const signature = generateSignature(payloadString, job.webhookSecret)
      headers['X-Webhook-Signature'] = `sha256=${signature}`
    }

    // Send webhook request
    const response = await fetch(job.webhookUrl, {
      method: 'POST',
      headers,
      body: payloadString,
    })

    // Update lastWebhookAt
    await prisma.job.update({
      where: { id: jobId },
      data: { lastWebhookAt: new Date() },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return NextResponse.json(
        {
          success: false,
          error: `Webhook returned ${response.status}: ${errorText}`,
          statusCode: response.status,
        },
        { status: 200 } // Return 200 but indicate failure in body
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook delivered successfully',
      statusCode: response.status,
    })
  } catch (error) {
    console.error('Webhook push error:', error)
    return NextResponse.json(
      { error: 'Failed to push webhook', details: String(error) },
      { status: 500 }
    )
  }
}
