import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

// Helper function to scrape job postings from URLs
async function scrapeJobPostingUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CuracelPeople/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }

    const html = await response.text()

    // Parse with cheerio (available via html-pdf-node dependency)
    const cheerio = await import('cheerio')
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $('script, style, nav, header, footer').remove()

    // Try common selectors
    const selectors = [
      '.job-description',
      '.job-content',
      '[role="main"]',
      'main',
      'article',
      '.posting-description',
      '.content-section',
      '.job-details',
    ]

    let content = ''
    for (const selector of selectors) {
      const element = $(selector)
      if (element.length > 0) {
        content = element.text()
        break
      }
    }

    if (!content) {
      content = $('body').text()
    }

    return content.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim()
  } catch (error: any) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Failed to import from URL: ${error.message}`,
    })
  }
}

// Helper function to format JD sections into rich HTML content
function formatJDContent(sections: any): string {
  const html: string[] = []

  // Overview
  if (sections.overview) {
    html.push(`<div class="jd-section">`)
    html.push(`<h2>Overview</h2>`)
    html.push(`<p>${sections.overview}</p>`)
    html.push(`</div>`)
  }

  // Responsibilities
  if (sections.responsibilities && sections.responsibilities.length > 0) {
    html.push(`<div class="jd-section">`)
    html.push(`<h2>Key Responsibilities</h2>`)
    html.push(`<ul>`)
    sections.responsibilities.forEach((r: string) => {
      html.push(`<li>${r}</li>`)
    })
    html.push(`</ul>`)
    html.push(`</div>`)
  }

  // Required Qualifications
  if (sections.requiredQualifications && sections.requiredQualifications.length > 0) {
    html.push(`<div class="jd-section">`)
    html.push(`<h2>Required Qualifications</h2>`)
    html.push(`<ul>`)
    sections.requiredQualifications.forEach((q: string) => {
      html.push(`<li>${q}</li>`)
    })
    html.push(`</ul>`)
    html.push(`</div>`)
  }

  // Preferred Qualifications
  if (sections.preferredQualifications && sections.preferredQualifications.length > 0) {
    html.push(`<div class="jd-section">`)
    html.push(`<h2>Preferred Qualifications</h2>`)
    html.push(`<ul>`)
    sections.preferredQualifications.forEach((q: string) => {
      html.push(`<li>${q}</li>`)
    })
    html.push(`</ul>`)
    html.push(`</div>`)
  }

  // Benefits
  if (sections.benefits && sections.benefits.length > 0) {
    html.push(`<div class="jd-section">`)
    html.push(`<h2>Benefits & Perks</h2>`)
    html.push(`<ul>`)
    sections.benefits.forEach((b: string) => {
      html.push(`<li>${b}</li>`)
    })
    html.push(`</ul>`)
    html.push(`</div>`)
  }

  // About Us
  if (sections.aboutUs) {
    html.push(`<div class="jd-section">`)
    html.push(`<h2>About Curacel</h2>`)
    html.push(`<p>${sections.aboutUs}</p>`)
    html.push(`</div>`)
  }

  return html.join('\n')
}

export const jobDescriptionRouter = router({
  // List all JDs (active and inactive)
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.jobDescription.findMany({
      orderBy: [{ updatedAt: 'desc' }],
    })
  }),

  // Get JDs for dropdown/select
  listForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.jobDescription.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true },
      orderBy: { name: 'asc' },
    })
  }),

  // Get a single JD by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const jd = await ctx.prisma.jobDescription.findUnique({
        where: { id: input.id },
      })

      if (!jd) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        })
      }

      return jd
    }),

  // Create a new JD
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(200),
        department: z.string().max(100).optional(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.jobDescription.create({
        data: {
          name: input.name.trim(),
          department: input.department?.trim(),
          content: input.content,
        },
      })
    }),

  // Update a JD (creates new version)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(200).optional(),
        department: z.string().max(100).optional().nullable(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const existing = await ctx.prisma.jobDescription.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        })
      }

      // Increment version if content changed
      const newVersion = data.content && data.content !== existing.content
        ? existing.version + 1
        : existing.version

      return ctx.prisma.jobDescription.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.department !== undefined && { department: data.department?.trim() || null }),
          ...(data.content && { content: data.content }),
          version: newVersion,
        },
      })
    }),

  // Delete (soft delete) a JD
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.jobDescription.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Duplicate a JD
  duplicate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.jobDescription.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        })
      }

      return ctx.prisma.jobDescription.create({
        data: {
          name: `${existing.name} (Copy)`,
          department: existing.department,
          content: existing.content,
          version: 1,
        },
      })
    }),

  // Generate JD from AI based on job title and department
  generateFromAI: protectedProcedure
    .input(
      z.object({
        jobTitle: z.string().min(2).max(200),
        department: z.string().max(100),
        additionalContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get AI settings
      const aiSettings = await ctx.prisma.aISettings.findFirst()

      if (!aiSettings || !aiSettings.isEnabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI is not enabled. Please configure AI settings in Admin > AI Settings.',
        })
      }

      // 2. Build prompt for structured JD
      const prompt = `You are AuntyPelz, Curacel's expert HR assistant. Generate a comprehensive, professional job description.

