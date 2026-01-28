import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import type { Role } from '@prisma/client'
import { hashApiToken, normalizeApiToken } from '@/lib/api-tokens'

const DEFAULT_ALLOWED_ROLES: Role[] = ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN']

type ApiAuthResult = {
  user: {
    id: string
    email: string
    role: Role
  }
  apiTokenId: string
}

type ApiAuthFailure = {
  error: string
  status: number
}

function extractApiToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (header?.toLowerCase().startsWith('bearer ')) {
    return normalizeApiToken(header.slice(7))
  }
  const key = request.headers.get('x-api-key')
  return key ? normalizeApiToken(key) : null
}

export async function authenticateApiRequest(
  request: NextRequest,
  allowedRoles: Role[] = DEFAULT_ALLOWED_ROLES
): Promise<ApiAuthResult | ApiAuthFailure> {
  const rawToken = extractApiToken(request)

  if (!rawToken) {
    return { error: 'Missing API token', status: 401 }
  }

  const tokenHash = hashApiToken(rawToken)
  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: { createdBy: true },
  })

  if (!apiToken || apiToken.revokedAt) {
    return { error: 'Invalid API token', status: 401 }
  }

  if (!allowedRoles.includes(apiToken.createdBy.role)) {
    return { error: 'API token not authorized', status: 403 }
  }

  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  })

  return {
    apiTokenId: apiToken.id,
    user: {
      id: apiToken.createdBy.id,
      email: apiToken.createdBy.email,
      role: apiToken.createdBy.role,
    },
  }
}
