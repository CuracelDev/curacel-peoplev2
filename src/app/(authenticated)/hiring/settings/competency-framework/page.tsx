'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  Database,
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { trpc } from '@/lib/trpc-client'
import { formatDistanceToNow } from 'date-fns'

export default function CompetencyFrameworkPage() {
  const utils = trpc.useUtils()
  const { data: sources, isLoading } = trpc.competencyFramework.listSources.useQuery()

  const syncSourceMutation = trpc.competencyFramework.syncSource.useMutation({
    onSuccess: () => {
      utils.competencyFramework.listSources.invalidate()
    },
  })

  const syncAllMutation = trpc.competencyFramework.syncAllSources.useMutation({
    onSuccess: () => {
      utils.competencyFramework.listSources.invalidate()
    },
  })

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

  const handleSync = async (sourceId: string, forceRefresh = false) => {
    try {
      await syncSourceMutation.mutateAsync({ id: sourceId, forceRefresh })
    } catch (error: any) {
      console.error('Sync failed:', error)
    }
  }

  const handleSyncAll = async () => {
    try {
      await syncAllMutation.mutateAsync({ forceRefresh: false })
    } catch (error: any) {
      console.error('Sync all failed:', error)
    }
  }

  const getSyncStatusBadge = (source: any) => {
    if (!source.lastSyncedAt) {
      return <Badge variant="secondary">Never Synced</Badge>
    }

    if (source.lastSyncStatus === 'SUCCESS') {
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Synced</Badge>
    }

    if (source.lastSyncStatus === 'FAILED') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
    }

    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DEPARTMENT':
        return 'Department'
      case 'AI':
        return 'AI Framework'
      case 'VALUES':
        return 'Company Values'
      default:
        return type
    }
  }

  const getFormatTypeLabel = (formatType: string) => {
    switch (formatType) {
      case 'STANDARD_4_LEVEL':
        return '4 Levels'
      case 'EXTENDED_5_LEVEL':
        return '5 Levels'
      case 'AI_BEHAVIORAL':
        return 'AI Behavioral'
      default:
        return formatType
    }
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Competency Framework"
        description="Manage competency frameworks synced from Google Sheets"
        backHref="/hiring/settings"
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {sources?.length || 0} framework sources configured
        </div>
        <Button
          onClick={handleSyncAll}
          disabled={syncAllMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
          {syncAllMutation.isPending ? 'Syncing All...' : 'Sync All Sources'}
        </Button>
      </div>

      {/* Framework Sources */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">Loading framework sources...</div>
          </CardContent>
        </Card>
      ) : sources && sources.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sources.map((source) => (
            <Card key={source.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getTypeLabel(source.type)}</Badge>
                      {source.department && (
                        <Badge variant="secondary">{source.department}</Badge>
                      )}
                      {source.formatType && (
                        <Badge variant="secondary">{getFormatTypeLabel(source.formatType)}</Badge>
                      )}
                    </div>
                  </div>
                  {getSyncStatusBadge(source)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Sync Information */}
                <div className="space-y-2 text-sm">
                  {source.lastSyncedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last synced:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(source.lastSyncedAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {source.cacheValidUntil && new Date(source.cacheValidUntil) > new Date() && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cache valid until:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(source.cacheValidUntil), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {source._count && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Core competencies:</span>
                      <span className="font-medium">
                        <Database className="h-3 w-3 inline mr-1" />
                        {source._count.coreCompetencies}
                      </span>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {source.lastSyncError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-medium">Sync Error:</p>
                    <p className="mt-1 text-xs">{source.lastSyncError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(source.id, false)}
                    disabled={syncSourceMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncSourceMutation.isPending ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(source.id, true)}
                    disabled={syncSourceMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncSourceMutation.isPending ? 'animate-spin' : ''}`} />
                    Force Refresh
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(source.sheetUrl, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Sheet
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedSourceId(source.id)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No framework sources configured</h3>
              <p className="text-muted-foreground mb-4">
                Set up competency framework sources to get started
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Competency Framework</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The competency framework syncs data from Google Sheets to provide structured competency definitions for:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Department Competencies:</strong> Role-specific skills and knowledge areas</li>
            <li><strong>AI Competencies:</strong> AI tool proficiency with behavioral indicators</li>
            <li><strong>Company Values:</strong> PRESS values framework for culture fit</li>
          </ul>
          <p className="pt-2">
            Data is cached for 30 days to minimize API calls. Use "Force Refresh" to update immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
