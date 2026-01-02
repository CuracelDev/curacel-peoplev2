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

const BADGE_OPTIONS = [
  { key: 'openJobs', label: 'Jobs', description: 'Open/active job positions' },
  { key: 'activeCandidates', label: 'Candidates', description: 'Candidates in active pipeline stages' },
  { key: 'activeEmployees', label: 'Employees', description: 'Current active employees' },
  { key: 'pendingContracts', label: 'Contracts', description: 'Contracts sent but not yet signed' },
  { key: 'inProgressOnboarding', label: 'Onboarding', description: 'Onboarding workflows in progress' },
  { key: 'inProgressOffboarding', label: 'Offboarding', description: 'Offboarding workflows in progress' },
] as const

export default function NotificationSettingsPage() {
  const utils = trpc.useUtils()
  const { data: settings, isLoading } = trpc.notificationSettings.get.useQuery()
  const { data: adminUsers } = trpc.notificationSettings.listAdmins.useQuery()
  const { data: badgeSettings } = trpc.organization.getBadgeSettings.useQuery()
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
  const updateBadgeSettings = trpc.organization.updateBadgeSettings.useMutation({
    onSuccess: () => {
      utils.organization.getBadgeSettings.invalidate()
      utils.dashboard.getSidebarCounts.invalidate()
      setSaveStatus({ kind: 'success', message: 'Badge settings saved.' })
    },
    onError: (error) => {
      setSaveStatus({ kind: 'error', message: error.message || 'Failed to save badge settings.' })
    },
  })

  const [emailEnabled, setEmailEnabled] = useState(true)
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [selectedAdmins, setSelectedAdmins] = useState<Set<string>>(new Set())
  const [recipientMode, setRecipientMode] = useState<'ALL_ADMINS' | 'INITIATOR' | 'SELECTED'>('ALL_ADMINS')

  // Badge settings state
  const [badgesEnabled, setBadgesEnabled] = useState(true)
  const [badgeToggles, setBadgeToggles] = useState<Record<string, boolean>>({
    openJobs: true,
    activeCandidates: true,
    activeEmployees: true,
    pendingContracts: true,
    inProgressOnboarding: true,
    inProgressOffboarding: true,
  })

  useEffect(() => {
    if (!settings) return
    setEmailEnabled(settings.enabled)
    setSelectedActions(new Set(settings.actions))
    setSelectedAdmins(new Set(settings.recipients))
    setRecipientMode(settings.recipientMode)
  }, [settings])

  useEffect(() => {
    if (!badgeSettings) return
    setBadgesEnabled(badgeSettings.enabled)
    setBadgeToggles(badgeSettings.settings)
  }, [badgeSettings])

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

  const toggleBadge = (key: string) => {
    setBadgeToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSaveBadgeSettings = async () => {
    setSaveStatus(null)
    try {
      await updateBadgeSettings.mutateAsync({
        enabled: badgesEnabled,
        settings: badgeToggles as {
          openJobs: boolean
          activeCandidates: boolean
          activeEmployees: boolean
          pendingContracts: boolean
          inProgressOnboarding: boolean
          inProgressOffboarding: boolean
        },
      })
    } catch (error) {
      if (error instanceof Error) {
        setSaveStatus({ kind: 'error', message: error.message })
      } else {
        setSaveStatus({ kind: 'error', message: 'Failed to save badge settings.' })
      }
    }
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
              <p className="text-xs text-muted-foreground">In-app notifications are always visible to admins.</p>
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
                <p className="text-sm text-muted-foreground">No admin users found.</p>
              ) : (
                <div className="space-y-3">
                  {adminList.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
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
            <span className="text-xs text-muted-foreground">{actionSummary}</span>
          </div>

          <div className="space-y-6">
            {NOTIFICATION_ACTION_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{group.title}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.actions.map((action) => (
                    <div key={action} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-sm text-foreground">{formatAuditAction(action)}</span>
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
            <span className={saveStatus.kind === 'success' ? 'text-sm text-success' : 'text-sm text-red-600'}>
              {saveStatus.message}
            </span>
          )}
          <Button type="button" onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Sidebar Badges</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Badge visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Show sidebar badges</Label>
              <p className="text-xs text-muted-foreground">Display count badges next to sidebar navigation items.</p>
            </div>
            <Switch checked={badgesEnabled} onCheckedChange={setBadgesEnabled} />
          </div>
        </CardContent>
      </Card>

      {badgesEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Badge metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Select which metrics to display as badges in the sidebar.</p>
            <div className="space-y-3">
              {BADGE_OPTIONS.map((option) => (
                <div key={option.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <Switch
                    checked={badgeToggles[option.key] ?? true}
                    onCheckedChange={() => toggleBadge(option.key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className={saveStatus.kind === 'success' ? 'text-sm text-success' : 'text-sm text-red-600'}>
              {saveStatus.message}
            </span>
          )}
          <Button type="button" onClick={handleSaveBadgeSettings} disabled={updateBadgeSettings.isPending}>
            {updateBadgeSettings.isPending ? 'Saving...' : 'Save badge settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
