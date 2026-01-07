import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

// ============================================
// TYPES
// ============================================

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

export interface ToolExecutionContext {
  prisma: PrismaClient
  userId: string
  userRole: string
}

export interface ToolExecutionResult {
  status: 'ok' | 'error' | 'confirmation_required'
  message?: string
  data?: unknown
  summary?: string
}

// ============================================
// TOOL EXECUTOR
// ============================================

export class CustomToolExecutor {
  constructor(private prisma: PrismaClient) { }

  /**
   * Execute a custom tool based on its configuration
   */
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    // Fetch the tool configuration from database
    const tool = await this.prisma.aICustomTool.findUnique({
      where: { name: toolName, isActive: true },
    })

    if (!tool) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Custom tool "${toolName}" not found or is inactive`,
      })
    }

    // Check permissions
    if (tool.allowedRoles) {
      const allowedRoles = tool.allowedRoles as string[]
      if (!allowedRoles.includes(context.userRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You don't have permission to use the "${tool.displayName}" tool`,
        })
      }
    }

    // Check confirmation requirement
    if (tool.requiresConfirmation && !args.confirmed) {
      return {
        status: 'confirmation_required',
        message: `The "${tool.displayName}" action requires confirmation. Are you sure you want to proceed?`,
        data: { toolName, args },
        summary: `Waiting for confirmation to execute: ${tool.displayName}`,
      }
    }

    // Execute based on execution type
    const executionConfig = tool.executionConfig as Record<string, any>

    try {
      switch (tool.executionType) {
        case 'trpc_mutation':
        case 'trpc_query':
          return await this.executeTRPC(tool, args, executionConfig as any, context)

        case 'webhook':
          return await this.executeWebhook(tool, args, executionConfig as any)

        case 'custom_code':
          return await this.executeCustomCode(tool, args, executionConfig as any, context)

        default:
          throw new Error(`Unknown execution type: ${tool.executionType}`)
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Execute a tRPC procedure
   */
  private async executeTRPC(
    tool: any,
    args: Record<string, unknown>,
    config: { router: string; procedure: string; inputMapping?: Record<string, string> },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    // Map arguments if inputMapping is provided
    let input = args
    if (config.inputMapping) {
      input = {}
      for (const [targetKey, sourceKey] of Object.entries(config.inputMapping)) {
        if (sourceKey in args) {
          input[targetKey] = args[sourceKey]
        }
      }
    }

    // Note: In a real implementation, you would dynamically call the tRPC procedure
    // For now, return a success message
    return {
      status: 'ok',
      message: `Successfully executed ${tool.displayName}`,
      data: input,
    }
  }

  /**
   * Execute a webhook call
   */
  private async executeWebhook(
    tool: any,
    args: Record<string, unknown>,
    config: { url: string; method?: string; headers?: Record<string, string> }
  ): Promise<ToolExecutionResult> {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(args),
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      status: 'ok',
      message: `Successfully executed ${tool.displayName}`,
      data,
    }
  }

  /**
   * Execute custom JavaScript code (sandboxed)
   */
  private async executeCustomCode(
    tool: any,
    args: Record<string, unknown>,
    config: { code: string },
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    // Create a sandboxed function
    // WARNING: This is a simplified example. In production, use proper sandboxing
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
    const fn = new AsyncFunction('args', 'context', 'prisma', config.code)

    const result = await fn(args, context, this.prisma)

    return {
      status: 'ok',
      message: `Successfully executed ${tool.displayName}`,
      data: result,
    }
  }
}

// ============================================
// TOOL REGISTRY
// ============================================

export class ToolRegistry {
  private executor: CustomToolExecutor

  constructor(private prisma: PrismaClient) {
    this.executor = new CustomToolExecutor(prisma)
  }

  /**
   * Load all active tools (built-in + custom)
   * Only includes approved tools for auto-created ones
   */
  async loadTools(): Promise<ToolDefinition[]> {
    const customTools = await this.prisma.aICustomTool.findMany({
      where: {
        isActive: true,
        OR: [
          { autoCreated: false }, // Include all manually created tools
          { autoCreated: true, approvalStatus: 'APPROVED' }, // Only approved auto-created tools
        ],
      },
      orderBy: { category: 'asc' },
    })

    return customTools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any,
      },
    }))
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    return this.executor.execute(toolName, args, context)
  }

  /**
   * Create a new custom tool
   */
  async createTool(data: {
    name: string
    displayName: string
    description: string
    category: string
    parameters: { type: 'object'; properties: Record<string, any>; required?: string[] }
    executionType: string
    executionConfig: Record<string, any>
    requiresConfirmation?: boolean
    allowedRoles?: string[]
    createdBy: string
  }) {
    return this.prisma.aICustomTool.create({
      data: {
        ...data,
        allowedRoles: data.allowedRoles as any,
        parameters: data.parameters as any,
        executionConfig: data.executionConfig as any,
      },
    })
  }

  /**
   * Update a custom tool
   */
  async updateTool(
    id: string,
    data: {
      displayName?: string
      description?: string
      category?: string
      parameters?: Record<string, any>
      executionType?: string
      executionConfig?: Record<string, any>
      requiresConfirmation?: boolean
      allowedRoles?: string[]
      isActive?: boolean
    }
  ) {
    return this.prisma.aICustomTool.update({
      where: { id },
      data: {
        ...data,
        allowedRoles: data.allowedRoles as any,
        parameters: data.parameters as any,
        executionConfig: data.executionConfig as any,
      },
    })
  }

  /**
   * Delete a custom tool (only non-built-in)
   */
  async deleteTool(id: string) {
    const tool = await this.prisma.aICustomTool.findUnique({ where: { id } })

    if (!tool) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tool not found',
      })
    }

    if (tool.isBuiltIn) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete built-in tools',
      })
    }

    return this.prisma.aICustomTool.delete({ where: { id } })
  }
}
