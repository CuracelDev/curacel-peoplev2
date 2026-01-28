/**
 * AuntyPelz Candidate Analysis Service
 *
 * Generates versioned AI analysis for candidates at various hiring stages
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import type { AnalysisType, CandidateAIAnalysis, JobCandidate, Job } from '@prisma/client'

interface AnalysisResult {
  summary: string
  strengths: string[]
  concerns: string[]
  recommendations: string[]
  overallScore: number
  scoreBreakdown: {
    technicalFit: number
    cultureFit: number
    experienceMatch: number
    communicationSkills: number
  }
  sentimentScore: number
  pressValues: {
    passionateWork: number
    relentlessGrowth: number
    empoweredAction: number
    senseOfUrgency: number
    seeingPossibilities: number
  }
  recommendation: 'STRONG_YES' | 'YES' | 'MAYBE' | 'NO' | 'STRONG_NO'
  confidence: number
  mustValidatePoints: string[]
  nextStageQuestions: string[]
}

interface GenerateAnalysisParams {
  candidateId: string
  analysisType: AnalysisType
  triggerStage?: string
  triggerEvent?: string
  interviewId?: string
  assessmentId?: string
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

  // Get the appropriate key and model based on provider
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
 * Get the latest version number for a candidate's analysis
 */
async function getNextVersion(candidateId: string): Promise<number> {
  const latest = await prisma.candidateAIAnalysis.findFirst({
    where: { candidateId },
    orderBy: { version: 'desc' },
    select: { version: true },
  })

  return (latest?.version || 0) + 1
}

/**
 * Generate a comprehensive prompt for candidate analysis
 */
function buildAnalysisPrompt(
  candidate: JobCandidate & { job: Job | null },
  analysisType: AnalysisType,
  additionalContext?: string
): string {
  const basePrompt = `You are AuntyPelz, an expert recruiting analyst at Curacel. Analyze this candidate and provide a detailed assessment.

## Company Values (PRESS)
- Passionate Work: Deep love for what we do
- Relentless Growth: Continuous improvement mindset
- Empowered Action: Taking ownership and initiative
- Sense of Urgency: Moving fast and decisively
- Seeing Possibilities: Innovation and creative problem-solving

## Candidate Information
Name: ${candidate.name}
Email: ${candidate.email}
Current Role: ${candidate.currentRole || 'Not specified'}
Current Company: ${candidate.currentCompany || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Years of Experience: ${candidate.yearsOfExperience || 'Not specified'}
Applied For: ${candidate.job?.title || 'Unknown position'}
Department: ${candidate.job?.department || 'Not specified'}
Current Stage: ${candidate.stage}

Resume Summary:
${candidate.resumeUrl ? 'Resume uploaded' : 'No resume'}

Bio:
${candidate.bio || 'Not provided'}

LinkedIn: ${candidate.linkedinUrl || 'Not provided'}
`

  let typeSpecificPrompt = ''

  switch (analysisType) {
    case 'APPLICATION_REVIEW':
      typeSpecificPrompt = `
## Analysis Type: Application Review
This is an initial review of the candidate's application. Focus on:
- Resume and background alignment with role requirements
- Initial red flags or concerns
- Potential for success in this role
- Key areas to explore in interviews
`
      break

    case 'INTERVIEW_ANALYSIS':
      typeSpecificPrompt = `
## Analysis Type: Interview Analysis
Analyze the candidate's interview performance. Focus on:
- Communication skills and articulation
- Technical competency demonstrated
- Cultural fit indicators
- Comparison to previous stage assessment
- Sentiment change from previous evaluations
`
      break

    case 'ASSESSMENT_REVIEW':
      typeSpecificPrompt = `
## Analysis Type: Assessment Review
Analyze the candidate's assessment results. Focus on:
- Technical or skill test performance
- Personality assessment insights (MBTI, Big Five)
- Cognitive ability indicators
- Alignment with role requirements
`
      break

    case 'STAGE_SUMMARY':
      typeSpecificPrompt = `
## Analysis Type: Stage Summary
Provide a summary of the candidate's performance in the current stage. Focus on:
- Key takeaways from this stage
- Progress compared to previous stages
- Readiness for next stage
- Any concerns that emerged
`
      break

    case 'COMPREHENSIVE':
      typeSpecificPrompt = `
## Analysis Type: Comprehensive Review
Provide a complete end-to-end analysis of the candidate. Focus on:
- Overall journey through the hiring process
- Aggregated strengths and concerns
- Final recommendation with confidence level
- Risk assessment and mitigation strategies
`
      break

    case 'SENTIMENT_CHANGE':
      typeSpecificPrompt = `
## Analysis Type: Sentiment Change Detection
Compare the candidate's performance across stages and identify:
- Changes in assessment over time
- Improving or declining indicators
- Explanation for sentiment shifts
- Impact on hiring decision
`
      break
  }

  const responseFormat = `
## Required Response Format (JSON)
{
  "summary": "2-3 sentence executive summary",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "overallScore": 75, // 0-100
  "scoreBreakdown": {
    "technicalFit": 80,
    "cultureFit": 70,
    "experienceMatch": 75,
    "communicationSkills": 80
  },
  "sentimentScore": 60, // -100 to 100, positive = favorable
  "pressValues": {
    "passionateWork": 4,
    "relentlessGrowth": 4,
    "empoweredAction": 3,
    "senseOfUrgency": 4,
    "seeingPossibilities": 3
  },
  "recommendation": "YES", // STRONG_YES, YES, MAYBE, NO, STRONG_NO
  "confidence": 0.8, // 0-1
  "mustValidatePoints": ["point to validate in next interview"],
  "nextStageQuestions": ["suggested question for next stage"]
}

Respond ONLY with valid JSON, no additional text.
`

  return basePrompt + typeSpecificPrompt + (additionalContext || '') + responseFormat
}

