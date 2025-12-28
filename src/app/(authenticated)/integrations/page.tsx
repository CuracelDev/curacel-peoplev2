'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'
import { Plug, Settings, CheckCircle2, XCircle, AppWindow } from 'lucide-react'
import Link from 'next/link'

export default function IntegrationsPage() {
  const { data: apps, isLoading, refetch } = trpc.integration.listApps.useQuery()
  const initApps = trpc.integration.initializeApps.useMutation({
    onSuccess: () => refetch(),
  })
  const [testingAppId, setTestingAppId] = useState<string | null>(null)
  const [testProgress, setTestProgress] = useState(0)
  const testConnection = trpc.integration.testConnection.useMutation({
    onSuccess: () => {
      setTestingAppId(null)
      refetch()
    },
    onError: () => {
      setTestingAppId(null)
    },
  })
  const toggleApp = trpc.integration.toggleApp.useMutation({
    onSuccess: () => refetch(),
  })
  const initTriggered = useRef(false)

  useEffect(() => {
    if (!testConnection.isPending) {
      setTestProgress(0)
      return
    }
    setTestProgress(15)
    const interval = setInterval(() => {
      setTestProgress((prev) => (prev >= 85 ? prev : prev + Math.floor(Math.random() * 10) + 5))
    }, 300)
    return () => clearInterval(interval)
  }, [testConnection.isPending])

  // Auto-initialize if nothing exists (e.g., fresh DB)
  useEffect(() => {
    if (isLoading || initApps.isPending || initTriggered.current) return
    const count = apps?.length ?? 0
    if (count === 0) {
      initTriggered.current = true
      initApps.mutate()
    }
  }, [apps, isLoading, initApps])

  const getAppIcon = (type: string, iconUrl?: string | null) => {
    const commonProps = { width: 32, height: 32, className: "h-8 w-8 object-contain" }
    
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
      default:
        if (iconUrl) {
          return <Image src={iconUrl} alt={type} {...commonProps} />
        }
        return <Plug className="h-8 w-8 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const sortPriority: Record<string, number> = {
    GOOGLE_WORKSPACE: 0,
    SLACK: 1,
  }

  const sortedApps = (apps || []).slice().sort((a, b) => {
    const pa = sortPriority[a.type] ?? 99
    const pb = sortPriority[b.type] ?? 99
    if (pa !== pb) return pa - pb
    return a.name.localeCompare(b.name)
  })

  const enabledApps = sortedApps.filter((a) => a.isEnabled)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button asChild variant="outline">
          <Link href="/settings/applications">
            <AppWindow className="mr-2 h-4 w-4" />
            Manage in Settings
          </Link>
        </Button>
      </div>

      {/* Apps Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {enabledApps.map((app) => {
          const hasConnection = app.connections.length > 0
          const effectiveEnabled = hasConnection && app.isEnabled
          const connection = app.connections[0]
          const lastTestStatus = connection?.lastTestStatus
          const isVerified = lastTestStatus === 'SUCCESS'
          const isFailed = lastTestStatus === 'FAILED'
          const isTesting = testConnection.isPending && testingAppId === app.id
          return (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getAppIcon(app.type, app.iconUrl)}
                    <div>
                      <CardTitle>{app.name}</CardTitle>
                      <CardDescription>{app.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={effectiveEnabled}
                    disabled={!hasConnection}
                    onCheckedChange={(checked) => toggleApp.mutate({ appId: app.id, isEnabled: checked })}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!hasConnection ? (
                    <p className="text-xs text-gray-500">
                      Connect this application to enable it.
                    </p>
                  ) : null}
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                      {!hasConnection ? (
                        <>
                          <XCircle className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">Not connected</span>
                        </>
                      ) : isVerified ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="text-sm">Connected</span>
                        </>
                      ) : isFailed ? (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="text-sm">Configured (Disconnected)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-gray-400" />
                          <span className="text-sm">Configured</span>
                        </>
                      )}
                    </div>
                    {hasConnection && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTestingAppId(app.id)
                          testConnection.mutate(app.id)
                        }}
                        disabled={testConnection.isPending}
                      >
                        {isTesting ? 'Testing...' : 'Test Connection'}
                      </Button>
                    )}
                  </div>
                  {isTesting && (
                    <div className="px-3">
                      <Progress value={testProgress} className="h-2" />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">{app._count.accounts}</p>
                      <p className="text-sm text-gray-500">Active Accounts</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">{app._count.provisioningRules}</p>
                      <p className="text-sm text-gray-500">Provisioning Rules</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/integrations/${app.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Apps */}
      {(enabledApps.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Plug className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <div>
              <h3 className="text-lg font-medium mb-1">No enabled applications</h3>
              <p className="text-gray-500">Enable or add applications in Settings.</p>
            </div>
            {(!apps || apps.length === 0) ? (
              <Button
                onClick={() => {
                  initTriggered.current = true
                  initApps.mutate()
                }}
                disabled={initApps.isPending}
              >
                {initApps.isPending ? 'Initializing...' : 'Initialize default applications'}
              </Button>
            ) : (
              <Button asChild>
                <Link href="/settings/applications">Go to Settings</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provisioning Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Provisioning Rules</CardTitle>
          <CardDescription>
            Define rules for automatically provisioning accounts based on employee attributes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/integrations/rules">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Rules
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
