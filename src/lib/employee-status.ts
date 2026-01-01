import type { PrismaClient } from '@prisma/client'

const AUTO_ACTIVE_STATUSES = ['OFFER_SIGNED', 'HIRED_PENDING_START'] as const

export async function autoActivateEmployees(
  prisma: PrismaClient,
  employeeId?: string
): Promise<number> {
  const now = new Date()
  const where = {
    status: { in: AUTO_ACTIVE_STATUSES },
    startDate: { lte: now },
    ...(employeeId ? { id: employeeId } : {}),
  }

  const result = await prisma.employee.updateMany({
    where,
    data: { status: 'ACTIVE' },
  })

  return result.count
}
