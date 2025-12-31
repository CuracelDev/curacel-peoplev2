import { google, gmail_v1 } from 'googleapis'

export interface GmailConfig {
  serviceAccountKey: string
  delegatedUser: string  // Admin user to impersonate for domain-wide delegation
  defaultCcEmail?: string
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  content: Buffer | string  // Base64 string or Buffer
  contentId?: string  // For inline images
}

export interface SendEmailParams {
  senderEmail: string  // Send as this user (requires domain-wide delegation)
  senderName?: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  htmlBody: string
  textBody?: string
  attachments?: EmailAttachment[]
  // For threading
  inReplyTo?: string      // Message-ID of email being replied to
  references?: string     // Full References header chain
  threadId?: string       // Gmail thread ID to add message to
}

export interface SendEmailResult {
  success: boolean
  messageId?: string      // Gmail message ID
  threadId?: string       // Gmail thread ID
  messageIdHeader?: string // RFC 5322 Message-ID header
  error?: string
}

export interface ParsedEmail {
  id: string
  threadId: string
  messageIdHeader?: string
  inReplyTo?: string
  references?: string
  from: { email: string; name?: string }
  to: Array<{ email: string; name?: string }>
  cc: Array<{ email: string; name?: string }>
  subject: string
  htmlBody?: string
  textBody?: string
  date: Date
  attachments: Array<{
    id: string
    filename: string
    mimeType: string
    size: number
  }>
}

export class GmailConnector {
  private config: GmailConfig
  private gmail: gmail_v1.Gmail | null = null
  private auth: InstanceType<typeof google.auth.JWT> | null = null
  private currentImpersonatedUser: string | null = null

  constructor(config: GmailConfig) {
    this.config = config
  }

