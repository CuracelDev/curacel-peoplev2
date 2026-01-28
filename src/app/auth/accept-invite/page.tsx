'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'

type AcceptInviteForm = {
  name: string
  password: string
  confirmPassword: string
}

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const inviteQuery = trpc.user.getInvite.useQuery(
    { token },
    { enabled: Boolean(token) }
  )
  const acceptInvite = trpc.user.acceptInvite.useMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteForm>()

  const inviteEmail = useMemo(() => inviteQuery.data?.email || '', [inviteQuery.data?.email])

  useEffect(() => {
    setErrorMessage(null)
  }, [token])

  const onSubmit = async (values: AcceptInviteForm) => {
    setErrorMessage(null)
    try {
      const result = await acceptInvite.mutateAsync({
        token,
        name: values.name,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })

      const res = await signIn('credentials', {
        email: result.email,
        password: values.password,
        callbackUrl: '/dashboard',
        redirect: false,
      })

      if (res?.error) {
        router.push('/auth/signin')
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to accept invite')
    }
  }

  const isLoading = inviteQuery.isLoading || acceptInvite.isPending

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-10" />
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  Curacel People
                </span>
                <span className="text-[9px] font-semibold text-slate-400">v0.1</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">Accept invite</CardTitle>
          <CardDescription>
            Create your account password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token ? null : (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
              Missing invite token.
            </div>
          )}

          {inviteQuery.error ? (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
              {inviteQuery.error.message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
              {errorMessage}
            </div>
          ) : null}

          <div className="text-sm text-foreground">
            {inviteEmail ? (
              <>
                Signing up as <span className="font-medium text-foreground">{inviteEmail}</span>
              </>
            ) : (
              'Loading invite...'
            )}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register('name', { required: 'Name is required' })} />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', { required: 'Please confirm your password' })}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={!token || isSubmitting || isLoading}>
              {isLoading ? 'Creating account...' : 'Accept invite'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
