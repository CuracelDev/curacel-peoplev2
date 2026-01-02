/**
 * Assessment AI Analysis Service
 *
 * AI-powered assessment features including:
 * - Question generation based on job requirements
 * - Response grading and scoring
 * - Results analysis and recommendations
 * - Predictive performance analysis
 * - Team fit analysis
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import type { AssessmentTemplate, CandidateAssessment, JobCandidate, Job, Prisma } from '@prisma/client'

// Types
export type AssessmentAnalysisType =
  | 'SCORE_ANALYSIS'
  | 'RESPONSE_GRADING'
  | 'GENERATE_QUESTIONS'
  | 'PREDICTIVE_ANALYSIS'
  | 'TEAM_FIT'

export interface GeneratedQuestion {
  id: string
  text: string
  type: 'multiple_choice' | 'short_answer' | 'coding' | 'behavioral' | 'situational'
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  options?: { value: string; label: string; isCorrect?: boolean }[]
  maxScore: number
  timeLimit?: number // minutes
  rubric?: string
}

export interface GradedResponse {
  questionId: string
  score: number
  maxScore: number
  feedback: string
  strengths: string[]
  improvements: string[]
  confidence: number
}

export interface AssessmentAnalysisResult {
  overallScore: number
  dimensionScores: Record<string, number>
  recommendation: 'HIRE' | 'HOLD' | 'NO_HIRE'
  confidence: number
  reasoning: string
  strengths: string[]
  concerns: string[]
  questionsForInterview: string[]
  benchmarkComparison?: {
    roleAverage: number
    percentile: number
  }
}

export interface PredictiveInsights {
  predictedPerformance: number // 0-100
  predictedTenure: number // months
  riskFactors: string[]
  successIndicators: string[]
  confidence: number
}

export interface TeamFitAnalysis {
  fitScore: number // 0-100
  complementaryTraits: string[]
  potentialFriction: string[]
  teamDynamicsImpact: string
  recommendations: string[]
  confidence: number
}

/**
 * Get AI settings from database
 */
