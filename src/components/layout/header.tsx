'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Bell, Menu } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { formatAuditAction, isAdminRole } from '@/lib/notifications'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Header({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const { data: session } = useSession()
  const isAdmin = isAdminRole(session?.user?.role)
  const { data } = trpc.notifications.list.useQuery(
    {
      page: 1,
      limit: 5,
      includeArchived: false,
    },
    {
      enabled: isAdmin,
    }
  )
  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, { enabled: isAdmin })
  const trpcContext = trpc.useUtils()
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      trpcContext.notifications.unreadCount.invalidate()
      trpcContext.notifications.list.invalidate()
    },
  })

  const notifications = data?.notifications ?? []
  const unreadCount = unread?.count ?? 0

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            {/* Breadcrumb or page title could go here */}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <DropdownMenu
              onOpenChange={(open) => {
                if (open && unreadCount > 0 && !markAllRead.isPending) {
                  void markAllRead.mutateAsync()
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
                  aria-label="Open notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No notifications yet.</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map((notification) => {
                      const resourceLabel = notification.resourceType.replace(/_/g, ' ')
                      const actorLabel =
                        notification.actorName || notification.actorEmail || 'System'
                      return (
                        <div key={notification.id} className="space-y-1 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatAuditAction(notification.action)}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatDateTime(notification.createdAt)}</span>
                        </div>
                        <div className="text-sm text-gray-700">
                          {actorLabel} · {resourceLabel}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
                <DropdownMenuSeparator />
                <div className="px-3 py-2 text-sm">
                  <Link href="/notifications" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    View all notifications
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
