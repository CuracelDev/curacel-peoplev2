'use client'

import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatAuditAction } from '@/lib/notifications'
import { NOTIFICATION_ACTION_GROUPS } from '@/lib/notification-actions'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

export default function NotificationSettingsPage() {
  const utils = trpc.useUtils()
  const { data: settings, isLoading } = trpc.notificationSettings.get.useQuery()
  const { data: adminUsers } = trpc.notificationSettings.listAdmins.useQuery()
  const [saveStatus, setSaveStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const updateSettings = trpc.notificationSettings.update.useMutation({
    onSuccess: () => {
      utils.notificationSettings.get.invalidate()
      setSaveStatus({ kind: 'success', message: 'Notification settings saved.' })
    },
    onError: (error) => {
      setSaveStatus({ kind: 'error', message: error.message || 'Failed to save notification settings.' })
    },
  })

  const [emailEnabled, setEmailEnabled] = useState(true)
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [selectedAdmins, setSelectedAdmins] = useState<Set<string>>(new Set())
  const [recipientMode, setRecipientMode] = useState<'ALL_ADMINS' | 'INITIATOR' | 'SELECTED'>('ALL_ADMINS')

  useEffect(() => {
    if (!settings) return
    setEmailEnabled(settings.enabled)
    setSelectedActions(new Set(settings.actions))
    setSelectedAdmins(new Set(settings.recipients))
    setRecipientMode(settings.recipientMode)
  }, [settings])

  useEffect(() => {
    if (!saveStatus) return
    const timer = setTimeout(() => setSaveStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [saveStatus])

  const adminList = adminUsers ?? []
  const allAdminsSelected = adminList.length > 0 && selectedAdmins.size === adminList.length

  const toggleAction = (action: string) => {
    setSelectedActions((prev) => {
      const next = new Set(prev)
      if (next.has(action)) {
        next.delete(action)
      } else {
        next.add(action)
      }
      return next
    })
  }

  const toggleAdmin = (id: string) => {
    setSelectedAdmins((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllAdmins = () => {
    setSelectedAdmins(new Set(adminList.map((user) => user.id)))
  }

  const handleClearAdmins = () => {
    setSelectedAdmins(new Set())
  }

  const handleSelectAllActions = () => {
    const allActions = NOTIFICATION_ACTION_GROUPS.flatMap((group) => group.actions)
    setSelectedActions(new Set(allActions))
  }

  const handleClearActions = () => {
    setSelectedActions(new Set())
  }

  const actionSummary = useMemo(() => `${selectedActions.size} actions selected`, [selectedActions.size])

  const handleSave = async () => {
    setSaveStatus(null)
    try {
      await updateSettings.mutateAsync({
        enabled: emailEnabled,
        recipientMode,
        actions: Array.from(selectedActions),
        recipients: Array.from(selectedAdmins),
      })
    } catch (error) {
      if (error instanceof Error) {
        setSaveStatus({ kind: 'error', message: error.message })
      } else {
        setSaveStatus({ kind: 'error', message: 'Failed to save notification settings.' })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Notifications"
        description="Control which admin emails are sent for system events."
      />

      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Send email alerts</Label>
              <p className="text-xs text-gray-500">In-app notifications are always visible to admins.</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin recipients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Send emails to</Label>
            <Select value={recipientMode} onValueChange={(value) => setRecipientMode(value as typeof recipientMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_ADMINS">All admins</SelectItem>
                <SelectItem value="INITIATOR">Admin who initiated the action</SelectItem>
                <SelectItem value="SELECTED">Selected admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientMode === 'SELECTED' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAllAdmins}>
                  Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearAdmins}>
                  Clear
                </Button>
              </div>
              {adminList.length === 0 ? (
                <p className="text-sm text-gray-500">No admin users found.</p>
              ) : (
                <div className="space-y-3">
                  {adminList.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Switch checked={selectedAdmins.has(user.id)} onCheckedChange={() => toggleAdmin(user.id)} />
                    </div>
                  ))}
                </div>
              )}
              {adminList.length > 0 && !allAdminsSelected && selectedAdmins.size === 0 && (
                <p className="text-xs text-amber-600">No admins selected. Emails will not be sent.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email triggers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSelectAllActions}>
              Select all actions
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearActions}>
              Clear
            </Button>
            <span className="text-xs text-gray-500">{actionSummary}</span>
          </div>

          <div className="space-y-6">
            {NOTIFICATION_ACTION_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">{group.title}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.actions.map((action) => (
                    <div key={action} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                      <span className="text-sm text-gray-700">{formatAuditAction(action)}</span>
                      <Switch checked={selectedActions.has(action)} onCheckedChange={() => toggleAction(action)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className={saveStatus.kind === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
              {saveStatus.message}
            </span>
          )}
          <Button type="button" onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
