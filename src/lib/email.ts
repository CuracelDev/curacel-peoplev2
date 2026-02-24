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

  const smtpHost = readEnv('SMTP_HOST', 'EMAIL_SERVER_HOST')
  const smtpUser = readEnv('SMTP_USER', 'SMTP_USERNAME', 'EMAIL_SERVER_USER')
  const smtpPassword = readEnv('SMTP_PASSWORD', 'SMTP_PASS', 'EMAIL_SERVER_PASSWORD')

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
  const smtpHost = readEnv('SMTP_HOST', 'EMAIL_SERVER_HOST')
  const smtpUser = readEnv('SMTP_USER', 'SMTP_USERNAME', 'EMAIL_SERVER_USER')
  const smtpPassword = readEnv('SMTP_PASSWORD', 'SMTP_PASS', 'EMAIL_SERVER_PASSWORD')
  const hasSmtpCreds = Boolean(smtpHost && smtpUser && smtpPassword)
  if (!hasSmtpCreds) return null

  const smtpPort = parseInt(readEnv('SMTP_PORT', 'EMAIL_SERVER_PORT') || '587', 10)
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
  fromName?: string
  replyTo?: string
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

import { marked } from 'marked'

/**
 * Process raw email body into formatted HTML.
 * Converts Markdown to HTML and ensures consistent styling.
 */
function processEmailBody(content: string): string {
  // If it already looks like it has complex HTML tags, return as is
  if (/<[a-z][\s\S]*>/i.test(content) && (content.includes('<div') || content.includes('<table') || content.includes('<p'))) {
    return content
  }

  // Configure marked for safe, clean output
  marked.setOptions({
    gfm: true,
    breaks: true,
  })

  // Convert markdown to HTML
  const parsed = marked.parse(content) as string

  return parsed
}

