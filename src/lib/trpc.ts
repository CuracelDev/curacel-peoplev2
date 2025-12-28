import { initTRPC, TRPCError } from '@trpc/server'
import { getServerSession } from 'next-auth'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import prisma from './prisma'
import type { Role } from '@prisma/client'

export async function createContext() {
  const session = await getServerSession(authOptions)

  return {
    prisma,
    session,
    user: session?.user,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// Auth middleware
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  const user = await ctx.prisma.user.findUnique({
    where: { email: ctx.user.email! },
    include: { employee: true },
  })
  
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
        id: user.id,
        role: user.role,
        employeeId: user.employeeId,
        employee: user.employee,
      },
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)

// Role-based middleware
const hasRole = (allowedRoles: Role[]) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    
    const user = await ctx.prisma.user.findUnique({
      where: { email: ctx.user.email! },
    })
    
    if (!user || !allowedRoles.includes(user.role)) {
      throw new TRPCError({ 
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      })
    }
    
    return next({
      ctx: {
        ...ctx,
        user: {
          ...ctx.user,
          id: user.id,
          role: user.role,
          employeeId: user.employeeId,
        },
      },
    })
  })

export const hrAdminProcedure = t.procedure.use(hasRole(['SUPER_ADMIN', 'HR_ADMIN']))
export const itAdminProcedure = t.procedure.use(hasRole(['SUPER_ADMIN', 'IT_ADMIN']))
export const adminProcedure = t.procedure.use(hasRole(['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN']))
export const managerProcedure = t.procedure.use(hasRole(['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER']))

