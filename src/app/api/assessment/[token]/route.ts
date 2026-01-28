/**
 * Public Assessment API
 *
 * Handles fetching assessment data for candidates
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  try {
    // Find assessment by invite token
    const assessment = await prisma.candidateAssessment.findUnique({
      where: { inviteToken: token },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            instructions: true,
            durationMinutes: true,
            questions: true,
            type: true,
          },
        },
        candidate: {
          select: {
            name: true,
            email: true,
            job: {
              select: {
                title: true,
                department: true,
              },
            },
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found or link expired' },
        { status: 404 }
      )
    }

    // Check if expired
    if (assessment.expiresAt && new Date(assessment.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This assessment has expired' },
        { status: 410 }
      )
    }

    // Don't expose sensitive data
    const safeAssessment = {
      id: assessment.id,
      status: assessment.status,
      template: {
        id: assessment.template.id,
        name: assessment.template.name,
        description: assessment.template.description,
        instructions: assessment.template.instructions,
        durationMinutes: assessment.template.durationMinutes,
        questions: assessment.template.questions,
        type: assessment.template.type,
      },
      candidate: {
        name: assessment.candidate.name,
        job: assessment.candidate.job
          ? {
              title: assessment.candidate.job.title,
              company: 'Curacel', // Hardcoded for now
            }
          : null,
      },
      startedAt: assessment.startedAt?.toISOString() || null,
      expiresAt: assessment.expiresAt?.toISOString() || null,
    }

    return NextResponse.json({ assessment: safeAssessment })
  } catch (error) {
    console.error('Failed to fetch assessment:', error)
    return NextResponse.json(
      { error: 'Failed to load assessment' },
      { status: 500 }
    )
  }
}