/**
 * Call AI provider to generate analysis
 */
async function callAIForAnalysis(prompt: string): Promise<AnalysisResult> {
  const settings = await getAISettings()

  let result: AnalysisResult

  switch (settings.provider) {
    case 'ANTHROPIC': {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client = new Anthropic({ apiKey: settings.apiKey })

      const response = await client.messages.create({
        model: settings.model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      const textContent = response.content.find(c => c.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Anthropic')
      }

      result = JSON.parse(textContent.text)
      break
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

      result = JSON.parse(content)
      break
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

      result = JSON.parse(content)
      break
    }

    default:
      throw new Error(`Unsupported AI provider: ${settings.provider}`)
  }

  return result
}

/**
 * Generate candidate analysis
 */
export async function generateCandidateAnalysis(
  params: GenerateAnalysisParams
): Promise<CandidateAIAnalysis> {
  const { candidateId, analysisType, triggerStage, triggerEvent, interviewId, assessmentId } = params

  // Get candidate with job
  const candidate = await prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  })

  if (!candidate) {
    throw new Error('Candidate not found')
  }

  // Get previous analysis for sentiment comparison
  const previousAnalysis = await prisma.candidateAIAnalysis.findFirst({
    where: { candidateId, isLatest: true },
    orderBy: { version: 'desc' },
  })

  // Build prompt with additional context if available
  let additionalContext = ''

  if (interviewId) {
    const interview = await prisma.candidateInterview.findUnique({
      where: { id: interviewId },
      include: { interviewType: true },
    })
    if (interview) {
      additionalContext += `\n## Interview Context\nType: ${interview.interviewType?.name}\nFeedback: ${interview.feedback || 'None'}\n`
    }
  }

  if (assessmentId) {
    const assessment = await prisma.candidateAssessment.findUnique({
      where: { id: assessmentId },
      include: { template: true },
    })
    if (assessment) {
      const platformLabel = assessment.template?.externalPlatform || assessment.template?.name || 'Unknown'
      additionalContext += `\n## Assessment Context\nType: ${platformLabel}\nScore: ${assessment.overallScore || 'Pending'}\n`
    }
  }

  if (previousAnalysis) {
    additionalContext += `\n## Previous Analysis (v${previousAnalysis.version})\nSummary: ${previousAnalysis.summary}\nSentiment: ${previousAnalysis.sentimentScore}\nRecommendation: ${previousAnalysis.recommendation}\n`
  }

  // Generate analysis
  const prompt = buildAnalysisPrompt(candidate, analysisType, additionalContext)
  const settings = await getAISettings()

  let result: AnalysisResult

  try {
    result = await callAIForAnalysis(prompt)
  } catch (error) {
    console.error('AI analysis failed:', error)
    // Return a fallback analysis structure
    result = {
      summary: 'Analysis generation failed. Please try again.',
      strengths: [],
      concerns: [],
      recommendations: [],
      overallScore: 0,
      scoreBreakdown: { technicalFit: 0, cultureFit: 0, experienceMatch: 0, communicationSkills: 0 },
      sentimentScore: 0,
      pressValues: { passionateWork: 0, relentlessGrowth: 0, empoweredAction: 0, senseOfUrgency: 0, seeingPossibilities: 0 },
      recommendation: 'MAYBE',
      confidence: 0,
      mustValidatePoints: [],
      nextStageQuestions: [],
    }
  }

  // Calculate sentiment change
  let sentimentChange = 0
  let sentimentReason: string | undefined

  if (previousAnalysis?.sentimentScore) {
    sentimentChange = result.sentimentScore - previousAnalysis.sentimentScore
    if (Math.abs(sentimentChange) >= 10) {
      sentimentReason = sentimentChange > 0
        ? 'Candidate showed improvement in this stage'
        : 'Concerns emerged during this evaluation'
    }
  }

  // Mark previous analyses as not latest
  await prisma.candidateAIAnalysis.updateMany({
    where: { candidateId, isLatest: true },
    data: { isLatest: false },
  })

  // Get next version
  const version = await getNextVersion(candidateId)

  // Create new analysis
  const analysis = await prisma.candidateAIAnalysis.create({
    data: {
      candidateId,
      version,
      analysisType,
      triggerStage,
      triggerEvent,
      interviewId,
      assessmentId,
      summary: result.summary,
      strengths: result.strengths,
      concerns: result.concerns,
      recommendations: result.recommendations,
      overallScore: result.overallScore,
      scoreBreakdown: result.scoreBreakdown,
      sentimentScore: result.sentimentScore,
      sentimentChange,
      sentimentReason,
      pressValues: result.pressValues,
      recommendation: result.recommendation,
      confidence: result.confidence,
      mustValidatePoints: result.mustValidatePoints,
      nextStageQuestions: result.nextStageQuestions,
      aiProvider: settings.provider,
      aiModel: settings.model,
      isLatest: true,
    },
  })

  return analysis
}

