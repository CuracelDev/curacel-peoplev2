import { NextResponse } from 'next/server'
import { TRPCError } from '@trpc/server'

export function apiErrorResponse(error: unknown) {
  if (error instanceof TRPCError) {
    const status =
      error.code === 'BAD_REQUEST'
        ? 400
        : error.code === 'UNAUTHORIZED'
          ? 401
          : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'NOT_FOUND'
              ? 404
              : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

export function parseNumberParam(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
