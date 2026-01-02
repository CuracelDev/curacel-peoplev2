import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'
import type { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// Question categories for validation
const questionCategoryEnum = z.enum([
  'situational',
  'behavioral',
  'technical',
  'motivational',
  'culture',
])

export const questionRouter = router({
  // List questions with filters
  list: protectedProcedure
    .input(
      z.object({
        category: questionCategoryEnum.optional(),
        jobId: z.string().optional(),
        interviewTypeId: z.string().optional(),
        search: z.string().optional(),
        onlyFavorites: z.boolean().optional(),
        onlyActive: z.boolean().optional().default(true),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = ctx
      const {
        category,
        jobId,
        interviewTypeId,
        search,
        onlyFavorites,
        onlyActive,
        limit,
        offset,
      } = input

      const where: Prisma.InterviewQuestionWhereInput = {}

      if (category) {
        where.category = category
      }

      if (jobId) {
        where.OR = [
          { jobId: jobId },
          { jobId: null }, // Also include global questions
        ]
      }

      if (interviewTypeId) {
        where.OR = [
          { interviewTypeId: interviewTypeId },
          { interviewTypeId: null }, // Also include type-agnostic questions
        ]
      }

      if (search) {
        where.OR = [
          { text: { contains: search, mode: 'insensitive' } },
          { followUp: { contains: search, mode: 'insensitive' } },
          { tags: { hasSome: [search] } },
        ]
      }

      if (onlyFavorites) {
        where.isFavorite = true
      }

      if (onlyActive) {
        where.isActive = true
      }

      const [questions, total] = await Promise.all([
        prisma.interviewQuestion.findMany({
          where,
          include: {
            job: { select: { id: true, title: true } },
            interviewType: { select: { id: true, name: true, slug: true } },
            createdBy: { select: { id: true, fullName: true } },
            _count: { select: { usages: true } },
          },
          orderBy: [
            { isFavorite: 'desc' },
            { timesUsed: 'desc' },
            { createdAt: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.interviewQuestion.count({ where }),
      ])

      return {
        questions: questions.map((q) => ({
          ...q,
          usageCount: q._count.usages,
        })),
        total,
        hasMore: offset + questions.length < total,
      }
    }),

  // Get single question
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.prisma.interviewQuestion.findUnique({
        where: { id: input.id },
        include: {
          job: { select: { id: true, title: true } },
          interviewType: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { id: true, fullName: true } },
          usages: {
            include: {
              interview: {
                select: {
                  id: true,
                  stageName: true,
                  candidate: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      })

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      return question
    }),

  // Create new question
  create: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, 'Question must be at least 10 characters'),
        followUp: z.string().optional(),
        category: questionCategoryEnum,
        tags: z.array(z.string()).optional().default([]),
        jobId: z.string().optional(),
        interviewTypeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx
      if (!session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to create questions.',
        })
      }

      // Get employee ID from user
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { employeeId: true },
      })

      const question = await prisma.interviewQuestion.create({
        data: {
          text: input.text,
          followUp: input.followUp,
          category: input.category,
          tags: input.tags,
          jobId: input.jobId,
          interviewTypeId: input.interviewTypeId,
          createdById: user?.employeeId,
        },
        include: {
          job: { select: { id: true, title: true } },
          interviewType: { select: { id: true, name: true } },
        },
      })

      return question
    }),

  // Update question
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        text: z.string().min(10).optional(),
        followUp: z.string().optional(),
        category: questionCategoryEnum.optional(),
        tags: z.array(z.string()).optional(),
        jobId: z.string().nullable().optional(),
        interviewTypeId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const question = await ctx.prisma.interviewQuestion.update({
        where: { id },
        data,
        include: {
          job: { select: { id: true, title: true } },
          interviewType: { select: { id: true, name: true } },
        },
      })

      return question
    }),

  // Delete question (soft delete by default)
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
        hardDelete: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.hardDelete) {
        await ctx.prisma.interviewQuestion.delete({
          where: { id: input.id },
        })
      } else {
        await ctx.prisma.interviewQuestion.update({
          where: { id: input.id },
          data: { isActive: false },
        })
      }

      return { success: true }
    }),

  // Toggle favorite status
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const question = await ctx.prisma.interviewQuestion.findUnique({
        where: { id: input.id },
        select: { isFavorite: true },
      })

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        })
      }

      const updated = await ctx.prisma.interviewQuestion.update({
        where: { id: input.id },
        data: { isFavorite: !question.isFavorite },
      })

      return updated
    }),

  // Suggest questions based on context
  suggest: protectedProcedure
    .input(
      z.object({
        candidateId: z.string().optional(),
        interviewTypeId: z.string().optional(),
        jobId: z.string().optional(),
        categories: z.array(questionCategoryEnum).optional(),
        count: z.number().min(1).max(20).optional().default(10),
        excludeIds: z.array(z.string()).optional(), // Questions to exclude
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = ctx
      const { candidateId, interviewTypeId, jobId, categories, count, excludeIds } = input

      // Get interview type to determine question categories
      let targetCategories = categories
      if (!targetCategories && interviewTypeId) {
        const interviewType = await prisma.interviewType.findUnique({
          where: { id: interviewTypeId },
          select: { questionCategories: true },
        })
        if (interviewType?.questionCategories?.length) {
          targetCategories = interviewType.questionCategories as typeof categories
        }
      }

      // Build query for relevant questions
      const where: Prisma.InterviewQuestionWhereInput = {
        isActive: true,
      }

      if (excludeIds?.length) {
        where.id = { notIn: excludeIds }
      }

      if (targetCategories?.length) {
        where.category = { in: targetCategories }
      }

      // Prioritize job-specific and type-specific questions
      const [jobSpecific, typeSpecific, globalQuestions] = await Promise.all([
        // Job-specific questions
        jobId
          ? prisma.interviewQuestion.findMany({
              where: { ...where, jobId },
              include: {
                job: { select: { id: true, title: true } },
                interviewType: { select: { id: true, name: true } },
              },
              orderBy: [{ avgRating: 'desc' }, { timesUsed: 'desc' }],
              take: Math.ceil(count / 3),
            })
          : [],

        // Interview type-specific questions
        interviewTypeId
          ? prisma.interviewQuestion.findMany({
              where: { ...where, interviewTypeId, jobId: null },
              include: {
                job: { select: { id: true, title: true } },
                interviewType: { select: { id: true, name: true } },
              },
              orderBy: [{ avgRating: 'desc' }, { timesUsed: 'desc' }],
              take: Math.ceil(count / 3),
            })
          : [],

        // Global questions
        prisma.interviewQuestion.findMany({
          where: { ...where, jobId: null, interviewTypeId: null },
          include: {
            job: { select: { id: true, title: true } },
            interviewType: { select: { id: true, name: true } },
          },
          orderBy: [{ isFavorite: 'desc' }, { avgRating: 'desc' }, { timesUsed: 'desc' }],
          take: count,
        }),
      ])

      // Combine and dedupe
      const allQuestions = [...jobSpecific, ...typeSpecific, ...globalQuestions]
      const seen = new Set<string>()
      const uniqueQuestions = allQuestions.filter((q) => {
        if (seen.has(q.id)) return false
        seen.add(q.id)
        return true
      })

      // Shuffle for variety and take requested count
      const shuffled = uniqueQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, count)

      // Add candidate context if available
      let candidateContext = null
      if (candidateId) {
        const candidate = await prisma.jobCandidate.findUnique({
          where: { id: candidateId },
          select: {
            name: true,
            currentRole: true,
            currentCompany: true,
            skills: true,
            resumeSummary: true,
            mustValidate: true,
          },
        })
        candidateContext = candidate
      }

      return {
        questions: shuffled,
        candidateContext,
        categories: targetCategories,
      }
    }),

  // Get candidate context for AI question generation
  getCandidateContext: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        interviewTypeId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = ctx
      const { candidateId, interviewTypeId } = input

      // Fetch latest AuntyPelz analysis
      const auntyPelzAnalysis = await prisma.candidateAIAnalysis.findFirst({
        where: { candidateId, isLatest: true },
        select: {
          recommendations: true,
          mustValidatePoints: true,
          concerns: true,
          nextStageQuestions: true,
          strengths: true,
        },
      })

      // Fetch candidate with job, red flags, and previous interviews
      const candidate = await prisma.jobCandidate.findUnique({
        where: { id: candidateId },
        select: {
          name: true,
          mustValidate: true,
          redFlags: true,
          suggestedQuestions: true,
          job: {
            select: {
              id: true,
              title: true,
              jobDescription: {
                select: { content: true },
              },
            },
          },
          interviews: {
            include: {
              interviewType: {
                select: { id: true, name: true },
              },
              evaluations: {
                select: {
                  overallNotes: true,
                  recommendation: true,
                  evaluatorName: true,
                },
              },
            },
            where: {
              status: { in: ['COMPLETED', 'EVALUATED'] },
            },
            orderBy: { scheduledAt: 'desc' },
            take: 5,
          },
        },
      })

      if (!candidate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidate not found',
        })
      }

      // Get interview type categories if specified
      let interviewTypeCategories: string[] = []
      if (interviewTypeId) {
        const interviewType = await prisma.interviewType.findUnique({
          where: { id: interviewTypeId },
          select: { questionCategories: true, name: true },
        })
        interviewTypeCategories = interviewType?.questionCategories || []
      }

      // Normalize AuntyPelz data (handle both array and JSON storage)
      const normalizeArray = (data: unknown): string[] => {
        if (!data) return []
        if (Array.isArray(data)) return data as string[]
        return []
      }

      const normalizeConcerns = (data: unknown): Array<{ title: string; description: string; severity?: string }> => {
        if (!data) return []
        if (Array.isArray(data)) return data as Array<{ title: string; description: string; severity?: string }>
        return []
      }

      const normalizeRedFlags = (data: unknown): Array<{ title: string; description: string }> => {
        if (!data) return []
        if (Array.isArray(data)) return data as Array<{ title: string; description: string }>
        return []
      }

      return {
        candidateName: candidate.name,
        auntyPelz: auntyPelzAnalysis ? {
          recommendations: normalizeArray(auntyPelzAnalysis.recommendations),
          mustValidatePoints: normalizeArray(auntyPelzAnalysis.mustValidatePoints),
          concerns: normalizeConcerns(auntyPelzAnalysis.concerns),
          nextStageQuestions: normalizeArray(auntyPelzAnalysis.nextStageQuestions),
          strengths: normalizeArray(auntyPelzAnalysis.strengths),
        } : null,
        candidate: {
          mustValidate: normalizeArray(candidate.mustValidate),
          redFlags: normalizeRedFlags(candidate.redFlags),
          suggestedQuestions: normalizeArray(candidate.suggestedQuestions),
        },
        job: candidate.job ? {
          id: candidate.job.id,
          title: candidate.job.title,
          description: candidate.job.jobDescription?.content || null,
        } : null,
        previousInterviews: candidate.interviews.map(interview => ({
          id: interview.id,
          stageName: interview.stageName || interview.interviewType?.name || 'Interview',
          scheduledAt: interview.scheduledAt,
          feedback: interview.evaluations
            .filter(e => e.overallNotes)
            .map(e => ({
              notes: e.overallNotes || '',
              recommendation: e.recommendation || '',
              evaluator: e.evaluatorName || 'Unknown',
            })),
        })),
        interviewTypeCategories,
      }
    }),

  // Track question usage in an interview
  trackUsage: protectedProcedure
    .input(
      z.object({
        questionId: z.string(),
        interviewId: z.string(),
        wasAsked: z.boolean().optional().default(true),
        rating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx
      if (!session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to track question usage.',
        })
      }

      // Get current user's employee info
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { employeeId: true, name: true },
      })

      // Upsert usage record
      const usage = await prisma.interviewQuestionUsage.upsert({
        where: {
          questionId_interviewId: {
            questionId: input.questionId,
            interviewId: input.interviewId,
          },
        },
        create: {
          questionId: input.questionId,
          interviewId: input.interviewId,
          askedById: user?.employeeId,
          askedByName: user?.name,
          wasAsked: input.wasAsked,
          rating: input.rating,
          notes: input.notes,
        },
        update: {
          wasAsked: input.wasAsked,
          rating: input.rating,
          notes: input.notes,
        },
      })

      // Update question usage count and average rating
      const stats = await prisma.interviewQuestionUsage.aggregate({
        where: { questionId: input.questionId, wasAsked: true },
        _count: true,
        _avg: { rating: true },
      })

      await prisma.interviewQuestion.update({
        where: { id: input.questionId },
        data: {
          timesUsed: stats._count,
          avgRating: stats._avg.rating,
        },
      })

      return usage
    }),

  // Get questions used in an interview
  getInterviewQuestions: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      const usages = await ctx.prisma.interviewQuestionUsage.findMany({
        where: { interviewId: input.interviewId },
        include: {
          question: {
            include: {
              job: { select: { id: true, title: true } },
              interviewType: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      return usages
    }),

  // Get question categories (for filters)
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const counts = await ctx.prisma.interviewQuestion.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: true,
    })

    const categories = [
      { value: 'situational', label: 'Situational', description: 'How would you handle...' },
      { value: 'behavioral', label: 'Behavioral', description: 'Tell me about a time...' },
      { value: 'technical', label: 'Technical', description: 'Technical skills and knowledge' },
      { value: 'motivational', label: 'Motivational', description: 'What drives you...' },
      { value: 'culture', label: 'Culture Fit', description: 'Values and work style' },
    ]

    return categories.map((cat) => ({
      ...cat,
      count: counts.find((c) => c.category === cat.value)?._count ?? 0,
    }))
  }),

  // Bulk create questions (for importing/seeding)
  bulkCreate: adminProcedure
    .input(
      z.object({
        questions: z.array(
          z.object({
            text: z.string().min(10),
            followUp: z.string().optional(),
            category: questionCategoryEnum,
            tags: z.array(z.string()).optional().default([]),
            jobId: z.string().optional(),
            interviewTypeId: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx
      if (!session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to create questions.',
        })
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { employeeId: true },
      })

      const created = await prisma.interviewQuestion.createMany({
        data: input.questions.map((q) => ({
          ...q,
          createdById: user?.employeeId,
        })),
      })

      return { count: created.count }
    }),

  // AI-powered question generation with context source selection
  generateAIQuestions: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        interviewTypeId: z.string().optional(),
        jobId: z.string().optional(),
        categories: z.array(questionCategoryEnum).optional(),
        count: z.number().min(1).max(20).optional().default(10),
        focusAreas: z.array(z.string()).optional(),
        // Context source selection
        contextSources: z.object({
          includeAuntyPelzRecommendations: z.boolean().default(true),
          includeAuntyPelzMustValidate: z.boolean().default(true),
          includeAuntyPelzConcerns: z.boolean().default(true),
          includePreviousInterviews: z.array(z.string()).optional(), // interview IDs to include
          includeJobRequirements: z.boolean().default(true),
          includeRedFlags: z.boolean().default(true),
        }).optional(),
        // Custom prompt for additional context
        customPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx
      const { candidateId, interviewTypeId, jobId, categories, count, focusAreas, contextSources, customPrompt } = input

      // Get AI settings
      const aiSettings = await prisma.aISettings.findFirst({
        orderBy: { updatedAt: 'desc' },
      })

      // Get the API key based on provider
      const getApiKey = () => {
        if (!aiSettings) return null
        switch (aiSettings.provider) {
          case 'ANTHROPIC': return aiSettings.anthropicKeyEncrypted
          case 'OPENAI': return aiSettings.openaiKeyEncrypted
          case 'GEMINI': return aiSettings.geminiKeyEncrypted
          default: return null
        }
      }

      // Get the model based on provider
      const getModel = () => {
        if (!aiSettings) return null
        switch (aiSettings.provider) {
          case 'ANTHROPIC': return aiSettings.anthropicModel
          case 'OPENAI': return aiSettings.openaiModel
          case 'GEMINI': return aiSettings.geminiModel
          default: return null
        }
      }

      const encryptedApiKey = getApiKey()
      const aiModel = getModel()

      if (!encryptedApiKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI settings not configured. Please configure in Settings → AI Configuration.',
        })
      }

      // Get candidate data with extended context
      const candidate = await prisma.jobCandidate.findUnique({
        where: { id: candidateId },
        include: {
          job: {
            include: {
              jobDescription: true,
            },
          },
          interviews: {
            include: {
              evaluations: {
                select: {
                  overallNotes: true,
                  recommendation: true,
                  evaluatorName: true,
                },
              },
              interviewType: {
                select: { name: true },
              },
            },
            where: {
              status: { in: ['COMPLETED', 'EVALUATED'] },
            },
            orderBy: { scheduledAt: 'desc' },
            take: 5,
          },
        },
      })

      if (!candidate) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Candidate not found',
        })
      }

      // Get AuntyPelz analysis if context sources include it
      let auntyPelzAnalysis: {
        recommendations: unknown
        mustValidatePoints: unknown
        concerns: unknown
        strengths: unknown
      } | null = null

      if (contextSources?.includeAuntyPelzRecommendations ||
          contextSources?.includeAuntyPelzMustValidate ||
          contextSources?.includeAuntyPelzConcerns) {
        auntyPelzAnalysis = await prisma.candidateAIAnalysis.findFirst({
          where: { candidateId, isLatest: true },
          select: {
            recommendations: true,
            mustValidatePoints: true,
            concerns: true,
            strengths: true,
          },
        })
      }

      // Helper to normalize JSON arrays
      const normalizeArray = (data: unknown): string[] => {
        if (!data) return []
        if (Array.isArray(data)) return data.map(String)
        return []
      }

      const normalizeConcerns = (data: unknown): Array<{ title: string; description: string; severity?: string }> => {
        if (!data) return []
        if (Array.isArray(data)) return data as Array<{ title: string; description: string; severity?: string }>
        return []
      }

      // Get interview type info
      let targetCategories = categories
      let interviewTypeName = 'General Interview'

      if (interviewTypeId) {
        const interviewType = await prisma.interviewType.findUnique({
          where: { id: interviewTypeId },
        })
        if (interviewType) {
          interviewTypeName = interviewType.name
          if (!targetCategories && interviewType.questionCategories?.length) {
            targetCategories = interviewType.questionCategories as typeof categories
          }
        }
      }

      // Get job info if not from candidate
      let jobTitle = candidate.job?.title || 'Unknown Position'
      let jobDescription = candidate.job?.jobDescription?.content || ''

      if (jobId && !candidate.job) {
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: {
            title: true,
            jobDescription: { select: { content: true } },
          },
        })
        if (job) {
          jobTitle = job.title
          jobDescription = job.jobDescription?.content || ''
        }
      }

      // Build context sections based on selected sources
      const contextSections: string[] = []

      // AuntyPelz Recommendations
      if (contextSources?.includeAuntyPelzRecommendations && auntyPelzAnalysis?.recommendations) {
        const recommendations = normalizeArray(auntyPelzAnalysis.recommendations)
        if (recommendations.length > 0) {
          contextSections.push(`## AuntyPelz Recommendations\n${recommendations.map(r => `- ${r}`).join('\n')}`)
        }
      }

      // AuntyPelz Must-Validate Points (CRITICAL)
      const mustValidatePoints: string[] = []
      if (contextSources?.includeAuntyPelzMustValidate) {
        if (auntyPelzAnalysis?.mustValidatePoints) {
          mustValidatePoints.push(...normalizeArray(auntyPelzAnalysis.mustValidatePoints))
        }
        if (candidate.mustValidate) {
          mustValidatePoints.push(...normalizeArray(candidate.mustValidate))
        }
      }
      if (mustValidatePoints.length > 0) {
        contextSections.push(`## ⚠️ CRITICAL: Points to Validate\nThese are high-priority areas that MUST be explored:\n${mustValidatePoints.map(p => `- ${p}`).join('\n')}`)
      }

      // AuntyPelz Concerns (CRITICAL)
      if (contextSources?.includeAuntyPelzConcerns && auntyPelzAnalysis?.concerns) {
        const concerns = normalizeConcerns(auntyPelzAnalysis.concerns)
        if (concerns.length > 0) {
          contextSections.push(`## ⚠️ CRITICAL: Concerns from Analysis\n${concerns.map(c => `- ${c.title}: ${c.description}${c.severity ? ` (${c.severity})` : ''}`).join('\n')}`)
        }
      }

      // Red Flags (CRITICAL)
      if (contextSources?.includeRedFlags && candidate.redFlags) {
        const redFlags = normalizeArray(candidate.redFlags).length > 0
          ? normalizeArray(candidate.redFlags)
          : (Array.isArray(candidate.redFlags) ? candidate.redFlags as Array<{ title: string; description: string }> : [])

        if (Array.isArray(redFlags) && redFlags.length > 0) {
          const flagText = typeof redFlags[0] === 'string'
            ? (redFlags as string[]).map(f => `- 🚩 ${f}`).join('\n')
            : (redFlags as Array<{ title: string; description: string }>).map(f => `- 🚩 ${f.title}: ${f.description}`).join('\n')
          contextSections.push(`## 🚩 CRITICAL: Red Flags Identified\nQuestions MUST address these concerns:\n${flagText}`)
        }
      }

      // Previous Interview Feedback
      if (contextSources?.includePreviousInterviews?.length && candidate.interviews?.length) {
        const relevantInterviews = candidate.interviews.filter(
          i => contextSources.includePreviousInterviews?.includes(i.id)
        )
        if (relevantInterviews.length > 0) {
          const interviewInsights = relevantInterviews.map(interview => {
            const feedback = interview.evaluations
              .filter(e => e.overallNotes)
              .map(e => `  - ${e.evaluatorName || 'Evaluator'}: ${e.overallNotes}${e.recommendation ? ` (${e.recommendation})` : ''}`)
              .join('\n')
            return `### ${interview.interviewType?.name || interview.stageName || 'Interview'}\n${feedback || '  No feedback recorded'}`
          }).join('\n\n')
          contextSections.push(`## Previous Interview Feedback\n${interviewInsights}`)
        }
      } else if (candidate.interviews?.length && !contextSources?.includePreviousInterviews) {
        // Include all interviews if no specific selection
        const interviewInsights = candidate.interviews.slice(0, 3).map(interview => {
          const feedback = interview.evaluations
            .filter(e => e.overallNotes)
            .map(e => e.overallNotes)
            .join('; ')
          return feedback
        }).filter(Boolean).join('\n')
        if (interviewInsights) {
          contextSections.push(`## Previous Interview Insights\n${interviewInsights.slice(0, 500)}`)
        }
      }

      // Job Requirements
      if (contextSources?.includeJobRequirements && jobDescription) {
        if (jobDescription) {
          contextSections.push(`## Job Requirements\n${jobDescription.slice(0, 800)}`)
        }
      }

      // Custom Prompt from user
      if (customPrompt?.trim()) {
        contextSections.push(`## Additional Instructions from Hiring Team\n${customPrompt}`)
      }

      // Determine if we have critical areas to address
      const hasCriticalAreas = mustValidatePoints.length > 0 ||
        (contextSources?.includeAuntyPelzConcerns && auntyPelzAnalysis?.concerns) ||
        (contextSources?.includeRedFlags && candidate.redFlags)

      // Build AI prompt
      const prompt = `You are an expert interviewer at Curacel, an insurtech company. Generate ${count} insightful interview questions for a candidate.

## Company Values (PRESS)
- Passionate Work: Deep love for what we do
- Relentless Growth: Continuous improvement mindset
- Empowered Action: Taking ownership and initiative
- Sense of Urgency: Moving fast and decisively
- Seeing Possibilities: Innovation and creative problem-solving

## Candidate Profile
- Name: ${candidate.name}
- Current Role: ${candidate.currentRole || 'Not specified'}
- Current Company: ${candidate.currentCompany || 'Not specified'}
- Years of Experience: ${candidate.yearsOfExperience || 'Not specified'}
- Location: ${candidate.location || 'Not specified'}
- Skills: ${Array.isArray(candidate.skills) ? (candidate.skills as string[]).join(', ') : 'Not specified'}
${candidate.bio ? `- Bio: ${candidate.bio}` : ''}
${candidate.resumeSummary ? `- Resume Summary: ${candidate.resumeSummary.slice(0, 500)}...` : ''}

## Position
- Title: ${jobTitle}
${jobDescription && contextSources?.includeJobRequirements ? `- Description: ${jobDescription.slice(0, 500)}...` : ''}

## Interview Type
${interviewTypeName}

## Question Categories to Focus On
${targetCategories?.join(', ') || 'behavioral, situational, technical, motivational, culture'}

${focusAreas?.length ? `## Specific Focus Areas\n${focusAreas.join(', ')}` : ''}