/**
 * Generate a tab-specific summary
 */
export async function generateTabSummary(
  candidateId: string,
  tabName: 'overview' | 'application' | 'interviews' | 'values'
): Promise<string> {
  const candidate = await prisma.jobCandidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  })

  if (!candidate) {
    throw new Error('Candidate not found')
  }

  const settings = await getAISettings()

  const prompts: Record<string, string> = {
    overview: `Provide a 2-sentence executive summary of ${candidate.name}'s candidacy for ${candidate.job?.title || 'this role'}. Focus on overall fit and top recommendation.`,
    application: `Summarize the key points from ${candidate.name}'s application materials (resume, cover letter, interest form) in 2-3 sentences. Highlight standout qualifications and any gaps.`,
    interviews: `Summarize ${candidate.name}'s interview performance across all stages in 2-3 sentences. Note communication style, technical depth, and cultural indicators.`,
    values: `Assess ${candidate.name}'s alignment with Curacel's PRESS values based on all available information. Provide a 2-sentence summary of cultural fit.`,
  }

  const prompt = prompts[tabName] || prompts.overview

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: settings.apiKey })

    const response = await client.messages.create({
      model: settings.model,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find(c => c.type === 'text')
    return textContent && textContent.type === 'text' ? textContent.text : 'Unable to generate summary.'
  } catch (error) {
    console.error('Tab summary generation failed:', error)
    return 'Summary unavailable.'
  }
}

/**
 * Get sentiment history for a candidate
 */
export async function getSentimentHistory(candidateId: string) {
  const analyses = await prisma.candidateAIAnalysis.findMany({
    where: { candidateId },
    orderBy: { version: 'asc' },
    select: {
      version: true,
      analysisType: true,
      triggerStage: true,
      sentimentScore: true,
      sentimentChange: true,
      sentimentReason: true,
      overallScore: true,
      recommendation: true,
      createdAt: true,
    },
  })

  return analyses
}
