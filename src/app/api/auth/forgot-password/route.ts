import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail, buildBrandedEmailHtml } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store the token on the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expiresAt,
      },
    })

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    // Get company name
    const companyName = process.env.COMPANY_NAME || 'Curacel'

    // Send email
    const bodyHtml = `
      <p style="margin:0 0 16px;">Hi${user.name ? ` ${user.name}` : ''},</p>
      <p style="margin:0 0 16px;">We received a request to reset your password for your ${companyName} account.</p>
      <p style="margin:0 0 24px;">Click the button below to set a new password. This link will expire in 1 hour.</p>
      <div style="margin:0 0 20px;">
        <a href="${resetUrl}" style="display:inline-block; background-color:#1d2bff; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:10px; font-weight:600;">Reset Password</a>
      </div>
      <p style="margin:24px 0 0; font-size:14px; color:#6b7280;">
        If you didn't request this, you can safely ignore this email.
      </p>
    `

    await sendEmail({
      to: normalizedEmail,
      subject: `Reset your ${companyName} password`,
      html: buildBrandedEmailHtml({ companyName, bodyHtml }),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
