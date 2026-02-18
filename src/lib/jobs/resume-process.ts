/**
 * Resume Processing Job
 *
 * Processes uploaded resumes to extract structured data (work experience,
 * education, skills) and generate AI summaries.
 */

import PgBoss from 'pg-boss'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

export const RESUME_PROCESS_JOB_NAME = 'resume-process'

interface ResumeProcessJobData {
  candidateId: string
  resumeUrl: string
}

interface WorkExperience {
  title: string
  company: string
  startDate?: string
  endDate?: string
  isCurrent?: boolean
  description?: string
  highlights?: string[]
  skills?: string[]
}

interface Education {
  degree: string
  field?: string
  institution: string
  years?: string
  honors?: string
}

interface Skills {
  languages?: string[]
  frameworks?: string[]
  databases?: string[]
  infrastructure?: string[]
}

interface ParsedResume {
  currentRole?: string
  currentCompany?: string
  yearsOfExperience?: number
  location?: string
  workExperience: WorkExperience[]
  education: Education[]
  skills: Skills
  summary: string
}

/**
 * Extract text from a resume file (PDF, DOCX, or plain text)
 */
async function extractTextFromResume(url: string): Promise<string> {
  try {
    // Handle base64 data URLs
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        throw new Error('Invalid data URL format')
      }

      const [, contentType, base64Data] = matches
      const buffer = Buffer.from(base64Data, 'base64')

      if (contentType.includes('pdf')) {
        // pdf-parse v2 uses a class-based API
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse')
        const parser = new PDFParse({ data: buffer })
        const result = await parser.getText()
        return result.text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()
      } else if (
        contentType.includes('word') ||
        contentType.includes('officedocument.wordprocessingml.document')
      ) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        return result.value.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()
      } else {
        // Assume text
        return buffer.toString('utf-8').replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()
      }
    }

    // Handle remote URLs
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
      // pdf-parse v2 uses a class-based API
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      return result.text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()
    } else if (
      contentType.includes('word') ||
      contentType.includes('officedocument.wordprocessingml.document') ||
      url.toLowerCase().endsWith('.docx') ||
      url.toLowerCase().endsWith('.doc')
    ) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()
    } else {
      // Assume text/plain
      return buffer.toString('utf-8').replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()
    }
  } catch (error: any) {
    console.error('[ResumeProcess] Text extraction error:', error)
    throw new Error(`Failed to extract text from resume: ${error.message}`)
  }
}

/**
 * Get AI settings from database or environment variables
 */
async function getAISettings() {
  // First check environment variables for quick setup
  const envOpenAIKey = process.env.OPENAI_API_KEY
  const envOpenAIModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (envOpenAIKey) {
    console.log('[ResumeProcess] Using OpenAI from environment variables')
    return {
      provider: 'OPENAI' as const,
      model: envOpenAIModel,
      apiKey: envOpenAIKey,
    }
  }

  // Fall back to database settings
  const settings = await prisma.aISettings.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (!settings || !settings.isEnabled) {
    return null
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
      return null
  }

  if (!apiKey) {
    return null
  }

  return {
    provider: settings.provider,
    model,
    apiKey: decrypt(apiKey),
  }
}

/**
 * Parse resume text using AI to extract structured data
 */
