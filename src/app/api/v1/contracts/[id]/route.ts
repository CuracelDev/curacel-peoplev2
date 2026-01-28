import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiErrorResponse } from '@/lib/api-utils'
import { createApiCaller } from '@/lib/api-caller'
import prisma from '@/lib/prisma'

type RouteParams = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const caller = createApiCaller(auth.user.email)
    const result = await caller.offer.getById(params.id)
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
    const caller = createApiCaller(auth.user.email)
    const result = await caller.offer.update({ offerId: params.id, ...body })
    return NextResponse.json(result)
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
    await prisma.offer.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
