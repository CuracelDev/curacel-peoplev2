import fs from 'fs/promises'
import nodemailer from 'nodemailer'
import { ServerClient } from 'postmark'

function normalizeEnvValue(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  return trimmed.replace(/^['"]|['"]$/g, '').trim()
}

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key])
    if (value) return value
  }
  return ''
}

export type EmailTransportKind = 'postmark' | 'smtp' | 'none'

export function getEmailTransportStatus(): {
  kind: EmailTransportKind
  postmarkConfigured: boolean
  smtpConfigured: boolean
  from: string
  messageStream: string
} {
  const postmarkToken = readEnv(
    'POSTMARK_SERVER_TOKEN',
    'POSTMARK_API_TOKEN',
    'POSTMARK_TOKEN',
    'POSTMARK_API_KEY',
    'POSTMARK_KEY'
  )

  const smtpHost = readEnv('SMTP_HOST')
  const smtpUser = readEnv('SMTP_USER', 'SMTP_USERNAME')
  const smtpPassword = readEnv('SMTP_PASSWORD', 'SMTP_PASS')

  const postmarkConfigured = Boolean(postmarkToken)
  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPassword)

  const companyDomain = readEnv('COMPANY_DOMAIN')
  const defaultFrom = companyDomain ? `people@${companyDomain}` : 'people@curacel.ai'
  const from = readEnv('POSTMARK_FROM', 'EMAIL_FROM') || defaultFrom
  const messageStream = readEnv('POSTMARK_MESSAGE_STREAM', 'POSTMARK_STREAM') || 'outbound'

  const kind: EmailTransportKind = postmarkConfigured ? 'postmark' : smtpConfigured ? 'smtp' : 'none'

  return { kind, postmarkConfigured, smtpConfigured, from, messageStream }
}

let warnedMissingTransport = false

// Build transports lazily so new env values are picked up after restart
function getPostmarkClient() {
  const token = readEnv(
    'POSTMARK_SERVER_TOKEN',
    'POSTMARK_API_TOKEN',
    'POSTMARK_TOKEN',
    'POSTMARK_API_KEY',
    'POSTMARK_KEY'
  )
  if (!token) return null
  return new ServerClient(token)
}

function getSmtpTransporter() {
  const smtpHost = readEnv('SMTP_HOST')
  const smtpUser = readEnv('SMTP_USER', 'SMTP_USERNAME')
  const smtpPassword = readEnv('SMTP_PASSWORD', 'SMTP_PASS')
  const hasSmtpCreds = Boolean(smtpHost && smtpUser && smtpPassword)
  if (!hasSmtpCreds) return null

  const smtpPort = parseInt(readEnv('SMTP_PORT') || '587', 10)
  const secure = readEnv('SMTP_SECURE') === 'true' || smtpPort === 465

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content?: Buffer | string
    path?: string
    contentType?: string
  }>
}

function getAppUrl(): string {
  const url = readEnv('NEXT_PUBLIC_APP_URL', 'NEXTAUTH_URL')
  return url || 'http://localhost:3000'
}

function resolveAbsoluteUrl(rawUrl: string | undefined, appUrl: string, fallbackPath: string) {
  const baseUrl = appUrl.replace(/\/+$/, '')
  const fallback = fallbackPath.startsWith('/') ? `${baseUrl}${fallbackPath}` : `${baseUrl}/${fallbackPath}`
  if (!rawUrl) return fallback
  const trimmed = rawUrl.trim()
  if (!trimmed) return fallback
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return `${baseUrl}${trimmed}`
  return `${baseUrl}/${trimmed}`
}

