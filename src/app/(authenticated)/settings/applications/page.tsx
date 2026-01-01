'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Archive, CheckCircle2, ExternalLink, Plus, Plug, RotateCcw, XCircle } from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

function getAppIcon(type: string, iconUrl?: string | null) {
  const commonProps = { width: 32, height: 32, className: 'h-8 w-8 object-contain' }
  switch (type) {
    case 'GOOGLE_WORKSPACE':
      return <Image src="/logos/google-workspace.png" alt="Google Workspace" {...commonProps} />
    case 'SLACK':
      return <Image src="/logos/slack.png" alt="Slack" {...commonProps} />
    case 'BITBUCKET':
      return <Image src="/logos/bitbucket.png" alt="Bitbucket" {...commonProps} />
    case 'JIRA':
      return <Image src="/logos/jira.png" alt="Jira" {...commonProps} />
    case 'PASSBOLT':
      return <Image src="/logos/passbolt.png" alt="Passbolt" {...commonProps} />
    case 'HUBSPOT':
      return <Image src="/logos/hubspot.png" alt="HubSpot" {...commonProps} />
    case 'STANDUPNINJA':
      return <Image src="/logos/standupninja.png" alt="StandupNinja" {...commonProps} />
    case 'FIREFLIES':
      return <Image src="/logos/fireflies.png" alt="Fireflies.ai" {...commonProps} />
    default:
      if (iconUrl) return <Image src={iconUrl} alt={type} {...commonProps} />
      return <Plug className="h-8 w-8 text-muted-foreground" />
  }
}

function statusBadge(hasConnection: boolean, isEnabled: boolean) {
  if (!hasConnection) return <Badge variant="secondary">Not connected</Badge>
  if (!isEnabled) return <Badge variant="secondary">Disabled</Badge>
  return <Badge className="bg-green-100 text-green-800">Enabled</Badge>
}

