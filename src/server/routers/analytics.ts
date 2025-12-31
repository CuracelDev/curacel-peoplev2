import { z } from 'zod'
import { router, hrAdminProcedure, protectedProcedure } from '@/lib/trpc'
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

  // ============================
  // MONTHLY TABLE (like spreadsheet)
  // ============================
  getMonthlyTable: hrAdminProcedure
    .input(
      z.object({
        year: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const year = input.year ?? new Date().getFullYear()
      const months = []

      for (let month = 1; month <= 12; month++) {
        const startDate = startOfMonth(new Date(year, month - 1))
        const endDate = endOfMonth(new Date(year, month - 1))

        const [interviews, trials, hired, trialsPassedToCeoChat] = await Promise.all([
          ctx.prisma.candidateInterview.count({
            where: {
              status: 'COMPLETED',
              completedAt: { gte: startDate, lte: endDate },
            },
          }),
          ctx.prisma.jobCandidate.count({
            where: {
              stage: { in: ['TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] },
              updatedAt: { gte: startDate, lte: endDate },
            },
          }),
          ctx.prisma.jobCandidate.count({
            where: {
              stage: 'HIRED',
              updatedAt: { gte: startDate, lte: endDate },
            },
          }),
          ctx.prisma.jobCandidate.count({
            where: {
              stage: { in: ['CEO_CHAT', 'OFFER', 'HIRED'] },
              updatedAt: { gte: startDate, lte: endDate },
            },
          }),
        ])

        const trialPassRate = trials > 0 ? Math.round((trialsPassedToCeoChat / trials) * 100 * 100) / 100 : 0
        const interviewTrialRate = interviews > 0 ? Math.round((trials / interviews) * 100 * 100) / 100 : 0

        months.push({
          month,
          monthName: format(startDate, 'MMMM'),
          interviews,
          trials,
          hired,
          trialPassRate,
          interviewTrialRate,
        })
      }

      // Calculate yearly totals
      const totals = months.reduce(
        (acc, m) => ({
          interviews: acc.interviews + m.interviews,
          trials: acc.trials + m.trials,
          hired: acc.hired + m.hired,
        }),
        { interviews: 0, trials: 0, hired: 0 }
      )

      const [yearlyOffersSent, yearlyOffersAccepted, yearlyActiveJobs, yearlyFilledJobs] = await Promise.all([
        ctx.prisma.offer.count({
          where: {
            esignSentAt: { gte: startOfYear(new Date(year, 0)), lte: endOfYear(new Date(year, 0)) },
          },
        }),
        ctx.prisma.offer.count({
          where: {
            status: 'SIGNED',
            esignSignedAt: { gte: startOfYear(new Date(year, 0)), lte: endOfYear(new Date(year, 0)) },
          },
        }),
        ctx.prisma.job.count({
          where: { status: { in: ['ACTIVE', 'HIRED'] }, createdAt: { lte: endOfYear(new Date(year, 0)) } },
        }),
        ctx.prisma.job.count({
          where: { status: 'HIRED', updatedAt: { gte: startOfYear(new Date(year, 0)), lte: endOfYear(new Date(year, 0)) } },
        }),
      ])

      const keyMetrics = {
        trialPassRate: totals.trials > 0 ? Math.round((totals.hired / totals.trials) * 100 * 100) / 100 : 0,
        trialHireRate: totals.trials > 0 ? Math.round((totals.hired / totals.trials) * 100 * 100) / 100 : 0,
        offerAcceptanceRate: yearlyOffersSent > 0 ? Math.round((yearlyOffersAccepted / yearlyOffersSent) * 100 * 100) / 100 : 0,
        hiringFillRate: yearlyActiveJobs > 0 ? Math.round((yearlyFilledJobs / yearlyActiveJobs) * 100 * 100) / 100 : 0,
        interviewTrial: totals.interviews > 0 ? Math.round((totals.trials / totals.interviews) * 100 * 100) / 100 : 0,
      }

      return { year, months, totals, keyMetrics }
    }),

  // ============================
  // WEEKLY INTERVIEWS
  // ============================
  getWeeklyInterviews: hrAdminProcedure
    .input(
      z.object({
        year: z.number().optional(),
        weeksBack: z.number().min(1).max(52).default(26),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const weeks = []

      for (let i = input.weeksBack - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })

        const [interviews, rolesFilled] = await Promise.all([
          ctx.prisma.candidateInterview.count({
            where: {
              scheduledAt: { gte: weekStart, lte: weekEnd },
            },
          }),
          ctx.prisma.jobCandidate.count({
            where: {
              stage: 'HIRED',
              updatedAt: { gte: weekStart, lte: weekEnd },
            },
          }),
        ])

        weeks.push({
          weekStart,
          weekEnd,
          label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
          interviews,
          rolesFilled,
        })
      }

      return { weeks }
    }),

  // ============================
  // HIRING VELOCITY BY ROLE
  // ============================
  getHiringVelocityByRole: hrAdminProcedure
    .input(
      z.object({
        years: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentYear = new Date().getFullYear()
      const years = input.years ?? [currentYear - 2, currentYear - 1, currentYear]

      // Get all hired candidates with their job info
      const hiredCandidates = await ctx.prisma.jobCandidate.findMany({
        where: {
          stage: 'HIRED',
          appliedAt: {
            gte: startOfYear(new Date(Math.min(...years), 0)),
            lte: endOfYear(new Date(Math.max(...years), 0)),
          },
        },
        select: {
          id: true,
          name: true,
          appliedAt: true,
          updatedAt: true,
          job: { select: { title: true, department: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })

      // Per-hire velocity
      const perHire = hiredCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.job.title,
        department: c.job.department,
        startDate: c.appliedAt,
        endDate: c.updatedAt,
        velocityDays: Math.ceil((c.updatedAt.getTime() - c.appliedAt.getTime()) / (1000 * 60 * 60 * 24)),
        year: c.updatedAt.getFullYear(),
      }))

      // Average by role and year
      const roleYearMap = new Map<string, { total: number; count: number; year: number }>()
      perHire.forEach((h) => {
        const key = `${h.role}-${h.year}`
        const existing = roleYearMap.get(key) || { total: 0, count: 0, year: h.year }
        roleYearMap.set(key, {
          total: existing.total + h.velocityDays,
          count: existing.count + 1,
          year: h.year,
        })
      })

      const byRoleYear: { role: string; year: number; avgVelocity: number; count: number }[] = []
      roleYearMap.forEach((value, key) => {
        const [role] = key.split('-')
        byRoleYear.push({
          role,
          year: value.year,
          avgVelocity: Math.round(value.total / value.count),
          count: value.count,
        })
      })

      // Average by role (all time)
      const roleMap = new Map<string, { total: number; count: number }>()
      perHire.forEach((h) => {
        const existing = roleMap.get(h.role) || { total: 0, count: 0 }
        roleMap.set(h.role, {
          total: existing.total + h.velocityDays,
          count: existing.count + 1,
        })
      })

      const byRole: { role: string; avgVelocity: number; count: number }[] = []
      roleMap.forEach((value, role) => {
        byRole.push({
          role,
          avgVelocity: Math.round(value.total / value.count),
          count: value.count,
        })
      })

      return { perHire, byRoleYear, byRole }
    }),

  // ============================
  // FUNNEL BY ROLE/YEAR
  // ============================
  getFunnelByRoleYear: hrAdminProcedure
    .input(
      z.object({
        years: z.array(z.number()).optional(),
        roles: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentYear = new Date().getFullYear()
      const years = input.years ?? [currentYear - 2, currentYear - 1, currentYear]

      // Get jobs (roles)
      const jobs = await ctx.prisma.job.findMany({
        where: input.roles?.length ? { title: { in: input.roles } } : {},
        select: { id: true, title: true, department: true },
        distinct: ['title'],
      })

      const funnelData = await Promise.all(
        jobs.map(async (job) => {
          const yearData = await Promise.all(
            years.map(async (year) => {
              const startDate = startOfYear(new Date(year, 0))
              const endDate = endOfYear(new Date(year, 0))

              const baseWhere = {
                job: { title: job.title },
                appliedAt: { gte: startDate, lte: endDate },
              }

              const [qualifiedCVs, firstStage, secondStage, thirdStage, trial, ceoChat, hired] =
                await Promise.all([
                  ctx.prisma.jobCandidate.count({ where: baseWhere }),
                  ctx.prisma.jobCandidate.count({
                    where: { ...baseWhere, stage: { in: ['HR_SCREEN', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
                  }),
                  ctx.prisma.jobCandidate.count({
                    where: { ...baseWhere, stage: { in: ['TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
                  }),
                  ctx.prisma.jobCandidate.count({
                    where: { ...baseWhere, stage: { in: ['PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
                  }),
                  ctx.prisma.jobCandidate.count({
                    where: { ...baseWhere, stage: { in: ['TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
                  }),
                  ctx.prisma.jobCandidate.count({
                    where: { ...baseWhere, stage: { in: ['CEO_CHAT', 'OFFER', 'HIRED'] } },
                  }),
                  ctx.prisma.jobCandidate.count({
                    where: { ...baseWhere, stage: 'HIRED' },
                  }),
                ])

              return {
                year,
                qualifiedCVs,
                firstStage,
                secondStage,
                thirdStage,
                trial,
                ceoChat,
                hired,
                conversionRates: {
                  qualToFirst: qualifiedCVs > 0 ? Math.round((firstStage / qualifiedCVs) * 100 * 100) / 100 : 0,
                  firstToSecond: firstStage > 0 ? Math.round((secondStage / firstStage) * 100 * 100) / 100 : 0,
                  secondToThird: secondStage > 0 ? Math.round((thirdStage / secondStage) * 100 * 100) / 100 : 0,
                  thirdToTrial: thirdStage > 0 ? Math.round((trial / thirdStage) * 100 * 100) / 100 : 0,
                  trialToHired: trial > 0 ? Math.round((hired / trial) * 100 * 100) / 100 : 0,
                  qualToHired: qualifiedCVs > 0 ? Math.round((hired / qualifiedCVs) * 100 * 100) / 100 : 0,
                },
              }
            })
          )

          return {
            role: job.title,
            department: job.department,
            years: yearData,
          }
        })
      )

      return { funnelData, availableYears: years }
    }),

  // ============================
  // FUNNEL SUMMARY WITH DROPOFF
  // ============================
  getFunnelSummary: hrAdminProcedure
    .input(
      z.object({
        years: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentYear = new Date().getFullYear()
      const years = input.years ?? [currentYear - 2, currentYear - 1, currentYear]

      const startDate = startOfYear(new Date(Math.min(...years), 0))
      const endDate = endOfYear(new Date(Math.max(...years), 0))

      const baseWhere = { appliedAt: { gte: startDate, lte: endDate } }

      const [qualifiedCVs, firstStage, secondStage, thirdStage, trial, ceoChat, hired] =
        await Promise.all([
          ctx.prisma.jobCandidate.count({ where: baseWhere }),
          ctx.prisma.jobCandidate.count({
            where: { ...baseWhere, stage: { in: ['HR_SCREEN', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
          }),
          ctx.prisma.jobCandidate.count({
            where: { ...baseWhere, stage: { in: ['TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
          }),
          ctx.prisma.jobCandidate.count({
            where: { ...baseWhere, stage: { in: ['PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
          }),
          ctx.prisma.jobCandidate.count({
            where: { ...baseWhere, stage: { in: ['TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
          }),
          ctx.prisma.jobCandidate.count({
            where: { ...baseWhere, stage: { in: ['CEO_CHAT', 'OFFER', 'HIRED'] } },
          }),
          ctx.prisma.jobCandidate.count({
            where: { ...baseWhere, stage: 'HIRED' },
          }),
        ])

      // Per-year breakdown
      const byYear = await Promise.all(
        years.map(async (year) => {
          const yearStart = startOfYear(new Date(year, 0))
          const yearEnd = endOfYear(new Date(year, 0))
          const yearWhere = { appliedAt: { gte: yearStart, lte: yearEnd } }

          const [yCVs, yFirst, ySecond, yThird, yTrial, yCeo, yHired] = await Promise.all([
            ctx.prisma.jobCandidate.count({ where: yearWhere }),
            ctx.prisma.jobCandidate.count({
              where: { ...yearWhere, stage: { in: ['HR_SCREEN', 'TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
            }),
            ctx.prisma.jobCandidate.count({
              where: { ...yearWhere, stage: { in: ['TECHNICAL', 'PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
            }),
            ctx.prisma.jobCandidate.count({
              where: { ...yearWhere, stage: { in: ['PANEL', 'TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
            }),
            ctx.prisma.jobCandidate.count({
              where: { ...yearWhere, stage: { in: ['TRIAL', 'CEO_CHAT', 'OFFER', 'HIRED'] } },
            }),
            ctx.prisma.jobCandidate.count({
              where: { ...yearWhere, stage: { in: ['CEO_CHAT', 'OFFER', 'HIRED'] } },
            }),
            ctx.prisma.jobCandidate.count({
              where: { ...yearWhere, stage: 'HIRED' },
            }),
          ])

          return {
            year,
            qualifiedCVs: yCVs,
            firstStage: yFirst,
            secondStage: ySecond,
            thirdStage: yThird,
            trial: yTrial,
            ceoChat: yCeo,
            hired: yHired,
            qualToFirstPct: yCVs > 0 ? Math.round((yFirst / yCVs) * 100 * 100) / 100 : 0,
            qualToHiredPct: yCVs > 0 ? Math.round((yHired / yCVs) * 100 * 100) / 100 : 0,
          }
        })
      )

      // Dropoff analysis
      const dropoff = [
        { stage: 'Qual → First', lossCount: qualifiedCVs - firstStage, lossPct: qualifiedCVs > 0 ? Math.round(((qualifiedCVs - firstStage) / qualifiedCVs) * 100 * 100) / 100 : 0 },
        { stage: 'First → Second', lossCount: firstStage - secondStage, lossPct: firstStage > 0 ? Math.round(((firstStage - secondStage) / firstStage) * 100 * 100) / 100 : 0 },
        { stage: 'Second → Third', lossCount: secondStage - thirdStage, lossPct: secondStage > 0 ? Math.round(((secondStage - thirdStage) / secondStage) * 100 * 100) / 100 : 0 },
        { stage: 'Third → Trial', lossCount: thirdStage - trial, lossPct: thirdStage > 0 ? Math.round(((thirdStage - trial) / thirdStage) * 100 * 100) / 100 : 0 },
        { stage: 'Trial → Hired', lossCount: trial - hired, lossPct: trial > 0 ? Math.round(((trial - hired) / trial) * 100 * 100) / 100 : 0 },
      ]

      // Top roles by hires
      const topRoles = await ctx.prisma.jobCandidate.groupBy({
        by: ['jobId'],
        where: { ...baseWhere, stage: 'HIRED' },
        _count: true,
        orderBy: { _count: { jobId: 'desc' } },
        take: 5,
      })

      const topRolesWithNames = await Promise.all(
        topRoles.map(async (r) => {
          const job = await ctx.prisma.job.findUnique({
            where: { id: r.jobId },
            select: { title: true },
          })
          return { role: job?.title ?? 'Unknown', hires: r._count }
        })
      )

      return {
        totals: { qualifiedCVs, firstStage, secondStage, thirdStage, trial, ceoChat, hired },
        conversionRates: {
          qualToFirst: qualifiedCVs > 0 ? Math.round((firstStage / qualifiedCVs) * 100 * 100) / 100 : 0,
          firstToSecond: firstStage > 0 ? Math.round((secondStage / firstStage) * 100 * 100) / 100 : 0,
          secondToThird: secondStage > 0 ? Math.round((thirdStage / secondStage) * 100 * 100) / 100 : 0,
          thirdToTrial: thirdStage > 0 ? Math.round((trial / thirdStage) * 100 * 100) / 100 : 0,
          trialToHired: trial > 0 ? Math.round((hired / trial) * 100 * 100) / 100 : 0,
          qualToHired: qualifiedCVs > 0 ? Math.round((hired / qualifiedCVs) * 100 * 100) / 100 : 0,
        },
        byYear,
        dropoff,
        topRoles: topRolesWithNames,
        biggestLoss: dropoff.reduce((max, d) => (d.lossCount > max.lossCount ? d : max), dropoff[0]),
        years,
      }
    }),

  // ============================
  // SOURCE BREAKDOWN
  // ============================
  getSourceBreakdown: hrAdminProcedure
    .input(
      z.object({
        year: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const year = input.year ?? new Date().getFullYear()
      const startDate = startOfYear(new Date(year, 0))
      const endDate = endOfYear(new Date(year, 0))

      const baseWhere = { appliedAt: { gte: startDate, lte: endDate } }

      // By main source
      const bySource = await ctx.prisma.jobCandidate.groupBy({
        by: ['source'],
        where: baseWhere,
        _count: true,
      })

      // By inbound channel
      const byInboundChannel = await ctx.prisma.jobCandidate.groupBy({
        by: ['inboundChannel'],
        where: { ...baseWhere, source: 'INBOUND', inboundChannel: { not: null } },
        _count: true,
      })

      // By outbound channel
      const byOutboundChannel = await ctx.prisma.jobCandidate.groupBy({
        by: ['outboundChannel'],
        where: { ...baseWhere, source: 'OUTBOUND', outboundChannel: { not: null } },
        _count: true,
      })

      // Hired by source
      const hiredBySource = await ctx.prisma.jobCandidate.groupBy({
        by: ['source'],
        where: { ...baseWhere, stage: 'HIRED' },
        _count: true,
      })

      const total = bySource.reduce((sum, s) => sum + s._count, 0)

      return {
        year,
        bySource: bySource.map((s) => ({
          source: s.source ?? 'UNKNOWN',
          count: s._count,
          percentage: total > 0 ? Math.round((s._count / total) * 100 * 100) / 100 : 0,
        })),
        byInboundChannel: byInboundChannel.map((c) => ({
          channel: c.inboundChannel ?? 'UNKNOWN',
          count: c._count,
        })),
        byOutboundChannel: byOutboundChannel.map((c) => ({
          channel: c.outboundChannel ?? 'UNKNOWN',
          count: c._count,
        })),
        hiredBySource: hiredBySource.map((s) => ({
          source: s.source ?? 'UNKNOWN',
          hires: s._count,
        })),
        total,
      }
    }),

  // ============================
  // DASHBOARD STATS (for main dashboard)
  // ============================
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma

    // Get counts in parallel
    const [
      totalActiveJobs,
      totalCandidates,
      candidatesByStage,
      upcomingInterviews,
      recentActivity,
    ] = await Promise.all([
      // Total active jobs
      db.job.count({
        where: { status: 'ACTIVE' },
      }),

      // Total candidates (excluding rejected/withdrawn)
      db.jobCandidate.count({
        where: {
          stage: { notIn: ['REJECTED', 'WITHDRAWN'] },
        },
      }),

      // Candidates by stage
      db.jobCandidate.groupBy({
        by: ['stage'],
        _count: { id: true },
        where: {
          stage: { notIn: ['REJECTED', 'WITHDRAWN'] },
        },
      }),

      // Upcoming interviews (next 7 days)
      db.candidateInterview.findMany({
        where: {
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          status: 'SCHEDULED',
        },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              job: {
                select: { id: true, title: true },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),

      // Recent activity (last 10 candidates added/moved)
      db.jobCandidate.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          stage: true,
          appliedAt: true,
          updatedAt: true,
          job: {
            select: { id: true, title: true },
          },
        },
      }),
    ])

    // Format candidates by stage with display names
    const stageDisplayNames: Record<string, string> = {
      APPLIED: 'Applied',
      HR_SCREEN: 'People Chat',
      TEAM_CHAT: 'Team Chat',
      ADVISOR_CHAT: 'Advisor Chat',
      TECHNICAL: 'Coding Test',
      PANEL: 'Panel',
      TRIAL: 'Trial',
      CEO_CHAT: 'CEO Chat',
      OFFER: 'Offer',
      HIRED: 'Hired',
    }

    const formattedCandidatesByStage = candidatesByStage.map((item) => ({
      stage: item.stage,
      displayName: stageDisplayNames[item.stage] || item.stage,
      count: item._count.id,
    }))

    return {
      totalActiveJobs,
      totalCandidates,
      candidatesByStage: formattedCandidatesByStage,
      upcomingInterviews: upcomingInterviews.map((interview) => ({
        id: interview.id,
        scheduledAt: interview.scheduledAt,
        stage: interview.stage,
        stageName: interview.stageName,
        candidate: interview.candidate,
      })),
      recentActivity: recentActivity.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        stage: candidate.stage,
        stageDisplayName: stageDisplayNames[candidate.stage] || candidate.stage,
        appliedAt: candidate.appliedAt,
        updatedAt: candidate.updatedAt,
        job: candidate.job,
      })),
    }
  }),

  // ============================
  // PIPELINE DATA (for charts)
  // ============================
  getPipelineData: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma

    // Get candidates by stage for pipeline visualization
    const candidatesByStage = await db.jobCandidate.groupBy({
      by: ['stage'],
      _count: { id: true },
      where: {
        stage: { notIn: ['REJECTED', 'WITHDRAWN'] },
      },
    })

    // Define pipeline order
    const pipelineOrder = [
      'APPLIED',
      'HR_SCREEN',
      'TECHNICAL',
      'TEAM_CHAT',
      'ADVISOR_CHAT',
      'TRIAL',
      'CEO_CHAT',
      'OFFER',
      'HIRED',
    ]

    const stageDisplayNames: Record<string, string> = {
      APPLIED: 'Applied',
      HR_SCREEN: 'People Chat',
      TECHNICAL: 'Coding Test',
      TEAM_CHAT: 'Team Chat',
      ADVISOR_CHAT: 'Advisor Chat',
      TRIAL: 'Trial',
      CEO_CHAT: 'CEO Chat',
      OFFER: 'Offer',
      HIRED: 'Hired',
    }

    const stageCountMap = new Map(
      candidatesByStage.map((item) => [item.stage, item._count.id])
    )

    const totalCandidates = candidatesByStage.reduce(
      (sum, item) => sum + item._count.id,
      0
    )

    const stages = pipelineOrder.map((stage) => {
      const count = stageCountMap.get(stage) || 0
      return {
        stage,
        displayName: stageDisplayNames[stage] || stage,
        count,
        percentage: totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0,
      }
    })

    // Get hiring trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const applicationsLast30Days = await db.jobCandidate.count({
      where: {
        appliedAt: { gte: thirtyDaysAgo },
      },
    })

    const hiresLast30Days = await db.jobCandidate.count({
      where: {
        stage: 'HIRED',
        updatedAt: { gte: thirtyDaysAgo },
      },
    })

    return {
      stages,
      totalCandidates,
      applicationsLast30Days,
      hiresLast30Days,
    }
  }),

  // ============================
  // TOP CANDIDATES
  // ============================
  getTopCandidates: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.prisma

      const candidates = await db.jobCandidate.findMany({
        where: {
          stage: { notIn: ['REJECTED', 'WITHDRAWN', 'HIRED'] },
          score: { not: null },
        },
        orderBy: { score: 'desc' },
        take: input.limit,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          currentRole: true,
          currentCompany: true,
          stage: true,
          score: true,
          recommendation: true,
          appliedAt: true,
          job: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
        },
      })

      const stageDisplayNames: Record<string, string> = {
        APPLIED: 'Applied',
        HR_SCREEN: 'People Chat',
        TECHNICAL: 'Coding Test',
        TEAM_CHAT: 'Team Chat',
        ADVISOR_CHAT: 'Advisor Chat',
        TRIAL: 'Trial',
        CEO_CHAT: 'CEO Chat',
        OFFER: 'Offer',
      }

      return candidates.map((candidate) => ({
        ...candidate,
        stageDisplayName: stageDisplayNames[candidate.stage] || candidate.stage,
      }))
    }),

  // ============================
  // HIRING METRICS SUMMARY
  // ============================
  getHiringMetricsSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.prisma

    // Get source breakdown
    const sourceBreakdown = await db.jobCandidate.groupBy({
      by: ['source'],
      _count: { id: true },
    })

    // Calculate average time to hire (for hired candidates)
    const hiredCandidates = await db.jobCandidate.findMany({
      where: { stage: 'HIRED' },
      select: {
        appliedAt: true,
        updatedAt: true,
      },
    })

    let avgTimeToHireDays = 0
    if (hiredCandidates.length > 0) {
      const totalDays = hiredCandidates.reduce((sum, candidate) => {
        const diffMs = candidate.updatedAt.getTime() - candidate.appliedAt.getTime()
        return sum + diffMs / (1000 * 60 * 60 * 24)
      }, 0)
      avgTimeToHireDays = Math.round(totalDays / hiredCandidates.length)
    }

    // Calculate offer acceptance rate
    const offersExtended = await db.jobCandidate.count({
      where: { stage: { in: ['OFFER', 'HIRED'] } },
    })

    const offersAccepted = await db.jobCandidate.count({
      where: { stage: 'HIRED' },
    })

    const offerAcceptanceRate =
      offersExtended > 0 ? Math.round((offersAccepted / offersExtended) * 100) : 0

    const sourceDisplayNames: Record<string, string> = {
      INBOUND: 'Inbound',
      OUTBOUND: 'Outbound',
      RECRUITER: 'Recruiter',
      EXCELLER: 'Exceller',
    }

    return {
      avgTimeToHireDays,
      offerAcceptanceRate,
      totalHires: hiredCandidates.length,
      sourceBreakdown: sourceBreakdown.map((item) => ({
        source: item.source,
        displayName: sourceDisplayNames[item.source] || item.source,
        count: item._count.id,
      })),
    }
  }),
})