## Job Details
Title: ${input.jobTitle}
Department: ${input.department}
${input.additionalContext ? `Additional Context: ${input.additionalContext}` : ''}

## Company Context
Curacel is a leading insurtech company in Africa, focused on using AI and technology to transform insurance infrastructure. We value:
- PRESS Values: Passionate Work, Relentless Growth, Empowered Action, Sense of Urgency, Seeing Possibilities
- Innovation and ownership
- Fast-paced, high-impact work environment

## Generate a JD with these sections:

1. **Overview** (2-3 paragraphs):
   - Brief company introduction
   - Role summary and impact
   - Why this role matters

2. **Key Responsibilities** (5-8 bullet points):
   - Primary duties and deliverables
   - Areas of ownership
   - Cross-functional collaboration

3. **Required Qualifications**:
   - Must-have skills and experience
   - Educational requirements
   - Technical competencies

4. **Preferred Qualifications**:
   - Nice-to-have skills
   - Bonus experience

5. **Benefits & Perks**:
   - What we offer
   - Growth opportunities
   - Work environment

6. **About Curacel**:
   - Mission and vision
   - Culture highlights
   - Impact story

Format your response as JSON:
{
  "overview": "...",
  "responsibilities": ["...", "..."],
  "requiredQualifications": ["...", "..."],
  "preferredQualifications": ["...", "..."],
  "benefits": ["...", "..."],
  "aboutUs": "..."
}

Make it compelling, specific, and aligned with modern tech hiring practices.`

      // 3. Call AI provider
      let response: any

      if (aiSettings.provider === 'ANTHROPIC') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const crypto = await import('crypto')

        if (!aiSettings.anthropicKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Anthropic API key not configured. Please add your API key in Admin > AI Settings.',
          })
        }

        if (!process.env.ENCRYPTION_KEY) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Server encryption key not configured. Please contact your administrator.',
          })
        }

        let apiKey: string
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
            Buffer.alloc(16, 0)
          )
          apiKey = decipher.update(aiSettings.anthropicKeyEncrypted, 'hex', 'utf8')
          apiKey += decipher.final('utf8')
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to decrypt API key. Please re-configure your AI settings in Admin > AI Settings.',
          })
        }

        const anthropic = new Anthropic({ apiKey })

        const message = await anthropic.messages.create({
          model: aiSettings.anthropicModel,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        })

        const content = message.content[0]
        if (content.type === 'text') {
          response = JSON.parse(content.text)
        }
      } else if (aiSettings.provider === 'OPENAI') {
        const OpenAI = (await import('openai')).default
        const crypto = await import('crypto')

        if (!aiSettings.openaiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'OpenAI API key not configured. Please add your API key in Admin > AI Settings.',
          })
        }

        if (!process.env.ENCRYPTION_KEY) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Server encryption key not configured. Please contact your administrator.',
          })
        }

        let apiKey: string
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
            Buffer.alloc(16, 0)
          )
          apiKey = decipher.update(aiSettings.openaiKeyEncrypted, 'hex', 'utf8')
          apiKey += decipher.final('utf8')
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to decrypt API key. Please re-configure your AI settings in Admin > AI Settings.',
          })
        }

        const openai = new OpenAI({ apiKey })

        const completion = await openai.chat.completions.create({
          model: aiSettings.openaiModel,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        })

        response = JSON.parse(completion.choices[0].message.content || '{}')
      } else if (aiSettings.provider === 'GEMINI') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const crypto = await import('crypto')

        if (!aiSettings.geminiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Gemini API key not configured. Please add your API key in Admin > AI Settings.',
          })
        }

        if (!process.env.ENCRYPTION_KEY) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Server encryption key not configured. Please contact your administrator.',
          })
        }

        let apiKey: string
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
            Buffer.alloc(16, 0)
          )
          apiKey = decipher.update(aiSettings.geminiKeyEncrypted, 'hex', 'utf8')
          apiKey += decipher.final('utf8')
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to decrypt API key. Please re-configure your AI settings in Admin > AI Settings.',
          })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: aiSettings.geminiModel })

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          response = JSON.parse(jsonMatch[0])
        } else {
          response = JSON.parse(text)
        }
      }

      // 4. Format sections into rich HTML content
      const contentHtml = formatJDContent(response)

      return {
        name: input.jobTitle,
        department: input.department,
        content: contentHtml,
      }
    }),

  // Import JD from URL
  importFromUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch and scrape URL
      const scrapedText = await scrapeJobPostingUrl(input.url)

      // 2. Get AI settings
      const aiSettings = await ctx.prisma.aISettings.findFirst()

      if (!aiSettings || !aiSettings.isEnabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI is required to parse job postings. Please enable AI in Admin > AI Settings.',
        })
      }

      // 3. Build prompt for extraction
      const prompt = `You are a JD extraction expert. I've scraped a job posting from a URL. Extract and structure the job description.

