/**
 * Email Tracking Utilities
 *
 * Generates tracking pixels and tracked links for email analytics
 */

import { prisma } from './prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Generate a 1x1 transparent tracking pixel URL
 */
export function generateTrackingPixelUrl(emailId: string): string {
  const token = Buffer.from(emailId).toString('base64url')
  return `${APP_URL}/api/email-track/open/${token}`
}

/**
 * Generate a tracked link that redirects to the original URL
 */
export function generateTrackedLinkUrl(emailId: string, originalUrl: string): string {
  const payload = JSON.stringify({ emailId, url: originalUrl })
  const token = Buffer.from(payload).toString('base64url')
  return `${APP_URL}/api/email-track/click/${token}`
}

/**
 * Generate tracking pixel HTML to embed in emails
 */
export function generateTrackingPixelHtml(emailId: string): string {
  const pixelUrl = generateTrackingPixelUrl(emailId)
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`
}

/**
 * Replace links in HTML with tracked versions
 */
export function addLinkTracking(emailId: string, htmlContent: string): string {
  // Match href attributes with http/https URLs
  const linkRegex = /href="(https?:\/\/[^"]+)"/gi

  return htmlContent.replace(linkRegex, (match, url) => {
    // Don't track internal tracking URLs or unsubscribe links
    if (url.includes('/api/email-track/') || url.includes('unsubscribe')) {
      return match
    }
    const trackedUrl = generateTrackedLinkUrl(emailId, url)
    return `href="${trackedUrl}"`
  })
}

/**
 * Add tracking to email HTML (pixel + link tracking)
 */
export function addEmailTracking(emailId: string, htmlContent: string): string {
  // Add link tracking
  let trackedHtml = addLinkTracking(emailId, htmlContent)

  // Add tracking pixel before closing body tag (or at end if no body tag)
  const pixelHtml = generateTrackingPixelHtml(emailId)

  if (trackedHtml.includes('</body>')) {
    trackedHtml = trackedHtml.replace('</body>', `${pixelHtml}</body>`)
  } else {
    trackedHtml += pixelHtml
  }

  return trackedHtml
}

/**
 * Record a tracking event
 */
export async function recordTrackingEvent(
  emailId: string,
  eventType: 'open' | 'click',
  eventData?: {
    linkUrl?: string
    userAgent?: string
    ipAddress?: string
  }
): Promise<void> {
  try {
    // Create tracking event
    await prisma.emailTrackingEvent.create({
      data: {
        emailId,
        eventType,
        eventData: eventData || {},
        occurredAt: new Date(),
      },
    })

    // Update email stats
    if (eventType === 'open') {
      await prisma.candidateEmail.update({
        where: { id: emailId },
        data: {
          openCount: { increment: 1 },
          openedAt: { set: new Date() }, // Only sets if null
        },
      })

      // Also update with first open time if not set
      const email = await prisma.candidateEmail.findUnique({
        where: { id: emailId },
        select: { openedAt: true },
      })

      if (!email?.openedAt) {
        await prisma.candidateEmail.update({
          where: { id: emailId },
          data: { openedAt: new Date() },
        })
      }
    } else if (eventType === 'click') {
      await prisma.candidateEmail.update({
        where: { id: emailId },
        data: {
          clickCount: { increment: 1 },
          clickedAt: { set: new Date() },
        },
      })

      // Also update with first click time if not set
      const email = await prisma.candidateEmail.findUnique({
        where: { id: emailId },
        select: { clickedAt: true },
      })

      if (!email?.clickedAt) {
        await prisma.candidateEmail.update({
          where: { id: emailId },
          data: { clickedAt: new Date() },
        })
      }
    }
  } catch (error) {
    console.error('Failed to record tracking event:', error)
    // Don't throw - tracking failures shouldn't break the user experience
  }
}

/**
 * Decode tracking token for open events
 */
export function decodeOpenTrackingToken(token: string): string | null {
  try {
    return Buffer.from(token, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/**
 * Decode tracking token for click events
 */
export function decodeClickTrackingToken(token: string): { emailId: string; url: string } | null {
  try {
    const payload = Buffer.from(token, 'base64url').toString('utf8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

/**
 * Get email analytics summary
 */
export async function getEmailAnalytics(emailId: string): Promise<{
  openCount: number
  clickCount: number
  firstOpenedAt: Date | null
  firstClickedAt: Date | null
  uniqueOpens: number
  uniqueClicks: number
  clickedLinks: Array<{ url: string; count: number }>
}> {
  const email = await prisma.candidateEmail.findUnique({
    where: { id: emailId },
    select: {
      openCount: true,
      clickCount: true,
      openedAt: true,
      clickedAt: true,
    },
  })

  const events = await prisma.emailTrackingEvent.findMany({
    where: { emailId },
    orderBy: { occurredAt: 'asc' },
  })

  // Count unique opens by IP (simplified)
  const uniqueOpenIps = new Set(
    events
      .filter(e => e.eventType === 'open')
      .map(e => (e.eventData as { ipAddress?: string })?.ipAddress)
      .filter(Boolean)
  )

  // Count unique clicks by IP
  const uniqueClickIps = new Set(
    events
      .filter(e => e.eventType === 'click')
      .map(e => (e.eventData as { ipAddress?: string })?.ipAddress)
      .filter(Boolean)
  )

  // Count clicks per link
  const linkClicks = new Map<string, number>()
  events
    .filter(e => e.eventType === 'click')
    .forEach(e => {
      const url = (e.eventData as { linkUrl?: string })?.linkUrl
      if (url) {
        linkClicks.set(url, (linkClicks.get(url) || 0) + 1)
      }
    })

  return {
    openCount: email?.openCount || 0,
    clickCount: email?.clickCount || 0,
    firstOpenedAt: email?.openedAt || null,
    firstClickedAt: email?.clickedAt || null,
    uniqueOpens: uniqueOpenIps.size,
    uniqueClicks: uniqueClickIps.size,
    clickedLinks: Array.from(linkClicks.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count),
  }
}
