'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatDateTime } from '@/lib/utils'
import { formatAuditAction, isAdminRole } from '@/lib/notifications'

export default function NotificationsPage() {
  const { data: session } = useSession()
  const isAdmin = isAdminRole(session?.user?.role)
  const [showArchived, setShowArchived] = useState(false)
  const hasMarkedReadRef = useRef(false)
  const utils = trpc.useUtils()
  const { data, isLoading, error } = trpc.notifications.list.useQuery(
    {
      page: 1,
      limit: 50,
      includeArchived: showArchived,
    },
    { enabled: isAdmin }
  )
  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: isAdmin })
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate()
      utils.notifications.list.invalidate()
    },
  })
  const archiveNotification = trpc.notifications.archive.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  })
  const restoreNotification = trpc.notifications.restore.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  })

  useEffect(() => {
    if (!isAdmin || showArchived || hasMarkedReadRef.current) return
    if (unread?.count && unread.count > 0) {
      hasMarkedReadRef.current = true
      void markAllRead.mutateAsync()
    }
  }, [isAdmin, showArchived, unread?.count, markAllRead])

  const notifications = data?.notifications ?? []

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <p className="text-foreground/80">Notifications are available to admin roles only.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/80">Show archived</span>
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/audit">Open audit log</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Error loading notifications: {error.message}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const actionLabel = formatAuditAction(notification.action)
                const resourceLabel = notification.resourceType.replace(/_/g, ' ')
                const actorLabel =
                  notification.actorName || notification.actorEmail || 'System'
                return (
                  <div key={notification.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                    <div className="flex flex-1 items-start gap-3">
                      <Badge variant="secondary" className="mt-0.5 text-xs">
                        {actionLabel}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {actorLabel} · {resourceLabel}
                        </p>
                        {notification.resourceId && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {notification.resourceId.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(notification.createdAt)}</span>
                      {notification.archivedAt ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreNotification.mutate({ id: notification.id })}
                        >
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveNotification.mutate({ id: notification.id })}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
