import { z } from 'zod'
import { router, hrAdminProcedure, protectedProcedure, publicProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'
import { createAuditLog } from '@/lib/audit'
import { sendOnboardingEmail } from '@/lib/email'
import { provisionEmployeeInApp, provisionEmployeeInAppById } from '@/lib/integrations'
import { hasMatchingProvisioningRule } from '@/lib/integrations/provisioning-rules'
import { getOrganization } from '@/lib/organization'
import { getGoogleSheetsService, extractSpreadsheetId, type OnboardingRosterRow, type TaskCatalogRow, type TaskProgressRow } from '@/lib/google-sheets'
import { ONBOARDING_TASKS, TASK_SECTIONS, type OnboardingTask } from '@/lib/onboarding-tasks'
import { addEmployeeToStandup } from '@/lib/integrations/standup-sync'

const DEFAULT_ONBOARDING_TASKS = [
  // Automated tasks
  { name: 'Provision Google Workspace account', type: 'AUTOMATED' as const, automationType: 'provision_google', sortOrder: 1 },
  { name: 'Provision Slack account', type: 'AUTOMATED' as const, automationType: 'provision_slack', sortOrder: 2 },
  // Manual tasks
  { name: 'Confirm laptop/hardware has been ordered', type: 'MANUAL' as const, sortOrder: 3 },
  { name: 'Add to stand-up app', type: 'MANUAL' as const, sortOrder: 4 },
  { name: 'Schedule orientation meeting', type: 'MANUAL' as const, sortOrder: 5 },
  { name: 'Add to team calendar', type: 'MANUAL' as const, sortOrder: 6 },
]

const GENERIC_PROVISION_AUTOMATION = 'provision_app'

function appTypeToAutomationType(appType: string) {
  switch (appType) {
    case 'GOOGLE_WORKSPACE':
      return 'provision_google'
    case 'SLACK':
      return 'provision_slack'
    case 'STANDUPNINJA':
      return 'provision_standupninja'
    default:
      return GENERIC_PROVISION_AUTOMATION
  }
}

async function resolveIntegrationApp(prisma: any, appType: string) {
  const app = await prisma.app.findFirst({ where: { type: appType } })
  if (!app) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown integration app: ${appType}` })
  }
  return app
}

async function ensureDefaultOnboardingTemplates(prisma: any) {
  const organization = await getOrganization()
  const existingCount = await prisma.onboardingTaskTemplate.count({
    where: { organizationId: organization.id },
  })

  if (existingCount > 0) return organization

  await prisma.onboardingTaskTemplate.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((task) => ({
      organizationId: organization.id,
      name: task.name,
      description: null,
      type: task.type,
      automationType: task.automationType ?? null,
      appType:
        task.automationType === 'provision_google'
          ? 'GOOGLE_WORKSPACE'
          : task.automationType === 'provision_slack'
            ? 'SLACK'
            : null,
      sortOrder: task.sortOrder,
      isActive: true,
    })),
  })

  return organization
}

async function getDefaultOnboardingTasks(prisma: any, employee?: any) {
  const organization = await ensureDefaultOnboardingTemplates(prisma)
  const templates = await prisma.onboardingTaskTemplate.findMany({
    where: { organizationId: organization.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const tasks: Array<{
    name: string
    type: 'MANUAL' | 'AUTOMATED'
    automationType?: string
    automationConfig?: Record<string, unknown>
    sortOrder: number
  }> = []

  let order = 1
  const handledAppIds = new Set<string>()
  for (const t of templates) {
    if (t.type === 'MANUAL') {
      tasks.push({
        name: t.name,
        type: t.type,
        automationType: t.automationType ?? undefined,
        automationConfig: t.appId
          ? { appId: t.appId, appType: t.appType ?? undefined }
          : t.appType
            ? { appType: t.appType }
            : undefined,
        sortOrder: order++,
      })
      continue
    }

    const app =
      t.appId
        ? await prisma.app.findUnique({ where: { id: t.appId } })
        : t.appType
          ? await prisma.app.findFirst({ where: { type: t.appType } })
          : null
    if (!app) continue

    if (employee) {
      const rules = await prisma.appProvisioningRule.findMany({
        where: { appId: app.id, isActive: true },
      })
      if (!hasMatchingProvisioningRule(employee, rules)) {
        continue
      }
    }

    tasks.push({
      name: t.name,
      type: t.type,
      automationType: t.automationType ?? undefined,
      automationConfig: t.appId
        ? { appId: t.appId, appType: t.appType ?? undefined }
        : t.appType
          ? { appType: t.appType }
          : undefined,
      sortOrder: order++,
    })
    handledAppIds.add(app.id)
  }

  if (employee) {
    const extraTasks = await getProvisioningTasksForEmployee(prisma, employee, tasks)
    for (const task of extraTasks) {
      if (handledAppIds.has(task.appId)) continue
      tasks.push({
        name: task.name,
        type: 'AUTOMATED',
        automationType: task.automationType,
        automationConfig: task.automationConfig,
        sortOrder: order++,
      })
      handledAppIds.add(task.appId)
    }
  }

  return tasks
}

type ProvisioningTaskInput = {
  appId: string
  name: string
  automationType: string
  automationConfig: Record<string, unknown>
}

function getAppIdFromTask(
  task: { automationType?: string | null; automationConfig?: unknown },
  appByType: Map<string, { id: string }>
) {
  const cfg = (task.automationConfig ?? {}) as Record<string, unknown>
  const appId = typeof cfg.appId === 'string' ? cfg.appId : null
  if (appId) return appId

  const appType = typeof cfg.appType === 'string' ? cfg.appType : null
  if (appType) {
    const app = appByType.get(appType)
    return app?.id ?? null
  }

  if (task.automationType === 'provision_google') {
    const app = appByType.get('GOOGLE_WORKSPACE')
    return app?.id ?? null
  }

  if (task.automationType === 'provision_slack') {
    const app = appByType.get('SLACK')
    return app?.id ?? null
  }

  return null
}

async function getProvisioningTasksForEmployee(
  prisma: any,
  employee: any,
  existingTasks: Array<{ automationType?: string | null; automationConfig?: unknown }>
): Promise<ProvisioningTaskInput[]> {
  const appsWithRules = await prisma.app.findMany({
    where: {
      archivedAt: null,
      provisioningRules: { some: { isActive: true } },
    },
    include: {
      provisioningRules: { where: { isActive: true } },
    },
  })

  if (appsWithRules.length === 0) return []

  const appByType = new Map<string, { id: string }>()
  for (const app of appsWithRules) {
    appByType.set(app.type, { id: app.id })
  }

  const existingAppIds = new Set<string>()
  for (const task of existingTasks) {
    const appId = getAppIdFromTask(task, appByType)
    if (appId) existingAppIds.add(appId)
  }

  const tasks: ProvisioningTaskInput[] = []
  for (const app of appsWithRules) {
    if (existingAppIds.has(app.id)) continue
    if (!hasMatchingProvisioningRule(employee, app.provisioningRules)) {
      continue
    }
    tasks.push({
      appId: app.id,
      name: `Provision ${app.name} access`,
      automationType: appTypeToAutomationType(app.type),
      automationConfig: { appId: app.id, appType: app.type },
    })
  }

  return tasks
}

async function syncProvisioningTasksForWorkflow(prisma: any, workflow: any) {
  if (!workflow?.employee) return workflow
  if (workflow.status === 'COMPLETED') return workflow

  const extraTasks = await getProvisioningTasksForEmployee(prisma, workflow.employee, workflow.tasks || [])
  if (extraTasks.length === 0) return workflow

  const maxSortOrder = (workflow.tasks || []).reduce((max: number, task: any) => {
    return Math.max(max, task.sortOrder || 0)
  }, 0)

  await prisma.onboardingTask.createMany({
    data: extraTasks.map((task, index) => ({
      workflowId: workflow.id,
      name: task.name,
      type: 'AUTOMATED',
      status: 'PENDING',
      automationType: task.automationType,
      automationConfig: task.automationConfig,
      sortOrder: maxSortOrder + index + 1,
    })),
  })

  return prisma.onboardingWorkflow.findUnique({
    where: { id: workflow.id },
    include: {
      employee: {
        include: {
          manager: { select: { id: true, fullName: true } },
          appAccounts: { include: { app: true } },
        },
      },
      tasks: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

export const onboardingRouter = router({
  getTaskTemplates: hrAdminProcedure
    .query(async ({ ctx }) => {
      const organization = await ensureDefaultOnboardingTemplates(ctx.prisma)
      return ctx.prisma.onboardingTaskTemplate.findMany({
        where: { organizationId: organization.id },
        orderBy: { sortOrder: 'asc' },
      })
    }),

  createTaskTemplate: hrAdminProcedure
    .input(z.object({
      kind: z.enum(['MANUAL', 'INTEGRATION']),
      name: z.string().min(1),
      description: z.string().optional(),
      integrationAppId: z.string().optional(),
      integrationAppType: z.string().optional(), // legacy
    }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ensureDefaultOnboardingTemplates(ctx.prisma)

      let app: any | null = null
      if (input.kind === 'INTEGRATION') {
        if (input.integrationAppId) {
          app = await ctx.prisma.app.findUnique({ where: { id: input.integrationAppId } })
        } else if (input.integrationAppType) {
          app = await resolveIntegrationApp(ctx.prisma, input.integrationAppType)
        }
        if (!app) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select an integration app' })
      }

      const max = await ctx.prisma.onboardingTaskTemplate.aggregate({
        where: { organizationId: organization.id },
        _max: { sortOrder: true },
      })
      const nextSort = (max._max.sortOrder ?? 0) + 1

      return ctx.prisma.onboardingTaskTemplate.create({
        data: {
          organizationId: organization.id,
          name: input.name,
          description: input.description?.trim() ? input.description.trim() : null,
          type: input.kind === 'MANUAL' ? 'MANUAL' : 'AUTOMATED',
          appId: input.kind === 'INTEGRATION' ? app!.id : null,
          appType: input.kind === 'INTEGRATION' ? app!.type : null,
          automationType:
            input.kind === 'INTEGRATION' ? appTypeToAutomationType(app!.type) : null,
          sortOrder: nextSort,
          isActive: true,
        },
      })
    }),

  updateTaskTemplate: hrAdminProcedure
    .input(z.object({
      id: z.string(),
      kind: z.enum(['MANUAL', 'INTEGRATION']).optional(),
      integrationAppId: z.string().optional(),
      integrationAppType: z.string().optional(), // legacy
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ensureDefaultOnboardingTemplates(ctx.prisma)
      const template = await ctx.prisma.onboardingTaskTemplate.findUnique({ where: { id: input.id } })
      if (!template || template.organizationId !== organization.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const kindUpdates: Record<string, unknown> = {}
      if (input.kind) {
        if (input.kind === 'MANUAL') {
          kindUpdates.type = 'MANUAL'
          kindUpdates.appId = null
          kindUpdates.appType = null
          kindUpdates.automationType = null
        } else {
          let app: any | null = null
          if (input.integrationAppId) {
            app = await ctx.prisma.app.findUnique({ where: { id: input.integrationAppId } })
          } else if (input.integrationAppType) {
            app = await resolveIntegrationApp(ctx.prisma, input.integrationAppType)
          }
          if (!app) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select an integration app' })
          kindUpdates.type = 'AUTOMATED'
          kindUpdates.appId = app.id
          kindUpdates.appType = app.type
          kindUpdates.automationType = appTypeToAutomationType(app.type)
        }
      }

      return ctx.prisma.onboardingTaskTemplate.update({
        where: { id: input.id },
        data: {
          ...kindUpdates,
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() ? input.description.trim() : null }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      })
    }),

  deleteTaskTemplate: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const organization = await ensureDefaultOnboardingTemplates(ctx.prisma)
      const template = await ctx.prisma.onboardingTaskTemplate.findUnique({ where: { id } })
      if (!template || template.organizationId !== organization.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.$transaction(async (tx: any) => {
        await tx.onboardingTaskTemplate.delete({ where: { id } })
        const remaining = await tx.onboardingTaskTemplate.findMany({
          where: { organizationId: organization.id },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        })
        for (let i = 0; i < remaining.length; i++) {
          await tx.onboardingTaskTemplate.update({
            where: { id: remaining[i].id },
            data: { sortOrder: i + 1 },
          })
        }
      })

      return { success: true }
    }),

  moveTaskTemplate: hrAdminProcedure
    .input(z.object({
      id: z.string(),
      direction: z.enum(['UP', 'DOWN']),
    }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ensureDefaultOnboardingTemplates(ctx.prisma)

      return ctx.prisma.$transaction(async (tx: any) => {
        const current = await tx.onboardingTaskTemplate.findUnique({ where: { id: input.id } })
        if (!current || current.organizationId !== organization.id) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        const neighbor = await tx.onboardingTaskTemplate.findFirst({
          where: {
            organizationId: organization.id,
            sortOrder:
              input.direction === 'UP'
                ? { lt: current.sortOrder }
                : { gt: current.sortOrder },
          },
          orderBy: { sortOrder: input.direction === 'UP' ? 'desc' : 'asc' },
        })

        if (!neighbor) return current

        await tx.onboardingTaskTemplate.update({
          where: { id: current.id },
          data: { sortOrder: neighbor.sortOrder },
        })
        await tx.onboardingTaskTemplate.update({
          where: { id: neighbor.id },
          data: { sortOrder: current.sortOrder },
        })

        return tx.onboardingTaskTemplate.findMany({
          where: { organizationId: organization.id },
          orderBy: { sortOrder: 'asc' },
        })
      })
    }),

  resetTaskTemplates: hrAdminProcedure
    .mutation(async ({ ctx }) => {
      const organization = await getOrganization()
      await ctx.prisma.onboardingTaskTemplate.deleteMany({ where: { organizationId: organization.id } })
      await ensureDefaultOnboardingTemplates(ctx.prisma)
      return { success: true }
    }),

  list: hrAdminProcedure
    .input(z.object({
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { status, page = 1, limit = 20 } = input || {}

      const where: Record<string, unknown> = {}
      if (status) where.status = status

      const [workflows, total] = await Promise.all([
        ctx.prisma.onboardingWorkflow.findMany({
          where,
          include: {
            employee: { select: { id: true, fullName: true, jobTitle: true, department: true, startDate: true, status: true } },
            tasks: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.onboardingWorkflow.count({ where }),
      ])

      return {
        workflows,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  getById: hrAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      const workflow = await ctx.prisma.onboardingWorkflow.findUnique({
        where: { id },
        include: {
          employee: {
            include: {
              manager: { select: { id: true, fullName: true } },
              appAccounts: { include: { app: true } },
            },
          },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
      })

      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const synced = await syncProvisioningTasksForWorkflow(ctx.prisma, workflow)
      return synced || workflow
    }),

  getByEmployee: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: employeeId }) => {
      return ctx.prisma.onboardingWorkflow.findFirst({
        where: { employeeId },
        include: {
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  startNew: hrAdminProcedure
    .input(z.object({
      employeeId: z.string(),
      startDate: z.string(),
      managerId: z.string().optional(),
      department: z.string().optional(),
      workEmail: z.string().optional(),
      emailProvider: z.enum(['PERSONAL', 'GOOGLE_WORKSPACE', 'CUSTOM']),
      jiraBoardId: z.string().optional(),
      jiraManager: z.boolean().optional(),
      bonus: z.string().optional(),
      probationPeriod: z.string().optional(),
      probationGoals: z.string().optional(),
      probationGoalsUrl: z.string().optional(),
      customTasks: z.array(z.object({
        name: z.string(),
        type: z.enum(['AUTOMATED', 'MANUAL']),
        automationType: z.string().optional(),
        automationConfig: z.record(z.unknown()).optional(),
        sortOrder: z.number(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const employee = await ctx.prisma.employee.findUnique({
        where: { id: input.employeeId },
        include: { manager: true },
      })

      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' })
      }

      // Update employee with start date, manager, and work email
      const updateData: any = {
        startDate: new Date(input.startDate),
        status: 'HIRED_PENDING_START',
      }

      if (input.managerId) {
        updateData.managerId = input.managerId
      }

      if (input.department !== undefined) {
        updateData.department = input.department || null
      }

      if (input.workEmail) {
        updateData.workEmail = input.workEmail
      }

      if (input.jiraBoardId !== undefined || input.jiraManager !== undefined || input.bonus !== undefined || input.probationPeriod !== undefined || input.probationGoals !== undefined || input.probationGoalsUrl !== undefined) {
        const meta = (employee.meta ?? {}) as Record<string, unknown>
        if (input.jiraBoardId) {
          meta.jiraBoardId = input.jiraBoardId
        } else {
          delete meta.jiraBoardId
        }
        if (input.jiraManager) {
          meta.jiraManager = true
        } else if (input.jiraManager === false) {
          delete meta.jiraManager
        }

        if (input.bonus !== undefined) {
          if (input.bonus) meta.bonus = input.bonus
          else delete meta.bonus
        }

        if (input.probationPeriod !== undefined) {
          if (input.probationPeriod) meta.probationPeriod = input.probationPeriod
          else delete meta.probationPeriod
        }

        if (input.probationGoals !== undefined) {
          if (input.probationGoals) meta.probationGoals = input.probationGoals
          else delete meta.probationGoals
        }

        if (input.probationGoalsUrl !== undefined) {
          if (input.probationGoalsUrl) meta.probationGoalsUrl = input.probationGoalsUrl
          else delete meta.probationGoalsUrl
        }
        updateData.meta = meta
      }

      await ctx.prisma.employee.update({
        where: { id: input.employeeId },
        data: updateData,
      })

      // Continue with workflow creation
      const updatedEmployee = await ctx.prisma.employee.findUnique({
        where: { id: input.employeeId },
        include: { manager: true },
      })

      // Check for existing active workflow
      const existingWorkflow = await ctx.prisma.onboardingWorkflow.findFirst({
        where: {
          employeeId: input.employeeId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })

      if (existingWorkflow) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Employee already has an active onboarding workflow' })
      }

      // Create workflow with tasks
      const tasks = input.customTasks || (await getDefaultOnboardingTasks(ctx.prisma, updatedEmployee || employee))

      const workflow = await ctx.prisma.onboardingWorkflow.create({
        data: {
          employeeId: input.employeeId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          accessTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          tasks: {
            create: tasks.map((task: any) => ({
              name: task.name,
              type: task.type,
              status: 'PENDING',
              automationType: task.automationType,
              automationConfig: task.automationConfig,
              sortOrder: task.sortOrder,
            })),
          },
        },
        include: { tasks: true },
      })

      // Send onboarding email to employee
      const onboardingLink = `${process.env.NEXTAUTH_URL}/welcome/${workflow.accessToken}`
      const onboardingRecipient = updatedEmployee?.workEmail || updatedEmployee!.personalEmail

      await sendOnboardingEmail({
        employeeEmail: onboardingRecipient,
        employeeName: updatedEmployee!.fullName,
        onboardingLink,
        startDate: updatedEmployee!.startDate || new Date(),
        managerName: updatedEmployee!.manager?.fullName,
        companyName: (await getOrganization()).name,
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'ONBOARDING_STARTED',
        resourceType: 'employee',
        resourceId: input.employeeId,
        metadata: { workflowId: workflow.id },
      })

      return workflow
    }),

  start: hrAdminProcedure
    .input(z.object({
      employeeId: z.string(),
      customTasks: z.array(z.object({
        name: z.string(),
        type: z.enum(['AUTOMATED', 'MANUAL']),
        automationType: z.string().optional(),
        automationConfig: z.record(z.unknown()).optional(),
        sortOrder: z.number(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const employee = await ctx.prisma.employee.findUnique({
        where: { id: input.employeeId },
        include: { manager: true },
      })

      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' })
      }

      if (!['OFFER_SIGNED', 'HIRED_PENDING_START'].includes(employee.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Employee must be in OFFER_SIGNED or HIRED_PENDING_START status'
        })
      }

      // Check for existing active workflow
      const existingWorkflow = await ctx.prisma.onboardingWorkflow.findFirst({
        where: {
          employeeId: input.employeeId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })

      if (existingWorkflow) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Employee already has an active onboarding workflow' })
      }

      // Create workflow with tasks
      const tasks = input.customTasks || (await getDefaultOnboardingTasks(ctx.prisma, employee))

      const workflow = await ctx.prisma.onboardingWorkflow.create({
        data: {
          employeeId: input.employeeId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          accessTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          tasks: {
            create: tasks.map((task: any) => ({
              name: task.name,
              type: task.type,
              status: 'PENDING',
              automationType: task.automationType,
              automationConfig: task.automationConfig,
              sortOrder: task.sortOrder,
            })),
          },
        },
        include: { tasks: true },
      })

      // Update employee status
      await ctx.prisma.employee.update({
        where: { id: input.employeeId },
        data: { status: 'HIRED_PENDING_START' },
      })

      // Send onboarding email to employee
      const onboardingLink = `${process.env.NEXTAUTH_URL}/welcome/${workflow.accessToken}`
      const onboardingRecipient = employee.workEmail || employee.personalEmail

      await sendOnboardingEmail({
        employeeEmail: onboardingRecipient,
        employeeName: employee.fullName,
        onboardingLink,
        startDate: employee.startDate || new Date(),
        managerName: employee.manager?.fullName,
        companyName: (await getOrganization()).name,
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'ONBOARDING_STARTED',
        resourceType: 'employee',
        resourceId: input.employeeId,
        metadata: { workflowId: workflow.id },
      })

      return workflow
    }),

  runAutomatedTask: hrAdminProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.onboardingTask.findUnique({
        where: { id: input.taskId },
        include: {
          workflow: { include: { employee: true } },
        },
      })

      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (task.type !== 'AUTOMATED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This is not an automated task' })
      }

      // Mark as in progress
      await ctx.prisma.onboardingTask.update({
        where: { id: task.id },
        data: {
          status: 'IN_PROGRESS',
          attempts: task.attempts + 1,
          lastAttemptAt: new Date(),
        },
      })

      const employee = task.workflow.employee

      try {
        let result: { success: boolean; error?: string }

        switch (task.automationType) {
          case 'provision_google':
            if ((task.automationConfig as any)?.appId) {
              result = await provisionEmployeeInAppById(employee, (task.automationConfig as any).appId, (ctx.user as { id: string }).id)
            } else {
              result = await provisionEmployeeInApp(employee, 'GOOGLE_WORKSPACE', (ctx.user as { id: string }).id)
            }
            break
          case 'provision_slack':
            if ((task.automationConfig as any)?.appId) {
              result = await provisionEmployeeInAppById(employee, (task.automationConfig as any).appId, (ctx.user as { id: string }).id)
            } else {
              result = await provisionEmployeeInApp(employee, 'SLACK', (ctx.user as { id: string }).id)
            }
            break
          case 'provision_standupninja': {
            const email = employee.workEmail || employee.personalEmail
            if (!email) {
              result = { success: false, error: 'Employee has no email' }
              break
            }
            const sync = await addEmployeeToStandup(email, employee.department, (ctx.user as { id: string }).id)
            result = { success: sync.success, error: sync.error }
            break
          }
          case GENERIC_PROVISION_AUTOMATION: {
            const config = (task.automationConfig as any) ?? {}
            if (typeof config.appId === 'string' && config.appId) {
              result = await provisionEmployeeInAppById(employee, config.appId, (ctx.user as { id: string }).id)
              break
            }
            const appType = config.appType as string | undefined
            if (!appType) {
              result = { success: false, error: 'Missing automationConfig.appId/appType for this task' }
              break
            }
            const app = await resolveIntegrationApp(ctx.prisma, appType)
            result = await provisionEmployeeInApp(employee, app.type, (ctx.user as { id: string }).id)
            break
          }
          default:
            result = { success: false, error: `Unknown automation type: ${task.automationType}` }
        }

        await ctx.prisma.onboardingTask.update({
          where: { id: task.id },
          data: {
            status: result.success
              ? 'SUCCESS'
              : result.error?.toLowerCase().includes('no active connection')
                ? 'PENDING'
                : 'FAILED',
            statusMessage: result.success
              ? null
              : result.error?.toLowerCase().includes('no active connection')
                ? 'Application not connected. Connect it in Settings → Applications, then run again (or skip).'
                : result.error,
            completedAt: result.success ? new Date() : undefined,
          },
        })

        await createAuditLog({
          actorId: (ctx.user as { id: string }).id,
          action: 'ONBOARDING_TASK_COMPLETED',
          resourceType: 'onboarding_task',
          resourceId: task.id,
          metadata: {
            taskName: task.name,
            automationType: task.automationType,
            success: result.success,
            error: result.error,
          },
        })

        // Check if all tasks are complete
        await checkAndCompleteWorkflow(ctx.prisma, task.workflowId)

        return { success: result.success, error: result.error }
      } catch (error) {
        await ctx.prisma.onboardingTask.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            statusMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })

        throw error
      }
    }),

  completeManualTask: hrAdminProcedure
    .input(z.object({
      taskId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.onboardingTask.findUnique({
        where: { id: input.taskId },
      })

      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.onboardingTask.update({
        where: { id: task.id },
        data: {
          status: 'SUCCESS',
          statusMessage: input.notes,
          completedAt: new Date(),
          completedBy: (ctx.user as { id: string }).id,
        },
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'ONBOARDING_TASK_COMPLETED',
        resourceType: 'onboarding_task',
        resourceId: task.id,
        metadata: { taskName: task.name, manual: true },
      })

      // Check if all tasks are complete
      await checkAndCompleteWorkflow(ctx.prisma, task.workflowId)

      return { success: true }
    }),

  skipTask: hrAdminProcedure
    .input(z.object({
      taskId: z.string(),
      reason: z.string(),
      sendByodAgreement: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.onboardingTask.findUnique({
        where: { id: input.taskId },
        include: {
          workflow: {
            include: {
              employee: {
                select: {
                  id: true,
                  fullName: true,
                  personalEmail: true,
                  workEmail: true,
                  jobTitle: true,
                  department: true,
                },
              },
            },
          },
        },
      })

      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.onboardingTask.update({
        where: { id: task.id },
        data: {
          status: 'SKIPPED',
          statusMessage: input.reason,
          completedAt: new Date(),
          completedBy: (ctx.user as { id: string }).id,
        },
      })

      // Send BYOD agreement if requested
      if (input.sendByodAgreement && task.workflow?.employee) {
        const employee = task.workflow.employee
        const candidateEmail = employee.workEmail || employee.personalEmail

        if (candidateEmail) {
          // Find the BYOD template
          const byodTemplate = await ctx.prisma.offerTemplate.findFirst({
            where: {
              name: { contains: 'BYOD', mode: 'insensitive' },
              isActive: true,
            },
          })

          if (byodTemplate) {
            // Create the BYOD agreement offer
            const byodOffer = await ctx.prisma.offer.create({
              data: {
                employeeId: employee.id,
                candidateEmail,
                candidateName: employee.fullName,
                templateId: byodTemplate.id,
                variables: {
                  employee_name: employee.fullName,
                  department: employee.department || 'N/A',
                  job_title: employee.jobTitle || 'N/A',
                  device_model: 'To be provided by employee',
                  serial_number: 'N/A',
                  charger_serial: 'N/A',
                  imei_number: 'N/A',
                  signature_date: new Date().toISOString().split('T')[0],
                },
                status: 'DRAFT',
                notes: 'BYOD Agreement - Auto-created when device provisioning was skipped',
              },
            })

            // Log event
            await ctx.prisma.offerEvent.create({
              data: {
                offerId: byodOffer.id,
                type: 'created',
                description: 'BYOD agreement created during onboarding (device task skipped)',
              },
            })
          }
        }
      }

      // Check if all tasks are complete
      await checkAndCompleteWorkflow(ctx.prisma, task.workflowId)

      return { success: true, byodAgreementCreated: input.sendByodAgreement || false }
    }),

  // Public endpoint for employee self-service onboarding
  getByToken: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: token }) => {
      const workflow = await ctx.prisma.onboardingWorkflow.findUnique({
        where: { accessToken: token },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              personalEmail: true,
              startDate: true,
              jobTitle: true,
              department: true,
              location: true,
              employmentType: true,
              // Personal Details
              gender: true,
              maritalStatus: true,
              dateOfBirth: true,
              nationality: true,
              taxId: true,
              // Address & Contact
              addressStreet: true,
              addressCity: true,
              addressState: true,
              addressPostal: true,
              addressCountry: true,
              phone: true,
              // Emergency Contact
              emergencyContactName: true,
              emergencyContactRelation: true,
              emergencyContactPhone: true,
              profileImageUrl: true,
              // Bank Details
              bankName: true,
              accountName: true,
              accountNumber: true,
              accountSortCode: true,
              manager: { select: { fullName: true } },
              // Former Employment (for full-time employees)
              formerOfferLetterUrl: true,
              formerLastPayslipUrl: true,
              formerResignationLetterUrl: true,
              formerResignationConfirmUrl: true,
              formerHrContactName: true,
              formerHrContactPhone: true,
              formerHrContactEmail: true,
              formerCompanyAddress: true,
              formerEmploymentSubmittedAt: true,
              // Personality & Values
              lifeValues: true,
              knowAboutMe: true,
              mbtiType: true,
              mbtiImageUrl: true,
              bigFiveUrl: true,
              bigFiveImageUrl: true,
              personalityCompleted: true,
              personalityCompletedAt: true,
            },
          },
          tasks: {
            where: { type: 'MANUAL' },
            select: { name: true, status: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired link' })
      }

      if (workflow.accessTokenExpiresAt && workflow.accessTokenExpiresAt < new Date()) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'This link has expired' })
      }

      return workflow
    }),

  updateEmployeeInfo: publicProcedure
    .input(z.object({
      token: z.string(),
      // Personal Details
      gender: z.string().optional(),
      maritalStatus: z.string().optional(),
      dateOfBirth: z.string().optional(),
      nationality: z.string().optional(),
      taxId: z.string().optional(),
      // Address & Contact
      addressStreet: z.string().optional(),
      addressCity: z.string().optional(),
      addressState: z.string().optional(),
      addressPostal: z.string().optional(),
      addressCountry: z.string().optional(),
      phone: z.string().optional(),
      // Emergency Contact
      emergencyContactName: z.string().optional(),
      emergencyContactRelation: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      // Bank Details
      bankName: z.string().optional(),
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      accountSortCode: z.string().optional(),
      profileImageUrl: z.string().optional(),
      // Former Employment (for full-time employees)
      formerOfferLetterUrl: z.string().optional(),
      formerLastPayslipUrl: z.string().optional(),
      formerResignationLetterUrl: z.string().optional(),
      formerResignationConfirmUrl: z.string().optional(),
      formerHrContactName: z.string().optional(),
      formerHrContactPhone: z.string().optional(),
      formerHrContactEmail: z.string().optional(),
      formerCompanyAddress: z.string().optional(),
      // Personality & Values
      lifeValues: z.object({
        mostImportant: z.string(),
        important: z.string(),
        somewhatImportant: z.string(),
        notImportant: z.string(),
      }).optional(),
      knowAboutMe: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })).optional(),
      // MBTI
      mbtiType: z.string().optional(),
      mbtiImageUrl: z.string().optional(),
      // Big Five
      bigFiveUrl: z.string().optional(),
      bigFiveImageUrl: z.string().optional(),
      personalityCompleted: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const {
        token,
        profileImageUrl,
        personalityCompleted,
        dateOfBirth,
        formerOfferLetterUrl,
        formerLastPayslipUrl,
        formerResignationLetterUrl,
        formerResignationConfirmUrl,
        formerHrContactName,
        formerHrContactPhone,
        formerHrContactEmail,
        formerCompanyAddress,
        mbtiType,
        mbtiImageUrl,
        bigFiveUrl,
        bigFiveImageUrl,
        ...data
      } = input

      const workflow = await ctx.prisma.onboardingWorkflow.findUnique({
        where: { accessToken: token },
      })

      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (workflow.accessTokenExpiresAt && workflow.accessTokenExpiresAt < new Date()) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'This link has expired' })
      }

      const updateData: Record<string, unknown> = { ...data }

      // Handle profile image URL
      if (profileImageUrl !== undefined) {
        const trimmed = profileImageUrl.trim()
        updateData.profileImageUrl = trimmed ? trimmed : null
      }

      // Handle date of birth conversion
      if (dateOfBirth !== undefined) {
        updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
      }

      // Handle former employment fields
      if (formerOfferLetterUrl !== undefined) updateData.formerOfferLetterUrl = formerOfferLetterUrl || null
      if (formerLastPayslipUrl !== undefined) updateData.formerLastPayslipUrl = formerLastPayslipUrl || null
      if (formerResignationLetterUrl !== undefined) updateData.formerResignationLetterUrl = formerResignationLetterUrl || null
      if (formerResignationConfirmUrl !== undefined) updateData.formerResignationConfirmUrl = formerResignationConfirmUrl || null
      if (formerHrContactName !== undefined) updateData.formerHrContactName = formerHrContactName || null
      if (formerHrContactPhone !== undefined) updateData.formerHrContactPhone = formerHrContactPhone || null
      if (formerHrContactEmail !== undefined) updateData.formerHrContactEmail = formerHrContactEmail || null
      if (formerCompanyAddress !== undefined) updateData.formerCompanyAddress = formerCompanyAddress || null

      // Track when former employment data is first submitted
      const hasFormerEmploymentData = formerOfferLetterUrl || formerLastPayslipUrl ||
        formerResignationLetterUrl || formerResignationConfirmUrl ||
        formerHrContactName || formerHrContactPhone ||
        formerHrContactEmail || formerCompanyAddress

      if (hasFormerEmploymentData) {
        updateData.formerEmploymentSubmittedAt = new Date()
      }

      // Handle MBTI and Big Five fields
      if (mbtiType !== undefined) updateData.mbtiType = mbtiType || null
      if (mbtiImageUrl !== undefined) updateData.mbtiImageUrl = mbtiImageUrl || null
      if (bigFiveUrl !== undefined) updateData.bigFiveUrl = bigFiveUrl || null
      if (bigFiveImageUrl !== undefined) updateData.bigFiveImageUrl = bigFiveImageUrl || null

      // Handle personality completion
      if (personalityCompleted) {
        updateData.personalityCompleted = true
        updateData.personalityCompletedAt = new Date()
      }

      await ctx.prisma.employee.update({
        where: { id: workflow.employeeId },
        data: updateData,
      })

      return { success: true }
    }),

  // ============================================================
  // Google Sheets-backed onboarding dashboard
  // ============================================================

  // Fetch onboarding roster from Google Sheet
  getSheetRoster: hrAdminProcedure
    .query(async ({ ctx }): Promise<{ roster: OnboardingRosterRow[]; error?: string; fetchedAt: string }> => {
      try {
        // Get sheet ID from settings
        const settings = await ctx.prisma.onboardingSettings.findFirst()
        const sheetId = settings?.sheetId || undefined

        const sheetsService = getGoogleSheetsService(sheetId ? { spreadsheetId: sheetId } : undefined)
        const roster = await sheetsService.fetchOnboardingRoster()
        return {
          roster,
          fetchedAt: new Date().toISOString(),
        }
      } catch (error) {
        console.error('Failed to fetch onboarding roster from Google Sheet:', error)
        return {
          roster: [],
          error: error instanceof Error ? error.message : 'Failed to fetch roster from Google Sheet',
          fetchedAt: new Date().toISOString(),
        }
      }
    }),

  // Get task catalog - tries Google Sheet first, falls back to static
  getTaskCatalog: hrAdminProcedure
    .query(async ({ ctx }): Promise<{
      tasks: OnboardingTask[]
      sections: typeof TASK_SECTIONS
      source: 'sheet' | 'static'
      error?: string
      lastSynced?: string
    }> => {
      try {
        // Get sheet ID from settings and clean it
        const settings = await ctx.prisma.onboardingSettings.findFirst()
        const rawSheetId = settings?.sheetId
        const sheetId = rawSheetId ? extractSpreadsheetId(rawSheetId) : null

        console.log('[getTaskCatalog] Raw sheet ID:', rawSheetId)
        console.log('[getTaskCatalog] Cleaned sheet ID:', sheetId)

        if (sheetId) {
          const sheetsService = getGoogleSheetsService({ spreadsheetId: sheetId })

          // Check if Task Catalog sheet exists (case-insensitive)
          const sheetNames = await sheetsService.getSheetNames()
          const hasTaskCatalog = sheetNames.some(name => name.toLowerCase().trim() === 'task catalog')

          if (!hasTaskCatalog && sheetNames.length > 0) {
            // Sheet exists but no Task Catalog tab - provide helpful message
            return {
              tasks: ONBOARDING_TASKS,
              sections: TASK_SECTIONS,
              source: 'static',
              error: `Task Catalog sheet not found. Found sheets: ${sheetNames.join(', ')}`,
            }
          }

          if (hasTaskCatalog) {
            const sheetTasks = await sheetsService.fetchTaskCatalog()

            if (sheetTasks.length > 0) {
              // Convert TaskCatalogRow to OnboardingTask format
              const tasks: OnboardingTask[] = sheetTasks.map((row) => ({
                id: row.id,
                section: row.section,
                title: row.title,
                url: row.url,
                notes: row.notes,
                isConditional: row.isConditional,
                conditionalLabel: row.conditionalLabel,
                appliesTo: row.appliesTo,
              }))

              return {
                tasks,
                sections: TASK_SECTIONS,
                source: 'sheet',
                lastSynced: new Date().toISOString(),
              }
            }
          }
        }

        // Fallback to static tasks
        return {
          tasks: ONBOARDING_TASKS,
          sections: TASK_SECTIONS,
          source: 'static',
        }
      } catch (error) {
        console.error('Failed to fetch task catalog from sheet:', error)
        // Fallback to static tasks on error
        return {
          tasks: ONBOARDING_TASKS,
          sections: TASK_SECTIONS,
          source: 'static',
          error: error instanceof Error ? error.message : 'Failed to fetch from sheet',
        }
      }
    }),

  // Force sync task catalog from Google Sheet
  syncTaskCatalog: hrAdminProcedure
    .mutation(async ({ ctx }): Promise<{
      success: boolean
      taskCount: number
      source: 'sheet' | 'static'
      error?: string
      debug?: {
        rawSheetId?: string | null
        cleanedSheetId?: string | null
        foundSheets?: string[]
        apiError?: string
        serviceAccountEmail?: string | null
      }
    }> => {
      const debug: {
        rawSheetId?: string | null
        cleanedSheetId?: string | null
        foundSheets?: string[]
        apiError?: string
        serviceAccountEmail?: string | null
      } = {}

      try {
        const settings = await ctx.prisma.onboardingSettings.findFirst()
        const rawSheetId = settings?.sheetId
        const sheetId = rawSheetId ? extractSpreadsheetId(rawSheetId) : null

        debug.rawSheetId = rawSheetId
        debug.cleanedSheetId = sheetId

        console.log('[syncTaskCatalog] Raw sheet ID:', rawSheetId)
        console.log('[syncTaskCatalog] Cleaned sheet ID:', sheetId)

        if (!sheetId) {
          return {
            success: false,
            taskCount: ONBOARDING_TASKS.length,
            source: 'static',
            error: 'No Google Sheet configured. Using static task list.',
            debug,
          }
        }

        const sheetsService = getGoogleSheetsService({ spreadsheetId: sheetId })

        // Get service account email for debugging
        const serviceAccountEmail = await sheetsService.getServiceAccountEmail()
        debug.serviceAccountEmail = serviceAccountEmail

        let sheetNames: string[] = []
        try {
          sheetNames = await sheetsService.getSheetNames()
          debug.foundSheets = sheetNames
          console.log('[syncTaskCatalog] Found sheets:', sheetNames)
        } catch (apiError: any) {
          const errorMsg = apiError?.response?.data?.error?.message || apiError?.message || String(apiError)
          debug.apiError = errorMsg
          console.error('[syncTaskCatalog] API error getting sheet names:', errorMsg)

          // Provide helpful error message for permission issues
          let helpText = ''
          if (errorMsg.includes('unauthorized_client') || errorMsg.includes('403') || errorMsg.includes('permission')) {
            helpText = serviceAccountEmail
              ? ` Share the sheet with: ${serviceAccountEmail}`
              : ' Check Google Workspace domain-wide delegation settings.'
          }

          return {
            success: false,
            taskCount: ONBOARDING_TASKS.length,
            source: 'static',
            error: `Google Sheets API error: ${errorMsg}${helpText}`,
            debug,
          }
        }

        const hasTaskCatalog = sheetNames.some(name => name.toLowerCase().trim() === 'task catalog')

        if (!hasTaskCatalog) {
          return {
            success: false,
            taskCount: ONBOARDING_TASKS.length,
            source: 'static',
            error: `Task Catalog sheet not found. Found sheets: ${sheetNames.join(', ') || 'none'}. Create a "Task Catalog" tab in your Google Sheet.`,
            debug,
          }
        }

        const sheetTasks = await sheetsService.fetchTaskCatalog()

        if (sheetTasks.length === 0) {
          return {
            success: false,
            taskCount: ONBOARDING_TASKS.length,
            source: 'static',
            error: 'Task Catalog sheet is empty. Add tasks starting from row 2.',
            debug,
          }
        }

        return {
          success: true,
          taskCount: sheetTasks.length,
          source: 'sheet',
          debug,
        }
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error?.message || error?.message || String(error)
        debug.apiError = errorMsg
        console.error('Failed to sync task catalog:', errorMsg)
        return {
          success: false,
          taskCount: ONBOARDING_TASKS.length,
          source: 'static',
          error: `Failed to sync: ${errorMsg}`,
          debug,
        }
      }
    }),

  // Get task progress for an employee from Google Sheet
  getEmployeeTaskProgress: hrAdminProcedure
    .input(z.object({
      visId: z.string().optional(),
      email: z.string().optional(),
      fullName: z.string().optional(),
    }))
    .query(async ({ ctx, input }): Promise<{
      progress: TaskProgressRow[]
      error?: string
    }> => {
      if (!input.visId && !input.email && !input.fullName) {
        return { progress: [], error: 'Either visId, email, or fullName is required' }
      }

      try {
        const settings = await ctx.prisma.onboardingSettings.findFirst()
        const sheetId = settings?.sheetId

        if (!sheetId) {
          return { progress: [], error: 'No Google Sheet configured' }
        }

        const sheetsService = getGoogleSheetsService({ spreadsheetId: sheetId })
        const hasProgressSheet = await sheetsService.sheetExists('Task Progress')

        if (!hasProgressSheet) {
          return { progress: [], error: 'Task Progress sheet not found' }
        }

        // Try to find by visId first, then email, then name
        const searchKey = input.visId || input.email || input.fullName || ''
        const progress = await sheetsService.fetchTaskProgress(searchKey)

        return { progress }
      } catch (error) {
        console.error('Failed to fetch task progress:', error)
        return {
          progress: [],
          error: error instanceof Error ? error.message : 'Failed to fetch progress',
        }
      }
    }),

  // Get all task progress (for dashboard/reports)
  getAllTaskProgress: hrAdminProcedure
    .query(async ({ ctx }): Promise<{
      progress: TaskProgressRow[]
      error?: string
    }> => {
      try {
        const settings = await ctx.prisma.onboardingSettings.findFirst()
        const sheetId = settings?.sheetId

        if (!sheetId) {
          return { progress: [], error: 'No Google Sheet configured' }
        }

        const sheetsService = getGoogleSheetsService({ spreadsheetId: sheetId })
        const hasProgressSheet = await sheetsService.sheetExists('Task Progress')

        if (!hasProgressSheet) {
          return { progress: [], error: 'Task Progress sheet not found' }
        }

        const progress = await sheetsService.fetchAllTaskProgress()
        return { progress }
      } catch (error) {
        console.error('Failed to fetch all task progress:', error)
        return {
          progress: [],
          error: error instanceof Error ? error.message : 'Failed to fetch progress',
        }
      }
    }),

  // Get employee onboarding data from Google Sheet by employee ID
  getEmployeeSheetData: hrAdminProcedure
    .input(z.object({ visId: z.string().optional(), email: z.string().optional(), fullName: z.string().optional() }))
    .query(async ({ ctx, input }): Promise<{ data: OnboardingRosterRow | null; error?: string }> => {
      if (!input.visId && !input.email && !input.fullName) {
        return { data: null, error: 'Either visId, email, or fullName is required' }
      }

      try {
        // Get sheet ID from settings
        const settings = await ctx.prisma.onboardingSettings.findFirst()
        const sheetId = settings?.sheetId || undefined

        console.log('[getEmployeeSheetData] Using sheet ID:', sheetId || 'DEFAULT (env)')
        console.log('[getEmployeeSheetData] Searching for:', { fullName: input.fullName, email: input.email, visId: input.visId })

        const sheetsService = getGoogleSheetsService(sheetId ? { spreadsheetId: sheetId } : undefined)
        const roster = await sheetsService.fetchOnboardingRoster()

        // Debug: log what's in the sheet
        console.log('[getEmployeeSheetData] Sheet returned', roster.length, 'rows')
        if (roster.length > 0) {
          console.log('[getEmployeeSheetData] Rows:', roster.map(r => ({ userId: r.userId, name: r.name, completionPercent: r.completionPercent })))
        }

        // Find the employee by visId, fullName, or email
        const employee = roster.find((row) => {
          const sheetName = row.name.toLowerCase().trim()
          const inputName = input.fullName?.toLowerCase().trim() || ''

          // Match by visId (userId column in sheet)
          if (input.visId && row.userId === input.visId) return true

          // Match by full name - exact match
          if (inputName && sheetName === inputName) return true

          // Match by full name - sheet name is contained in input (e.g., sheet has "Goody", db has "Goody Adeleke")
          if (inputName && inputName.includes(sheetName) && sheetName.length > 2) return true

          // Match by full name - input is contained in sheet name (e.g., db has "Goody", sheet has "Goody Adeleke")
          if (inputName && sheetName.includes(inputName) && inputName.length > 2) return true

          // Match by first name (first word of full name)
          if (inputName) {
            const inputFirstName = inputName.split(' ')[0]
            const sheetFirstName = sheetName.split(' ')[0]
            if (inputFirstName === sheetFirstName && inputFirstName.length > 2) return true
          }

          // Fallback: match email prefix in name column
          if (input.email && sheetName.includes(input.email.toLowerCase().split('@')[0])) return true

          return false
        })

        if (employee) {
          console.log('[getEmployeeSheetData] Found match:', employee.name, 'completion:', employee.completionPercent)
        } else {
          console.log('[getEmployeeSheetData] No match found for:', input.fullName)
        }

        return { data: employee || null }
      } catch (error) {
        console.error('Failed to fetch employee sheet data:', error)
        return {
          data: null,
          error: error instanceof Error ? error.message : 'Failed to fetch from Google Sheet',
        }
      }
    }),

  // ============================================================
  // Onboarding Settings
  // ============================================================

  // Get onboarding settings
  getSettings: hrAdminProcedure.query(async ({ ctx }) => {
    let settings = await ctx.prisma.onboardingSettings.findFirst()

    // Create default settings if none exist
    if (!settings) {
      settings = await ctx.prisma.onboardingSettings.create({
        data: {
          sheetId: null,
          sheetRosterRange: 'Status!A2:J',
          sheetRefreshMs: 30000,
        },
      })
    }

    return settings
  }),

  // Update onboarding settings
  updateSettings: hrAdminProcedure
    .input(
      z.object({
        sheetId: z.string().optional().nullable(),
        sheetRosterRange: z.string().optional(),
        sheetRefreshMs: z.number().min(5000).max(300000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let settings = await ctx.prisma.onboardingSettings.findFirst()

      if (!settings) {
        settings = await ctx.prisma.onboardingSettings.create({
          data: {
            sheetId: input.sheetId ?? null,
            sheetRosterRange: input.sheetRosterRange ?? 'Status!A2:J',
            sheetRefreshMs: input.sheetRefreshMs ?? 30000,
          },
        })
      } else {
        settings = await ctx.prisma.onboardingSettings.update({
          where: { id: settings.id },
          data: {
            ...(input.sheetId !== undefined && { sheetId: input.sheetId }),
            ...(input.sheetRosterRange && { sheetRosterRange: input.sheetRosterRange }),
            ...(input.sheetRefreshMs && { sheetRefreshMs: input.sheetRefreshMs }),
          },
        })
      }

      return settings
    }),

  // Test Google Sheet connection
  testSheetConnection: hrAdminProcedure
    .input(z.object({ sheetId: z.string() }))
    .mutation(async ({ input }): Promise<{ success: boolean; rowCount?: number; error?: string }> => {
      try {
        const sheetsService = getGoogleSheetsService({ spreadsheetId: input.sheetId })
        const roster = await sheetsService.fetchOnboardingRoster()
        return {
          success: true,
          rowCount: roster.length,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to connect to Google Sheet',
        }
      }
    }),
})

async function checkAndCompleteWorkflow(prisma: typeof import('@/lib/prisma').default, workflowId: string) {
  const workflow = await prisma.onboardingWorkflow.findUnique({
    where: { id: workflowId },
    include: { tasks: true },
  })

  if (!workflow) return

  const incompleteTasks = workflow.tasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'FAILED'
  )

  if (incompleteTasks.length === 0) {
    await prisma.onboardingWorkflow.update({
      where: { id: workflowId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Update employee status to ACTIVE
    const employee = await prisma.employee.update({
      where: { id: workflow.employeeId },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        workEmail: true,
        personalEmail: true,
        department: true,
      },
    })

    await createAuditLog({
      actorType: 'system',
      action: 'ONBOARDING_COMPLETED',
      resourceType: 'employee',
      resourceId: workflow.employeeId,
      metadata: { workflowId },
    })
  }
}
