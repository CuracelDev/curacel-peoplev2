'use client'

import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'
import {
  Plug,
  Settings,
  CheckCircle2,
  XCircle,
  AppWindow,
  ChevronRight,
  Users,
  GitBranch,
  Mic,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function IntegrationsPage() {
  const { data: apps, isLoading, refetch } = trpc.integration.listApps.useQuery()
  const firefliesConfigQuery = trpc.interview.isFirefliesConfigured.useQuery()
  const calendarConfigQuery = trpc.interview.isCalendarConfigured.useQuery()
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

  useEffect(() => {
    if (isLoading || initApps.isPending || initTriggered.current) return
    const count = apps?.length ?? 0
    if (count === 0) {
      initTriggered.current = true
      initApps.mutate()
    }
  }, [apps, isLoading, initApps])

  const getAppIcon = (type: string, iconUrl?: string | null) => {
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
      default:
        if (iconUrl) {
          return <Image src={iconUrl} alt={type} {...commonProps} />
        }
        return <Plug className={commonProps.className + ' text-muted-foreground'} />
    }
  }

  const getStatusInfo = (app: NonNullable<typeof apps>[0]) => {
    const hasConnection = app.connections.length > 0
    const connection = app.connections[0]
    const lastTestStatus = connection?.lastTestStatus
    const isVerified = lastTestStatus === 'SUCCESS'
    const isFailed = lastTestStatus === 'FAILED'

    if (!hasConnection) {
      return { icon: XCircle, text: 'Not connected', color: 'text-muted-foreground', bg: 'bg-muted' }
    }
    if (isVerified) {
      return { icon: CheckCircle2, text: 'Connected', color: 'text-green-600', bg: 'bg-green-50' }
    }
    if (isFailed) {
      return { icon: XCircle, text: 'Disconnected', color: 'text-red-500', bg: 'bg-red-50' }
    }
    return { icon: CheckCircle2, text: 'Configured', color: 'text-muted-foreground', bg: 'bg-muted' }
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
  const isTesting = testConnection.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/applications">
            <AppWindow className="mr-2 h-4 w-4" />
            Manage in Settings
          </Link>
        </Button>
      </div>

      {/* List View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connected Applications</CardTitle>
          <CardDescription>Manage your organization's integrations and connections</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {enabledApps.map((app) => {
              const status = getStatusInfo(app)
              const StatusIcon = status.icon
              const hasConnection = app.connections.length > 0
              const effectiveEnabled = hasConnection && app.isEnabled
              const isTestingThis = testConnection.isPending && testingAppId === app.id

              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      {getAppIcon(app.type, app.iconUrl)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{app.name}</p>
                        <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', status.bg)}>
                          <StatusIcon className={cn('h-3 w-3', status.color)} />
                          <span className={status.color}>{status.text}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{app.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{app._count.accounts}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-4 w-4" />
                        <span>{app._count.provisioningRules}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {hasConnection && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTestingAppId(app.id)
                            testConnection.mutate(app.id)
                          }}
                          disabled={testConnection.isPending}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isTestingThis ? 'Testing...' : 'Test'}
                        </Button>
                      )}
                      <Switch
                        checked={effectiveEnabled}
                        disabled={!hasConnection}
                        onCheckedChange={(checked) => toggleApp.mutate({ appId: app.id, isEnabled: checked })}
                      />
                      <Link href={`/integrations/${app.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {isTesting && testingAppId && (
            <div className="px-6 pb-4">
              <Progress value={testProgress} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Apps */}
      {(enabledApps.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Plug className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <div>
              <h3 className="text-lg font-medium mb-1">No enabled applications</h3>
              <p className="text-muted-foreground">Enable or add applications in Settings.</p>
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

      {/* Recruiting Integrations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recruiting Integrations</CardTitle>
          <CardDescription>Interview recording, calendar, and AI-powered analysis</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Fireflies Integration */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">Fireflies.ai</p>
                    {firefliesConfigQuery.data?.configured ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
                        <XCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Not configured</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    Automatically attach meeting transcripts to interviews
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {firefliesConfigQuery.data?.configured ? (
                  <span className="text-xs text-muted-foreground">API key configured</span>
                ) : (
                  <code className="text-xs bg-muted px-2 py-1 rounded">FIREFLIES_API_KEY</code>
                )}
                <Link href="https://fireflies.ai" target="_blank">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Google Calendar Integration */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">Google Calendar</p>
                    {calendarConfigQuery.data?.configured ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
                        <XCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Not configured</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    Check availability and create calendar events with Google Meet
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {calendarConfigQuery.data?.configured ? (
                  <span className="text-xs text-muted-foreground">Google Workspace connected</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Requires Google Workspace</span>
                )}
                <Link href="/settings/applications">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* BlueAI Integration */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">BlueAI Analysis</p>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
                      <span className="text-muted-foreground">Configure in Settings</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    AI-powered candidate analysis, question generation, and transcript scoring
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/settings/ai-agent">
                  <Button variant="ghost" size="sm">
                    Configure
                  </Button>
                </Link>
                <Link href="/settings/ai-agent">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provisioning Rules */}
      {enabledApps.length > 0 && (
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
      )}
    </div>
  )
}
