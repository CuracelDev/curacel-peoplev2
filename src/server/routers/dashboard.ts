import { router, protectedProcedure, hrAdminProcedure } from '@/lib/trpc'

export const dashboardRouter = router({
  getStats: hrAdminProcedure
    .query(async ({ ctx }) => {
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

