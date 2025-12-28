// DocuSign Integration (Placeholder)
// The docusign-esign SDK has import issues with Next.js
// Configure DOCUSIGN_* env vars and install a working SDK version to enable

interface DocuSignConfig {
  integrationKey: string
  userId: string
  accountId: string
  basePath: string
  privateKey: string
}

interface SendEnvelopeParams {
  signerEmail: string
  signerName: string
  subject: string
  documentHtml: string
  callbackUrl?: string
}

interface EnvelopeResult {
  envelopeId: string
  status: string
  signingUrl?: string
}

export class DocuSignConnector {
  private config: DocuSignConfig

  constructor(config: DocuSignConfig) {
    this.config = config
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // Placeholder - DocuSign SDK not configured
    return { 
      success: false, 
      error: 'DocuSign integration not configured. Set DOCUSIGN_* environment variables.' 
    }
  }

  async sendEnvelope(params: SendEnvelopeParams): Promise<EnvelopeResult> {
    throw new Error('DocuSign integration not configured')
  }

  async getSigningUrl(envelopeId: string, signerEmail: string, signerName: string, returnUrl: string): Promise<string> {
    throw new Error('DocuSign integration not configured')
  }

  async getEnvelopeStatus(envelopeId: string): Promise<{ status: string; completedAt?: Date }> {
    throw new Error('DocuSign integration not configured')
  }

  async getSignedDocument(envelopeId: string): Promise<Buffer> {
    throw new Error('DocuSign integration not configured')
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    throw new Error('DocuSign integration not configured')
  }
}

export function createDocuSignConnector(): DocuSignConnector | null {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
  const userId = process.env.DOCUSIGN_USER_ID
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID
  const basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi'
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY

  if (!integrationKey || !userId || !accountId || !privateKey) {
    // DocuSign not configured - this is fine, offers can still be sent via email
    return null
  }

  return new DocuSignConnector({
    integrationKey,
    userId,
    accountId,
    basePath,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  })
}

export function verifyDocuSignWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('base64')
  return signature === expectedSignature
}
