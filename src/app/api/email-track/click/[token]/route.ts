import { NextRequest, NextResponse } from 'next/server'
import { decodeClickTrackingToken, recordTrackingEvent } from '@/lib/email-tracking'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    // Decode token to get email ID and original URL
    const payload = decodeClickTrackingToken(token)

    if (!payload) {
      // Invalid token, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }

    const { emailId, url } = payload

    // Get request metadata
    const userAgent = request.headers.get('user-agent') || undefined
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined

    // Record the click event (async, don't await to not delay redirect)
    recordTrackingEvent(emailId, 'click', {
      linkUrl: url,
      userAgent,
      ipAddress,
    }).catch(err => console.error('Failed to record click event:', err))

    // Redirect to the original URL
    return NextResponse.redirect(url, { status: 302 })
  } catch (error) {
    console.error('Error processing tracking click:', error)
    // On error, redirect to home
    return NextResponse.redirect(new URL('/', request.url))
  }
}
