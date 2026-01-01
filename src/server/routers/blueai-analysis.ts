import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'
import {
  generateCandidateAnalysis,
  generateTabSummary,
  getSentimentHistory,
} from '@/lib/ai/hiring/analysis'
import type { AnalysisType } from '@prisma/client'

const AnalysisTypeEnum = z.enum([
  'APPLICATION_REVIEW',
  'STAGE_SUMMARY',
  'INTERVIEW_ANALYSIS',
  'ASSESSMENT_REVIEW',
  'COMPREHENSIVE',
  'SENTIMENT_CHANGE',
])

const GenerateAnalysisSchema = z.object({
  candidateId: z.string(),
  analysisType: AnalysisTypeEnum,
  triggerStage: z.string().optional(),
  triggerEvent: z.string().optional(),
  interviewId: z.string().optional(),
  assessmentId: z.string().optional(),
})

export const blueAIAnalysisRouter = router({
  // Generate new analysis
  generateAnalysis: protectedProcedure
    .input(GenerateAnalysisSchema)
    .mutation(async ({ input }) => {
      try {
        const analysis = await generateCandidateAnalysis({
          candidateId: input.candidateId,
          analysisType: input.analysisType as AnalysisType,
          triggerStage: input.triggerStage,
          triggerEvent: input.triggerEvent,
          interviewId: input.interviewId,
          assessmentId: input.assessmentId,
        })

        return analysis
      } catch (error) {
        console.error('Analysis generation failed:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate analysis',
        })
      }
    }),

  // Get latest analysis for a candidate
  getLatestAnalysis: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const analysis = await ctx.prisma.candidateAIAnalysis.findFirst({
        where: { candidateId: input.candidateId, isLatest: true },
        orderBy: { version: 'desc' },
      })

      return analysis
    }),

  // List all analysis versions for a candidate
  listVersions: protectedProcedure
    .input(z.object({
      candidateId: z.string(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const analyses = await ctx.prisma.candidateAIAnalysis.findMany({
        where: { candidateId: input.candidateId },
        orderBy: { version: 'desc' },
        take: input.limit,
        select: {
          id: true,
          version: true,
          analysisType: true,
          triggerStage: true,
          triggerEvent: true,
          summary: true,
          overallScore: true,
          sentimentScore: true,
          sentimentChange: true,
          recommendation: true,
          confidence: true,
          isLatest: true,
          createdAt: true,
        },
      })

      return analyses
    }),

  // Get a specific version
  getVersion: protectedProcedure
    .input(z.object({
      candidateId: z.string(),
      version: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const analysis = await ctx.prisma.candidateAIAnalysis.findFirst({
        where: {
          candidateId: input.candidateId,
          version: input.version,
        },
      })

      if (!analysis) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Analysis version not found',
        })
      }

      return analysis
    }),

  // Get analysis by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const analysis = await ctx.prisma.candidateAIAnalysis.findUnique({
        where: { id: input.id },
      })

      if (!analysis) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Analysis not found',
        })
      }

      return analysis
    }),

  // Generate tab summary
  getTabSummary: protectedProcedure
    .input(z.object({
      candidateId: z.string(),
      tab: z.enum(['overview', 'application', 'interviews', 'values']),
    }))
    .query(async ({ input }) => {
      try {
        const summary = await generateTabSummary(input.candidateId, input.tab)
        return { summary }
      } catch (error) {
        console.error('Tab summary generation failed:', error)
        return { summary: 'Unable to generate summary. Please check AI settings.' }
      }
    }),

  // Get sentiment history
  getSentimentHistory: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ input }) => {
      const history = await getSentimentHistory(input.candidateId)
      return history
    }),

  // Compare two versions
  compareVersions: protectedProcedure
    .input(z.object({
      candidateId: z.string(),
      versionA: z.number(),
      versionB: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const [analysisA, analysisB] = await Promise.all([
        ctx.prisma.candidateAIAnalysis.findFirst({
          where: { candidateId: input.candidateId, version: input.versionA },
        }),
        ctx.prisma.candidateAIAnalysis.findFirst({
          where: { candidateId: input.candidateId, version: input.versionB },
        }),
      ])

      if (!analysisA || !analysisB) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or both analysis versions not found',
        })
      }

      // Calculate differences
      const scoreDelta = analysisB.overallScore - analysisA.overallScore
      const sentimentDelta = analysisB.sentimentScore - analysisA.sentimentScore

      // Compare strengths and concerns
      const strengthsA = analysisA.strengths as string[] || []
      const strengthsB = analysisB.strengths as string[] || []
      const concernsA = analysisA.concerns as string[] || []
      const concernsB = analysisB.concerns as string[] || []

      const newStrengths = strengthsB.filter(s => !strengthsA.includes(s))
      const removedStrengths = strengthsA.filter(s => !strengthsB.includes(s))
      const newConcerns = concernsB.filter(c => !concernsA.includes(c))
      const resolvedConcerns = concernsA.filter(c => !concernsB.includes(c))

      return {
        versionA: analysisA,
        versionB: analysisB,
        comparison: {
          scoreDelta,
          sentimentDelta,
          recommendationChanged: analysisA.recommendation !== analysisB.recommendation,
          newStrengths,
          removedStrengths,
          newConcerns,
          resolvedConcerns,
        },
      }
    }),

  // Delete an analysis (admin only)
  deleteAnalysis: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.candidateAIAnalysis.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Regenerate latest analysis
  regenerateLatest: protectedProcedure
    .input(z.object({
      candidateId: z.string(),
      analysisType: AnalysisTypeEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the latest analysis to know what type to regenerate
      const latest = await ctx.prisma.candidateAIAnalysis.findFirst({
        where: { candidateId: input.candidateId, isLatest: true },
        orderBy: { version: 'desc' },
      })

      const analysisType = (input.analysisType || latest?.analysisType || 'COMPREHENSIVE') as AnalysisType

      const analysis = await generateCandidateAnalysis({
        candidateId: input.candidateId,
        analysisType,
        triggerStage: latest?.triggerStage || undefined,
        triggerEvent: 'manual_regeneration',
      })

      return analysis
    }),
})