export function buildBrandedEmailHtml(params: {
  companyName: string
  bodyHtml: string
  logoUrl?: string
  themeColor?: string
}): string {
  const { companyName, bodyHtml, logoUrl: rawLogoUrl, themeColor = '#4f46e5' } = params
  const appUrl = getAppUrl()
  const logoUrl = resolveAbsoluteUrl(rawLogoUrl, appUrl, '/logo.png')
  const year = new Date().getFullYear()

  // Process body (Markdown support)
  const formattedBody = processEmailBody(bodyHtml)

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <title>${companyName}</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 10px !important; }
            .content { padding: 24px 20px !important; }
          }
          /* Markdown Styling */
          .email-body h1, .email-body h2, .email-body h3 { 
            color: #0f172a; 
            margin: 24px 0 12px; 
            font-weight: 700;
          }
          .email-body h1 { font-size: 22px; }
          .email-body h2 { font-size: 18px; }
          .email-body p { margin: 0 0 16px; }
          .email-body ul, .email-body ol { 
            margin: 0 0 16px 20px; 
            padding: 0; 
          }
          .email-body li { margin-bottom: 8px; }
          .email-body strong { color: #0f172a; }
          .email-body a { color: ${themeColor}; text-decoration: underline; }
          .email-body blockquote {
            margin: 20px 0;
            padding: 10px 20px;
            border-left: 4px solid #e2e8f0;
            color: #64748b;
            font-style: italic;
          }
          .button {
            display: inline-block;
            background-color: ${themeColor};
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none !important;
            border-radius: 8px;
            font-weight: 600;
            margin: 16px 0;
          }
          .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
          <tr>
            <td align="center" style="padding: 40px 16px;">
              <!--[if mso]>
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td>
              <![endif]-->
              <table role="presentation" class="container" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; overflow: hidden;">
                <!-- Header / Logo -->
                <tr>
                  <td style="padding: 40px 40px 10px; text-align: left;">
                    <img
                      src="${logoUrl}"
                      alt="${companyName}"
                      width="120"
                      style="display: block; height: auto; border: 0;"
                    />
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td class="content" style="padding: 20px 40px 40px; font-size: 16px; line-height: 1.7; color: #334155;">
                    <div class="email-body">
                      ${formattedBody}
                    </div>
                  </td>
                </tr>

                <!-- Footer Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #f1f5f9;">
                      <tr><td></td></tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer Legal/Info -->
                <tr>
                  <td style="padding: 32px 40px; background-color: #fafafa;">
                    <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                      Sent by <strong>${companyName}</strong> Recruitment Team.
                    </p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                      &copy; ${year} ${companyName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                  </td>
                </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, text, attachments, fromName, replyTo } = options
  const status = getEmailTransportStatus()
  const postmarkFrom = status.from
  const messageStream = status.messageStream

  // Extract email if postmarkFrom is in "Name <email@example.com>" format
  const emailOnly = postmarkFrom.includes('<')
    ? postmarkFrom.match(/<([^>]+)>/)?.[1] || postmarkFrom
    : postmarkFrom

  // Combine fromName with the system from address if provided
  const formattedFrom = fromName ? `${fromName} <${emailOnly}>` : postmarkFrom

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
        From: formattedFrom,
        To: to,
        ReplyTo: replyTo,
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
      from: formattedFrom,
      to,
      replyTo,
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
    const details = []
    if (!status.postmarkConfigured) details.push('Postmark token missing')
    if (!status.smtpConfigured) details.push('SMTP credentials incomplete')
    throw new Error(
      `Email send failed: no email transport configured (${details.join(', ')}). Set POSTMARK_SERVER_TOKEN / POSTMARK_API_TOKEN or SMTP_HOST/SMTP_USER/SMTP_PASSWORD, then restart the server.`
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
  const { candidateEmail, candidateName, offerLink, companyName, logoUrl } = params

  await sendEmail({
    to: candidateEmail,
    subject: `Your offer from ${companyName}`,
    html: buildBrandedEmailHtml({
      companyName,
      logoUrl,
      themeColor: '#1d4ed8', // Blue
      bodyHtml: `
# Congratulations, ${candidateName}!

We're excited to extend an offer to join **${companyName}**.

Please review and sign your offer letter by clicking the button below.

<a href="${offerLink}" class="button">Review & Sign Offer</a>

If you have any issues, please reach out to the People team.
      `,
    }),
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

  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  await sendEmail({
    to: employeeEmail,
    subject: `Welcome to ${companyName} - Complete your onboarding`,
    html: buildBrandedEmailHtml({
      companyName,
      themeColor: '#10b981', // Green
      bodyHtml: `
# Welcome aboard, ${employeeName}!

We're thrilled to have you joining **${companyName}**!

<div class="info-box">
  <strong>Start Date:</strong> ${dateStr}
  ${managerName ? `<br><strong>Manager:</strong> ${managerName}` : ''}
</div>

To complete your onboarding, please fill out your personal details:

* Home address
* Phone number
* Emergency contact
* Bank details

<a href="${onboardingLink}" class="button">Complete Onboarding</a>

This link will expire in 7 days. If you have any questions, please contact HR.
      `,
    }),
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
    html: buildBrandedEmailHtml({
      companyName,
      themeColor: '#3b82f6', // Blue
      bodyHtml: `
# Your Account is Ready!

Hi ${employeeName},

Your **${companyName}** Google Workspace account has been created:

<div class="info-box" style="font-family: monospace;">
  <strong>Email:</strong> ${workEmail}<br>
  <strong>Temporary Password:</strong> ${temporaryPassword}
</div>

> **Important:** You will be required to change your password on first login.

You can sign in at [workspace.google.com](https://workspace.google.com)

If you didn't expect this email or have questions, please contact IT.
      `,
    }),
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
    html: buildBrandedEmailHtml({
      companyName: 'Curacel People',
      bodyHtml: `
# You've been invited

${invitedByName ? `${invitedByName} has` : 'You have'} invited you to join **Curacel People**.

**Role:** ${role}

<a href="${acceptUrl}" class="button">Accept invite</a>

If you didn't expect this invite, you can safely ignore this email.
      `,
    }),
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

  const dateStr = interviewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timeStr = interviewDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  await sendEmail({
    to,
    subject: `Interview Assignment: ${candidateName} for ${jobTitle}`,
    html: buildBrandedEmailHtml({
      companyName,
      logoUrl,
      bodyHtml: `
# Interview Assignment

Hi ${interviewerName},

You've been assigned as an interviewer for **${candidateName}** applying for **${jobTitle}**.

<div class="info-box">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td style="padding:4px 0; color:#64748b; font-size:14px;">Date</td>
      <td style="padding:4px 0; text-align:right; font-weight:600;">${dateStr}</td>
    </tr>
    <tr>
      <td style="padding:4px 0; color:#64748b; font-size:14px;">Time</td>
      <td style="padding:4px 0; text-align:right; font-weight:600;">${timeStr}</td>
    </tr>
    <tr>
      <td style="padding:4px 0; color:#64748b; font-size:14px;">Type</td>
      <td style="padding:4px 0; text-align:right; font-weight:600;">${interviewType}</td>
    </tr>
  </table>
</div>

Click the button below to view your interview questions and submit your feedback after the interview.

<a href="${interviewLink}" class="button">View Interview Questions</a>

You can customize your questions before the interview. After the interview, please submit your feedback within 3 days.
      `,
    }),
  })
}

export async function sendOfferSignedNotificationToAdmin(params: {
  adminEmail: string
  adminName?: string | null
  candidateName: string
  companyName: string
  offerId: string
  signedPdf?: Buffer
}): Promise<void> {
  const { adminEmail, adminName, candidateName, companyName, offerId, signedPdf } = params
  const appUrl = getAppUrl()

  // Link to the offer details page for the admin
  const offerLink = `${appUrl}/hiring/offers/${offerId}`

  await sendEmail({
    to: adminEmail,
    subject: `Offer Signed: ${candidateName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9fafb; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #111827; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin-top: 16px; font-weight: 500; }
            .meta { color: #6b7280; font-size: 14px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2 style="margin-top: 0; color: #111827;">Offer Signed!</h2>
              <p>Hi ${adminName || 'there'},</p>
              <p><strong>${candidateName}</strong> has successfully signed their offer letter.</p>
              
              <p>The candidate has been moved to the <strong>Offer Signed</strong> status. You can now proceed with the next steps in the hiring process.</p>
              
              <a class="button" href="${offerLink}">View Offer Details</a>
              
              <p class="meta">
                A copy of the signed PDF is attached to this email.
              </p>
            </div>
            <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px;">
              &copy; ${new Date().getFullYear()} ${companyName}
            </p>
          </div>
        </body>
      </html>
    `,
    attachments: signedPdf ? [
      {
        filename: `${candidateName.replace(/\s+/g, '-').toLowerCase()}-signed-offer.pdf`,
        content: signedPdf,
        contentType: 'application/pdf',
      }
    ] : undefined,
  })
}