## Scraped Content
${scrapedText}

## Source URL
${input.url}

Extract and organize into these sections:
1. Job Title
2. Department/Team (if mentioned)
3. Overview (company intro + role summary)
4. Responsibilities
5. Required Qualifications
6. Preferred Qualifications
7. Benefits (if mentioned)

If a section is missing, use empty string or empty array.

Format as JSON:
{
  "jobTitle": "...",
  "department": "...",
  "overview": "...",
  "responsibilities": ["...", "..."],
  "requiredQualifications": ["...", "..."],
  "preferredQualifications": ["...", "..."],
  "benefits": ["...", "..."]
}`

      // 4. Call AI provider (same pattern as generateFromAI)
      let response: any

      if (aiSettings.provider === 'ANTHROPIC') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const crypto = await import('crypto')

        if (!aiSettings.anthropicKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Anthropic API key not configured. Please add your API key in Admin > AI Settings.',
          })
        }

        if (!process.env.ENCRYPTION_KEY) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Server encryption key not configured. Please contact your administrator.',
          })
        }

        let apiKey: string
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
            Buffer.alloc(16, 0)
          )
          apiKey = decipher.update(aiSettings.anthropicKeyEncrypted, 'hex', 'utf8')
          apiKey += decipher.final('utf8')
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to decrypt API key. Please re-configure your AI settings in Admin > AI Settings.',
          })
        }

        const anthropic = new Anthropic({ apiKey })

        const message = await anthropic.messages.create({
          model: aiSettings.anthropicModel,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        })

        const content = message.content[0]
        if (content.type === 'text') {
          response = JSON.parse(content.text)
        }
      } else if (aiSettings.provider === 'OPENAI') {
        const OpenAI = (await import('openai')).default
        const crypto = await import('crypto')

        if (!aiSettings.openaiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'OpenAI API key not configured. Please add your API key in Admin > AI Settings.',
          })
        }

        if (!process.env.ENCRYPTION_KEY) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Server encryption key not configured. Please contact your administrator.',
          })
        }

        let apiKey: string
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
            Buffer.alloc(16, 0)
          )
          apiKey = decipher.update(aiSettings.openaiKeyEncrypted, 'hex', 'utf8')
          apiKey += decipher.final('utf8')
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to decrypt API key. Please re-configure your AI settings in Admin > AI Settings.',
          })
        }

        const openai = new OpenAI({ apiKey })

        const completion = await openai.chat.completions.create({
          model: aiSettings.openaiModel,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        })

        response = JSON.parse(completion.choices[0].message.content || '{}')
      } else if (aiSettings.provider === 'GEMINI') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const crypto = await import('crypto')

        if (!aiSettings.geminiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Gemini API key not configured. Please add your API key in Admin > AI Settings.',
          })
        }

        if (!process.env.ENCRYPTION_KEY) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Server encryption key not configured. Please contact your administrator.',
          })
        }

        let apiKey: string
        try {
          const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
            Buffer.alloc(16, 0)
          )
          apiKey = decipher.update(aiSettings.geminiKeyEncrypted, 'hex', 'utf8')
          apiKey += decipher.final('utf8')
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to decrypt API key. Please re-configure your AI settings in Admin > AI Settings.',
          })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: aiSettings.geminiModel })

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          response = JSON.parse(jsonMatch[0])
        } else {
          response = JSON.parse(text)
        }
      }

      // 5. Format and return
      const contentHtml = formatJDContent(response)

      return {
        name: response.jobTitle || 'Imported Job Description',
        department: response.department || '',
        content: contentHtml,
      }
    }),
})
