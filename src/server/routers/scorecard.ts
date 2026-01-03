import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '@/lib/trpc'
import { decrypt } from '@/lib/encryption'

const OutcomeSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  successCriteria: z.array(z.string()),
})

export const scorecardRouter = router({
  // Get scorecard by jobId
  get: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const scorecard = await ctx.prisma.scorecard.findUnique({
        where: { jobId: input.jobId },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
        },
      })

      return scorecard
    }),

  // Create a new scorecard
  create: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        mission: z.string().min(1, 'Mission statement is required'),
        outcomes: z.array(OutcomeSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if job exists
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.jobId },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      // Check if scorecard already exists
      const existing = await ctx.prisma.scorecard.findUnique({
        where: { jobId: input.jobId },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Scorecard already exists for this job',
        })
      }

      const scorecard = await ctx.prisma.scorecard.create({
        data: {
          jobId: input.jobId,
          mission: input.mission,
          outcomes: input.outcomes,
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
        },
      })

      return scorecard
    }),

  // Update an existing scorecard
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        mission: z.string().min(1, 'Mission statement is required').optional(),
        outcomes: z.array(OutcomeSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const scorecard = await ctx.prisma.scorecard.update({
        where: { id },
        data,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
        },
      })

      return scorecard
    }),

  // Delete a scorecard
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.scorecard.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Generate scorecard from job description using AI
  generateFromJobDescription: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.jobId },
        include: {
          jobDescription: true,
        },
      })

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        })
      }

      if (!job.jobDescription) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No job description found for this job',
        })
      }

      // Get AI settings
      const aiSettings = await ctx.prisma.aISettings.findFirst()

      if (!aiSettings || !aiSettings.isEnabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI is not enabled',
        })
      }

      // Prepare the prompt for AI
      const prompt = `Based on the following job description, generate a scorecard with a mission statement and 3-5 key outcomes.

Job Title: ${job.title}
Department: ${job.department || 'Not specified'}

Job Description:
${job.jobDescription.overview || ''}
${job.jobDescription.responsibilities || ''}
${job.jobDescription.requirements || ''}

Please provide a JSON response with:
1. mission: A clear, concise mission statement (1-2 sentences) describing what this role needs to accomplish
2. outcomes: An array of 3-5 measurable outcomes, each with:
   - name: A short name for the outcome (e.g., "Revenue Growth", "Team Development")
   - description: A detailed description of the outcome
   - successCriteria: An array of 2-4 specific, measurable success criteria

Format your response as valid JSON matching this structure:
{
  "mission": "string",
  "outcomes": [
    {
      "name": "string",
      "description": "string",
      "successCriteria": ["string", "string"]
    }
  ]
}`

      // Call AI based on provider
      let response: any

      if (aiSettings.provider === 'ANTHROPIC') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default

        if (!aiSettings.anthropicKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Anthropic API key not configured',
          })
        }

        const apiKey = decrypt(aiSettings.anthropicKeyEncrypted)

        const anthropic = new Anthropic({ apiKey })

        const message = await anthropic.messages.create({
          model: aiSettings.anthropicModel,
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        })

        const content = message.content[0]
        if (content.type === 'text') {
          response = JSON.parse(content.text)
        }
      } else if (aiSettings.provider === 'OPENAI') {
        const OpenAI = (await import('openai')).default

        if (!aiSettings.openaiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'OpenAI API key not configured',
          })
        }

        const apiKey = decrypt(aiSettings.openaiKeyEncrypted)

        const openai = new OpenAI({ apiKey })

        const completion = await openai.chat.completions.create({
          model: aiSettings.openaiModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
        })

        response = JSON.parse(completion.choices[0].message.content || '{}')
      } else if (aiSettings.provider === 'GEMINI') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')

        if (!aiSettings.geminiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Gemini API key not configured',
          })
        }

        const apiKey = decrypt(aiSettings.geminiKeyEncrypted)

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: aiSettings.geminiModel })

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        // Extract JSON from response (Gemini might wrap it in markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          response = JSON.parse(jsonMatch[0])
        } else {
          response = JSON.parse(text)
        }
      }

      return {
        mission: response.mission,
        outcomes: response.outcomes,
      }
    }),

  // List all scorecards for selection dropdown
  listForSelection: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.scorecard.findMany({
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }),

  // Get AI-recommended scorecards based on JD similarity
  getRecommendations: protectedProcedure
    .input(z.object({ jobDescriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const jd = await ctx.prisma.jobDescription.findUnique({
        where: { id: input.jobDescriptionId },
      })

      if (!jd) return []

      const scorecards = await ctx.prisma.scorecard.findMany({
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              jobDescription: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      // AI similarity scoring:
      // - Same department: +40 points
      // - Similar title (word matching): +30 points
      // - Return top 5 matches
      const recommendations = scorecards
        .map((scorecard) => {
          let score = 0

          // Department match
          if (scorecard.job.department === jd.department) {
            score += 40
          }

          // Title similarity (word matching)
          if (scorecard.job.title && jd.name) {
            const titleWords = jd.name.toLowerCase().split(' ')
            const scorecardWords = scorecard.job.title.toLowerCase().split(' ')
            const commonWords = titleWords.filter((w) => scorecardWords.includes(w))
            score += Math.min(30, commonWords.length * 10)
          }

          return { scorecard, score }
        })
        .filter((r) => r.score > 20) // Only show relevant matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // Top 5 recommendations
        .map((r) => r.scorecard)

      return recommendations
    }),

  // Generate scorecard directly from JD (without needing a job)
  generateFromJD: protectedProcedure
    .input(z.object({ jobDescriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const jd = await ctx.prisma.jobDescription.findUnique({
        where: { id: input.jobDescriptionId },
      })

      if (!jd) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job description not found',
        })
      }

      // Get AI settings
      const aiSettings = await ctx.prisma.aISettings.findFirst()

      if (!aiSettings || !aiSettings.isEnabled) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI is not enabled',
        })
      }

      // Prepare the prompt for AI
      const prompt = `Based on the following job description, generate a scorecard with a mission statement and 3-5 key outcomes.

Job Title: ${jd.name}
Department: ${jd.department || 'Not specified'}

Job Description:
${jd.overview || ''}
${jd.responsibilities || ''}
${jd.requirements || ''}

Please provide a JSON response with:
1. mission: A clear, concise mission statement (1-2 sentences) describing what this role needs to accomplish
2. outcomes: An array of 3-5 measurable outcomes, each with:
   - name: A short name for the outcome (e.g., "Revenue Growth", "Team Development")
   - description: A detailed description of the outcome
   - successCriteria: An array of 2-4 specific, measurable success criteria

Format your response as valid JSON matching this structure:
{
  "mission": "string",
  "outcomes": [
    {
      "name": "string",
      "description": "string",
      "successCriteria": ["string", "string"]
    }
  ]
}`

      // Call AI based on provider
      let response: any

      if (aiSettings.provider === 'ANTHROPIC') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default

        if (!aiSettings.anthropicKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Anthropic API key not configured',
          })
        }

        const apiKey = decrypt(aiSettings.anthropicKeyEncrypted)

        const anthropic = new Anthropic({ apiKey })

        const message = await anthropic.messages.create({
          model: aiSettings.anthropicModel,
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        })

        const content = message.content[0]
        if (content.type === 'text') {
          response = JSON.parse(content.text)
        }
      } else if (aiSettings.provider === 'OPENAI') {
        const OpenAI = (await import('openai')).default

        if (!aiSettings.openaiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'OpenAI API key not configured',
          })
        }

        const apiKey = decrypt(aiSettings.openaiKeyEncrypted)

        const openai = new OpenAI({ apiKey })

        const completion = await openai.chat.completions.create({
          model: aiSettings.openaiModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
        })

        response = JSON.parse(completion.choices[0].message.content || '{}')
      } else if (aiSettings.provider === 'GEMINI') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')

        if (!aiSettings.geminiKeyEncrypted) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Gemini API key not configured',
          })
        }

        const apiKey = decrypt(aiSettings.geminiKeyEncrypted)

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: aiSettings.geminiModel })

        const result = await model.generateContent(prompt)
        const text = result.response.text()

        // Extract JSON from response (Gemini might wrap it in markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          response = JSON.parse(jsonMatch[0])
        } else {
          response = JSON.parse(text)
        }
      }

      return {
        mission: response.mission,
        outcomes: response.outcomes,
      }
    }),
})
