import { router, protectedProcedure, hrAdminProcedure } from '@/lib/trpc'
import type { JobCandidateStage } from '@prisma/client'
import { autoActivateEmployees } from '@/lib/employee-status'

export const dashboardRouter = router({
  // Get all sidebar badge counts with settings
  getSidebarCounts: protectedProcedure.query(async ({ ctx }) => {
    await autoActivateEmployees(ctx.prisma)
    // Get badge settings from organization
    const org = await ctx.prisma.organization.findFirst({
      select: {
        sidebarBadgesEnabled: true,
        sidebarBadgeSettings: true,
      },
    })

    const badgesEnabled = org?.sidebarBadgesEnabled ?? true
    const defaultSettings = {
      openJobs: true,
      activeCandidates: true,
      scheduledInterviews: true,
      pendingAssessments: true,
      activeEmployees: true,
      pendingContracts: true,
      inProgressOnboarding: true,
      inProgressOffboarding: true,
    }
    const settings = (org?.sidebarBadgeSettings as Record<string, boolean> | null) ?? defaultSettings

    // If badges are disabled globally, return zeros
    if (!badgesEnabled) {
      return {
        openJobs: 0,
        activeCandidates: 0,
        scheduledInterviews: 0,
        pendingAssessments: 0,
        activeEmployees: 0,
        pendingContracts: 0,
        inProgressOnboarding: 0,
        inProgressOffboarding: 0,
        settings,
        enabled: false,
      }
    }

    const [
      openJobs,
      activeCandidates,
      scheduledInterviews,
      pendingAssessments,
      activeEmployees,
      pendingContracts,
      inProgressOnboarding,
      inProgressOffboarding,
    ] = await Promise.all([
      // Open jobs (ACTIVE status)
      settings.openJobs
        ? ctx.prisma.job.count({ where: { status: 'ACTIVE' } })
        : Promise.resolve(0),

      // Active candidates (in pipeline on active jobs)
      settings.activeCandidates
        ? ctx.prisma.jobCandidate.count({
            where: {
              job: { status: 'ACTIVE' },
              stage: { in: ['APPLIED', 'HR_SCREEN', 'TEAM_CHAT', 'ADVISOR_CHAT', 'TECHNICAL', 'PANEL', 'OFFER'] },
            },
          })
        : Promise.resolve(0),

      // Scheduled interviews (upcoming)
      settings.scheduledInterviews
        ? ctx.prisma.candidateInterview.count({
            where: {
              status: 'SCHEDULED',
              scheduledAt: { gte: new Date() },
            },
          })
        : Promise.resolve(0),

      // Pending assessments (not started, invited, or in progress)
      settings.pendingAssessments
        ? ctx.prisma.candidateAssessment.count({
            where: {
              status: { in: ['NOT_STARTED', 'INVITED', 'IN_PROGRESS'] },
            },
          })
        : Promise.resolve(0),

      // Active employees
      settings.activeEmployees
        ? ctx.prisma.employee.count({ where: { status: 'ACTIVE' } })
        : Promise.resolve(0),

      // Pending contracts (sent but not signed)
      settings.pendingContracts
        ? ctx.prisma.offer.count({ where: { status: { in: ['SENT', 'VIEWED'] } } })
        : Promise.resolve(0),

      // In-progress onboarding
      settings.inProgressOnboarding
        ? ctx.prisma.onboardingWorkflow.count({ where: { status: 'IN_PROGRESS' } })
        : Promise.resolve(0),

      // In-progress offboarding
      settings.inProgressOffboarding
        ? ctx.prisma.offboardingWorkflow.count({ where: { status: 'IN_PROGRESS' } })
        : Promise.resolve(0),
    ])

    return {
      openJobs,
      activeCandidates,
      scheduledInterviews,
      pendingAssessments,
      activeEmployees,
      pendingContracts,
      inProgressOnboarding,
      inProgressOffboarding,
      settings,
      enabled: true,
    }
  }),

  getStats: hrAdminProcedure
    .query(async ({ ctx }) => {
      await autoActivateEmployees(ctx.prisma)
      const [
        totalEmployees,
        activeEmployees,
        pendingOnboarding,
        pendingOffboarding,
        offersByStatus,
        recentHires,
        upcomingStarts,
      ] = await Promise.all([
        // Total employees (excluding candidates)
        ctx.prisma.employee.count({
          where: { status: { not: 'CANDIDATE' } },
        }),
        
        // Active employees
        ctx.prisma.employee.count({
          where: { status: 'ACTIVE' },
        }),
        
        // Pending onboarding
        ctx.prisma.onboardingWorkflow.count({
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        }),
        
        // Pending offboarding
        ctx.prisma.offboardingWorkflow.count({
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        }),
        
        // Offers by status
        ctx.prisma.offer.groupBy({
          by: ['status'],
          _count: true,
        }),
        
        // Recent hires (last 30 days)
        ctx.prisma.employee.findMany({
          where: {
            status: 'ACTIVE',
            startDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: { id: true, fullName: true, jobTitle: true, department: true, startDate: true },
          orderBy: { startDate: 'desc' },
          take: 5,
        }),
        
        // Upcoming starts (next 30 days)
        ctx.prisma.employee.findMany({
          where: {
            status: { in: ['OFFER_SIGNED', 'HIRED_PENDING_START'] },
            startDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: { id: true, fullName: true, jobTitle: true, department: true, startDate: true },
          orderBy: { startDate: 'asc' },
          take: 5,
        }),
      ])

      // Transform offers by status into object
      const offersMap = offersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>)

      return {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
        },
        workflows: {
          pendingOnboarding,
          pendingOffboarding,
        },
        offers: {
          draft: offersMap.DRAFT || 0,
          sent: offersMap.SENT || 0,
          viewed: offersMap.VIEWED || 0,
          signed: offersMap.SIGNED || 0,
          declined: offersMap.DECLINED || 0,
        },
        recentHires,
        upcomingStarts,
      }
    }),

  getHiringOverview: hrAdminProcedure
    .query(async ({ ctx }) => {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const interviewStages: JobCandidateStage[] = [
        'HR_SCREEN',
        'TECHNICAL',
        'TEAM_CHAT',
        'ADVISOR_CHAT',
        'PANEL',
        'TRIAL',
        'CEO_CHAT',
      ]

      const [
        activeJobs,
        totalCandidates,
        inInterview,
        avgScoreAggregate,
        newJobsThisWeek,
        newCandidatesThisWeek,
        interviewsScheduledThisWeek,
        avgScoreThisWeek,
        avgScoreLastWeek,
      ] = await Promise.all([
        ctx.prisma.job.count({ where: { status: 'ACTIVE' } }),
        ctx.prisma.jobCandidate.count({
          where: { stage: { notIn: ['REJECTED', 'WITHDRAWN'] } },
        }),
        ctx.prisma.jobCandidate.count({
          where: { stage: { in: interviewStages } },
        }),
        ctx.prisma.jobCandidate.aggregate({
          _avg: { score: true },
          where: { score: { not: null } },
        }),
        ctx.prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        ctx.prisma.jobCandidate.count({ where: { appliedAt: { gte: sevenDaysAgo } } }),
        ctx.prisma.candidateInterview.count({ where: { scheduledAt: { gte: sevenDaysAgo } } }),
        ctx.prisma.jobCandidate.aggregate({
          _avg: { score: true },
          where: { score: { not: null }, updatedAt: { gte: sevenDaysAgo } },
        }),
        ctx.prisma.jobCandidate.aggregate({
          _avg: { score: true },
          where: { score: { not: null }, updatedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        }),
      ])

      const avgScore = avgScoreAggregate._avg.score
        ? Math.round(avgScoreAggregate._avg.score)
        : null

      const avgScoreDelta =
        avgScoreThisWeek._avg.score != null && avgScoreLastWeek._avg.score != null
          ? Math.round(avgScoreThisWeek._avg.score - avgScoreLastWeek._avg.score)
          : null

      return {
        activeJobs,
        totalCandidates,
        inInterview,
        avgScore,
        changes: {
          newJobsThisWeek,
          newCandidatesThisWeek,
          interviewsScheduledThisWeek,
          avgScoreDelta,
        },
      }
    }),

  getRecentActivity: hrAdminProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.auditLog.findMany({
        include: {
          actor: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    }),

  getOnboardingProgress: hrAdminProcedure
    .query(async ({ ctx }) => {
      const workflows = await ctx.prisma.onboardingWorkflow.findMany({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        include: {
          employee: { select: { id: true, fullName: true, startDate: true } },
          tasks: { select: { status: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      })

      return workflows.map(workflow => {
        const totalTasks = workflow.tasks.length
        const completedTasks = workflow.tasks.filter(
          t => t.status === 'SUCCESS' || t.status === 'SKIPPED'
        ).length

        return {
          id: workflow.id,
          employee: workflow.employee,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          totalTasks,
          completedTasks,
          status: workflow.status,
        }
      })
    }),

  getManagerDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user as { employeeId?: string }
      
      if (!user.employeeId) {
        return { directReports: [], onboardingInProgress: [] }
      }

      const [directReports, onboardingInProgress] = await Promise.all([
        ctx.prisma.employee.findMany({
          where: { managerId: user.employeeId },
          select: {
            id: true,
            fullName: true,
            jobTitle: true,
            status: true,
            startDate: true,
          },
          orderBy: { fullName: 'asc' },
        }),
        
        ctx.prisma.onboardingWorkflow.findMany({
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            employee: { managerId: user.employeeId },
          },
          include: {
            employee: { select: { id: true, fullName: true, startDate: true } },
            tasks: { select: { status: true } },
          },
        }),
      ])

      return {
        directReports,
        onboardingInProgress: onboardingInProgress.map(workflow => ({
          id: workflow.id,
          employee: workflow.employee,
          progress: workflow.tasks.length > 0
            ? Math.round(
                (workflow.tasks.filter(t => t.status === 'SUCCESS' || t.status === 'SKIPPED').length /
                  workflow.tasks.length) *
                  100
              )
            : 0,
        })),
      }
    }),
})
