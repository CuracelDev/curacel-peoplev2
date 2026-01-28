/**
 * Start Assessment API
 *
 * Marks an assessment as started and records the start time
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
          },
        },
        candidate: {
          select: {
            name: true,
            job: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
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

    // Check if already completed
    if (assessment.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This assessment has already been completed' },
        { status: 400 }
      )
    }

    // Update assessment to started
    const updatedAssessment = await prisma.candidateAssessment.update({
      where: { id: assessment.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: assessment.startedAt || new Date(),
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            instructions: true,
            durationMinutes: true,
            questions: true,
          },
        },
        candidate: {
          select: {
            name: true,
            job: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    const safeAssessment = {
      id: updatedAssessment.id,
      status: updatedAssessment.status,
      template: {
        id: updatedAssessment.template.id,
        name: updatedAssessment.template.name,
        description: updatedAssessment.template.description,
        instructions: updatedAssessment.template.instructions,
        durationMinutes: updatedAssessment.template.durationMinutes,
        questions: updatedAssessment.template.questions,
      },
      candidate: {
        name: updatedAssessment.candidate.name,
        job: updatedAssessment.candidate.job
          ? {
              title: updatedAssessment.candidate.job.title,
              company: 'Curacel',
            }
          : null,
      },
      startedAt: updatedAssessment.startedAt?.toISOString() || null,
      expiresAt: updatedAssessment.expiresAt?.toISOString() || null,
    }

    return NextResponse.json({ assessment: safeAssessment })
  } catch (error) {
    console.error('Failed to start assessment:', error)
    return NextResponse.json(
      { error: 'Failed to start assessment' },
      { status: 500 }
    )
  }
}
