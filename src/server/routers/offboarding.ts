import { z } from 'zod'
import { router, hrAdminProcedure } from '@/lib/trpc'
import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { createAuditLog } from '@/lib/audit'
import { deprovisionEmployeeInApp, deprovisionEmployeeInAppById, deprovisionEmployeeFromAllApps } from '@/lib/integrations'
import { getOrganization } from '@/lib/organization'
import { removeEmployeeFromStandup } from '@/lib/integrations/standup-sync'

const DEFAULT_OFFBOARDING_TASK_TEMPLATES = [
  { name: 'Collect company equipment', type: 'MANUAL' as const, sortOrder: 1 },
  { name: 'Revoke building/office access', type: 'MANUAL' as const, sortOrder: 2 },
  { name: 'Transfer files and documents', type: 'MANUAL' as const, sortOrder: 3 },
  { name: 'Exit interview', type: 'MANUAL' as const, sortOrder: 4 },
  { name: 'Deprovision Google Workspace account', type: 'AUTOMATED' as const, appType: 'GOOGLE_WORKSPACE' as const, sortOrder: 10 },
  { name: 'Deprovision Slack account', type: 'AUTOMATED' as const, appType: 'SLACK' as const, sortOrder: 11 },
  { name: 'Remove from StandupNinja teams', type: 'AUTOMATED' as const, appType: 'STANDUPNINJA' as const, sortOrder: 12 },
]

const DEFAULT_OFFBOARDING_EMPLOYEE_TASKS = [
  { name: 'Handover Docs', description: null as string | null, sortOrder: 1 },
]

async function ensureDefaultOffboardingTemplates(prisma: any) {
  const organization = await getOrganization()
  const existingCount = await prisma.offboardingTaskTemplate.count({
    where: { organizationId: organization.id },
  })

  if (existingCount > 0) return organization

  // Ensure default apps exist (avoid creating duplicate per-type placeholder records).
  const defaultAppNames: Record<string, { name: string; description: string | null }> = {
    GOOGLE_WORKSPACE: {
      name: 'Google Workspace',
      description: 'Provision Google Workspace accounts, groups, and organizational units',
    },
    SLACK: {
      name: 'Slack',
      description: 'Provision Slack workspace access and channel memberships',
    },
  }
  for (const t of DEFAULT_OFFBOARDING_TASK_TEMPLATES) {
    if (t.type !== 'AUTOMATED') continue
    const meta = defaultAppNames[t.appType]
    if (!meta) continue
    await prisma.app.upsert({
      where: { type_name: { type: t.appType, name: meta.name } },
      create: { type: t.appType, name: meta.name, description: meta.description },
      update: { description: meta.description },
    })
  }

  await prisma.offboardingTaskTemplate.createMany({
    data: DEFAULT_OFFBOARDING_TASK_TEMPLATES.map((t) => ({
      organizationId: organization.id,
      name: t.name,
      description: null,
      type: t.type,
      automationType: t.type === 'AUTOMATED' ? 'deprovision_app' : null,
      appType: t.type === 'AUTOMATED' ? t.appType : null,
      sortOrder: t.sortOrder,
      isActive: true,
    })),
  })

  return organization
}

async function ensureDefaultOffboardingEmployeeTasks(prisma: any) {
  const organization = await getOrganization()
  const existingCount = await prisma.offboardingEmployeeTask.count({
    where: { organizationId: organization.id },
  })

  if (existingCount > 0) return organization

  await prisma.offboardingEmployeeTask.createMany({
    data: DEFAULT_OFFBOARDING_EMPLOYEE_TASKS.map((task) => ({
      organizationId: organization.id,
      name: task.name,
      description: task.description,
      sortOrder: task.sortOrder,
      isActive: true,
    })),
  })

  return organization
}

