import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return NextResponse.json(
        { error: 'This reset link has expired' },
        { status: 400 }
      )
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update user's password and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordSetAt: new Date(),
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

// GET endpoint to verify token is valid
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: token },
      select: { email: true, resetTokenExpires: true },
    })

    if (!user) {
      return NextResponse.json({ valid: false, error: 'Invalid reset link' })
    }

    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return NextResponse.json({ valid: false, error: 'This reset link has expired' })
    }

    return NextResponse.json({ valid: true, email: user.email })
  } catch (error) {
    console.error('Verify token error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}
