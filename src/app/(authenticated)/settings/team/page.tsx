'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'

const ROLE_OPTIONS = ['SUPER_ADMIN', 'HR_ADMIN', 'IT_ADMIN', 'MANAGER', 'EMPLOYEE'] as const

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || '').trim()
  if (!source) return 'U'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function TeamMembersPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN' || userRole === 'IT_ADMIN'

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<(typeof ROLE_OPTIONS)[number]>('EMPLOYEE')
  const [search, setSearch] = useState('')
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [lastInviteEmailSent, setLastInviteEmailSent] = useState<boolean>(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email: string } | null>(null)

  const usersQuery = trpc.user.list.useQuery(
    { search: search || undefined, page: 1, limit: 50 },
    { enabled: isAdmin }
  )
  const invitesQuery = trpc.user.listInvites.useQuery(undefined, { enabled: isAdmin })

  const createInvite = trpc.user.createInvite.useMutation({
    onSuccess: (data) => {
      setInviteEmail('')
      setLastInviteUrl(data.acceptUrl)
      setLastInviteEmailSent(data.emailSent)
      invitesQuery.refetch()
    },
  })
  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess: () => usersQuery.refetch(),
  })
  const revokeInvite = trpc.user.revokeInvite.useMutation({
    onSuccess: () => invitesQuery.refetch(),
  })
  const resendInvite = trpc.user.resendInvite.useMutation({
    onSuccess: () => invitesQuery.refetch(),
  })
  const deleteUser = trpc.user.delete.useMutation({
    onSuccess: () => {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
      usersQuery.refetch()
    },
  })

  const pendingInvites = useMemo(() => {
    const now = Date.now()
    return (invitesQuery.data || []).filter((i) => !i.acceptedAt && !i.revokedAt && i.expiresAt.getTime() > now)
  }, [invitesQuery.data])

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader
          title="App Admins"
          description="Invite admins and manage access."
        />
        <Card>
          <CardHeader>
            <CardTitle>App Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/80">You don’t have access to this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="App Admins"
        description="Invite admins and manage access."
      />

      <Card>
        <CardHeader>
          <CardTitle>Invite a user</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastInviteUrl ? (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {lastInviteEmailSent ? 'Invite sent.' : 'Invite created (email not sent).'}
                </p>
                <p className="truncate">{lastInviteUrl}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (navigator?.clipboard) {
                    await navigator.clipboard.writeText(lastInviteUrl)
                  }
                }}
              >
                Copy
              </Button>
            </div>
          ) : null}
          {createInvite.error ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {createInvite.error.message}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={() => createInvite.mutate({ email: inviteEmail, role: inviteRole })}
            disabled={!inviteEmail || createInvite.isPending}
          >
            {createInvite.isPending ? 'Sending...' : 'Send invite'}
          </Button>
          <p className="text-xs text-muted-foreground">
            The invite email includes a link to set a password and sign in.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitesQuery.isLoading ? (
            <p className="text-sm text-foreground/80">Loading invites...</p>
          ) : pendingInvites.length === 0 ? (
            <p className="text-sm text-foreground/80">No pending invites.</p>
          ) : (
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                      <Badge variant="secondary">{invite.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires {invite.expiresAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvite.mutate({ inviteId: invite.id })}
                      disabled={resendInvite.isPending}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeInvite.mutate({ inviteId: invite.id })}
                      disabled={revokeInvite.isPending}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
            />
          </div>

          {usersQuery.isLoading ? (
            <p className="text-sm text-foreground/80">Loading users...</p>
          ) : usersQuery.data?.users?.length ? (
            <div className="space-y-2">
              {usersQuery.data.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.image || ''} alt={user.name || user.email || 'User'} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {user.employee?.fullName ? (
                        <p className="text-xs text-muted-foreground truncate">
                          Linked employee: {user.employee.fullName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(role) => updateRole.mutate({ userId: user.id, role: role as any })}
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isSuperAdmin && user.id !== session?.user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setUserToDelete({
                            id: user.id,
                            name: user.name || user.email || 'User',
                            email: user.email || '',
                          })
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/80">No users found.</p>
          )}
        </CardContent>
      </Card>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDelete) {
                  deleteUser.mutate({ userId: userToDelete.id })
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
