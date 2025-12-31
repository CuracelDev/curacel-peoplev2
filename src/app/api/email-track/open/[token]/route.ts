import { NextRequest, NextResponse } from 'next/server'
import { decodeOpenTrackingToken, recordTrackingEvent } from '@/lib/email-tracking'

// 1x1 transparent PNG pixel
const PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
const PIXEL_BUFFER = Buffer.from(PIXEL_BASE64, 'base64')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    // Decode token to get email ID
    const emailId = decodeOpenTrackingToken(token)

    if (emailId) {
      // Get request metadata
      const userAgent = request.headers.get('user-agent') || undefined
      const forwarded = request.headers.get('x-forwarded-for')
      const ipAddress = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined

      // Record the open event (async, don't await)
      recordTrackingEvent(emailId, 'open', {
        userAgent,
        ipAddress,
      }).catch(err => console.error('Failed to record open event:', err))
    }
  } catch (error) {
    console.error('Error processing tracking pixel:', error)
  }

  // Always return the pixel, regardless of tracking success
  return new NextResponse(PIXEL_BUFFER, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': PIXEL_BUFFER.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
