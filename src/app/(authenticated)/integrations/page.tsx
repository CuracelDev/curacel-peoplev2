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
  List,
  LayoutGrid,
  Sparkles,
  ChevronRight,
  Users,
  GitBranch,
  ExternalLink,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type LayoutType = 'list' | 'thumbnail' | 'bento'

export default function IntegrationsPage() {
  const [layout, setLayout] = useState<LayoutType>('list')
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

  useEffect(() => {
    if (isLoading || initApps.isPending || initTriggered.current) return
    const count = apps?.length ?? 0
    if (count === 0) {
      initTriggered.current = true
      initApps.mutate()
    }
  }, [apps, isLoading, initApps])

  const getAppIcon = (type: string, iconUrl?: string | null, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeMap = {
      sm: { width: 24, height: 24, className: 'h-6 w-6 object-contain' },
      md: { width: 32, height: 32, className: 'h-8 w-8 object-contain' },
      lg: { width: 48, height: 48, className: 'h-12 w-12 object-contain' },
    }
    const commonProps = sizeMap[size]

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
        return <Plug className={commonProps.className + ' text-gray-500'} />
    }
  }

  const getStatusInfo = (app: NonNullable<typeof apps>[0]) => {
    const hasConnection = app.connections.length > 0
    const connection = app.connections[0]
    const lastTestStatus = connection?.lastTestStatus
    const isVerified = lastTestStatus === 'SUCCESS'
    const isFailed = lastTestStatus === 'FAILED'

    if (!hasConnection) {
      return { icon: XCircle, text: 'Not connected', color: 'text-gray-400', bg: 'bg-gray-100' }
    }
    if (isVerified) {
      return { icon: CheckCircle2, text: 'Connected', color: 'text-green-600', bg: 'bg-green-50' }
    }
    if (isFailed) {
      return { icon: XCircle, text: 'Disconnected', color: 'text-red-500', bg: 'bg-red-50' }
    }
    return { icon: CheckCircle2, text: 'Configured', color: 'text-gray-400', bg: 'bg-gray-100' }
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

  const layoutIcons = {
    list: List,
    thumbnail: LayoutGrid,
    bento: Sparkles,
  }

  const layoutLabels = {
    list: 'List View',
    thumbnail: 'Grid View',
    bento: 'Bento View',
  }

  const LayoutIcon = layoutIcons[layout]

  // ============================================
  // VERSION 1: LIST VIEW
  // ============================================
  const ListView = () => (
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
            const isTesting = testConnection.isPending && testingAppId === app.id

            return (
              <div
                key={app.id}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    {getAppIcon(app.type, app.iconUrl)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{app.name}</p>
                      <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', status.bg)}>
                        <StatusIcon className={cn('h-3 w-3', status.color)} />
                        <span className={status.color}>{status.text}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{app.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
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
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {isTesting ? 'Testing...' : 'Test'}
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
  )

  // ============================================
  // VERSION 2: THUMBNAIL/GRID VIEW (like Settings)
  // ============================================
  const ThumbnailView = () => {
    const categories = [
      { name: 'Productivity', types: ['GOOGLE_WORKSPACE', 'SLACK', 'STANDUPNINJA'] },
      { name: 'Development', types: ['BITBUCKET', 'JIRA', 'PASSBOLT'] },
      { name: 'Marketing & Sales', types: ['HUBSPOT'] },
      { name: 'Custom', types: ['CUSTOM'] },
    ]

    const getCategory = (type: string) => {
      for (const cat of categories) {
        if (cat.types.includes(type)) return cat.name
      }
      return 'Other'
    }

    const groupedApps = enabledApps.reduce((acc, app) => {
      const cat = getCategory(app.type)
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(app)
      return acc
    }, {} as Record<string, typeof enabledApps>)

    return (
      <div className="space-y-6">
        {Object.entries(groupedApps).map(([category, categoryApps]) => (
          <div key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 px-1">
              {category}
            </h2>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {categoryApps.map((app) => {
                    const status = getStatusInfo(app)
                    const isConnected = status.text === 'Connected'

                    return (
                      <Link
                        key={app.id}
                        href={`/integrations/${app.id}`}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl transition-all text-center relative',
                          'hover:bg-indigo-50 hover:shadow-sm group'
                        )}
                      >
                        {isConnected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          </div>
                        )}
                        <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-indigo-600 flex items-center justify-center transition-colors">
                          <div className="group-hover:hidden">
                            {getAppIcon(app.type, app.iconUrl)}
                          </div>
                          <Settings className="h-6 w-6 text-white hidden group-hover:block" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 leading-tight">
                            {app.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {app._count.accounts} accounts
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    )
  }

  // ============================================
  // VERSION 3: BENTO GRID VIEW (Surprise!)
  // ============================================
  const BentoView = () => {
    const primaryApp = enabledApps[0]
    const secondaryApps = enabledApps.slice(1, 3)
    const otherApps = enabledApps.slice(3)

    const totalAccounts = enabledApps.reduce((sum, app) => sum + app._count.accounts, 0)
    const totalRules = enabledApps.reduce((sum, app) => sum + app._count.provisioningRules, 0)
    const connectedCount = enabledApps.filter(app => {
      const status = getStatusInfo(app)
      return status.text === 'Connected'
    }).length

    return (
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Connected</p>
                  <p className="text-3xl font-bold">{connectedCount}</p>
                </div>
                <Zap className="h-8 w-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Accounts</p>
                  <p className="text-3xl font-bold">{totalAccounts}</p>
                </div>
                <Users className="h-8 w-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Rules</p>
                  <p className="text-3xl font-bold">{totalRules}</p>
                </div>
                <GitBranch className="h-8 w-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-4 gap-4 auto-rows-[140px]">
          {/* Primary/Featured Card - spans 2x2 */}
          {primaryApp && (
            <Link
              href={`/integrations/${primaryApp.id}`}
              className="col-span-2 row-span-2 group"
            >
              <Card className="h-full hover:shadow-lg transition-all hover:border-indigo-200 overflow-hidden">
                <CardContent className="p-6 h-full flex flex-col justify-between relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full" />
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-gray-50 group-hover:bg-indigo-50 transition-colors">
                        {getAppIcon(primaryApp.type, primaryApp.iconUrl, 'lg')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{primaryApp.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Connected
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{primaryApp.description}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{primaryApp._count.accounts}</span>
                      <span className="text-gray-400">accounts</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <GitBranch className="h-4 w-4" />
                      <span className="font-medium">{primaryApp._count.provisioningRules}</span>
                      <span className="text-gray-400">rules</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Secondary Cards */}
          {secondaryApps.map((app) => {
            const status = getStatusInfo(app)
            const StatusIcon = status.icon
            return (
              <Link key={app.id} href={`/integrations/${app.id}`} className="col-span-1 row-span-1 group">
                <Card className="h-full hover:shadow-md transition-all hover:border-indigo-200">
                  <CardContent className="p-4 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-indigo-50 transition-colors">
                        {getAppIcon(app.type, app.iconUrl, 'sm')}
                      </div>
                      <StatusIcon className={cn('h-4 w-4', status.color)} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm truncate">{app.name}</h4>
                      <p className="text-xs text-gray-500">{app._count.accounts} accounts</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {/* Quick Actions Card */}
          <Card className="col-span-2 row-span-1 bg-gray-50 border-dashed">
            <CardContent className="p-4 h-full flex items-center justify-center gap-4">
              <Link href="/integrations/rules">
                <Button variant="outline" size="sm" className="bg-white">
                  <GitBranch className="mr-2 h-4 w-4" />
                  Manage Rules
                </Button>
              </Link>
              <Link href="/settings/applications">
                <Button variant="outline" size="sm" className="bg-white">
                  <AppWindow className="mr-2 h-4 w-4" />
                  All Integrations
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Other Apps - smaller cards */}
          {otherApps.map((app) => {
            const status = getStatusInfo(app)
            const StatusIcon = status.icon
            return (
              <Link key={app.id} href={`/integrations/${app.id}`} className="col-span-1 row-span-1 group">
                <Card className="h-full hover:shadow-md transition-all hover:border-indigo-200">
                  <CardContent className="p-4 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-indigo-50 transition-colors">
                        {getAppIcon(app.type, app.iconUrl, 'sm')}
                      </div>
                      <StatusIcon className={cn('h-4 w-4', status.color)} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm truncate">{app.name}</h4>
                      <p className="text-xs text-gray-500">{app._count.accounts} accounts</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // Check if testing is happening globally
  const isTesting = testConnection.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <LayoutIcon className="mr-2 h-4 w-4" />
              {layoutLabels[layout]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {Object.entries(layoutLabels).map(([key, label]) => {
              const Icon = layoutIcons[key as LayoutType]
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setLayout(key as LayoutType)}
                  className={cn(layout === key && 'bg-gray-100')}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button asChild variant="outline" size="sm">
          <Link href="/settings/applications">
            <AppWindow className="mr-2 h-4 w-4" />
            Manage in Settings
          </Link>
        </Button>
      </div>

      {/* Render selected layout */}
      {layout === 'list' && <ListView />}
      {layout === 'thumbnail' && <ThumbnailView />}
      {layout === 'bento' && <BentoView />}

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

      {/* Provisioning Rules - only show in list view */}
      {layout === 'list' && enabledApps.length > 0 && (
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
