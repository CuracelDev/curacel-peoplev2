import { randomUUID } from 'crypto'
import { decrypt } from '@/lib/encryption'
import { getOrganization } from '@/lib/organization'
import type { PrismaClient } from '@prisma/client'
import { OUTBOUND_EVENTS, type OutboundEventType } from './outbound-events'

type OutboundActor = {
  id?: string
  name?: string
  email?: string
  role?: string
}

type OutboundConfig = {
  url: string
  apiKey?: string
  events?: string[]
}

const OUTBOUND_EVENT_SET = new Set(OUTBOUND_EVENTS.map((event) => event.id))

function safeParseConfig(configEncrypted: string): Record<string, unknown> {
  try {
    return JSON.parse(decrypt(configEncrypted)) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(configEncrypted) as Record<string, unknown>
    } catch {
      return {}
    }
  }
}

function buildHeaders(apiKey?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (apiKey) {
    headers.authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
  }
  return headers
}

export function extractOutboundConfig(config: Record<string, unknown>): OutboundConfig | null {
  const outbound = (config.outbound ?? {}) as Record<string, unknown>
  const url = typeof outbound.url === 'string' ? outbound.url.trim() : ''
  if (!url) return null
  const apiKey = typeof outbound.apiKey === 'string' ? outbound.apiKey.trim() : undefined
  const events = Array.isArray(outbound.events)
    ? outbound.events.filter((event): event is string => typeof event === 'string')
    : undefined
  return { url, apiKey, events }
}

export async function testOutboundConnection(config: OutboundConfig) {
  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: buildHeaders(config.apiKey),
      body: JSON.stringify({
        id: randomUUID(),
        event: 'curacel.test',
        timestamp: new Date().toISOString(),
        data: { message: 'Connection test' },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, error: text || `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
  }
}

export async function sendOutboundEvent(
  prisma: PrismaClient,
  event: OutboundEventType,
  data: unknown,
  actor?: OutboundActor
) {
  if (!OUTBOUND_EVENT_SET.has(event)) return

  let connections: Array<{ configEncrypted: string }>
  try {
    connections = await prisma.appConnection.findMany({
      where: {
        isActive: true,
        app: { name: { equals: 'n8n', mode: 'insensitive' } },
      },
      select: { configEncrypted: true },
      orderBy: { updatedAt: 'desc' },
    })
  } catch (error) {
    console.warn('Failed to load outbound event connections:', error)
    return
  }

  if (connections.length === 0) return

  const organization = await getOrganization().catch(() => null)
  const payload = {
    id: randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    data,
    actor,
    organization: organization ? { id: organization.id, name: organization.name } : undefined,
    source: 'curacel-people',
  }

  await Promise.all(
    connections.map(async (connection) => {
      const config = safeParseConfig(connection.configEncrypted)
      const outbound = extractOutboundConfig(config)
      if (!outbound) return
      if (outbound.events && !outbound.events.includes(event)) return

      try {
        const res = await fetch(outbound.url, {
          method: 'POST',
          headers: buildHeaders(outbound.apiKey),
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.warn('Outbound event failed:', event, text || res.status)
        }
      } catch (error) {
        console.warn('Outbound event failed:', event, error)
      }
    })
  )
}
