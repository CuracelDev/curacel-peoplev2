'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Logo } from '@/components/ui/logo'

export default function SignInPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')
  const [email, setEmail] = useState('admin@curacel.com')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const allowPasswordless =
    process.env.NEXT_PUBLIC_DEV_PASSWORDLESS_LOGIN === 'true'

  useEffect(() => {
    if (session) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  const handleSignIn = async () => {
    setIsLoading(true)
    await signIn('credentials', { email, password, callbackUrl })
    setIsLoading(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-10" />
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  PeopleOps
                </span>
                <span className="text-[9px] font-semibold text-slate-400">v2</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
              {error === 'AccessDenied'
                ? 'Access denied. Please use your company email to sign in.'
                : error === 'CredentialsSignin'
                  ? 'Invalid credentials. Please check your email and password.'
                  : 'An error occurred during sign in. Please try again.'}
            </div>
          )}

          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Enter any email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={handleSignIn}
              disabled={isLoading || !email || (!allowPasswordless && !password)}
            >
              {isLoading ? 'Signing in...' : 'Sign in as Admin'}
            </Button>
            {allowPasswordless ? (
              <p className="text-center text-xs text-muted-foreground">
                Development mode may allow passwordless login.
              </p>
            ) : null}
          </div>

          <div className="text-center">
            <a
              href="/auth/forgot-password"
              className="text-sm text-primary hover:text-primary/80 hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <Separator />
          <p className="text-center text-xs text-muted-foreground">
            Need an account? Ask your admin for an invite.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
