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
    const result = await caller.onboarding.list({
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

    if (body.startDate || body.emailProvider || body.managerId || body.workEmail) {
      if (!body.startDate || !body.emailProvider) {
        return NextResponse.json(
          { error: 'startDate and emailProvider are required for startNew' },
          { status: 400 }
        )
      }

      const result = await caller.onboarding.startNew({
        employeeId: body.employeeId,
        startDate: body.startDate,
        managerId: body.managerId,
        workEmail: body.workEmail,
        emailProvider: body.emailProvider,
        customTasks: body.customTasks,
      })
      return NextResponse.json(result)
    }

    const result = await caller.onboarding.start({
      employeeId: body.employeeId,
      customTasks: body.customTasks,
    })
    return NextResponse.json(result)
  } catch (error) {
    return apiErrorResponse(error)
  }
}
