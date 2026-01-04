/**
 * Standup Sync Router
 *
 * Manages standup_mate integration settings and team mappings
 */

import { z } from 'zod'
import { router, protectedProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'
import { encrypt, decrypt } from '@/lib/encryption'
import {
  testStandupSyncConnection,
  addEmployeeToStandup,
  removeEmployeeFromStandup,
} from '@/lib/integrations/standup-sync'

export const standupSyncRouter = router({
  /**
   * Get standup sync settings
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    let settings = await ctx.prisma.standupSyncSettings.findFirst()

    // Create default settings if they don't exist
    if (!settings) {
      settings = await ctx.prisma.standupSyncSettings.create({
        data: {
          apiUrl: '',
          isEnabled: false,
          syncOnHire: true,
          syncOnTermination: true,
        },
      })
    }

    // Return settings without encrypted fields
    return {
      id: settings.id,
      apiUrl: settings.apiUrl,
      isEnabled: settings.isEnabled,
      syncOnHire: settings.syncOnHire,
      syncOnTermination: settings.syncOnTermination,
      lastSyncAt: settings.lastSyncAt,
      lastTestAt: settings.lastTestAt,
      lastTestResult: settings.lastTestResult,
      hasApiKey: !!settings.apiKeyEncrypted,
    }
  }),

  /**
   * Update standup sync settings
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        apiUrl: z.string().url('Invalid API URL'),
        apiKey: z.string().optional(),
        isEnabled: z.boolean(),
        syncOnHire: z.boolean(),
        syncOnTermination: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.prisma.standupSyncSettings.findFirst()

      if (!settings) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Settings not found',
        })
      }

      // Prepare update data
      const updateData: {
        apiUrl: string
        isEnabled: boolean
        syncOnHire: boolean
        syncOnTermination: boolean
        apiKeyEncrypted?: string
      } = {
        apiUrl: input.apiUrl,
        isEnabled: input.isEnabled,
        syncOnHire: input.syncOnHire,
        syncOnTermination: input.syncOnTermination,
      }

      // Only update API key if provided
      if (input.apiKey) {
        updateData.apiKeyEncrypted = encrypt(input.apiKey)
      }

      await ctx.prisma.standupSyncSettings.update({
        where: { id: settings.id },
        data: updateData,
      })

      return { success: true }
    }),

  /**
   * Test standup sync connection
   */
  testConnection: protectedProcedure
    .input(
      z.object({
        apiUrl: z.string().url('Invalid API URL'),
        apiKey: z.string().min(1, 'API key is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await testStandupSyncConnection(input.apiUrl, input.apiKey)

      // Update test result in database
      await ctx.prisma.standupSyncSettings.updateMany({
        data: {
          lastTestAt: new Date(),
          lastTestResult: result.success ? 'success' : result.message,
        },
      })

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.message,
        })
      }

      return result
    }),

  /**
   * List team mappings
   */
  listMappings: protectedProcedure.query(async ({ ctx }) => {
    const mappings = await ctx.prisma.standupTeamMapping.findMany({
      orderBy: { department: 'asc' },
    })

    return mappings
  }),

  /**
   * Create team mapping
   */
  createMapping: protectedProcedure
    .input(
      z.object({
        department: z.string().min(1, 'Department is required'),
        standupTeamName: z.string().min(1, 'Standup team name is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if mapping already exists
      const existing = await ctx.prisma.standupTeamMapping.findUnique({
        where: { department: input.department },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Mapping already exists for department: ${input.department}`,
        })
      }

      const mapping = await ctx.prisma.standupTeamMapping.create({
        data: {
          department: input.department,
          standupTeamName: input.standupTeamName,
          isActive: true,
        },
      })

      return mapping
    }),

  /**
   * Update team mapping
   */
  updateMapping: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        department: z.string().min(1, 'Department is required'),
        standupTeamName: z.string().min(1, 'Standup team name is required'),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mapping = await ctx.prisma.standupTeamMapping.update({
        where: { id: input.id },
        data: {
          department: input.department,
          standupTeamName: input.standupTeamName,
          isActive: input.isActive,
        },
      })

      return mapping
    }),

  /**
   * Delete team mapping
   */
  deleteMapping: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.standupTeamMapping.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * Manually sync an employee
   */
  syncEmployee: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        department: z.string().nullable(),
        action: z.enum(['add', 'remove']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id
      const result =
        input.action === 'add'
          ? await addEmployeeToStandup(input.email, input.department, userId)
          : await removeEmployeeFromStandup(input.email, userId)

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Sync failed',
        })
      }

      return result
    }),

  /**
   * Bulk sync all active employees
   */
  syncAllEmployees: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id
    const employees = await ctx.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        workEmail: true,
        personalEmail: true,
        department: true,
      },
    })

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
    }

    for (const employee of employees) {
      const email = employee.workEmail || employee.personalEmail

      if (!email) {
        results.skipped++
        continue
      }

      const result = await addEmployeeToStandup(email, employee.department, userId)

      if (result.success) {
        results.success++
      } else {
        results.failed++
      }
    }

    return results
  }),
})
