import prisma from '@/lib/prisma'
import { appRouter } from '@/server/routers/_app'

export function createApiCaller(userEmail: string) {
  return appRouter.createCaller({
    prisma,
    session: { user: { email: userEmail } },
    user: { email: userEmail },
  } as any)
}
