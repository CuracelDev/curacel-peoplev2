import { z } from 'zod'
import { router, hrAdminProcedure } from '@/lib/trpc'
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subMonths,
  subQuarters,
  subWeeks,
  format,
} from 'date-fns'

const TimeGranularity = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])

export const analyticsRouter = router({
  // ============================
  // MONTHLY METRICS
  // ============================
  getMonthlyMetrics: hrAdminProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12).optional(),
        year: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const year = input.year ?? now.getFullYear()
      const month = input.month ?? now.getMonth() + 1

      const startDate = startOfMonth(new Date(year, month - 1))
      const endDate = endOfMonth(new Date(year, month - 1))

      const [
        trialsCount,
        trialsPassed,
        interviewsCompleted,
        interviewsScheduled,
        hiredCount,
        appliedToInterview,
        totalApplied,
      ] = await Promise.all([
        // No of Trials - candidates who reached TRIAL stage
        ctx.prisma.jobCandidate.count({
          where: {
            stage: { in: ['TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
            updatedAt: { gte: startDate, lte: endDate },
          },
        }),

        // Trial Pass Rate - those who passed trial (moved to CEO_CHAT or beyond)
        ctx.prisma.jobCandidate.count({
          where: {
            stage: { in: ['CEO_CHAT', 'OFFER', 'HIRED'] },
            updatedAt: { gte: startDate, lte: endDate },
          },
        }),

        // No of Interviews completed
        ctx.prisma.candidateInterview.count({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startDate, lte: endDate },
          },
        }),

        // Interviews scheduled (total for the period)
        ctx.prisma.candidateInterview.count({
          where: {
            scheduledAt: { gte: startDate, lte: endDate },
          },
        }),

        // No of candidates hired
        ctx.prisma.jobCandidate.count({
          where: {
            stage: 'HIRED',
            updatedAt: { gte: startDate, lte: endDate },
          },
        }),

        // For Interview-Trial rate: candidates that went to interview
        ctx.prisma.jobCandidate.count({
          where: {
            stage: {
              in: ['HR_SCREEN', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'],
            },
            updatedAt: { gte: startDate, lte: endDate },
          },
        }),

        // Total applied in period
        ctx.prisma.jobCandidate.count({
          where: {
            appliedAt: { gte: startDate, lte: endDate },
          },
        }),
      ])

      // Calculate derived metrics
      const trialPassRate = trialsCount > 0 ? Math.round((trialsPassed / trialsCount) * 100) : 0

      const interviewTrialRate =
        appliedToInterview > 0 ? Math.round((trialsCount / appliedToInterview) * 100) : 0

      // Hiring velocity: avg days from application to hire
      const hiredCandidates = await ctx.prisma.jobCandidate.findMany({
        where: {
          stage: 'HIRED',
          updatedAt: { gte: startDate, lte: endDate },
        },
        select: { appliedAt: true, updatedAt: true },
      })

      const avgHiringDays =
        hiredCandidates.length > 0
          ? Math.round(
              hiredCandidates.reduce((sum, c) => {
                return (
                  sum +
                  Math.ceil((c.updatedAt.getTime() - c.appliedAt.getTime()) / (1000 * 60 * 60 * 24))
                )
              }, 0) / hiredCandidates.length
            )
          : 0

      return {
        period: { month, year, startDate, endDate },
        metrics: {
          noOfTrials: trialsCount,
          trialPassRate,
          interviewTrialRate,
          noOfCandidatesHired: hiredCount,
          hiringVelocity: avgHiringDays,
          noOfInterviews: interviewsCompleted,
          interviewsScheduled,
          totalApplied,
        },
      }
    }),

  // ============================
  // QUARTERLY METRICS
  // ============================
  getQuarterlyMetrics: hrAdminProcedure
    .input(
      z.object({
        quarter: z.number().min(1).max(4).optional(),
        year: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const year = input.year ?? now.getFullYear()
      const quarter = input.quarter ?? Math.ceil((now.getMonth() + 1) / 3)

      const quarterStartMonth = (quarter - 1) * 3
      const startDate = startOfQuarter(new Date(year, quarterStartMonth))
      const endDate = endOfQuarter(new Date(year, quarterStartMonth))

      const [hiredCandidates, activeJobs, filledJobs, offersSent, offersAccepted, offersDeclined] =
        await Promise.all([
          ctx.prisma.jobCandidate.findMany({
            where: {
              stage: 'HIRED',
              updatedAt: { gte: startDate, lte: endDate },
            },
            select: {
              appliedAt: true,
              updatedAt: true,
              score: true,
              job: { select: { hiresCount: true } },
            },
          }),

          ctx.prisma.job.count({
            where: {
              status: 'ACTIVE',
              createdAt: { lte: endDate },
            },
          }),

          ctx.prisma.job.count({
            where: {
              status: 'HIRED',
              updatedAt: { gte: startDate, lte: endDate },
            },
          }),

          ctx.prisma.offer.count({
            where: {
              status: { in: ['SENT', 'VIEWED', 'SIGNED', 'DECLINED'] },
              esignSentAt: { gte: startDate, lte: endDate },
            },
          }),

          ctx.prisma.offer.count({
            where: {
              status: 'SIGNED',
              esignSignedAt: { gte: startDate, lte: endDate },
            },
          }),

          ctx.prisma.offer.count({
            where: {
              status: 'DECLINED',
              esignDeclinedAt: { gte: startDate, lte: endDate },
            },
          }),
        ])

      // Calculations
      const avgTimeToHire =
        hiredCandidates.length > 0
          ? Math.round(
              hiredCandidates.reduce((sum, c) => {
                return (
                  sum +
                  Math.ceil((c.updatedAt.getTime() - c.appliedAt.getTime()) / (1000 * 60 * 60 * 24))
                )
              }, 0) / hiredCandidates.length
            )
          : 0

      const scoredCandidates = hiredCandidates.filter((c) => c.score != null)
      const qualityOfHire =
        scoredCandidates.length > 0
          ? Math.round(
              scoredCandidates.reduce((sum, c) => sum + (c.score ?? 0), 0) / scoredCandidates.length
            )
          : 0

      const offerAcceptanceRate =
        offersSent > 0 ? Math.round((offersAccepted / offersSent) * 100) : 0

      const hiringFillRate = activeJobs > 0 ? Math.round((filledJobs / activeJobs) * 100) : 0

      return {
        period: { quarter, year, startDate, endDate },
        metrics: {
          hiringVelocity: avgTimeToHire,
          qualityOfHire,
          hiringFillRate,
          avgTimeToHire,
          offerAcceptanceRate,
          costPerHire: 0, // Placeholder - needs cost tracking
          totalHires: hiredCandidates.length,
          offersAccepted,
          offersDeclined,
          offersSent,
        },
      }
    }),

  // ============================
  // WEEKLY BY ROLE
  // ============================
  getWeeklyByRole: hrAdminProcedure
    .input(
      z.object({
        weekStart: z.string().optional(),
        jobIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const weekStartDate = input.weekStart
        ? new Date(input.weekStart)
        : startOfWeek(now, { weekStartsOn: 1 })
      const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 })

      // Get all active jobs or filter by provided IDs
      const jobs = await ctx.prisma.job.findMany({
        where: input.jobIds?.length
          ? { id: { in: input.jobIds } }
          : { status: { in: ['ACTIVE', 'HIRED'] } },
        select: { id: true, title: true, department: true },
      })

      // For each job, calculate weekly metrics
      const roleMetrics = await Promise.all(
        jobs.map(async (job) => {
          const [
            qualifiedCVs,
            noOfInterviews,
            stage1Count,
            stage2Count,
            stage3Count,
            stage4Count,
            rolesFilled,
            trialsCount,
          ] = await Promise.all([
            // Qualified CVs (score >= 60)
            ctx.prisma.jobCandidate.count({
              where: {
                jobId: job.id,
                score: { gte: 60 },
                appliedAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),

            // No of interviews this week
            ctx.prisma.candidateInterview.count({
              where: {
                candidate: { jobId: job.id },
                scheduledAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),

            // Stage 1 (APPLIED -> HR_SCREEN)
            ctx.prisma.jobCandidate.count({
              where: {
                jobId: job.id,
                stage: {
                  in: ['HR_SCREEN', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'],
                },
                updatedAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),

            // Stage 2 (HR_SCREEN -> TECHNICAL)
            ctx.prisma.jobCandidate.count({
              where: {
                jobId: job.id,
                stage: { in: ['TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
                updatedAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),

            // Stage 3 (TECHNICAL -> PANEL)
            ctx.prisma.jobCandidate.count({
              where: {
                jobId: job.id,
                stage: { in: ['PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
                updatedAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),

            // Stage 4 (PANEL -> TRIAL/CEO_CHAT/OFFER/HIRED)
            ctx.prisma.jobCandidate.count({
              where: {
                jobId: job.id,
                stage: { in: ['TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
                updatedAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),

            // Roles filled
            ctx.prisma.jobCandidate.count({
              where: {
                jobId: job.id,
                stage: 'HIRED',
                updatedAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),

            // Trials (TRIAL stage)
            ctx.prisma.jobCandidate.count({
              where: {
                jobId: job.id,
                stage: 'TRIAL',
                updatedAt: { gte: weekStartDate, lte: weekEndDate },
              },
            }),
          ])

          return {
            jobId: job.id,
            jobTitle: job.title,
            department: job.department,
            qualifiedCVs,
            noOfInterviews,
            stageConversions: {
              stage1to2:
                stage1Count > 0 && stage2Count > 0
                  ? Math.round((stage2Count / stage1Count) * 100)
                  : 0,
              stage2to3:
                stage2Count > 0 && stage3Count > 0
                  ? Math.round((stage3Count / stage2Count) * 100)
                  : 0,
              stage3to4:
                stage3Count > 0 && stage4Count > 0
                  ? Math.round((stage4Count / stage3Count) * 100)
                  : 0,
            },
            noOfRolesFilled: rolesFilled,
            noOfTrials: trialsCount,
          }
        })
      )

      return {
        period: { weekStart: weekStartDate, weekEnd: weekEndDate },
        roles: roleMetrics,
      }
    }),

  // ============================
  // YEARLY BY DEPARTMENT (FUNNEL)
  // ============================
  getYearlyByDepartment: hrAdminProcedure
    .input(
      z.object({
        years: z.array(z.number()).optional(),
        departments: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentYear = new Date().getFullYear()
      const years = input.years ?? [currentYear - 2, currentYear - 1, currentYear]

      // Get all unique departments (teams)
      const teams = await ctx.prisma.team.findMany({
        where: input.departments?.length
          ? { name: { in: input.departments } }
          : { isActive: true },
        select: { id: true, name: true },
      })

      // Build results for each year and department
      const results = await Promise.all(
        years.map(async (year) => {
          const startDate = startOfYear(new Date(year, 0, 1))
          const endDate = endOfYear(new Date(year, 0, 1))

          const departmentMetrics = await Promise.all(
            teams.map(async (team) => {
              const [totalCVs, firstStage, secondStage, thirdStage, trial, ceoChat, hired] =
                await Promise.all([
                  // Total CVs/Applications
                  ctx.prisma.jobCandidate.count({
                    where: {
                      job: { department: team.name },
                      appliedAt: { gte: startDate, lte: endDate },
                    },
                  }),

                  // First Stage (HR_SCREEN)
                  ctx.prisma.jobCandidate.count({
                    where: {
                      job: { department: team.name },
                      stage: {
                        in: ['HR_SCREEN', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'],
                      },
                      appliedAt: { gte: startDate, lte: endDate },
                    },
                  }),

                  // Second Stage (TECHNICAL)
                  ctx.prisma.jobCandidate.count({
                    where: {
                      job: { department: team.name },
                      stage: { in: ['TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
                      appliedAt: { gte: startDate, lte: endDate },
                    },
                  }),

                  // Third Stage (PANEL)
                  ctx.prisma.jobCandidate.count({
                    where: {
                      job: { department: team.name },
                      stage: { in: ['PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
                      appliedAt: { gte: startDate, lte: endDate },
                    },
                  }),

                  // Trial
                  ctx.prisma.jobCandidate.count({
                    where: {
                      job: { department: team.name },
                      stage: { in: ['TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
                      appliedAt: { gte: startDate, lte: endDate },
                    },
                  }),

                  // CEO Chat
                  ctx.prisma.jobCandidate.count({
                    where: {
                      job: { department: team.name },
                      stage: { in: ['CEO_CHAT', 'OFFER', 'HIRED'] },
                      appliedAt: { gte: startDate, lte: endDate },
                    },
                  }),

                  // Hired
                  ctx.prisma.jobCandidate.count({
                    where: {
                      job: { department: team.name },
                      stage: 'HIRED',
                      appliedAt: { gte: startDate, lte: endDate },
                    },
                  }),
                ])

              return {
                department: team.name,
                totalCVs,
                firstStage,
                secondStage,
                thirdStage,
                trial,
                ceoChat,
                hired,
              }
            })
          )

          return {
            year,
            departments: departmentMetrics,
          }
        })
      )

      return {
        years: results,
        availableDepartments: teams.map((t) => t.name),
      }
    }),

  // ============================
  // TREND DATA (for charts)
  // ============================
  getHiringTrends: hrAdminProcedure
    .input(
      z.object({
        granularity: TimeGranularity.default('monthly'),
        periods: z.number().min(1).max(24).default(12),
        metric: z.enum(['hires', 'applications', 'interviews', 'offers']).default('hires'),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const periods: { label: string; count: number }[] = []

      for (let i = input.periods - 1; i >= 0; i--) {
        let startDate: Date
        let endDate: Date
        let label: string

        switch (input.granularity) {
          case 'monthly':
            startDate = startOfMonth(subMonths(now, i))
            endDate = endOfMonth(subMonths(now, i))
            label = format(startDate, 'MMM yyyy')
            break
          case 'quarterly':
            startDate = startOfQuarter(subQuarters(now, i))
            endDate = endOfQuarter(subQuarters(now, i))
            label = `Q${Math.ceil((startDate.getMonth() + 1) / 3)} ${startDate.getFullYear()}`
            break
          case 'weekly':
            startDate = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
            endDate = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
            label = format(startDate, 'MMM d')
            break
          default:
            startDate = startOfMonth(subMonths(now, i))
            endDate = endOfMonth(subMonths(now, i))
            label = format(startDate, 'MMM yyyy')
        }

        let count = 0
        switch (input.metric) {
          case 'hires':
            count = await ctx.prisma.jobCandidate.count({
              where: {
                stage: 'HIRED',
                updatedAt: { gte: startDate, lte: endDate },
              },
            })
            break
          case 'applications':
            count = await ctx.prisma.jobCandidate.count({
              where: {
                appliedAt: { gte: startDate, lte: endDate },
              },
            })
            break
          case 'interviews':
            count = await ctx.prisma.candidateInterview.count({
              where: {
                completedAt: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
              },
            })
            break
          case 'offers':
            count = await ctx.prisma.offer.count({
              where: {
                esignSentAt: { gte: startDate, lte: endDate },
              },
            })
            break
        }

        periods.push({ label, count })
      }

      return { periods, granularity: input.granularity, metric: input.metric }
    }),
})
