import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function deriveDevKey(): Buffer {
  const seed = process.env.NEXTAUTH_SECRET || 'dev-insecure-key'
  console.warn(
    'ENCRYPTION_KEY is not set; using a derived development key. Set ENCRYPTION_KEY to persist encrypted secrets safely.'
  )
  return crypto.createHash('sha256').update(`dev:${seed}`).digest()
}

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    // Development fallback:
    // Derive a stable key from NEXTAUTH_SECRET (or a constant) so local dev can function
    // without extra setup. This is not intended for production.
    return deriveDevKey()
  }
  // If the key is hex-encoded, convert it
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }
  // Otherwise, hash it to get 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decryptWithKey(encryptedText: string, key: Buffer): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted text format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function decrypt(encryptedText: string): string {
  const key = getKey()

  try {
    return decryptWithKey(encryptedText, key)
  } catch (e) {
    // Backward-compat for local dev: if secrets were encrypted before ENCRYPTION_KEY existed,
    // they used the derived dev key. Try it as a fallback.
    if (process.env.NODE_ENV !== 'production' && process.env.ENCRYPTION_KEY) {
      return decryptWithKey(encryptedText, deriveDevKey())
    }
    throw e
  }
}

export function encryptJson<T>(data: T): string {
  return encrypt(JSON.stringify(data))
}

export function decryptJson<T>(encryptedText: string): T {
  return JSON.parse(decrypt(encryptedText))
}
