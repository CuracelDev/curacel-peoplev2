import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiErrorResponse } from '@/lib/api-utils'
import { createApiCaller } from '@/lib/api-caller'
import prisma from '@/lib/prisma'

type RouteParams = {
  params: { id: string }
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const caller = createApiCaller(auth.user.email)
    const result = await caller.offboarding.getById(params.id)
    return NextResponse.json(result)
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.scheduledFor !== undefined) updateData.scheduledFor = parseDate(body.scheduledFor)
    if (body.isImmediate !== undefined) updateData.isImmediate = Boolean(body.isImmediate)
    if (body.startedAt !== undefined) updateData.startedAt = parseDate(body.startedAt)
    if (body.completedAt !== undefined) updateData.completedAt = parseDate(body.completedAt)
    if (body.reason !== undefined) updateData.reason = body.reason
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.googleDeleteAccount !== undefined) updateData.googleDeleteAccount = Boolean(body.googleDeleteAccount)
    if (body.googleTransferToEmail !== undefined) updateData.googleTransferToEmail = body.googleTransferToEmail
    if (body.googleTransferApps !== undefined) updateData.googleTransferApps = body.googleTransferApps
    if (body.googleAliasToEmail !== undefined) updateData.googleAliasToEmail = body.googleAliasToEmail

    const workflow = await prisma.offboardingWorkflow.update({
      where: { id: params.id },
      data: updateData,
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json(workflow)
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    await prisma.offboardingWorkflow.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