export function buildBrandedEmailHtml(params: {
  companyName: string
  bodyHtml: string
  logoUrl?: string
}): string {
  const { companyName, bodyHtml, logoUrl: rawLogoUrl } = params
  const appUrl = getAppUrl()
  const logoUrl = resolveAbsoluteUrl(rawLogoUrl, appUrl, '/logo.png')
  const year = new Date().getFullYear()

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0; padding:0; background-color:#eef2f7; font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef2f7;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
                <tr>
                  <td style="padding:24px 32px 12px; text-align:center;">
                    <img
                      src="${logoUrl}"
                      alt="${companyName} logo"
                      width="120"
                      style="display:block; margin:0 auto; height:auto;"
                    />
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 32px 32px; font-size:16px; line-height:1.6; color:#334155;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0; font-size:12px; color:#94a3b8; text-align:center;">
                &copy; ${year} ${companyName}
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, text, attachments } = options
  const status = getEmailTransportStatus()
  const postmarkFrom = status.from
  const messageStream = status.messageStream

  let lastError: unknown = null

  const postmarkClient = getPostmarkClient()

  if (postmarkClient) {
    try {
      const postmarkAttachments = attachments
        ? await Promise.all(
            attachments.map(async (file) => {
              if (file.content) {
                return {
                  Name: file.filename,
                  Content: Buffer.isBuffer(file.content)
                    ? file.content.toString('base64')
                    : Buffer.from(file.content).toString('base64'),
                  ContentType: file.contentType || 'application/octet-stream',
                  ContentID: file.filename,
                }
              }

              if (file.path) {
                const contentBuffer = await fs.readFile(file.path)
                return {
                  Name: file.filename,
                  Content: contentBuffer.toString('base64'),
                  ContentType: file.contentType || 'application/octet-stream',
                  ContentID: file.filename,
                }
              }

              return null
            })
          ).then(
            (values) =>
              values.filter(Boolean) as Array<{ Name: string; Content: string; ContentType: string; ContentID: string }>
          )
        : undefined

      await postmarkClient.sendEmail({
        From: postmarkFrom,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text || html.replace(/<[^>]*>/g, ''),
        MessageStream: messageStream,
        Attachments: postmarkAttachments,
      })
      return
    } catch (error) {
      console.warn('Postmark send failed, falling back to SMTP (if configured):', error)
      lastError = error
    }
  }

  const transporter = getSmtpTransporter()

  if (transporter) {
    await transporter.sendMail({
      from: postmarkFrom,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      attachments,
    })
    return
  }

  // No transporter and Postmark failed: surface error instead of silent success
  if (status.kind === 'none' && !warnedMissingTransport) {
    warnedMissingTransport = true
    console.error(
      'Email transport not configured. Set POSTMARK_SERVER_TOKEN (or POSTMARK_API_TOKEN) or SMTP_HOST/SMTP_USER/SMTP_PASSWORD. If you just changed env vars, restart the server.'
    )
  }
  if (status.kind === 'none') {
    throw new Error(
      'Email send failed: no email transport configured (set POSTMARK_SERVER_TOKEN / POSTMARK_API_TOKEN or SMTP_HOST/SMTP_USER/SMTP_PASSWORD, then restart the server)'
    )
  }

  throw lastError instanceof Error ? lastError : new Error('Email send failed')
}

export async function sendOfferEmail(params: {
  candidateEmail: string
  candidateName: string
  offerLink: string
  companyName: string
  logoUrl?: string
}): Promise<void> {
  const { candidateEmail, candidateName, offerLink, companyName, logoUrl: rawLogoUrl } = params
  const appUrl = getAppUrl()
  const logoUrl = resolveAbsoluteUrl(rawLogoUrl, appUrl, '/logo.png')
  const year = new Date().getFullYear()

  await sendEmail({
    to: candidateEmail,
    subject: `Your offer from ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
	        </head>
	        <body style="margin:0; padding:0; background-color:#eef2f7; font-family: 'Segoe UI', Arial, sans-serif; color:#0f172a;">
	          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef2f7;">
              <tr>
                <td align="center" style="padding:32px 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
                    <tr>
                      <td style="padding:24px 32px 12px; text-align:center;">
                        <img
                          src="${logoUrl}"
                          alt="${companyName} logo"
                          width="120"
                          style="display:block; margin:0 auto; height:auto;"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 32px 32px;">
                        <h1 style="margin:0 0 16px; font-size:24px; line-height:1.3; font-weight:700; color:#0f172a;">
                          Congratulations, ${candidateName}!
                        </h1>
                        <p style="margin:0 0 12px; font-size:16px; line-height:1.6; color:#334155;">
                          We&#39;re excited to extend an offer to join ${companyName}.
                        </p>
                        <p style="margin:0 0 24px; font-size:16px; line-height:1.6; color:#334155;">
                          Please review and sign your offer letter by clicking the button below.
                        </p>
                        <a
                          href="${offerLink}"
                          style="display:inline-block; background:#1d4ed8; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:10px; font-weight:600; font-size:15px;"
                        >Review &amp; Sign Offer</a>
                        <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#64748b; text-align:center;">
                          If you have any issues, please reach out to the People team.
                        </p>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:16px 0 0; font-size:12px; color:#94a3b8; text-align:center;">
                    &copy; ${year} ${companyName}
                  </p>
                </td>
              </tr>
	          </table>
	        </body>
	      </html>
	    `,
  })
}

