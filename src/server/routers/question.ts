import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'
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

      const where: Parameters<typeof prisma.interviewQuestion.findMany>[0]['where'] = {}

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
      const where: Parameters<typeof prisma.interviewQuestion.findMany>[0]['where'] = {
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

  // Seed default questions
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const { prisma, session } = ctx

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employeeId: true },
    })

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
})
