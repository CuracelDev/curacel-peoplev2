import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc'

export const assessmentAnalyticsRouter = router({
  // Get overall assessment metrics
  getOverviewMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        jobId: z.string().optional(),
        type: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, any> = {}

      if (input?.startDate || input?.endDate) {
        where.createdAt = {}
        if (input?.startDate) {
          (where.createdAt as Record<string, Date>).gte = input.startDate
        }
        if (input?.endDate) {
          (where.createdAt as Record<string, Date>).lte = input.endDate
        }
      }

      if (input?.jobId) {
        where.candidate = { jobId: input.jobId }
      }

      if (input?.type) {
        if (input.type === 'KANDI_IO') {
          where.template = { externalPlatform: 'kandi' }
        } else if (['COMPETENCY_TEST', 'CODING_TEST', 'PERSONALITY_TEST', 'WORK_TRIAL', 'CUSTOM'].includes(input.type)) {
          where.template = { type: input.type }
        }
      }

      // Get total counts
      const [
        totalAssessments,
        completedAssessments,
        pendingAssessments,
        expiredAssessments,
      ] = await Promise.all([
        ctx.prisma.candidateAssessment.count({ where }),
        ctx.prisma.candidateAssessment.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        ctx.prisma.candidateAssessment.count({
          where: {
            ...where,
            status: { in: ['NOT_STARTED', 'INVITED', 'IN_PROGRESS'] },
          },
        }),
        ctx.prisma.candidateAssessment.count({
          where: { ...where, status: 'EXPIRED' },
        }),
      ])

      // Calculate completion rate
      const completionRate = totalAssessments > 0
        ? Math.round((completedAssessments / totalAssessments) * 100)
        : 0

      // Get average score
      const completedWithScores = await ctx.prisma.candidateAssessment.findMany({
        where: { ...where, status: 'COMPLETED', overallScore: { not: null } },
        select: { overallScore: true },
      })

      const avgScore = completedWithScores.length > 0
        ? Math.round(
          completedWithScores.reduce((sum, a) => sum + (a.overallScore || 0), 0) /
          completedWithScores.length
        )
        : 0

      // Get average completion time
      const completedWithTime = await ctx.prisma.candidateAssessment.findMany({
        where: { ...where, status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
      })

      let avgCompletionMinutes = 0
      if (completedWithTime.length > 0) {
        const totalMinutes = completedWithTime.reduce((sum, a) => {
          if (a.startedAt && a.completedAt) {
            return sum + (a.completedAt.getTime() - a.startedAt.getTime()) / 60000
          }
          return sum
        }, 0)
        avgCompletionMinutes = Math.round(totalMinutes / completedWithTime.length)
      }

      // Get recommendation distribution
      const recommendations = await ctx.prisma.candidateAssessment.groupBy({
        by: ['recommendation'],
        where: { ...where, recommendation: { not: null } },
        _count: true,
      })

      const recommendationDistribution = recommendations.reduce(
        (acc, r) => {
          if (r.recommendation) {
            acc[r.recommendation] = r._count
          }
          return acc
        },
        {} as Record<string, number>
      )

      return {
        totalAssessments,
        completedAssessments,
        pendingAssessments,
        expiredAssessments,
        completionRate,
        avgScore,
        avgCompletionMinutes,
        recommendationDistribution,
      }
    }),

  // Get assessment completion funnel
  getCompletionFunnel: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        type: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {}

      if (input?.startDate || input?.endDate) {
        where.createdAt = {}
        if (input?.startDate) {
          (where.createdAt as Record<string, Date>).gte = input.startDate
        }
        if (input?.endDate) {
          (where.createdAt as Record<string, Date>).lte = input.endDate
        }
      }

      if (input?.type) {
        if (input.type === 'KANDI_IO') {
          where.template = { externalPlatform: 'kandi' }
        } else if (['COMPETENCY_TEST', 'CODING_TEST', 'PERSONALITY_TEST', 'WORK_TRIAL', 'CUSTOM'].includes(input.type)) {
          where.template = { type: input.type }
        }
      }

      const statusCounts = await ctx.prisma.candidateAssessment.groupBy({
        by: ['status'],
        where,
        _count: true,
      })

      const funnel = {
        created: 0,
        invited: 0,
        started: 0,
        completed: 0,
        expired: 0,
      }

      for (const s of statusCounts) {
        switch (s.status) {
          case 'NOT_STARTED':
            funnel.created += s._count
            break
          case 'INVITED':
            funnel.invited += s._count
            break
          case 'IN_PROGRESS':
            funnel.started += s._count
            break
          case 'COMPLETED':
            funnel.completed += s._count
            break
          case 'EXPIRED':
            funnel.expired += s._count
            break
        }
      }

      // Add cumulative totals for funnel display
      const total = funnel.created + funnel.invited + funnel.started + funnel.completed + funnel.expired

      return {
        stages: [
          { name: 'Created', count: total, percentage: 100 },
          {
            name: 'Invited',
            count: funnel.invited + funnel.started + funnel.completed,
            percentage: total > 0 ? Math.round(((funnel.invited + funnel.started + funnel.completed) / total) * 100) : 0,
          },
          {
            name: 'Started',
            count: funnel.started + funnel.completed,
            percentage: total > 0 ? Math.round(((funnel.started + funnel.completed) / total) * 100) : 0,
          },
          {
            name: 'Completed',
            count: funnel.completed,
            percentage: total > 0 ? Math.round((funnel.completed / total) * 100) : 0,
          },
        ],
        expired: funnel.expired,
      }
    }),

  // Get role/job benchmarks
  getRoleBenchmarks: protectedProcedure
    .input(z.object({ jobId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Get all jobs with completed assessments
      const jobsWithAssessments = await ctx.prisma.job.findMany({
        where: input?.jobId ? { id: input.jobId } : {
          candidates: {
            some: {
              assessments: {
                some: {
                  status: 'COMPLETED',
                  overallScore: { not: null },
                },
              },
            },
          },
        },
        select: {
          id: true,
          title: true,
          department: true,
          candidates: {
            select: {
              assessments: {
                where: { status: 'COMPLETED', overallScore: { not: null } },
                select: {
                  overallScore: true,
                  recommendation: true,
                  template: { select: { type: true } },
                },
              },
            },
          },
        },
      })

      const benchmarks = jobsWithAssessments.map(job => {
        const allScores = job.candidates.flatMap(c =>
          c.assessments.map(a => ({
            score: a.overallScore || 0,
            type: a.template.type,
            recommendation: a.recommendation,
          }))
        )

        if (allScores.length === 0) {
          return null
        }

        const avgScore = Math.round(
          allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length
        )

        const scores = allScores.map(s => s.score).sort((a, b) => a - b)
        const medianScore = scores[Math.floor(scores.length / 2)]

        // Count by type
        const byType = allScores.reduce(
          (acc, s) => {
            acc[s.type] = acc[s.type] || { count: 0, totalScore: 0 }
            acc[s.type].count++
            acc[s.type].totalScore += s.score
            return acc
          },
          {} as Record<string, { count: number; totalScore: number }>
        )

        const typeAverages = Object.entries(byType).map(([type, data]) => ({
          type,
          avgScore: Math.round(data.totalScore / data.count),
          count: data.count,
        }))

        // Hire rate
        const hireCount = allScores.filter(s => s.recommendation === 'HIRE').length
        const hireRate = Math.round((hireCount / allScores.length) * 100)

        return {
          jobId: job.id,
          jobTitle: job.title,
          department: job.department,
          totalAssessments: allScores.length,
          avgScore,
          medianScore,
          hireRate,
          typeAverages,
        }
      }).filter(Boolean)

      return benchmarks
    }),

  // Compare candidate to benchmarks
  getCandidateComparison: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        jobId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get candidate's assessments
      const candidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id: input.candidateId },
        include: {
          job: true,
          assessments: {
            where: { status: 'COMPLETED', overallScore: { not: null } },
            include: { template: true },
          },
        },
      })

      if (!candidate || candidate.assessments.length === 0) {
        return null
      }

      const jobId = input.jobId || candidate.jobId

      // Get all candidates for same job with completed assessments
      const peers = await ctx.prisma.jobCandidate.findMany({
        where: {
          jobId,
          id: { not: input.candidateId },
        },
        include: {
          assessments: {
            where: { status: 'COMPLETED', overallScore: { not: null } },
            include: { template: true },
          },
        },
      })

      const comparison = candidate.assessments.map(assessment => {
        // Get peer scores for same assessment type
        const peerScores = peers
          .flatMap(p => p.assessments)
          .filter(a => a.template.type === assessment.template.type)
          .map(a => a.overallScore || 0)

        if (peerScores.length === 0) {
          return {
            assessmentType: assessment.template.type,
            assessmentName: assessment.template.name,
            candidateScore: assessment.overallScore,
            percentile: null,
            peerAvg: null,
            peersCount: 0,
          }
        }

        const peerAvg = Math.round(
          peerScores.reduce((sum, s) => sum + s, 0) / peerScores.length
        )

        // Calculate percentile
        const allScores = [...peerScores, assessment.overallScore || 0].sort((a, b) => a - b)
        const candidateRank = allScores.indexOf(assessment.overallScore || 0) + 1
        const percentile = Math.round((candidateRank / allScores.length) * 100)

        return {
          assessmentType: assessment.template.type,
          assessmentName: assessment.template.name,
          candidateScore: assessment.overallScore,
          percentile,
          peerAvg,
          peersCount: peerScores.length,
        }
      })

      return {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          job: candidate.job?.title,
        },
        comparison,
      }
    }),

  // Get predictive insights based on assessments
  getPredictiveInsights: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const candidate = await ctx.prisma.jobCandidate.findUnique({
        where: { id: input.candidateId },
        include: {
          assessments: {
            where: { status: 'COMPLETED' },
            include: { template: true },
          },
        },
      })

      if (!candidate) {
        return null
      }

      // Get assessment with predicted performance
      const assessmentWithPrediction = candidate.assessments.find(
        a => a.predictedPerformance !== null
      )

      if (!assessmentWithPrediction) {
        // No predictions yet, return basic summary
        return {
          hasPredictor: false,
          assessmentCount: candidate.assessments.length,
          avgScore: candidate.assessments.length > 0
            ? Math.round(
              candidate.assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) /
              candidate.assessments.length
            )
            : null,
        }
      }

      return {
        hasPrediction: true,
        predictedPerformance: assessmentWithPrediction.predictedPerformance,
        predictedTenure: assessmentWithPrediction.predictedTenure,
        teamFitScore: assessmentWithPrediction.teamFitScore,
        aiConfidence: assessmentWithPrediction.aiConfidence,
        aiRecommendation: assessmentWithPrediction.aiRecommendation,
      }
    }),

  // Get assessment trends over time
  getAssessmentTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Calculate date range based on period
      const now = new Date()
      let startDate: Date

      switch (input.period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
      }

      const where: Record<string, unknown> = {
        createdAt: { gte: startDate },
      }

      if (input.type) {
        // Handle virtual types
        if (input.type === 'KANDI_IO') {
          where.template = { externalPlatform: 'kandi' }
        } else if (['CODING_TEST', 'WORK_TRIAL', 'CUSTOM', 'COMPETENCY_TEST', 'PERSONALITY_TEST'].includes(input.type)) {
          where.template = { type: input.type }
        }
      }

      const assessments = await ctx.prisma.candidateAssessment.findMany({
        where,
        select: {
          createdAt: true,
          status: true,
          overallScore: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      // Group by day/week depending on period
      const groupByFormat = input.period === 'week' ? 'day' : 'week'

      const grouped = assessments.reduce(
        (acc, a) => {
          const date = a.createdAt
          let key: string

          if (groupByFormat === 'day') {
            key = date.toISOString().split('T')[0]
          } else {
            // Week number
            const weekNumber = Math.ceil(
              (date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
            )
            key = `Week ${weekNumber}`
          }

          if (!acc[key]) {
            acc[key] = {
              label: key,
              created: 0,
              completed: 0,
              avgScore: 0,
              scores: [] as number[],
            }
          }

          acc[key].created++
          if (a.status === 'COMPLETED') {
            acc[key].completed++
            if (a.overallScore !== null) {
              acc[key].scores.push(a.overallScore)
            }
          }

          return acc
        },
        {} as Record<string, { label: string; created: number; completed: number; avgScore: number; scores: number[] }>
      )

      // Calculate averages
      const trends = Object.values(grouped).map(g => ({
        label: g.label,
        created: g.created,
        completed: g.completed,
        completionRate: g.created > 0 ? Math.round((g.completed / g.created) * 100) : 0,
        avgScore: g.scores.length > 0
          ? Math.round(g.scores.reduce((sum, s) => sum + s, 0) / g.scores.length)
          : null,
      }))

      return trends
    }),

  // Get AI accuracy metrics
  getAIAccuracyMetrics: adminProcedure.query(async ({ ctx }) => {
    // Get assessments with both AI predictions and actual outcomes
    // This is for tracking how accurate AI recommendations are

    const assessmentsWithOutcomes = await ctx.prisma.candidateAssessment.findMany({
      where: {
        aiRecommendation: { not: null },
        candidate: {
          stage: { in: ['HIRED', 'REJECTED'] },
        },
      },
      include: {
        candidate: {
          select: { stage: true },
        },
      },
    })

    if (assessmentsWithOutcomes.length === 0) {
      return {
        totalPredictions: 0,
        accuracy: null,
        message: 'Not enough data to calculate accuracy',
      }
    }

    let correctPredictions = 0

    for (const a of assessmentsWithOutcomes) {
      const wasHired = a.candidate.stage === 'HIRED'
      const predictedHire = a.aiRecommendation === 'HIRE'

      if ((wasHired && predictedHire) || (!wasHired && !predictedHire)) {
        correctPredictions++
      }
    }

    const accuracy = Math.round((correctPredictions / assessmentsWithOutcomes.length) * 100)

    return {
      totalPredictions: assessmentsWithOutcomes.length,
      correctPredictions,
      accuracy,
      breakdown: {
        hireRecommended: assessmentsWithOutcomes.filter(a => a.aiRecommendation === 'HIRE').length,
        holdRecommended: assessmentsWithOutcomes.filter(a => a.aiRecommendation === 'HOLD').length,
        noHireRecommended: assessmentsWithOutcomes.filter(a => a.aiRecommendation === 'NO_HIRE').length,
      },
    }
  }),
})
