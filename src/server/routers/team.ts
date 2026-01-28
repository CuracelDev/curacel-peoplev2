import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '@/lib/trpc'

export const teamRouter = router({
  // List all active teams with hierarchy
  list: protectedProcedure.query(async ({ ctx }) => {
    const teams = await ctx.prisma.team.findMany({
      where: { isActive: true },
      include: {
        subTeams: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Get employee counts per team (by matching department name)
    const allTeams = await ctx.prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })

    const teamCounts = await Promise.all(
      allTeams.map(async (team) => {
        const count = await ctx.prisma.employee.count({
          where: { department: team.name },
        })
        return { teamId: team.id, count }
      })
    )

    const countMap = new Map(teamCounts.map((tc) => [tc.teamId, tc.count]))

    // Return only root teams (parentId = null) with sub-teams nested
    const rootTeams = teams.filter((team) => !team.parentId)

    return rootTeams.map((team) => ({
      ...team,
      employeeCount: countMap.get(team.id) || 0,
      subTeams: team.subTeams.map((sub) => ({
        ...sub,
        employeeCount: countMap.get(sub.id) || 0,
      })),
    }))
  }),

  // Get a single team by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.prisma.team.findUnique({
        where: { id: input.id },
        include: {
          parent: true,
          subTeams: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
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
        parentId: z.string().optional(),
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

      // If parentId is provided, verify it exists
      if (input.parentId) {
        const parent = await ctx.prisma.team.findUnique({
          where: { id: input.parentId },
        })
        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent team not found',
          })
        }
      }

      return ctx.prisma.team.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim(),
          color: input.color,
          leaderId: input.leaderId,
          parentId: input.parentId,
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
        parentId: z.string().optional().nullable(),
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

      // Prevent circular reference (can't be parent of itself or descendant)
      if (data.parentId !== undefined && data.parentId !== null) {
        // Check if trying to set self as parent
        if (data.parentId === id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'A team cannot be its own parent',
          })
        }

        // Check if parent exists
        const parent = await ctx.prisma.team.findUnique({
          where: { id: data.parentId },
        })
        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent team not found',
          })
        }

        // Check for circular reference (parent's parent chain shouldn't include this team)
        let current = parent
        while (current.parentId) {
          if (current.parentId === id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Circular team hierarchy detected',
            })
          }
          const next = await ctx.prisma.team.findUnique({
            where: { id: current.parentId },
          })
          if (!next) break
          current = next
        }
      }

      return ctx.prisma.team.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.leaderId !== undefined && { leaderId: data.leaderId }),
          ...(data.parentId !== undefined && { parentId: data.parentId }),
        },
      })
    }),

  // Delete (soft delete) a team
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Also soft delete all sub-teams
      await ctx.prisma.team.updateMany({
        where: { parentId: input.id },
        data: { isActive: false },
      })

      await ctx.prisma.team.update({
        where: { id: input.id },
        data: { isActive: false },
      })
      return { success: true }
    }),

  // Get teams for dropdown/select (minimal data, flat list)
  listForSelect: protectedProcedure.query(async ({ ctx }) => {
    const teams = await ctx.prisma.team.findMany({
      where: { isActive: true },
      select: { id: true, name: true, color: true, parentId: true },
      orderBy: { name: 'asc' },
    })

    // Build hierarchical display names
    const teamMap = new Map(teams.map((t) => [t.id, t]))

    return teams.map((team) => {
      let displayName = team.name
      if (team.parentId) {
        const parent = teamMap.get(team.parentId)
        if (parent) {
          displayName = `${parent.name} > ${team.name}`
        }
      }
      return {
        ...team,
        displayName,
      }
    })
  }),
})
