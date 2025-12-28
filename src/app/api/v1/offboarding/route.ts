import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import { apiErrorResponse, parseNumberParam } from '@/lib/api-utils'
import { createApiCaller } from '@/lib/api-caller'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const caller = createApiCaller(auth.user.email)
    const result = await caller.offboarding.list({
      status: searchParams.get('status') || undefined,
      page: parseNumberParam(searchParams.get('page'), 1),
      limit: parseNumberParam(searchParams.get('limit'), 20),
    })
    return NextResponse.json(result)
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const caller = createApiCaller(auth.user.email)

    if (!body?.employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 })
    }

    const result = await caller.offboarding.start({
      employeeId: body.employeeId,
      endDate: body.endDate,
      isImmediate: body.isImmediate,
      reason: body.reason,
      notes: body.notes,
      googleDeleteAccount: body.googleDeleteAccount,
      googleTransferToEmail: body.googleTransferToEmail,
      googleTransferApps: body.googleTransferApps,
      googleAliasToEmail: body.googleAliasToEmail,
    })
    return NextResponse.json(result)
  } catch (error) {
    return apiErrorResponse(error)
  }
}