async function parseResumeWithAI(resumeText: string): Promise<ParsedResume> {
  const aiSettings = await getAISettings()

  if (!aiSettings) {
    console.log('[ResumeProcess] AI not configured, using basic parsing')
    return basicResumeParse(resumeText)
  }

  const prompt = `You are an expert resume parser. Analyze the following resume text and extract structured information.

Resume Text:
"""
${resumeText.slice(0, 15000)}
"""

Extract and return a JSON object with exactly this structure (use null for missing fields, empty arrays [] for missing lists):
{
  "currentRole": "string or null - the person's most recent/current job title",
  "currentCompany": "string or null - the person's most recent/current employer",
  "yearsOfExperience": number or null - calculate total years of professional experience from work history,
  "location": "string or null - city, country format if available",
  "workExperience": [
    {
      "title": "job title (required)",
      "company": "company name (required)",
      "startDate": "MMM YYYY format (e.g., 'Jan 2020')",
      "endDate": "MMM YYYY format or 'Present' if current",
      "isCurrent": true if this is current job, false otherwise,
      "highlights": ["key achievement or responsibility 1", "key achievement 2", "key achievement 3"],
      "skills": ["specific technology or skill used in this role"]
    }
  ],
  "education": [
    {
      "degree": "degree type (e.g., 'Bachelor of Science', 'Master of Arts', 'PhD')",
      "field": "field of study (e.g., 'Computer Science', 'Electrical Engineering')",
      "institution": "school/university name",
      "years": "YYYY - YYYY format (e.g., '2015 - 2019') or single year if only graduation mentioned",
      "honors": "honors, distinctions, or GPA if mentioned (e.g., 'First Class Honours', 'GPA: 3.8/4.0')"
    }
  ],
  "skills": {
    "languages": ["programming languages like Python, JavaScript, TypeScript, Java, C++, etc."],
    "frameworks": ["frameworks and libraries like React, Next.js, Django, TensorFlow, PyTorch, etc."],
    "databases": ["databases like PostgreSQL, MongoDB, MySQL, Redis, etc."],
    "infrastructure": ["cloud platforms, DevOps tools like AWS, GCP, Azure, Docker, Kubernetes, CI/CD, etc."]
  },
  "summary": "A 2-3 sentence professional summary that highlights the person's key strengths, years of experience, main expertise areas, and notable achievements. Write in third person."
}

IMPORTANT:
- Extract ALL work experiences found, ordered from most recent to oldest
- Extract ALL education entries found
- Be thorough in extracting skills from the entire resume
- For highlights, extract specific achievements with metrics when available
- Return ONLY the JSON object, no additional text or markdown`

  try {
    let response: string

    if (aiSettings.provider === 'ANTHROPIC') {
      const anthropicModule = await import('@anthropic-ai/sdk')
      const Anthropic = (anthropicModule as any).default || anthropicModule.Anthropic
      const client = new Anthropic({ apiKey: aiSettings.apiKey })

      const result = await client.messages.create({
        model: aiSettings.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      response = (result.content[0] as any).text
    } else if (aiSettings.provider === 'OPENAI') {
      const openaiModule = await import('openai')
      const OpenAI = (openaiModule as any).default || openaiModule.OpenAI
      const client = new OpenAI({ apiKey: aiSettings.apiKey })

      const result = await client.chat.completions.create({
        model: aiSettings.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      })

      response = result.choices[0]?.message?.content || '{}'
    } else {
      // Fallback to basic parsing for unsupported providers
      return basicResumeParse(resumeText)
    }

    // Parse the JSON response
    // Remove markdown code blocks if present
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7)
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3)
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3)
    }
    cleanResponse = cleanResponse.trim()

    const parsed = JSON.parse(cleanResponse)

    // Transform and validate the parsed data
    const workExperience = Array.isArray(parsed.workExperience)
      ? parsed.workExperience.map((exp: any) => ({
        title: exp.title || '',
        company: exp.company || '',
        startDate: exp.startDate || undefined,
        endDate: exp.endDate || undefined,
        isCurrent: Boolean(exp.isCurrent),
        highlights: Array.isArray(exp.highlights) ? exp.highlights.filter((h: any) => typeof h === 'string') : [],
        skills: Array.isArray(exp.skills) ? exp.skills.filter((s: any) => typeof s === 'string') : [],
      }))
      : []

    const education = Array.isArray(parsed.education)
      ? parsed.education.map((edu: any) => ({
        degree: edu.degree || '',
        field: edu.field || '',
        institution: edu.institution || '',
        years: edu.years || '',
        honors: edu.honors || '',
      }))
      : []

    const skills = {
      languages: Array.isArray(parsed.skills?.languages) ? parsed.skills.languages.filter((s: any) => typeof s === 'string') : [],
      frameworks: Array.isArray(parsed.skills?.frameworks) ? parsed.skills.frameworks.filter((s: any) => typeof s === 'string') : [],
      databases: Array.isArray(parsed.skills?.databases) ? parsed.skills.databases.filter((s: any) => typeof s === 'string') : [],
      infrastructure: Array.isArray(parsed.skills?.infrastructure) ? parsed.skills.infrastructure.filter((s: any) => typeof s === 'string') : [],
    }

    console.log('[ResumeProcess] Parsed data:', {
      workExperienceCount: workExperience.length,
      educationCount: education.length,
      skillsCount: Object.values(skills).flat().length,
    })

    return {
      currentRole: parsed.currentRole || undefined,
      currentCompany: parsed.currentCompany || undefined,
      yearsOfExperience: typeof parsed.yearsOfExperience === 'number' ? parsed.yearsOfExperience : undefined,
      location: parsed.location || undefined,
      workExperience,
      education,
      skills,
      summary: parsed.summary || '',
    }
  } catch (error) {
    console.error('[ResumeProcess] AI parsing error:', error)
    return basicResumeParse(resumeText)
  }
}

