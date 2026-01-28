import { z } from 'zod'
import { router, publicProcedure, protectedProcedure, adminProcedure } from '@/lib/trpc'
import { TRPCError } from '@trpc/server'
import crypto from 'crypto'
import { sendTeamInviteEmail } from '@/lib/email'
import { hashPassword, verifyPassword } from '@/lib/password'
import { Prisma, type Role } from '@prisma/client'

const userSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
  employeeId: true,
  passwordSetAt: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      fullName: true,
      jobTitle: true,
      department: true,
      status: true,
    },
  },
} satisfies Prisma.UserSelect

function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  return raw || 'http://localhost:3000'
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const userRouter = router({
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: ctx.user?.email! },
        select: userSelect,
      })

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return user
    }),

  list: adminProcedure
    .input(z.object({
      role: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { role, search, page = 1, limit = 20 } = input || {}
      
      const where: Record<string, unknown> = {}
      
      if (role) where.role = role
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          select: userSelect,
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.user.count({ where }),
      ])

      return {
        users,
        total,
        pages: Math.ceil(total / limit),
      }
    }),

  updateRole: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN', 'MANAGER', 'EMPLOYEE']),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as { role: string }
      
      // Only SUPER_ADMIN can create other SUPER_ADMINs
      if (input.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Only Super Admins can grant Super Admin role' 
        })
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: userSelect,
      })
    }),

  linkEmployee: adminProcedure
    .input(z.object({
      userId: z.string(),
      employeeId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if employee is already linked
      const existingLink = await ctx.prisma.user.findFirst({
        where: { employeeId: input.employeeId },
      })

      if (existingLink && existingLink.id !== input.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This employee is already linked to another user',
        })
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { employeeId: input.employeeId },
        select: userSelect,
      })
    }),

  delete: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, role: true },
      })

      // Only SUPER_ADMIN can delete users
      if (user?.role !== 'SUPER_ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super Admins can delete users',
        })
      }

      // Prevent deleting yourself
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot delete yourself',
        })
      }

      const userToDelete = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      })

      if (!userToDelete) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      await ctx.prisma.user.delete({
        where: { id: input.userId },
      })

      return { email: userToDelete.email }
    }),

  createInvite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN', 'MANAGER', 'EMPLOYEE']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email)

      const existingUser = await ctx.prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists. Update their role instead.',
        })
      }

      // Revoke any existing pending invites to this email
      await ctx.prisma.userInvite.updateMany({
        where: {
          email,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      })

      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const invite = await ctx.prisma.userInvite.create({
        data: {
          email,
          role: input.role as Role,
          token,
          expiresAt,
          invitedById: ctx.user.id,
        },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
          invitedBy: { select: { name: true, email: true } },
        },
      })

      const acceptUrl = `${getAppUrl()}/auth/accept-invite?token=${token}`
      let emailSent = true
      try {
        await sendTeamInviteEmail({
          to: email,
          invitedByName: invite.invitedBy.name || invite.invitedBy.email,
          role: invite.role,
          acceptUrl,
        })
      } catch (err) {
        emailSent = false
        console.warn('Invite created but email send failed:', err)
      }

      return { ...invite, acceptUrl, emailSent }
    }),

  listInvites: adminProcedure
    .query(async ({ ctx }) => {
      const invites = await ctx.prisma.userInvite.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          createdAt: true,
          invitedBy: { select: { name: true, email: true } },
        },
      })

      return invites
    }),

  revokeInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.userInvite.findUnique({
        where: { id: input.inviteId },
        select: { id: true, revokedAt: true, acceptedAt: true },
      })

      if (!invite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' })
      }
      if (invite.acceptedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite already accepted' })
      }
      if (invite.revokedAt) return { ok: true }

      await ctx.prisma.userInvite.update({
        where: { id: input.inviteId },
        data: { revokedAt: new Date() },
      })

      return { ok: true }
    }),

  resendInvite: adminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.userInvite.findUnique({
        where: { id: input.inviteId },
        select: {
          id: true,
          email: true,
          role: true,
          acceptedAt: true,
          revokedAt: true,
          invitedBy: { select: { name: true, email: true } },
        },
      })

      if (!invite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' })
      }
      if (invite.acceptedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite already accepted' })
      }
      if (invite.revokedAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite has been revoked' })
      }

      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await ctx.prisma.userInvite.update({
        where: { id: input.inviteId },
        data: { token, expiresAt },
      })

      const acceptUrl = `${getAppUrl()}/auth/accept-invite?token=${token}`
      let emailSent = true
      try {
        await sendTeamInviteEmail({
          to: invite.email,
          invitedByName: invite.invitedBy.name || invite.invitedBy.email,
          role: invite.role,
          acceptUrl,
        })
      } catch (err) {
        emailSent = false
        console.warn('Invite updated but email send failed:', err)
      }

      return { ok: true, acceptUrl, emailSent }
    }),

  getInvite: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.prisma.userInvite.findUnique({
        where: { token: input.token },
        select: {
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          invitedBy: { select: { name: true, email: true } },
        },
      })

      if (!invite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' })
      }
      if (invite.revokedAt) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite has been revoked' })
      }
      if (invite.acceptedAt) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite already accepted' })
      }
      if (invite.expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite has expired' })
      }

      return invite
    }),

  acceptInvite: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        name: z.string().min(1).max(200),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passwords do not match' })
      }

      const invite = await ctx.prisma.userInvite.findUnique({
        where: { token: input.token },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
        },
      })

      if (!invite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' })
      }
      if (invite.revokedAt) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite has been revoked' })
      }
      if (invite.acceptedAt) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite already accepted' })
      }
      if (invite.expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite has expired' })
      }

      const existingUser = await ctx.prisma.user.findUnique({ where: { email: invite.email } })
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists. Sign in instead.',
        })
      }

      const passwordHash = await hashPassword(input.password)
      await ctx.prisma.$transaction([
        ctx.prisma.user.create({
          data: {
            email: invite.email,
            name: input.name,
            role: invite.role,
            passwordHash,
            passwordSetAt: new Date(),
          },
        }),
        ctx.prisma.userInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        }),
      ])

      return { email: invite.email }
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1).nullable(),
        newPassword: z.string().min(8),
        confirmPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passwords do not match' })
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, passwordHash: true, passwordSetAt: true },
      })

      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      if (user.passwordHash) {
        if (!input.currentPassword) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Current password is required' })
        }

        const ok = await verifyPassword({ password: input.currentPassword, passwordHash: user.passwordHash })
        if (!ok) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Current password is incorrect' })
        }
      }

      const passwordHash = await hashPassword(input.newPassword)
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordSetAt: new Date() },
      })

      return { ok: true }
    }),
})