${contextSections.join('\n\n')}

## Response Format (JSON array)
Return ONLY a valid JSON array of questions. Each question must have:
{
  "text": "The main question (be specific and probing)",
  "followUp": "A follow-up question to dig deeper",
  "category": "situational|behavioral|technical|motivational|culture",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "reasoning": "Why this question is relevant for this candidate (2-3 sentences)",
  "addressesCritical": true/false // Set to true if this question addresses a must-validate point, concern, or red flag
}

Generate questions that:
1. Are tailored to this specific candidate's background
2. ${hasCriticalAreas ? 'PRIORITIZE questions that address the CRITICAL areas marked with ⚠️ or 🚩' : 'Probe areas that need validation'}
3. Assess cultural fit with PRESS values
4. Uncover both strengths and potential concerns
5. Allow the candidate to demonstrate relevant experience
${hasCriticalAreas ? '6. At least 30% of questions MUST address the critical areas (must-validate points, concerns, or red flags)' : ''}

Respond ONLY with a valid JSON array, no additional text.`

      // Helper to clean AI response (strip markdown code blocks if present)
      const cleanJsonResponse = (text: string): string => {
        let cleaned = text.trim()
        // Remove markdown code block markers
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.slice(7)
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.slice(3)
        }
        if (cleaned.endsWith('```')) {
          cleaned = cleaned.slice(0, -3)
        }
        return cleaned.trim()
      }

      // Helper to check if an object looks like a question
      const isQuestionObject = (obj: unknown): boolean => {
        if (!obj || typeof obj !== 'object') return false
        const q = obj as Record<string, unknown>
        return typeof q.text === 'string' && typeof q.category === 'string'
      }

      // Helper to parse AI response with better error handling
      const parseAIResponse = (text: string): unknown[] => {
        const cleaned = cleanJsonResponse(text)
        console.log('Parsing AI response, length:', cleaned.length)
        console.log('First 500 chars:', cleaned.slice(0, 500))

        try {
          const parsed = JSON.parse(cleaned)
          console.log('Parsed JSON type:', Array.isArray(parsed) ? 'array' : typeof parsed)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            console.log('Object keys:', Object.keys(parsed))
          }

          // Handle direct array response (array of questions)
          if (Array.isArray(parsed)) {
            // Verify it's an array of question objects
            if (parsed.length > 0 && isQuestionObject(parsed[0])) {
              console.log('Found direct array of questions with', parsed.length, 'items')
              return parsed
            }
          }

          // Handle wrapped response like { questions: [...] } or { data: [...] } etc
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            // FIRST: Check if this IS a single question object
            if (isQuestionObject(parsed)) {
              console.log('Found single question object, wrapping in array')
              return [parsed]
            }

            // Then look for arrays that contain question objects
            for (const key of ['questions', 'data', 'items', 'results', 'interview_questions']) {
              if (Array.isArray(parsed[key]) && parsed[key].length > 0 && isQuestionObject(parsed[key][0])) {
                console.log(`Found array of questions in '${key}' with`, parsed[key].length, 'items')
                return parsed[key]
              }
            }

            // Check other array properties for question objects
            for (const key of Object.keys(parsed)) {
              if (Array.isArray(parsed[key]) && parsed[key].length > 0 && isQuestionObject(parsed[key][0])) {
                console.log(`Found array of questions in '${key}' with`, parsed[key].length, 'items')
                return parsed[key]
              }
            }
          }

          console.error('AI response format unexpected:', Object.keys(parsed || {}))
          return []
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError)
          console.error('Raw response:', cleaned.slice(0, 1000))
          return []
        }
      }

      // Call AI
      let generatedQuestions: Array<{
        text: string
        followUp: string
        category: string
        tags: string[]
        reasoning: string
        addressesCritical?: boolean
      }> = []

      try {
        console.log('Starting AI question generation...')
        console.log('AI Provider:', aiSettings!.provider)
        console.log('AI Model:', aiModel)

        const { decrypt } = await import('@/lib/encryption')
        let apiKey: string
        try {
          apiKey = decrypt(encryptedApiKey)
          console.log('API key decrypted successfully, length:', apiKey.length)
        } catch (decryptError) {
          console.error('Decryption failed:', decryptError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to decrypt API key. Please re-save your AI settings.',
          })
        }

        switch (aiSettings!.provider) {
          case 'ANTHROPIC': {
            console.log('Initializing Anthropic client...')
            const { default: Anthropic } = await import('@anthropic-ai/sdk')
            const client = new Anthropic({ apiKey })

            console.log('Calling Anthropic API with model:', aiModel || 'claude-sonnet-4-20250514')
            const response = await client.messages.create({
              model: aiModel || 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              messages: [{ role: 'user', content: prompt }],
            })
            console.log('Anthropic response received')

            const textContent = response.content.find(c => c.type === 'text')
            if (!textContent || textContent.type !== 'text') {
              throw new Error('No text response from Anthropic')
            }

            generatedQuestions = parseAIResponse(textContent.text) as typeof generatedQuestions
            break
          }

          case 'OPENAI': {
            console.log('Initializing OpenAI client...')
            const { default: OpenAI } = await import('openai')
            const client = new OpenAI({ apiKey })

            const model = aiModel || 'gpt-4o'
            console.log('Calling OpenAI API with model:', model)

            // Many newer models (o1, o3, gpt-5.x, etc.) don't support system messages or temperature
            // Only standard GPT-4/GPT-3.5 models reliably support these parameters
            const isStandardModel = model.startsWith('gpt-4') || model.startsWith('gpt-3')
            const isReasoningModel = !isStandardModel

            const systemMessage = `You are an expert interviewer. Always respond with a valid JSON array of question objects. Never wrap the array in another object. Return exactly the number of questions requested.`

            const messages = isReasoningModel
              ? [{ role: 'user' as const, content: `${systemMessage}\n\n${prompt}` }]
              : [
                  { role: 'system' as const, content: systemMessage },
                  { role: 'user' as const, content: prompt }
                ]

            const response = await client.chat.completions.create({
              model,
              messages,
              ...(!isReasoningModel ? { temperature: 0.7 } : {}),
            })

            const content = response.choices[0]?.message?.content
            console.log('OpenAI response received, length:', content?.length)
            if (!content) {
              throw new Error('No response from OpenAI')
            }

            generatedQuestions = parseAIResponse(content) as typeof generatedQuestions
            console.log('Parsed', generatedQuestions.length, 'questions from OpenAI')
            break
          }

          case 'GEMINI': {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${aiModel || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`,
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
            const genContent = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!genContent) {
              throw new Error('No response from Gemini')
            }

            generatedQuestions = parseAIResponse(genContent) as typeof generatedQuestions
            break
          }

          default:
            throw new Error(`Unsupported AI provider: ${aiSettings!.provider}`)
        }
      } catch (error) {
        console.error('AI question generation failed:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate questions',
        })
      }

      // Check if we got valid questions
      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI returned no questions. Please try again or adjust the context.',
        })
      }

      return {
        questions: generatedQuestions.map((q, idx) => ({
          id: `ai-${Date.now()}-${idx}`,
          ...q,
          isAIGenerated: true,
          candidateId,
          interviewTypeId,
        })),
        candidateName: candidate.name,
        interviewType: interviewTypeName,
        generatedAt: new Date().toISOString(),
      }
    }),

  // Save AI-generated questions to the question bank
  saveAIQuestions: protectedProcedure
    .input(
      z.object({
        questions: z.array(
          z.object({
            text: z.string().min(10),
            followUp: z.string().optional(),
            category: questionCategoryEnum,
            tags: z.array(z.string()).optional().default([]),
          })
        ),
        jobId: z.string().optional(),
        interviewTypeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, session } = ctx

      const sessionUserId = session?.user?.id
      const user = sessionUserId
        ? await prisma.user.findUnique({
            where: { id: sessionUserId },
            select: { employeeId: true },
          })
        : null

      const created = await prisma.interviewQuestion.createMany({
        data: input.questions.map((q) => ({
          ...q,
          jobId: input.jobId,
          interviewTypeId: input.interviewTypeId,
          createdById: user?.employeeId,
        })),
      })

      return { count: created.count, message: `${created.count} questions saved to bank` }
    }),

  // Seed default questions
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const { prisma, session } = ctx

    const user = session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { employeeId: true },
        })
      : null

    const defaultQuestions = [
      // Behavioral
      {
        text: 'Tell me about a time when you had to deal with a difficult team member. How did you handle it?',
        followUp: 'What did you learn from that experience?',
        category: 'behavioral',
        tags: ['Teamwork', 'Conflict Resolution', 'Communication'],
      },
      {
        text: 'Describe a situation where you had to meet a tight deadline. How did you prioritize your work?',
        followUp: 'Would you do anything differently now?',
        category: 'behavioral',
        tags: ['Time Management', 'Prioritization', 'Pressure'],
      },
      {
        text: 'Give me an example of a project that failed. What was your role and what did you learn?',
        followUp: 'How have you applied those lessons since?',
        category: 'behavioral',
        tags: ['Failure', 'Learning', 'Self-Awareness'],
      },
      {
        text: 'Tell me about a time you went above and beyond for a customer or colleague.',
        followUp: 'What motivated you to do so?',
        category: 'behavioral',
        tags: ['Customer Focus', 'Initiative', 'Service'],
      },

      // Situational
      {
        text: 'If you disagreed with your manager about a key decision, how would you handle it?',
        followUp: 'What if they still disagreed after you presented your case?',
        category: 'situational',
        tags: ['Conflict', 'Communication', 'Professionalism'],
      },
      {
        text: 'Imagine you have multiple urgent tasks due at the same time. How would you decide what to work on first?',
        followUp: 'How would you communicate this to stakeholders?',
        category: 'situational',
        tags: ['Prioritization', 'Decision Making', 'Communication'],
      },
      {
        text: 'What would you do if you noticed a colleague was struggling but hadn\'t asked for help?',
        followUp: 'How would you approach them?',
        category: 'situational',
        tags: ['Teamwork', 'Empathy', 'Leadership'],
      },

      // Technical
      {
        text: 'Walk me through your approach to debugging a complex issue in production.',
        followUp: 'How do you prevent similar issues in the future?',
        category: 'technical',
        tags: ['Problem Solving', 'Debugging', 'Process'],
      },
      {
        text: 'How do you stay current with industry trends and new technologies?',
        followUp: 'Give an example of how you applied something new you learned.',
        category: 'technical',
        tags: ['Learning', 'Growth', 'Technology'],
      },
      {
        text: 'Describe your experience with code reviews. What do you look for when reviewing code?',
        followUp: 'How do you handle disagreements in code reviews?',
        category: 'technical',
        tags: ['Code Quality', 'Collaboration', 'Best Practices'],
      },

      // Motivational
      {
        text: 'What motivates you to do your best work?',
        followUp: 'How does this role align with that motivation?',
        category: 'motivational',
        tags: ['Motivation', 'Self-Awareness', 'Fit'],
      },
      {
        text: 'Where do you see yourself in 5 years?',
        followUp: 'How does this position help you get there?',
        category: 'motivational',
        tags: ['Career Goals', 'Growth', 'Ambition'],
      },
      {
        text: 'What attracted you to this role and our company?',
        followUp: 'What would make you stay long-term?',
        category: 'motivational',
        tags: ['Interest', 'Research', 'Commitment'],
      },

      // Culture
      {
        text: 'Describe your ideal work environment.',
        followUp: 'How do you adapt when the environment isn\'t ideal?',
        category: 'culture',
        tags: ['Work Style', 'Adaptability', 'Preferences'],
      },
      {
        text: 'How do you prefer to receive feedback?',
        followUp: 'Give an example of feedback that helped you grow.',
        category: 'culture',
        tags: ['Feedback', 'Growth', 'Communication'],
      },
      {
        text: 'What does work-life balance mean to you?',
        followUp: 'How do you maintain it during busy periods?',
        category: 'culture',
        tags: ['Balance', 'Self-Care', 'Boundaries'],
      },
      {
        text: 'How do you handle working with people who have different working styles than you?',
        followUp: 'Can you give a specific example?',
        category: 'culture',
        tags: ['Diversity', 'Collaboration', 'Flexibility'],
      },
    ]

    // Check if we already have default questions
    const existingCount = await prisma.interviewQuestion.count({
      where: { jobId: null, interviewTypeId: null },
    })

    if (existingCount > 0) {
      return { message: 'Default questions already exist', count: existingCount }
    }

    const created = await prisma.interviewQuestion.createMany({
      data: defaultQuestions.map((q) => ({
        ...q,
        createdById: user?.employeeId,
      })),
    })

    return { message: 'Default questions seeded successfully', count: created.count }
  }),

  // AI-powered question generation for question bank (no candidate required)
  generateBankQuestions: protectedProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        interviewTypeId: z.string().optional(),
        categories: z.array(questionCategoryEnum).optional(),
        count: z.number().min(1).max(20).optional().default(10),
        customPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx
      const { jobId, interviewTypeId, categories, count, customPrompt } = input

      // Get AI settings
      const aiSettings = await prisma.aISettings.findFirst({
        orderBy: { updatedAt: 'desc' },
      })

      // Get the API key based on provider
      const getApiKey = () => {
        if (!aiSettings) return null
        switch (aiSettings.provider) {
          case 'ANTHROPIC': return aiSettings.anthropicKeyEncrypted
          case 'OPENAI': return aiSettings.openaiKeyEncrypted
          case 'GEMINI': return aiSettings.geminiKeyEncrypted
          default: return null
        }
      }

      // Get the model based on provider
      const getModel = () => {
        if (!aiSettings) return null
        switch (aiSettings.provider) {
          case 'ANTHROPIC': return aiSettings.anthropicModel
          case 'OPENAI': return aiSettings.openaiModel
          case 'GEMINI': return aiSettings.geminiModel
          default: return null
        }
      }

      const encryptedApiKey = getApiKey()
      const aiModel = getModel()

      if (!encryptedApiKey) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI settings not configured. Please configure in Settings → AI Configuration.',
        })
      }

      // Get job info if provided
      let jobTitle = 'General Position'
      let jobDescription = ''

      if (jobId) {
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          include: { jobDescription: { select: { content: true } } },
        })
        if (job) {
          jobTitle = job.title
          jobDescription = job.jobDescription?.content || ''
        }
      }

      // Get interview type info
      let targetCategories = categories
      let interviewTypeName = 'General Interview'

      if (interviewTypeId) {
        const interviewType = await prisma.interviewType.findUnique({
          where: { id: interviewTypeId },
        })
        if (interviewType) {
          interviewTypeName = interviewType.name
          if (!targetCategories && interviewType.questionCategories?.length) {
            targetCategories = interviewType.questionCategories as typeof categories
          }
        }
      }

      // Build AI prompt
      const prompt = `You are an expert interviewer at Curacel, an insurtech company. Generate ${count} high-quality interview questions for the company's question bank.

## Company Values (PRESS)
- Passionate Work: Deep love for what we do
- Relentless Growth: Continuous improvement mindset
- Empowered Action: Taking ownership and initiative
- Sense of Urgency: Moving fast and decisively
- Seeing Possibilities: Innovation and creative problem-solving

${jobId ? `## Position: ${jobTitle}${jobDescription ? `\n${jobDescription.slice(0, 600)}` : ''}` : '## General Interview Questions'}

## Interview Type
${interviewTypeName}

## Question Categories to Generate
${targetCategories?.join(', ') || 'behavioral, situational, technical, motivational, culture'}

${customPrompt?.trim() ? `## Additional Instructions\n${customPrompt}` : ''}

## Response Format (JSON array)
Return ONLY a valid JSON array of questions. Each question must have:
{
  "text": "The main question (be specific and probing)",
  "followUp": "A follow-up question to dig deeper",
  "category": "situational|behavioral|technical|motivational|culture",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "reasoning": "Why this is a good interview question (1-2 sentences)"
}

Generate questions that:
1. Are insightful and thought-provoking
2. Can reveal candidate capabilities and fit
3. Assess cultural fit with PRESS values
4. Cover different aspects of the role${jobId ? ' and job requirements' : ''}
5. Include appropriate follow-up questions to dig deeper

Respond ONLY with a valid JSON array, no additional text.`

      // Helper to clean AI response
      const cleanJsonResponse = (text: string): string => {
        let cleaned = text.trim()
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.slice(7)
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.slice(3)
        }
        if (cleaned.endsWith('```')) {
          cleaned = cleaned.slice(0, -3)
        }
        return cleaned.trim()
      }

      // Helper to parse AI response
      const parseAIResponse = (text: string): unknown[] => {
        const cleaned = cleanJsonResponse(text)
        try {
          const parsed = JSON.parse(cleaned)
          if (Array.isArray(parsed)) return parsed
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
            return parsed.questions
          }
          if (parsed && typeof parsed === 'object' && 'text' in parsed && 'category' in parsed) {
            return [parsed]
          }
          return []
        } catch {
          console.error('Failed to parse AI response:', text.slice(0, 200))
          return []
        }
      }

      // Decrypt API key
      const { decrypt } = await import('@/lib/encryption')
      const apiKey = decrypt(encryptedApiKey)

      // Call AI based on provider
      let responseText = ''

      if (aiSettings?.provider === 'ANTHROPIC') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey })
        const response = await anthropic.messages.create({
          model: aiModel || 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        })
        responseText = response.content[0].type === 'text' ? response.content[0].text : ''
      } else if (aiSettings?.provider === 'OPENAI') {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey })
        const response = await openai.chat.completions.create({
          model: aiModel || 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 4000,
        })
        responseText = response.choices[0]?.message?.content || ''
      } else if (aiSettings?.provider === 'GEMINI') {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: aiModel || 'gemini-pro' })
        const result = await model.generateContent(prompt)
        responseText = result.response.text()
      }

      if (!responseText) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI did not return a response',
        })
      }

      const parsedQuestions = parseAIResponse(responseText)

      if (!parsedQuestions.length) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI returned no valid questions. Please try again.',
        })
      }

      // Process and return questions
      const questions = parsedQuestions.map((q: unknown, idx: number) => {
        const question = q as {
          text?: string
          followUp?: string
          category?: string
          tags?: string[]
          reasoning?: string
        }
        return {
          id: `bank-gen-${Date.now()}-${idx}`,
          text: question.text || '',
          followUp: question.followUp || '',
          category: question.category || 'behavioral',
          tags: question.tags || [],
          reasoning: question.reasoning || '',
        }
      })

      return {
        questions,
        jobTitle,
        interviewTypeName,
      }
    }),
})