  /**
   * Get Gmail client, optionally impersonating a specific user
   */
  private async getGmailClient(impersonateUser?: string): Promise<gmail_v1.Gmail> {
    const targetUser = impersonateUser || this.config.delegatedUser

    // Reuse client if same user
    if (this.gmail && this.currentImpersonatedUser === targetUser) {
      return this.gmail
    }

    const serviceAccount = JSON.parse(this.config.serviceAccountKey)

    this.auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
      subject: targetUser,  // Impersonate this user
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.auth })
    this.currentImpersonatedUser = targetUser
    return this.gmail
  }

  /**
   * Test connection to Gmail API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const gmail = await this.getGmailClient()
      // Try to get user profile
      await gmail.users.getProfile({ userId: 'me' })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Gmail API',
      }
    }
  }

  /**
   * Send email as a specific user (requires domain-wide delegation)
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      // Get client impersonating the sender
      const gmail = await this.getGmailClient(params.senderEmail)

      // Build MIME message
      const mimeMessage = this.buildMimeMessage(params)

      // Encode to base64url
      const encodedMessage = Buffer.from(mimeMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      // Send the message
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: params.threadId,  // Add to existing thread if provided
        },
      })

      // Extract Message-ID header from sent message
      let messageIdHeader: string | undefined
      if (response.data.id) {
        const sentMessage = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.id,
          format: 'metadata',
          metadataHeaders: ['Message-ID'],
        })
        const messageIdHeaderObj = sentMessage.data.payload?.headers?.find(
          h => h.name?.toLowerCase() === 'message-id'
        )
        messageIdHeader = messageIdHeaderObj?.value || undefined
      }

      return {
        success: true,
        messageId: response.data.id || undefined,
        threadId: response.data.threadId || undefined,
        messageIdHeader,
      }
    } catch (error) {
      console.error('Gmail send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }
    }
  }

  /**
   * Build RFC 2822 MIME message
   */
  private buildMimeMessage(params: SendEmailParams): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2)}`
    const hasAttachments = params.attachments && params.attachments.length > 0

    // Build headers
    const headers: string[] = []

    // From
    if (params.senderName) {
      headers.push(`From: "${params.senderName}" <${params.senderEmail}>`)
    } else {
      headers.push(`From: ${params.senderEmail}`)
    }

    // To
    headers.push(`To: ${params.to.join(', ')}`)

    // CC
    if (params.cc && params.cc.length > 0) {
      headers.push(`Cc: ${params.cc.join(', ')}`)
    }

    // BCC
    if (params.bcc && params.bcc.length > 0) {
      headers.push(`Bcc: ${params.bcc.join(', ')}`)
    }

    // Subject
    headers.push(`Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`)

    // Threading headers
    if (params.inReplyTo) {
      headers.push(`In-Reply-To: ${params.inReplyTo}`)
    }
    if (params.references) {
      headers.push(`References: ${params.references}`)
    }

    // MIME headers
    headers.push('MIME-Version: 1.0')

    if (hasAttachments) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
    } else if (params.textBody && params.htmlBody) {
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    } else if (params.htmlBody) {
      headers.push('Content-Type: text/html; charset=UTF-8')
    } else {
      headers.push('Content-Type: text/plain; charset=UTF-8')
    }

    // Build message
    let message = headers.join('\r\n') + '\r\n\r\n'

    if (hasAttachments) {
      // Multipart/mixed for attachments
      const altBoundary = `alt_${boundary}`

      // Body part
      message += `--${boundary}\r\n`
      if (params.textBody && params.htmlBody) {
        message += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`

        // Plain text
        message += `--${altBoundary}\r\n`
        message += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n'
        message += params.textBody + '\r\n\r\n'

        // HTML
        message += `--${altBoundary}\r\n`
        message += 'Content-Type: text/html; charset=UTF-8\r\n\r\n'
        message += params.htmlBody + '\r\n\r\n'

        message += `--${altBoundary}--\r\n`
      } else if (params.htmlBody) {
        message += 'Content-Type: text/html; charset=UTF-8\r\n\r\n'
        message += params.htmlBody + '\r\n\r\n'
      } else {
        message += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n'
        message += (params.textBody || '') + '\r\n\r\n'
      }

      // Attachments
      for (const attachment of params.attachments || []) {
        message += `--${boundary}\r\n`
        message += `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"\r\n`
        message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`
        message += 'Content-Transfer-Encoding: base64\r\n'
        if (attachment.contentId) {
          message += `Content-ID: <${attachment.contentId}>\r\n`
        }
        message += '\r\n'

        const base64Content = typeof attachment.content === 'string'
          ? attachment.content
          : attachment.content.toString('base64')
        message += base64Content + '\r\n'
      }

      message += `--${boundary}--\r\n`
    } else if (params.textBody && params.htmlBody) {
      // Multipart/alternative for text + html
      message += `--${boundary}\r\n`
      message += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n'
      message += params.textBody + '\r\n\r\n'

      message += `--${boundary}\r\n`
      message += 'Content-Type: text/html; charset=UTF-8\r\n\r\n'
      message += params.htmlBody + '\r\n\r\n'

      message += `--${boundary}--\r\n`
    } else {
      // Simple text or html
      message += params.htmlBody || params.textBody || ''
    }

    return message
  }

  /**
   * Get a thread by ID
   */
  async getThread(senderEmail: string, threadId: string): Promise<gmail_v1.Schema$Thread | null> {
    try {
      const gmail = await this.getGmailClient(senderEmail)
      const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      })
      return response.data
    } catch (error) {
      console.error('Gmail getThread error:', error)
      return null
    }
  }

  /**
   * List messages in a thread
   */
  async listThreadMessages(senderEmail: string, threadId: string): Promise<ParsedEmail[]> {
    try {
      const thread = await this.getThread(senderEmail, threadId)
      if (!thread?.messages) return []

      return thread.messages.map(msg => this.parseMessage(msg))
    } catch (error) {
      console.error('Gmail listThreadMessages error:', error)
      return []
    }
  }

  /**
   * Get new messages in a thread after a specific message ID
   */
  async getNewMessages(
    senderEmail: string,
    threadId: string,
    afterMessageId: string
  ): Promise<ParsedEmail[]> {
    try {
      const messages = await this.listThreadMessages(senderEmail, threadId)

      // Find the index of the afterMessageId
      const afterIndex = messages.findIndex(m => m.id === afterMessageId)
      if (afterIndex === -1) return messages  // Return all if not found

      // Return messages after that index
      return messages.slice(afterIndex + 1)
    } catch (error) {
      console.error('Gmail getNewMessages error:', error)
      return []
    }
  }

  /**
   * Get a single message
   */
  async getMessage(senderEmail: string, messageId: string): Promise<ParsedEmail | null> {
    try {
      const gmail = await this.getGmailClient(senderEmail)
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })
      return this.parseMessage(response.data)
    } catch (error) {
      console.error('Gmail getMessage error:', error)
      return null
    }
  }

  /**
   * Get attachment data
   */
  async getAttachment(
    senderEmail: string,
    messageId: string,
    attachmentId: string
  ): Promise<Buffer | null> {
    try {
      const gmail = await this.getGmailClient(senderEmail)
      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId,
      })

      if (!response.data.data) return null

      // Decode base64url
      const base64 = response.data.data.replace(/-/g, '+').replace(/_/g, '/')
      return Buffer.from(base64, 'base64')
    } catch (error) {
      console.error('Gmail getAttachment error:', error)
      return null
    }
  }

  /**
   * Parse a Gmail message into our structure
   */
  private parseMessage(message: gmail_v1.Schema$Message): ParsedEmail {
    const headers = message.payload?.headers || []

    const getHeader = (name: string): string | undefined => {
      return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || undefined
    }

    const parseAddress = (addr: string): { email: string; name?: string } => {
      // Parse "Name <email@example.com>" or just "email@example.com"
      const match = addr.match(/^(?:"?(.+?)"?\s)?<?([^\s<>]+@[^\s<>]+)>?$/)
      if (match) {
        return { email: match[2], name: match[1] || undefined }
      }
      return { email: addr }
    }

    const parseAddressList = (header: string | undefined): Array<{ email: string; name?: string }> => {
      if (!header) return []
      return header.split(',').map(addr => parseAddress(addr.trim())).filter(a => a.email)
    }

    // Extract body
    let htmlBody: string | undefined
    let textBody: string | undefined
    const attachments: ParsedEmail['attachments'] = []

    const extractParts = (parts: gmail_v1.Schema$MessagePart[] | undefined) => {
      if (!parts) return

      for (const part of parts) {
        const mimeType = part.mimeType || ''

        if (mimeType === 'text/plain' && part.body?.data) {
          textBody = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        } else if (mimeType === 'text/html' && part.body?.data) {
          htmlBody = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        } else if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: mimeType,
            size: part.body.size || 0,
          })
        } else if (part.parts) {
          extractParts(part.parts)
        }
      }
    }

    // Handle single-part messages
    if (message.payload?.body?.data) {
      const mimeType = message.payload.mimeType || 'text/plain'
      const bodyData = Buffer.from(
        message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf8')

      if (mimeType === 'text/html') {
        htmlBody = bodyData
      } else {
        textBody = bodyData
      }
    }

    // Handle multi-part messages
    if (message.payload?.parts) {
      extractParts(message.payload.parts)
    }

    return {
      id: message.id || '',
      threadId: message.threadId || '',
      messageIdHeader: getHeader('Message-ID'),
      inReplyTo: getHeader('In-Reply-To'),
      references: getHeader('References'),
      from: parseAddress(getHeader('From') || ''),
      to: parseAddressList(getHeader('To')),
      cc: parseAddressList(getHeader('Cc')),
      subject: getHeader('Subject') || '(No Subject)',
      htmlBody,
      textBody,
      date: new Date(parseInt(message.internalDate || '0')),
      attachments,
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(senderEmail: string, messageId: string): Promise<boolean> {
    try {
      const gmail = await this.getGmailClient(senderEmail)
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      })
      return true
    } catch (error) {
      console.error('Gmail markAsRead error:', error)
      return false
    }
  }
}

/**
 * Create a Gmail connector from environment variables
 */
export function createGmailConnector(): GmailConnector | null {
  // Can reuse the same service account key as Google Workspace
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GMAIL_SERVICE_ACCOUNT_KEY
  const delegatedUser = process.env.GMAIL_DELEGATED_USER || process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL
  const defaultCcEmail = process.env.GMAIL_DEFAULT_CC || 'peopleops@curacel.ai'

  if (!serviceAccountKey || !delegatedUser) {
    console.warn('Gmail integration not configured')
    return null
  }

  return new GmailConnector({
    serviceAccountKey,
    delegatedUser,
    defaultCcEmail,
  })
}
