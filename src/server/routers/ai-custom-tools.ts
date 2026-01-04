import { z } from 'zod'
import { router, adminProcedure } from '@/lib/trpc'
import { ToolRegistry } from '@/lib/ai/tool-registry'

// JSON Schema for function parameters
const parameterSchemaSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
})

// Execution config schemas for different types
const trpcExecutionConfigSchema = z.object({
  router: z.string(),
  procedure: z.string(),
  inputMapping: z.record(z.string()).optional(),
})

const webhookExecutionConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  headers: z.record(z.string()).optional(),
})

const customCodeExecutionConfigSchema = z.object({
  code: z.string(),
})

export const aiCustomToolsRouter = router({
  // List all custom tools
  list: adminProcedure
    .input(
      z.object({
        category: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {}

      if (input?.category) {
        where.category = input.category
      }

      if (input?.isActive !== undefined) {
        where.isActive = input.isActive
      }

      return ctx.prisma.aICustomTool.findMany({
        where,
        orderBy: [
          { isBuiltIn: 'desc' },
          { category: 'asc' },
          { displayName: 'asc' },
        ],
      })
    }),

  // Get a single tool
  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.aICustomTool.findUnique({
        where: { id: input.id },
      })
    }),

  // Create a custom tool
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Name must be lowercase, start with letter, and contain only letters, numbers, and underscores'),
        displayName: z.string().min(1),
        description: z.string().min(1),
        category: z.string().min(1),
        parameters: parameterSchemaSchema,
        executionType: z.enum(['trpc_mutation', 'trpc_query', 'webhook', 'custom_code']),
        executionConfig: z.any(), // Validated based on executionType
        requiresConfirmation: z.boolean().optional(),
        allowedRoles: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate execution config based on type
      switch (input.executionType) {
        case 'trpc_mutation':
        case 'trpc_query':
          trpcExecutionConfigSchema.parse(input.executionConfig)
          break
        case 'webhook':
          webhookExecutionConfigSchema.parse(input.executionConfig)
          break
        case 'custom_code':
          customCodeExecutionConfigSchema.parse(input.executionConfig)
          break
      }

      const registry = new ToolRegistry(ctx.prisma)
      return registry.createTool({
        ...input,
        createdBy: ctx.user!.id,
      })
    }),

  // Update a custom tool
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        displayName: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        parameters: parameterSchemaSchema.optional(),
        executionType: z.enum(['trpc_mutation', 'trpc_query', 'webhook', 'custom_code']).optional(),
        executionConfig: z.any().optional(),
        requiresConfirmation: z.boolean().optional(),
        allowedRoles: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // Validate execution config if provided
      if (data.executionType && data.executionConfig) {
        switch (data.executionType) {
          case 'trpc_mutation':
          case 'trpc_query':
            trpcExecutionConfigSchema.parse(data.executionConfig)
            break
          case 'webhook':
            webhookExecutionConfigSchema.parse(data.executionConfig)
            break
          case 'custom_code':
            customCodeExecutionConfigSchema.parse(data.executionConfig)
            break
        }
      }

      const registry = new ToolRegistry(ctx.prisma)
      return registry.updateTool(id, data)
    }),

  // Delete a custom tool
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const registry = new ToolRegistry(ctx.prisma)
      return registry.deleteTool(input.id)
    }),

  // Get tool categories
  getCategories: adminProcedure.query(async ({ ctx }) => {
    const tools = await ctx.prisma.aICustomTool.findMany({
      select: { category: true },
      distinct: ['category'],
    })
    return tools.map(t => t.category)
  }),

  // Test a tool execution
  test: adminProcedure
    .input(
      z.object({
        id: z.string(),
        args: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tool = await ctx.prisma.aICustomTool.findUnique({
        where: { id: input.id },
      })

      if (!tool) {
        throw new Error('Tool not found')
      }

      const registry = new ToolRegistry(ctx.prisma)
      return registry.executeTool(
        tool.name,
        input.args,
        {
          prisma: ctx.prisma,
          userId: ctx.user!.id,
          userRole: ctx.user!.role,
        }
      )
    }),

  // List pending tools (auto-created and awaiting approval)
  listPending: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.aICustomTool.findMany({
      where: {
        autoCreated: true,
        approvalStatus: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Approve a pending tool
  approve: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tool = await ctx.prisma.aICustomTool.findUnique({
        where: { id: input.id },
      })

      if (!tool) {
        throw new Error('Tool not found')
      }

      if (!tool.autoCreated || tool.approvalStatus !== 'PENDING') {
        throw new Error('This tool is not pending approval')
      }

      return ctx.prisma.aICustomTool.update({
        where: { id: input.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy: ctx.user!.id,
          approvedAt: new Date(),
          isActive: true, // Activate the tool
        },
      })
    }),

  // Reject a pending tool
  reject: adminProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tool = await ctx.prisma.aICustomTool.findUnique({
        where: { id: input.id },
      })

      if (!tool) {
        throw new Error('Tool not found')
      }

      if (!tool.autoCreated || tool.approvalStatus !== 'PENDING') {
        throw new Error('This tool is not pending approval')
      }

      return ctx.prisma.aICustomTool.update({
        where: { id: input.id },
        data: {
          approvalStatus: 'REJECTED',
          approvedBy: ctx.user!.id,
          approvedAt: new Date(),
          rejectionReason: input.reason,
          isActive: false, // Keep inactive
        },
      })
    }),
})
