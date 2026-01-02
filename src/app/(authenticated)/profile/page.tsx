'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PasswordForm = {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { data: me, isLoading } = trpc.user.me.useQuery()
  const updatePassword = trpc.user.updatePassword.useMutation()

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>()

  const requiresCurrentPassword = useMemo(() => Boolean(me?.passwordSetAt), [me?.passwordSetAt])

  const onSubmitPassword = async (values: PasswordForm) => {
    setSuccessMessage(null)
    await updatePassword.mutateAsync({
      currentPassword: values.currentPassword || null,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    })
    setSuccessMessage('Password updated.')
    reset()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <div className="text-sm text-foreground">{me?.name || '—'}</div>
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <div className="text-sm text-foreground">{me?.email}</div>
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <div className="text-sm text-foreground">{me?.role}</div>
          </div>
          {me?.employee?.id ? (
            <div className="pt-2">
              <Link className="text-sm text-blue-600 hover:underline" href={`/employees/${me.employee.id}`}>
                View linked employee profile
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <div className="mb-4 p-3 bg-success/10 border border-success/20 text-success-foreground rounded-lg text-sm">
              {successMessage}
            </div>
          ) : null}
          {updatePassword.error ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {updatePassword.error.message}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmitPassword)}>
            {requiresCurrentPassword ? (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  {...register('currentPassword', { required: 'Current password is required' })}
                />
                {errors.currentPassword ? (
                  <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              {errors.newPassword ? (
                <p className="text-sm text-red-600">{errors.newPassword.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', { required: 'Please confirm your new password' })}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            <Button type="submit" disabled={isSubmitting || updatePassword.isPending}>
              {updatePassword.isPending ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