export default function ApplicationsSettingsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [newAppDescription, setNewAppDescription] = useState('')
  const [newAppIconUrl, setNewAppIconUrl] = useState('')

  const appsQuery = trpc.integration.listApps.useQuery()
  const archivedQuery = trpc.integration.listArchivedApps.useQuery()

  const initApps = trpc.integration.initializeApps.useMutation({
    onSuccess: async () => {
      await appsQuery.refetch()
      await archivedQuery.refetch()
    },
  })
  const initTriggered = useRef(false)

  const toggleApp = trpc.integration.toggleApp.useMutation({
    onSuccess: () => appsQuery.refetch(),
  })
  const archiveApp = trpc.integration.archiveApp.useMutation({
    onSuccess: async () => {
      await appsQuery.refetch()
      await archivedQuery.refetch()
    },
  })
  const restoreApp = trpc.integration.restoreApp.useMutation({
    onSuccess: async () => {
      await appsQuery.refetch()
      await archivedQuery.refetch()
    },
  })

  const createCustomApp = trpc.integration.createCustomApp.useMutation({
    onSuccess: async () => {
      setCreateDialogOpen(false)
      setNewAppName('')
      setNewAppDescription('')
      setNewAppIconUrl('')
      await appsQuery.refetch()
    },
  })

  useEffect(() => {
    if (appsQuery.isLoading || initApps.isPending || initTriggered.current) return
    const count = appsQuery.data?.length ?? 0
    if (count === 0) {
      initTriggered.current = true
      initApps.mutate()
    }
  }, [appsQuery.data, appsQuery.isLoading, initApps])

  const apps = useMemo(() => appsQuery.data ?? [], [appsQuery.data])
  const archivedApps = useMemo(() => archivedQuery.data ?? [], [archivedQuery.data])

  const activeApps = useMemo(() => apps.filter((a) => a.isEnabled), [apps])
  const disabledApps = useMemo(() => apps.filter((a) => !a.isEnabled), [apps])

  const busy =
    initApps.isPending ||
    toggleApp.isPending ||
    archiveApp.isPending ||
    restoreApp.isPending ||
    createCustomApp.isPending

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Integrations"
        description="Add, disable, archive, and manage integrations."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                initTriggered.current = true
                initApps.mutate()
              }}
              disabled={busy}
              title="Re-create default applications if missing"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Initialize defaults
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add integration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add integration</DialogTitle>
                  <DialogDesc>
                    Create a custom integration and connect it via webhook (no coding required).
                  </DialogDesc>
                </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="appName">Name *</Label>
                  <Input
                    id="appName"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    placeholder="e.g. Notion, Linear, Zoom"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appDescription">Description</Label>
                  <Input
                    id="appDescription"
                    value={newAppDescription}
                    onChange={(e) => setNewAppDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appIconUrl">Icon URL</Label>
                  <Input
                    id="appIconUrl"
                    value={newAppIconUrl}
                    onChange={(e) => setNewAppIconUrl(e.target.value)}
                    placeholder="https://.../icon.png (optional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createCustomApp.mutate({
                      name: newAppName.trim(),
                      description: newAppDescription.trim() || undefined,
                      iconUrl: newAppIconUrl.trim() || undefined,
                    })
                  }
                  disabled={!newAppName.trim() || createCustomApp.isPending}
                >
                  {createCustomApp.isPending ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </>
        }
      />

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="disabled" className="flex-1">Disabled</TabsTrigger>
          <TabsTrigger value="archived" className="flex-1">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active applications</CardTitle>
              <CardDescription>These are enabled and can appear in the Integrations view.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {appsQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : activeApps.length === 0 ? (
                <p className="text-sm text-foreground/80">No enabled applications yet.</p>
              ) : (
                activeApps.map((app) => {
                  const hasConnection = app.connections.length > 0
                  const connection = app.connections[0]
                  const lastTestStatus = connection?.lastTestStatus
                  const isVerified = lastTestStatus === 'SUCCESS'
                  const isFailed = lastTestStatus === 'FAILED'
                  return (
                    <div key={app.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {getAppIcon(app.type, app.iconUrl)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{app.name}</p>
                            {statusBadge(hasConnection, app.isEnabled)}
                            {app.type === 'CUSTOM' ? <Badge variant="secondary">Custom</Badge> : null}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{app.description || '—'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          checked={Boolean(app.isEnabled)}
                          disabled={(!hasConnection && !app.isEnabled) || busy}
                          onCheckedChange={(checked) => {
                            if (!checked && app.type === 'CUSTOM') {
                              if (confirm('Archive this custom application? It will be moved to Archived.')) {
                                archiveApp.mutate({ appId: app.id })
                              }
                              return
                            }
                            toggleApp.mutate({ appId: app.id, isEnabled: checked })
                          }}
                        />
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/settings/applications/${app.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Configure
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disabled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disabled applications</CardTitle>
              <CardDescription>Disabled apps are hidden from the Integrations view.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {appsQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : disabledApps.length === 0 ? (
                <p className="text-sm text-foreground/80">No disabled applications.</p>
              ) : (
                disabledApps.map((app) => {
                  const hasConnection = app.connections.length > 0
                  const connection = app.connections[0]
                  const lastTestStatus = connection?.lastTestStatus
                  const isVerified = lastTestStatus === 'SUCCESS'
                  const isFailed = lastTestStatus === 'FAILED'
                  return (
                    <div key={app.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {getAppIcon(app.type, app.iconUrl)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{app.name}</p>
                            <Badge variant="secondary">Disabled</Badge>
                            {app.type === 'CUSTOM' ? <Badge variant="secondary">Custom</Badge> : null}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{app.description || '—'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {app.type === 'CUSTOM' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Archive this custom application?')) archiveApp.mutate({ appId: app.id })
                            }}
                            disabled={busy}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </Button>
                        ) : (
                          <Switch
                            checked={Boolean(app.isEnabled)}
                            disabled={!hasConnection || busy}
                            onCheckedChange={(checked) => toggleApp.mutate({ appId: app.id, isEnabled: checked })}
                          />
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/settings/applications/${app.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Configure
                          </Link>
                        </Button>
                        {!hasConnection ? (
                          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            Not connected
                          </div>
                        ) : isVerified ? (
                          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Connected
                          </div>
                        ) : isFailed ? (
                          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Configured (Disconnected)
                          </div>
                        ) : (
                          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            Configured
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived applications</CardTitle>
              <CardDescription>Restore an archived app to use it again.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {archivedQuery.isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : archivedApps.length === 0 ? (
                <p className="text-sm text-foreground/80">No archived applications.</p>
              ) : (
                archivedApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {getAppIcon(app.type, app.iconUrl)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{app.name}</p>
                          <Badge variant="secondary">Archived</Badge>
                          {app.type === 'CUSTOM' ? <Badge variant="secondary">Custom</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{app.description || '—'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => restoreApp.mutate({ appId: app.id })}
                        disabled={busy}
                        variant="outline"
                        size="sm"
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