async function getAISettings() {
  const settings = await prisma.aISettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (!settings) {
    throw new Error('AI settings not configured')
  }

  let apiKey: string | null = null
  let model: string

  switch (settings.provider) {
    case 'OPENAI':
      apiKey = settings.openaiKeyEncrypted
      model = settings.openaiModel
      break
    case 'ANTHROPIC':
      apiKey = settings.anthropicKeyEncrypted
      model = settings.anthropicModel
      break
    case 'GEMINI':
      apiKey = settings.geminiKeyEncrypted
      model = settings.geminiModel
      break
    default:
      throw new Error(`Unsupported AI provider: ${settings.provider}`)
  }

  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${settings.provider}`)
  }

  return {
    provider: settings.provider,
    model,
    apiKey: decrypt(apiKey),
  }
}

/**
 * Call AI provider
 */
async function callAI<T>(prompt: string, maxTokens: number = 4096): Promise<T> {
  const settings = await getAISettings()

  switch (settings.provider) {
    case 'ANTHROPIC': {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client = new Anthropic({ apiKey: settings.apiKey })

      const response = await client.messages.create({
        model: settings.model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      })

      const textContent = response.content.find(c => c.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Anthropic')
      }

      return JSON.parse(textContent.text)
    }

    case 'OPENAI': {
      const { default: OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: settings.apiKey })

      const response = await client.chat.completions.create({
        model: settings.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      return JSON.parse(content)
    }

    case 'GEMINI': {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      )

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!content) {
        throw new Error('No response from Gemini')
      }

      return JSON.parse(content)
    }

    default:
      throw new Error(`Unsupported AI provider: ${settings.provider}`)
  }
}

/**
 * Generate assessment questions based on job requirements
 */
export async function generateAssessmentQuestions(params: {
  jobId?: string
  templateId?: string
  type: 'technical' | 'behavioral' | 'cognitive' | 'role_specific'
  count?: number
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
}): Promise<GeneratedQuestion[]> {
  const { jobId, templateId, type, count = 10, difficulty = 'mixed' } = params

  let jobContext = ''
  let templateContext = ''

  if (jobId) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { jobDescription: true, competencies: { include: { competency: true } } },
    })
    if (job) {
      jobContext = `
## Job Information
Title: ${job.title}
Department: ${job.department || 'Not specified'}
Description: ${job.jobDescription?.content || 'Not provided'}
Required Competencies: ${job.competencies.map(c => c.competency.name).join(', ') || 'Not specified'}
`
    }
  }

  if (templateId) {
    const template = await prisma.assessmentTemplate.findUnique({
      where: { id: templateId },
    })
    if (template) {
      templateContext = `
## Assessment Template
Name: ${template.name}
Type: ${template.type}
Duration: ${template.durationMinutes || 'Not specified'} minutes
Instructions: ${template.instructions || 'Not provided'}
`
    }
  }

  const prompt = `You are an expert assessment designer. Generate ${count} high-quality assessment questions.

${jobContext}
${templateContext}

## Requirements
- Question Type: ${type}
- Difficulty Distribution: ${difficulty}
- Each question should test specific skills or competencies
- Include clear scoring rubrics

## Question Types to Include
${type === 'technical' ? '- Coding challenges, system design, debugging, technical concepts' : ''}
${type === 'behavioral' ? '- STAR format situational questions, past experience scenarios' : ''}
${type === 'cognitive' ? '- Problem-solving, logic puzzles, analytical thinking' : ''}
${type === 'role_specific' ? '- Industry knowledge, domain expertise, role-specific scenarios' : ''}

## Response Format (JSON)
{
  "questions": [
    {
      "id": "q1",
      "text": "Question text here",
      "type": "multiple_choice|short_answer|coding|behavioral|situational",
      "category": "Category name",
      "difficulty": "easy|medium|hard",
      "options": [{"value": "a", "label": "Option A", "isCorrect": true}],
      "maxScore": 10,
      "timeLimit": 5,
      "rubric": "Scoring guidelines"
    }
  ]
}

Respond ONLY with valid JSON.
`

  try {
    const result = await callAI<{ questions: GeneratedQuestion[] }>(prompt)
    return result.questions
  } catch (error) {
    console.error('Question generation failed:', error)
    return []
  }
}

/**
 * Grade assessment responses using AI
 */
export async function gradeAssessmentResponses(params: {
  assessmentId: string
  responses: Array<{ questionId: string; response: string }>
}): Promise<GradedResponse[]> {
  const { assessmentId, responses } = params

  const assessment = await prisma.candidateAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      template: true,
      candidate: { include: { job: true } },
    },
  })

  if (!assessment) {
    throw new Error('Assessment not found')
  }

  const questions = assessment.template.questions as GeneratedQuestion[] | null

  const prompt = `You are an expert assessment grader. Grade the following responses objectively and fairly.

## Assessment Context
Assessment: ${assessment.template.name}
Type: ${assessment.template.type}
Candidate Position: ${assessment.candidate.job?.title || 'Unknown'}

## Questions and Responses
${responses.map((r, i) => {
  const question = questions?.find(q => q.id === r.questionId)
  return `
### Question ${i + 1}
${question?.text || 'Question text not found'}
Type: ${question?.type || 'Unknown'}
Max Score: ${question?.maxScore || 10}
Rubric: ${question?.rubric || 'Standard grading'}

### Response
${r.response}
`
}).join('\n')}

## Response Format (JSON)
{
  "gradedResponses": [
    {
      "questionId": "q1",
      "score": 8,
      "maxScore": 10,
      "feedback": "Detailed feedback on the response",
      "strengths": ["What they did well"],
      "improvements": ["Areas for improvement"],
      "confidence": 0.9
    }
  ]
}

Grade strictly based on the rubric and requirements. Respond ONLY with valid JSON.
`

  try {
    const result = await callAI<{ gradedResponses: GradedResponse[] }>(prompt)
    return result.gradedResponses
  } catch (error) {
    console.error('Response grading failed:', error)
    return responses.map(r => ({
      questionId: r.questionId,
      score: 0,
      maxScore: 10,
      feedback: 'Grading failed. Please review manually.',
      strengths: [],
      improvements: [],
      confidence: 0,
    }))
  }
}

/**
 * Analyze assessment results and generate recommendations
 */
export async function analyzeAssessmentResults(assessmentId: string): Promise<AssessmentAnalysisResult> {
  const assessment = await prisma.candidateAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      template: true,
      candidate: {
        include: {
          job: true,
          assessments: { include: { template: true } },
        },
      },
    },
  })

  if (!assessment) {
    throw new Error('Assessment not found')
  }

  // Get benchmark data if available
  const benchmarkData = assessment.template.benchmarkData as Record<string, number> | null

  const prompt = `You are AuntyPelz, an expert recruiting analyst. Analyze this assessment result and provide recommendations.

## Assessment Information
Type: ${assessment.template.name} (${assessment.template.type})
Candidate: ${assessment.candidate.name}
Position: ${assessment.candidate.job?.title || 'Unknown'}
Current Stage: ${assessment.candidate.stage}

## Results
Overall Score: ${assessment.overallScore || 'Not scored'}
Dimension Scores: ${JSON.stringify(assessment.dimensionScores || assessment.scores || {})}
Percentile: ${assessment.percentile || 'Unknown'}

${benchmarkData ? `## Role Benchmarks\n${JSON.stringify(benchmarkData)}` : ''}

## Other Assessments
${assessment.candidate.assessments
  .filter(a => a.id !== assessmentId)
  .map(a => `- ${a.template.name}: ${a.overallScore || 'Pending'}%`)
  .join('\n') || 'No other assessments'}

## Response Format (JSON)
{
  "overallScore": 75,
  "dimensionScores": {"technical": 80, "behavioral": 70, "aptitude": 75},
  "recommendation": "HIRE|HOLD|NO_HIRE",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of the recommendation",
  "strengths": ["Key strength 1", "Key strength 2"],
  "concerns": ["Concern 1", "Concern 2"],
  "questionsForInterview": ["Suggested interview question 1"],
  "benchmarkComparison": {"roleAverage": 70, "percentile": 75}
}

Respond ONLY with valid JSON.
`

  try {
    const result = await callAI<AssessmentAnalysisResult>(prompt)

    // Update the assessment with AI analysis
    await prisma.candidateAssessment.update({
      where: { id: assessmentId },
      data: {
        aiAnalysis: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
        aiRecommendation: result.recommendation,
        aiConfidence: result.confidence,
        dimensionScores: JSON.parse(JSON.stringify(result.dimensionScores)) as Prisma.InputJsonValue,
        benchmarkComparison: JSON.parse(JSON.stringify(result.benchmarkComparison)) as Prisma.InputJsonValue,
      },
    })

    return result
  } catch (error) {
    console.error('Assessment analysis failed:', error)
    return {
      overallScore: assessment.overallScore || 0,
      dimensionScores: {},
      recommendation: 'HOLD',
      confidence: 0,
      reasoning: 'Analysis failed. Please review manually.',
      strengths: [],
      concerns: [],
      questionsForInterview: [],
    }
  }
}

/**
 * Predict job performance based on assessment results
 */
export async function predictJobPerformance(candidateId: string): Promise<PredictiveInsights> {
  const candidate = await prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: true,
      assessments: { include: { template: true }, where: { status: 'COMPLETED' } },
      interviews: { include: { evaluations: true } },
    },
  })

  if (!candidate) {
    throw new Error('Candidate not found')
  }

  const assessmentSummary = candidate.assessments.map(a => ({
    type: a.template.type,
    score: a.overallScore,
    recommendation: a.recommendation,
  }))

  const interviewSummary = candidate.interviews.map(i => ({
    stage: i.stage,
    score: i.overallScore,
    evaluations: i.evaluations.length,
  }))

  const prompt = `You are a predictive analytics expert. Based on the candidate's assessment and interview data, predict their job performance.

## Candidate Profile
Name: ${candidate.name}
Position: ${candidate.job?.title || 'Unknown'}
Experience: ${candidate.yearsOfExperience || 'Unknown'} years
Current Stage: ${candidate.stage}

## Assessment Results
${JSON.stringify(assessmentSummary, null, 2)}

## Interview Performance
${JSON.stringify(interviewSummary, null, 2)}

## Company Context
This is for Curacel, a fast-paced insurance tech startup. We value:
- Technical excellence
- Ownership and accountability
- Fast execution
- Continuous learning

## Response Format (JSON)
{
  "predictedPerformance": 75,
  "predictedTenure": 24,
  "riskFactors": ["Risk factor 1", "Risk factor 2"],
  "successIndicators": ["Success indicator 1", "Success indicator 2"],
  "confidence": 0.7
}

Respond ONLY with valid JSON.
`

  try {
    const result = await callAI<PredictiveInsights>(prompt)

    // Note: Predictive insights are computed on-demand and returned
    // These can be stored in CandidateAssessment if needed for specific assessments

    return result
  } catch (error) {
    console.error('Predictive analysis failed:', error)
    return {
      predictedPerformance: 50,
      predictedTenure: 12,
      riskFactors: ['Insufficient data for prediction'],
      successIndicators: [],
      confidence: 0,
    }
  }
}

/**
 * Analyze team fit based on personality and assessment data
 */
export async function analyzeTeamFit(params: {
  candidateId: string
  teamId?: string
  departmentName?: string
}): Promise<TeamFitAnalysis> {
  const { candidateId, teamId, departmentName } = params

  const candidate = await prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: true,
      assessments: {
        where: {
          template: {
            type: 'PERSONALITY_TEST',
          },
          status: 'COMPLETED',
        },
        include: { template: true },
      },
    },
  })

  if (!candidate) {
    throw new Error('Candidate not found')
  }

  // Get team members' personality data if available
  let teamContext = ''
  if (departmentName || candidate.job?.department) {
    const dept = departmentName || candidate.job?.department
    const teamMembers = await prisma.employee.findMany({
      where: { department: dept, status: 'ACTIVE' },
      select: {
        fullName: true,
        mbtiType: true,
        jobTitle: true,
      },
      take: 10,
    })

    if (teamMembers.length > 0) {
      teamContext = `
## Current Team Composition
${teamMembers.map(m => `- ${m.fullName} (${m.jobTitle}): ${m.mbtiType || 'Unknown MBTI'}`).join('\n')}
`
    }
  }

  const candidatePersonality = candidate.assessments.length > 0
    ? candidate.assessments.map(a => ({
        type: a.template.type,
        results: a.resultData || a.scores,
      }))
    : []

  const prompt = `You are an organizational psychology expert. Analyze how well this candidate would fit with the team.

## Candidate Profile
Name: ${candidate.name}
Position: ${candidate.job?.title || 'Unknown'}
MBTI: ${candidate.mbtiType || 'Unknown'}

## Personality Assessment Results
${JSON.stringify(candidatePersonality, null, 2)}

${teamContext}

## Analysis Requirements
- Consider complementary skills and personalities
- Identify potential friction points
- Assess impact on team dynamics
- Provide actionable recommendations

## Response Format (JSON)
{
  "fitScore": 78,
  "complementaryTraits": ["Trait that adds to team", "Another complementary aspect"],
  "potentialFriction": ["Area of potential conflict"],
  "teamDynamicsImpact": "Description of how candidate would affect team dynamics",
  "recommendations": ["Onboarding recommendation", "Integration suggestion"],
  "confidence": 0.75
}

Respond ONLY with valid JSON.
`

  try {
    const result = await callAI<TeamFitAnalysis>(prompt)

    // Update assessment with team fit score if we have a personality assessment
    const personalityAssessment = candidate.assessments[0]
    if (personalityAssessment) {
      await prisma.candidateAssessment.update({
        where: { id: personalityAssessment.id },
        data: { teamFitScore: result.fitScore },
      })
    }

    return result
  } catch (error) {
    console.error('Team fit analysis failed:', error)
    return {
      fitScore: 50,
      complementaryTraits: [],
      potentialFriction: [],
      teamDynamicsImpact: 'Analysis unavailable',
      recommendations: [],
      confidence: 0,
    }
  }
}

/**
 * Get AI-recommended assessments for a candidate
 */
export async function getRecommendedAssessments(params: {
  candidateId: string
  jobId?: string
}): Promise<Array<{
  templateId: string
  templateName: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
}>> {
  const { candidateId, jobId } = params

  const candidate = await prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: {
      job: {
        include: {
          assessmentTemplates: { include: { template: true } },
          competencies: { include: { competency: true } },
        },
      },
      assessments: { select: { templateId: true, status: true } },
    },
  })

  if (!candidate) {
    throw new Error('Candidate not found')
  }

  // Get available templates
  const availableTemplates = await prisma.assessmentTemplate.findMany({
    where: {
      isActive: true,
      id: { notIn: candidate.assessments.map(a => a.templateId) },
    },
  })

  if (availableTemplates.length === 0) {
    return []
  }

  // Check job-configured assessments first
  const jobAssessments = candidate.job?.assessmentTemplates || []
  const pendingJobAssessments = jobAssessments.filter(
    ja => !candidate.assessments.some(a => a.templateId === ja.templateId)
  )

  const prompt = `You are a recruiting assessment expert. Recommend the most relevant assessments for this candidate.

## Candidate Profile
Name: ${candidate.name}
Position: ${candidate.job?.title || 'Unknown'}
Stage: ${candidate.stage}
Experience: ${candidate.yearsOfExperience || 'Unknown'} years

## Completed Assessments
${candidate.assessments.map(a => a.templateId).join(', ') || 'None'}

## Job-Configured Assessments (Required)
${pendingJobAssessments.map(ja => `- ${ja.template.name} (${ja.isRequired ? 'Required' : 'Optional'}, Stage: ${ja.triggerStage || 'Any'})`).join('\n') || 'None configured'}

## Available Templates
${availableTemplates.map(t => `- ID: ${t.id}, Name: ${t.name}, Type: ${t.type}`).join('\n')}

## Required Competencies
${candidate.job?.competencies.map(c => c.competency.name).join(', ') || 'Not specified'}

## Response Format (JSON)
{
  "recommendations": [
    {
      "templateId": "template-id-here",
      "templateName": "Template Name",
      "reason": "Why this assessment is recommended",
      "priority": "HIGH|MEDIUM|LOW",
      "confidence": 0.85
    }
  ]
}

Prioritize job-configured assessments. Respond ONLY with valid JSON.
`

  try {
    const result = await callAI<{
      recommendations: Array<{
        templateId: string
        templateName: string
        reason: string
        priority: 'HIGH' | 'MEDIUM' | 'LOW'
        confidence: number
      }>
    }>(prompt)

    return result.recommendations
  } catch (error) {
    console.error('Assessment recommendation failed:', error)

    // Fallback: return job-configured assessments
    return pendingJobAssessments.map(ja => ({
      templateId: ja.templateId,
      templateName: ja.template.name,
      reason: ja.isRequired ? 'Required for this job' : 'Configured for this job',
      priority: ja.isRequired ? 'HIGH' as const : 'MEDIUM' as const,
      confidence: 1,
    }))
  }
}
