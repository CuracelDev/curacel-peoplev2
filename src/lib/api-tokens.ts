import crypto from 'crypto'

const TOKEN_PREFIX = 'curacel_'
const PREFIX_LENGTH = 10

export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateApiToken(): {
  token: string
  tokenHash: string
  tokenPrefix: string
} {
  const token = `${TOKEN_PREFIX}${crypto.randomBytes(24).toString('hex')}`
  return {
    token,
    tokenHash: hashApiToken(token),
    tokenPrefix: token.slice(0, PREFIX_LENGTH),
  }
}

export function normalizeApiToken(raw: string): string {
  return raw.trim()
}