export async function sendOnboardingEmail(params: {
  employeeEmail: string
  employeeName: string
  onboardingLink: string
  startDate: Date
  managerName?: string
  companyName: string
}): Promise<void> {
  const { employeeEmail, employeeName, onboardingLink, startDate, managerName, companyName } = params

  await sendEmail({
    to: employeeEmail,
    subject: `Welcome to ${companyName} - Complete your onboarding`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome aboard, ${employeeName}!</h1>
            </div>
            <div class="content">
              <p>We're thrilled to have you joining ${companyName}!</p>
              
              <div class="info-box">
                <strong>Start Date:</strong> ${startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                ${managerName ? `<br><strong>Manager:</strong> ${managerName}` : ''}
              </div>
              
              <p>To complete your onboarding, please fill out your personal details:</p>
              <ul>
                <li>Home address</li>
                <li>Phone number</li>
                <li>Emergency contact</li>
                <li>Bank details</li>
              </ul>
              
              <a href="${onboardingLink}" class="button">Complete Onboarding</a>
              
              <p class="footer">
                This link will expire in 7 days. If you have any questions, please contact HR.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendAccountCredentialsEmail(params: {
  employeeEmail: string
  employeeName: string
  workEmail: string
  temporaryPassword: string
  companyName: string
}): Promise<void> {
  const { employeeEmail, employeeName, workEmail, temporaryPassword, companyName } = params

  await sendEmail({
    to: employeeEmail,
    subject: `Your ${companyName} account credentials`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 6px; margin: 15px 0; font-family: monospace; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Your Account is Ready!</h1>
            </div>
            <div class="content">
              <p>Hi ${employeeName},</p>
              <p>Your ${companyName} Google Workspace account has been created:</p>
              
              <div class="credentials">
                <strong>Email:</strong> ${workEmail}<br>
                <strong>Temporary Password:</strong> ${temporaryPassword}
              </div>
              
              <div class="warning">
                <strong>Important:</strong> You will be required to change your password on first login.
              </div>
              
              <p>You can sign in at <a href="https://workspace.google.com">workspace.google.com</a></p>
              
              <p class="footer">
                If you didn't expect this email or have questions, please contact IT.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendSignedOfferEmail(params: {
  to: string
  candidateName: string
  companyName: string
  signedHtml: string
  signedPdf?: Buffer
  signedFileName?: string
}): Promise<void> {
  const { to, candidateName, companyName, signedHtml, signedPdf, signedFileName = signedPdf ? 'signed-offer.pdf' : 'signed-offer.html' } = params

  await sendEmail({
    to,
    subject: `Signed offer copy - ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="margin-bottom: 8px;">Signed offer</h2>
          <p>Hi ${candidateName},</p>
          <p>Attached is a copy of your signed offer with ${companyName}.</p>
          <p style="margin-top: 16px;">Thank you!</p>
        </body>
      </html>
    `,
    attachments: [
      {
        filename: signedFileName,
        content: signedPdf ? signedPdf : Buffer.from(signedHtml),
        contentType: signedPdf ? 'application/pdf' : 'text/html',
      },
    ],
  })
}

export async function sendTeamInviteEmail(params: {
  to: string
  invitedByName?: string | null
  role: string
  acceptUrl: string
}): Promise<void> {
  const { to, invitedByName, role, acceptUrl } = params

  await sendEmail({
    to,
    subject: `You've been invited to Curacel People`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9fafb; padding: 24px; border-radius: 8px; }
            .button { display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 18px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
            .meta { color: #6b7280; font-size: 12px; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2 style="margin-top: 0;">You've been invited</h2>
              <p>${invitedByName ? `${invitedByName} has` : 'You have'} invited you to Curacel People.</p>
              <p><strong>Role:</strong> ${role}</p>
              <a class="button" href="${acceptUrl}">Accept invite</a>
              <p class="meta">If you didn't expect this invite, you can ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendInterviewerInviteEmail(params: {
  to: string
  interviewerName: string
  candidateName: string
  jobTitle: string
  interviewDate: Date
  interviewType: string
  interviewLink: string
  companyName: string
  logoUrl?: string
}): Promise<void> {
  const { to, interviewerName, candidateName, jobTitle, interviewDate, interviewType, interviewLink, companyName, logoUrl } = params
  const appUrl = getAppUrl()
  const resolvedLogoUrl = resolveAbsoluteUrl(logoUrl, appUrl, '/logo.png')
  const year = new Date().getFullYear()

  const formattedDate = interviewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = interviewDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  await sendEmail({
    to,
    subject: `Interview Assignment: ${candidateName} for ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0; padding:0; background-color:#eef2f7; font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef2f7;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
                  <tr>
                    <td style="padding:24px 32px 12px; text-align:center;">
                      <img
                        src="${resolvedLogoUrl}"
                        alt="${companyName} logo"
                        width="120"
                        style="display:block; margin:0 auto; height:auto;"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 32px 32px;">
                      <h1 style="margin:0 0 16px; font-size:24px; line-height:1.3; font-weight:700; color:#0f172a;">
                        Interview Assignment
                      </h1>
                      <p style="margin:0 0 12px; font-size:16px; line-height:1.6; color:#334155;">
                        Hi ${interviewerName},
                      </p>
                      <p style="margin:0 0 20px; font-size:16px; line-height:1.6; color:#334155;">
                        You've been assigned as an interviewer for <strong>${candidateName}</strong> applying for <strong>${jobTitle}</strong>.
                      </p>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc; border-radius:10px; margin-bottom:24px;">
                        <tr>
                          <td style="padding:20px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="padding:4px 0;">
                                  <span style="color:#64748b; font-size:14px;">Date</span>
                                </td>
                                <td style="padding:4px 0; text-align:right;">
                                  <span style="color:#0f172a; font-weight:600; font-size:14px;">${formattedDate}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:4px 0;">
                                  <span style="color:#64748b; font-size:14px;">Time</span>
                                </td>
                                <td style="padding:4px 0; text-align:right;">
                                  <span style="color:#0f172a; font-weight:600; font-size:14px;">${formattedTime}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:4px 0;">
                                  <span style="color:#64748b; font-size:14px;">Interview Type</span>
                                </td>
                                <td style="padding:4px 0; text-align:right;">
                                  <span style="color:#0f172a; font-weight:600; font-size:14px;">${interviewType}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 20px; font-size:16px; line-height:1.6; color:#334155;">
                        Click the button below to view your interview questions and submit your feedback after the interview.
                      </p>

                      <a
                        href="${interviewLink}"
                        style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; padding:14px 24px; border-radius:10px; font-weight:600; font-size:15px;"
                      >View Interview Questions</a>

                      <p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#64748b;">
                        You can customize your questions before the interview. After the interview, please submit your feedback within 3 days.
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0; font-size:12px; color:#94a3b8; text-align:center;">
                  &copy; ${year} ${companyName}
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  })
}