async function resolveIntegrationApp(prisma: any, appType: string) {
  const app = await prisma.app.findFirst({ where: { type: appType } })
  if (!app) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown integration app: ${appType}` })
  }
  return app
}

async function buildOffboardingTasksFromTemplates(prisma: any, templates: any[]) {
  const tasks: Array<{
    name: string
    type: 'MANUAL' | 'AUTOMATED'
    sortOrder: number
    automationType?: string
    appId?: string
  }> = []

  let i = 1
  for (const template of templates) {
    if (template.type === 'MANUAL') {
      tasks.push({ name: template.name, type: 'MANUAL', sortOrder: i++ })
      continue
    }

    const app =
      template.appId
        ? await prisma.app.findUnique({ where: { id: template.appId } })
        : template.appType
          ? await prisma.app.findFirst({ where: { type: template.appType } })
          : null
    if (!app) continue

    tasks.push({
      name: template.name,
      type: 'AUTOMATED',
      automationType:
        app.type === 'STANDUPNINJA'
          ? 'deprovision_standupninja'
          : template.automationType || 'deprovision_app',
      appId: app.id,
      sortOrder: i++,
    })
  }

  return tasks
}

export const offboardingRouter = router({
  getTaskTemplates: hrAdminProcedure
    .query(async ({ ctx }) => {
      const organization = await ensureDefaultOffboardingTemplates(ctx.prisma)
      return ctx.prisma.offboardingTaskTemplate.findMany({
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
      const organization = await ensureDefaultOffboardingTemplates(ctx.prisma)

      let app: any | null = null
      if (input.kind === 'INTEGRATION') {
        if (input.integrationAppId) {
          app = await ctx.prisma.app.findUnique({ where: { id: input.integrationAppId } })
        } else if (input.integrationAppType) {
          app = await resolveIntegrationApp(ctx.prisma, input.integrationAppType)
        }
        if (!app) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Select an integration app' })
      }

      const max = await ctx.prisma.offboardingTaskTemplate.aggregate({
        where: { organizationId: organization.id },
        _max: { sortOrder: true },
      })
      const nextSort = (max._max.sortOrder ?? 0) + 1

      return ctx.prisma.offboardingTaskTemplate.create({
        data: {
          organizationId: organization.id,
          name: input.name,
          description: input.description?.trim() ? input.description.trim() : null,
          type: input.kind === 'MANUAL' ? 'MANUAL' : 'AUTOMATED',
          appId: input.kind === 'INTEGRATION' ? app!.id : null,
          appType: input.kind === 'INTEGRATION' ? app!.type : null,
          automationType:
            input.kind === 'INTEGRATION'
              ? app!.type === 'STANDUPNINJA'
                ? 'deprovision_standupninja'
                : 'deprovision_app'
              : null,
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
      const organization = await ensureDefaultOffboardingTemplates(ctx.prisma)
      const template = await ctx.prisma.offboardingTaskTemplate.findUnique({ where: { id: input.id } })
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
          kindUpdates.automationType = app.type === 'STANDUPNINJA' ? 'deprovision_standupninja' : 'deprovision_app'
        }
      }

      return ctx.prisma.offboardingTaskTemplate.update({
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
      const organization = await ensureDefaultOffboardingTemplates(ctx.prisma)
      const template = await ctx.prisma.offboardingTaskTemplate.findUnique({ where: { id } })
      if (!template || template.organizationId !== organization.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.$transaction(async (tx: any) => {
        await tx.offboardingTaskTemplate.delete({ where: { id } })
        const remaining = await tx.offboardingTaskTemplate.findMany({
          where: { organizationId: organization.id },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        })
        for (let i = 0; i < remaining.length; i++) {
          await tx.offboardingTaskTemplate.update({
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
      const organization = await ensureDefaultOffboardingTemplates(ctx.prisma)

      return ctx.prisma.$transaction(async (tx: any) => {
        const current = await tx.offboardingTaskTemplate.findUnique({ where: { id: input.id } })
        if (!current || current.organizationId !== organization.id) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        const neighbor = await tx.offboardingTaskTemplate.findFirst({
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

        await tx.offboardingTaskTemplate.update({
          where: { id: current.id },
          data: { sortOrder: neighbor.sortOrder },
        })
        await tx.offboardingTaskTemplate.update({
          where: { id: neighbor.id },
          data: { sortOrder: current.sortOrder },
        })

        return tx.offboardingTaskTemplate.findMany({
          where: { organizationId: organization.id },
          orderBy: { sortOrder: 'asc' },
        })
      })
    }),

  resetTaskTemplates: hrAdminProcedure
    .mutation(async ({ ctx }) => {
      const organization = await getOrganization()
      await ctx.prisma.offboardingTaskTemplate.deleteMany({ where: { organizationId: organization.id } })
      await ensureDefaultOffboardingTemplates(ctx.prisma)
      return { success: true }
    }),

  getEmployeeTasks: hrAdminProcedure
    .query(async ({ ctx }) => {
      const organization = await ensureDefaultOffboardingEmployeeTasks(ctx.prisma)
      return ctx.prisma.offboardingEmployeeTask.findMany({
        where: { organizationId: organization.id },
        orderBy: { sortOrder: 'asc' },
      })
    }),

  createEmployeeTask: hrAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ensureDefaultOffboardingEmployeeTasks(ctx.prisma)
      const max = await ctx.prisma.offboardingEmployeeTask.aggregate({
        where: { organizationId: organization.id },
        _max: { sortOrder: true },
      })
      const nextSort = (max._max.sortOrder ?? 0) + 1

      return ctx.prisma.offboardingEmployeeTask.create({
        data: {
          organizationId: organization.id,
          name: input.name.trim(),
          description: input.description?.trim() ? input.description.trim() : null,
          sortOrder: nextSort,
          isActive: true,
        },
      })
    }),

  updateEmployeeTask: hrAdminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ensureDefaultOffboardingEmployeeTasks(ctx.prisma)
      const task = await ctx.prisma.offboardingEmployeeTask.findUnique({ where: { id: input.id } })
      if (!task || task.organizationId !== organization.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return ctx.prisma.offboardingEmployeeTask.update({
        where: { id: input.id },
        data: {
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() ? input.description.trim() : null }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      })
    }),

  deleteEmployeeTask: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const organization = await ensureDefaultOffboardingEmployeeTasks(ctx.prisma)
      const task = await ctx.prisma.offboardingEmployeeTask.findUnique({ where: { id } })
      if (!task || task.organizationId !== organization.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.$transaction(async (tx: any) => {
        await tx.offboardingEmployeeTask.delete({ where: { id } })
        const remaining = await tx.offboardingEmployeeTask.findMany({
          where: { organizationId: organization.id },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        })
        for (let i = 0; i < remaining.length; i++) {
          await tx.offboardingEmployeeTask.update({
            where: { id: remaining[i].id },
            data: { sortOrder: i + 1 },
          })
        }
      })

      return { success: true }
    }),

  moveEmployeeTask: hrAdminProcedure
    .input(z.object({
      id: z.string(),
      direction: z.enum(['UP', 'DOWN']),
    }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ensureDefaultOffboardingEmployeeTasks(ctx.prisma)

      return ctx.prisma.$transaction(async (tx: any) => {
        const current = await tx.offboardingEmployeeTask.findUnique({ where: { id: input.id } })
        if (!current || current.organizationId !== organization.id) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        const neighbor = await tx.offboardingEmployeeTask.findFirst({
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

        await tx.offboardingEmployeeTask.update({
          where: { id: current.id },
          data: { sortOrder: neighbor.sortOrder },
        })
        await tx.offboardingEmployeeTask.update({
          where: { id: neighbor.id },
          data: { sortOrder: current.sortOrder },
        })

        return tx.offboardingEmployeeTask.findMany({
          where: { organizationId: organization.id },
          orderBy: { sortOrder: 'asc' },
        })
      })
    }),

  getByEmployee: hrAdminProcedure
    .input(z.string())
    .query(async ({ ctx, input: employeeId }) => {
      return ctx.prisma.offboardingWorkflow.findFirst({
        where: { employeeId },
        include: { tasks: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      })
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
        ctx.prisma.offboardingWorkflow.findMany({
          where,
          include: {
            employee: { select: { id: true, fullName: true, jobTitle: true, department: true, endDate: true, status: true } },
            tasks: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.offboardingWorkflow.count({ where }),
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
      const workflow = await ctx.prisma.offboardingWorkflow.findUnique({
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

      return workflow
    }),

  start: hrAdminProcedure
    .input(z.object({
      employeeId: z.string(),
      endDate: z.string().optional(),
      isImmediate: z.boolean().default(false),
      reason: z.string().optional(),
      notes: z.string().optional(),
      googleDeleteAccount: z.boolean().optional(),
      googleTransferToEmail: z.string().optional(),
      googleTransferApps: z.array(z.string()).optional(),
      googleAliasToEmail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const employee = await ctx.prisma.employee.findUnique({
        where: { id: input.employeeId },
        include: { appAccounts: { include: { app: true } } },
      })

      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' })
      }

      if (employee.status === 'EXITED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Employee has already exited' })
      }

      // Check for existing active workflow
      const existingWorkflow = await ctx.prisma.offboardingWorkflow.findFirst({
        where: {
          employeeId: input.employeeId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })

      if (existingWorkflow) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Employee already has an active offboarding workflow' })
      }

      // Create tasks from org templates
      const organization = await ensureDefaultOffboardingTemplates(ctx.prisma)
      const templates = await ctx.prisma.offboardingTaskTemplate.findMany({
        where: { organizationId: organization.id, isActive: true },
        orderBy: { sortOrder: 'asc' },
      })

      const tasks = await buildOffboardingTasksFromTemplates(ctx.prisma, templates)
      const taskAppIds = new Set(tasks.map((t) => t.appId).filter(Boolean) as string[])

      // Backwards-compatible: also deprovision any ACTIVE app accounts not explicitly included in templates.
      let nextSort = tasks.length + 1
      for (const account of employee.appAccounts) {
        if (account.status !== 'ACTIVE') continue
        if (!account.appId) continue
        if (taskAppIds.has(account.appId)) continue
        tasks.push({
          name: `Deprovision ${account.app.name} account`,
          type: 'AUTOMATED',
          automationType: 'deprovision_app',
          appId: account.appId,
          sortOrder: nextSort++,
        })
      }

      const scheduledFor = input.isImmediate
        ? new Date()
        : input.endDate
          ? new Date(input.endDate)
          : undefined

      const workflow = await ctx.prisma.offboardingWorkflow.create({
        data: {
          employeeId: input.employeeId,
          status: input.isImmediate ? 'IN_PROGRESS' : 'PENDING',
          scheduledFor,
          isImmediate: input.isImmediate,
          startedAt: input.isImmediate ? new Date() : undefined,
          reason: input.reason,
          notes: input.notes,
          googleDeleteAccount: Boolean(input.googleDeleteAccount),
          googleTransferToEmail: input.googleTransferToEmail?.trim() || null,
          googleTransferApps: input.googleTransferApps?.length
            ? (input.googleTransferApps as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          googleAliasToEmail: input.googleAliasToEmail?.trim() || null,
          initiatedBy: (ctx.user as { id: string }).id,
          tasks: {
            create: tasks.map(task => ({
              name: task.name,
              type: task.type,
              status: 'PENDING',
              automationType: (task as { automationType?: string }).automationType,
              appId: (task as { appId?: string }).appId,
              sortOrder: task.sortOrder,
            })),
          },
        },
        include: { tasks: true },
      })

      // Update employee status and end date
      await ctx.prisma.employee.update({
        where: { id: input.employeeId },
        data: {
          status: 'OFFBOARDING',
          endDate: scheduledFor,
        },
      })

      await createAuditLog({
        actorId: (ctx.user as { id: string }).id,
        action: 'OFFBOARDING_STARTED',
        resourceType: 'employee',
        resourceId: input.employeeId,
        metadata: {
          workflowId: workflow.id,
          isImmediate: input.isImmediate,
          reason: input.reason,
        },
      })

      // If immediate, run automated tasks
      if (input.isImmediate) {
        const automatedTasks = workflow.tasks.filter(t => t.type === 'AUTOMATED')
        for (const task of automatedTasks) {
          try {
            await runOffboardingTask(ctx.prisma, task.id, (ctx.user as { id: string }).id, employee)
          } catch (error) {
            console.error(`Failed to run offboarding task ${task.id}:`, error)
          }
        }
      }

      return workflow
    }),

  runTask: hrAdminProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.offboardingTask.findUnique({
        where: { id: input.taskId },
        include: {
          workflow: { include: { employee: true } },
        },
      })

      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (task.type === 'AUTOMATED') {
        return runOffboardingTask(ctx.prisma, task.id, (ctx.user as { id: string }).id, task.workflow.employee)
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Use completeManualTask for manual tasks' })
      }
    }),

  completeManualTask: hrAdminProcedure
    .input(z.object({
      taskId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.offboardingTask.findUnique({
        where: { id: input.taskId },
      })

      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.offboardingTask.update({
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
        action: 'OFFBOARDING_TASK_COMPLETED',
        resourceType: 'offboarding_task',
        resourceId: task.id,
        metadata: { taskName: task.name, manual: true },
      })

      await checkAndCompleteOffboarding(ctx.prisma, task.workflowId)

      return { success: true }
    }),

  skipTask: hrAdminProcedure
    .input(z.object({
      taskId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.offboardingTask.findUnique({
        where: { id: input.taskId },
      })

      if (!task) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.prisma.offboardingTask.update({
        where: { id: task.id },
        data: {
          status: 'SKIPPED',
          statusMessage: input.reason,
          completedAt: new Date(),
          completedBy: (ctx.user as { id: string }).id,
        },
      })

      await checkAndCompleteOffboarding(ctx.prisma, task.workflowId)

      return { success: true }
    }),

  cancel: hrAdminProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: workflowId }) => {
      const workflow = await ctx.prisma.offboardingWorkflow.findUnique({
        where: { id: workflowId },
      })

      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (workflow.status === 'COMPLETED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel completed offboarding' })
      }

      await ctx.prisma.offboardingWorkflow.update({
        where: { id: workflowId },
        data: { status: 'CANCELLED' },
      })

      // Revert employee status
      await ctx.prisma.employee.update({
        where: { id: workflow.employeeId },
        data: {
          status: 'ACTIVE',
          endDate: null,
        },
      })

      return { success: true }
    }),

  // Get scheduled offboardings for processing
  getScheduledForToday: hrAdminProcedure
    .query(async ({ ctx }) => {
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      return ctx.prisma.offboardingWorkflow.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: today },
        },
        include: {
          employee: true,
          tasks: true,
        },
      })
    }),
})

async function runOffboardingTask(
  prisma: typeof import('@/lib/prisma').default,
  taskId: string,
  actorId: string,
  employee: { id: string; fullName: string }
) {
  const task = await prisma.offboardingTask.findUnique({
    where: { id: taskId },
    include: { workflow: true },
  })

  if (!task) {
    throw new Error('Task not found')
  }

  await prisma.offboardingTask.update({
    where: { id: taskId },
    data: {
      status: 'IN_PROGRESS',
      attempts: task.attempts + 1,
      lastAttemptAt: new Date(),
    },
  })

  try {
    let result: { success: boolean; error?: string; apiConfirmation?: Record<string, unknown> }

    // Get full employee with necessary relations
    const fullEmployee = await prisma.employee.findUnique({
      where: { id: employee.id },
    })

    if (!fullEmployee) {
      throw new Error('Employee not found')
    }

    const googleOptions = {
      deleteAccount: task.workflow.googleDeleteAccount,
      transferToEmail: task.workflow.googleTransferToEmail ?? undefined,
      transferApps: Array.isArray(task.workflow.googleTransferApps)
        ? (task.workflow.googleTransferApps as string[])
        : undefined,
      aliasToEmail: task.workflow.googleAliasToEmail ?? undefined,
    }

    switch (task.automationType) {
      case 'deprovision_app': {
        if (!task.appId) {
          result = { success: false, error: 'Missing appId for this task' }
          break
        }
        result = await deprovisionEmployeeInAppById(fullEmployee, task.appId, actorId, googleOptions)
        break
      }
      case 'deprovision_google_workspace':
        result = await deprovisionEmployeeInApp(fullEmployee, 'GOOGLE_WORKSPACE', actorId, googleOptions)
        break
      case 'deprovision_slack':
        result = await deprovisionEmployeeInApp(fullEmployee, 'SLACK', actorId)
        break
      case 'deprovision_standupninja': {
        const email = fullEmployee.workEmail || fullEmployee.personalEmail
        if (!email) {
          result = { success: false, error: 'Employee has no email' }
          break
        }
        const sync = await removeEmployeeFromStandup(email, actorId)
        result = { success: sync.success, error: sync.error, apiConfirmation: sync.apiConfirmation }
        break
      }
      default:
        if (typeof task.automationType === 'string' && task.automationType.startsWith('deprovision_')) {
          const raw = task.automationType.slice('deprovision_'.length)
          const guessedType = raw.toUpperCase()
          const app = await prisma.app.findFirst({ where: { type: guessedType as any } })
          if (app) {
            result = await deprovisionEmployeeInAppById(fullEmployee, app.id, actorId)
            break
          }
        }
        result = { success: false, error: `Unknown automation type: ${task.automationType}` }
    }

    await prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        status: result.success ? 'SUCCESS' : 'FAILED',
        statusMessage: result.error,
        completedAt: result.success ? new Date() : undefined,
      },
    })

    await createAuditLog({
      actorId,
      action: 'OFFBOARDING_TASK_COMPLETED',
      resourceType: 'offboarding_task',
      resourceId: taskId,
      metadata: {
        taskName: task.name,
        automationType: task.automationType,
        success: result.success,
        error: result.error,
        apiConfirmation: result.apiConfirmation,
      },
    })

    await checkAndCompleteOffboarding(prisma, task.workflowId)

    return { success: result.success, error: result.error }
  } catch (error) {
    await prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    throw error
  }
}

async function checkAndCompleteOffboarding(prisma: typeof import('@/lib/prisma').default, workflowId: string) {
  const workflow = await prisma.offboardingWorkflow.findUnique({
    where: { id: workflowId },
    include: { tasks: true },
  })

  if (!workflow) return

  const incompleteTasks = workflow.tasks.filter(
    t => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
  )

  if (incompleteTasks.length === 0) {
    await prisma.offboardingWorkflow.update({
      where: { id: workflowId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    const employee = await prisma.employee.update({
      where: { id: workflow.employeeId },
      data: { status: 'EXITED' },
      select: {
        id: true,
        workEmail: true,
        personalEmail: true,
      },
    })

    await createAuditLog({
      actorType: 'system',
      action: 'OFFBOARDING_COMPLETED',
      resourceType: 'employee',
      resourceId: workflow.employeeId,
      metadata: { workflowId },
    })
  }
}