/**
 * Basic resume parsing without AI (fallback)
 */
function basicResumeParse(resumeText: string): ParsedResume {
  // Extract a basic summary from the first few lines
  const lines = resumeText.split('\n').filter((l) => l.trim())
  const summary = lines.slice(0, 3).join(' ').slice(0, 500)

  return {
    workExperience: [],
    education: [],
    skills: {},
    summary: summary || 'Resume uploaded - manual review required.',
  }
}

/**
 * Resume processing job handler
 */
export async function resumeProcessHandler(job: any) {
  if (!job?.data) {
    console.error('[ResumeProcess] Job data is missing, skipping job:', job?.id)
    return
  }

  const { candidateId, resumeUrl } = job.data

  console.log(`[ResumeProcess] Processing resume for candidate ${candidateId}`)

  try {
    // Update status to processing
    await prisma.jobCandidate.update({
      where: { id: candidateId },
      data: { processingStatus: 'processing' },
    })

    // Extract text from resume
    console.log('[ResumeProcess] Extracting text from resume...')
    const resumeText = await extractTextFromResume(resumeUrl)

    if (!resumeText || resumeText.length < 50) {
      throw new Error('Failed to extract meaningful text from resume')
    }

    console.log(`[ResumeProcess] Extracted ${resumeText.length} characters`)

    // Parse resume with AI
    console.log('[ResumeProcess] Parsing resume with AI...')
    const parsed = await parseResumeWithAI(resumeText)

    console.log('[ResumeProcess] Parsed resume:', {
      currentRole: parsed.currentRole,
      currentCompany: parsed.currentCompany,
      yearsOfExperience: parsed.yearsOfExperience,
      workExperienceCount: parsed.workExperience.length,
      educationCount: parsed.education.length,
      hasSkills: Object.keys(parsed.skills).length > 0,
    })

    // Update candidate with parsed data
    // Cast to any for Prisma Json fields
    await prisma.jobCandidate.update({
      where: { id: candidateId },
      data: {
        currentRole: parsed.currentRole || undefined,
        currentCompany: parsed.currentCompany || undefined,
        yearsOfExperience: parsed.yearsOfExperience || undefined,
        location: parsed.location || undefined,
        workExperience:
          parsed.workExperience.length > 0
            ? (parsed.workExperience as unknown as any)
            : undefined,
        education:
          parsed.education.length > 0 ? (parsed.education as unknown as any) : undefined,
        skills:
          Object.keys(parsed.skills).length > 0
            ? (parsed.skills as unknown as any)
            : undefined,
        resumeSummary: parsed.summary || undefined,
        processingStatus: 'completed',
        processedAt: new Date(),
      },
    })

    console.log(`[ResumeProcess] Successfully processed resume for candidate ${candidateId}`)
  } catch (error) {
    console.error(`[ResumeProcess] Failed to process resume for candidate ${candidateId}:`, error)

    // Update status to failed
    await prisma.jobCandidate.update({
      where: { id: candidateId },
      data: {
        processingStatus: 'failed',
        processedAt: new Date(),
      },
    })

    throw error
  }
}

/**
 * Initialize the resume processing job handler
 */
export function initResumeProcessJob(boss: PgBoss) {
  boss.work(RESUME_PROCESS_JOB_NAME, { teamSize: 2, teamConcurrency: 1 }, resumeProcessHandler)
  console.log(`[Worker] Job handler registered: ${RESUME_PROCESS_JOB_NAME}`)
}

/**
 * Queue a resume for processing
 */
export async function queueResumeProcess(boss: PgBoss, candidateId: string, resumeUrl: string) {
  const jobId = await boss.send(RESUME_PROCESS_JOB_NAME, { candidateId, resumeUrl })
  console.log(`[ResumeProcess] Queued resume processing for candidate ${candidateId}, job ID: ${jobId}`)
  return jobId
}
