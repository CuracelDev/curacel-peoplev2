import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

export const teamRouter = router({
  // List all active teams
  list: protectedProcedure.query(async ({ ctx }) => {
    const teams = await ctx.prisma.team.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    // Get employee counts per team (by matching department name)
    const teamCounts = await Promise.all(
      teams.map(async (team) => {
        const count = await ctx.prisma.employee.count({
          where: { department: team.name },
        })
        return { teamId: team.id, count }
      })
    )

    const countMap = new Map(teamCounts.map((tc) => [tc.teamId, tc.count]))

    return teams.map((team) => ({
      ...team,
      employeeCount: countMap.get(team.id) || 0,
    }))
  }),

  // Get a single team by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({
        where: { id: input.id },
      })

      if (!team) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found',
        })
      }

      // Get employee count
      const employeeCount = await ctx.prisma.employee.count({
        where: { department: team.name },
      })

      // Get employees in this team
      const employees = await ctx.prisma.employee.findMany({
        where: { department: team.name },
        select: {
          id: true,
          fullName: true,
          jobTitle: true,
          status: true,
          profileImageUrl: true,
        },
        orderBy: { fullName: 'asc' },
      })

      return {
        ...team,
        employeeCount,
        employees,
      }
    }),

  // Create a new team
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        leaderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if team name already exists
      const existing = await ctx.prisma.team.findFirst({
        where: { name: { equals: input.name, mode: 'insensitive' } },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A team with this name already exists',
        })
      }

      return ctx.prisma.team.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim(),
          color: input.color,
          leaderId: input.leaderId,
        },
      })
    }),

  // Update a team
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
        leaderId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // If name is being changed, check for duplicates
      if (data.name) {
        const existing = await ctx.prisma.team.findFirst({
          where: {
            name: { equals: data.name, mode: 'insensitive' },
            id: { not: id },
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A team with this name already exists',
          })
        }
      }

      return ctx.prisma.team.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.leaderId !== undefined && { leaderId: data.leaderId }),
        },
      })
    }),

  // Delete (soft delete) a team
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.team.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Sync teams from existing employee departments
  syncFromDepartments: adminProcedure.mutation(async ({ ctx }) => {
    // Get all unique departments from employees
    const employees = await ctx.prisma.employee.findMany({
      where: { department: { not: null } },
      select: { department: true },
    })

    const uniqueDepartments = Array.from(
      new Set(employees.map((e) => e.department).filter(Boolean))
    ) as string[]

    // Create teams for departments that don't exist yet
    const created: string[] = []
    for (const dept of uniqueDepartments) {
      const existing = await ctx.prisma.team.findFirst({
        where: { name: { equals: dept, mode: 'insensitive' } },
      })

      if (!existing) {
        await ctx.prisma.team.create({
          data: { name: dept },
        })
        created.push(dept)
      }
    }

    return {
      synced: created.length,
      teams: created,
      total: uniqueDepartments.length,
    }
  }),

  // Get teams for dropdown/select (minimal data)
  listForSelect: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    })
  }),
})
