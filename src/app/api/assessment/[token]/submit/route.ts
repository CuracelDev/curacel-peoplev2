/**
 * Submit Assessment API
 *
 * Handles submission of candidate responses and triggers AI grading
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { gradeAssessmentResponses, analyzeAssessmentResults } from '@/lib/ai/hiring/assessment-analysis'

interface RouteParams {
  params: Promise<{ token: string }>
}

interface Response {
  questionId: string
  response: string
  submittedAt: string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  try {
    const body = await request.json()
    const { responses } = body as { responses: Response[] }

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Find assessment by invite token
    const assessment = await prisma.candidateAssessment.findUnique({
      where: { inviteToken: token },
      include: {
        template: true,
        candidate: {
          include: { job: true },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Check if already completed
    if (assessment.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This assessment has already been submitted' },
        { status: 400 }
      )
    }

    // Update assessment with responses and mark as completed
    const updatedAssessment = await prisma.candidateAssessment.update({
      where: { id: assessment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        responses: responses as unknown as Prisma.InputJsonValue,
      },
    })

    // Trigger AI grading in the background
    // We don't wait for this to complete to give quick response to candidate
    gradeAndAnalyzeInBackground(assessment.id, responses)

    return NextResponse.json({
      success: true,
      message: 'Assessment submitted successfully',
      assessmentId: updatedAssessment.id,
    })
  } catch (error) {
    console.error('Failed to submit assessment:', error)
    return NextResponse.json(
      { error: 'Failed to submit assessment' },
      { status: 500 }
    )
  }
}

async function gradeAndAnalyzeInBackground(assessmentId: string, responses: Response[]) {
  try {
    // Grade the responses
    const gradingResult = await gradeAssessmentResponses({
      assessmentId,
      responses: responses.map((response) => ({
        questionId: response.questionId,
        response: response.response,
      })),
    })

    // Calculate overall score from grading
    let totalScore = 0
    let maxPossibleScore = 0

    if (Array.isArray(gradingResult)) {
      for (const grade of gradingResult) {
        totalScore += grade.score || 0
        maxPossibleScore += grade.maxScore || 10
      }
    }

    const overallScore = maxPossibleScore > 0
      ? Math.round((totalScore / maxPossibleScore) * 100)
      : null

    // Update with grading results
    await prisma.candidateAssessment.update({
      where: { id: assessmentId },
      data: {
        overallScore,
        scores: gradingResult as unknown as Prisma.InputJsonValue,
      },
    })

    // Run full AI analysis
    const analysis = await analyzeAssessmentResults(assessmentId)

    // Update with AI analysis
    await prisma.candidateAssessment.update({
      where: { id: assessmentId },
      data: {
        aiAnalysis: analysis as unknown as Prisma.InputJsonValue,
        aiRecommendation: analysis.recommendation,
        aiConfidence: analysis.confidence,
        summary: analysis.reasoning,
        strengths: analysis.strengths,
        risks: analysis.concerns,
        recommendation: analysis.recommendation,
        questionsForCandidate: analysis.questionsForInterview,
      },
    })

    console.log(`Assessment ${assessmentId} graded and analyzed successfully`)
  } catch (error) {
    console.error(`Failed to grade assessment ${assessmentId}:`, error)

    // Update assessment to indicate grading failed
    await prisma.candidateAssessment.update({
      where: { id: assessmentId },
      data: {
        notes: (await prisma.candidateAssessment.findUnique({
          where: { id: assessmentId },
          select: { notes: true },
        }))?.notes
          ? `${(await prisma.candidateAssessment.findUnique({ where: { id: assessmentId }, select: { notes: true } }))?.notes}\n\n[AI Grading Failed: ${error instanceof Error ? error.message : 'Unknown error'}]`
          : `[AI Grading Failed: ${error instanceof Error ? error.message : 'Unknown error'}]`,
      },
    })
  }
}
