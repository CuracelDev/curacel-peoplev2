'use client'

import { useState, useEffect, useMemo } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, RefreshCw, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

interface WebflowConfigSectionProps {
  appId: string
  secrets: Record<string, unknown>
  canEdit: boolean
  busy: boolean
  onSave: (config: {
    apiToken?: string
    siteId?: string
    collectionId?: string
    autoPublish?: boolean
    autoSync?: boolean
  }) => void
  onSaveSuccess: () => void
}

export function WebflowConfigSection({
  appId,
  secrets,
  canEdit,
  busy,
  onSave,
  onSaveSuccess,
}: WebflowConfigSectionProps) {
  const [apiToken, setApiToken] = useState('')
  const [siteId, setSiteId] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [autoPublish, setAutoPublish] = useState(false)
  const [autoSync, setAutoSync] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Webflow queries
  const statusQuery = trpc.webflow.getStatus.useQuery()
  const sitesQuery = trpc.webflow.listSites.useQuery(undefined, {
    enabled: statusQuery.data?.isConnected ?? false,
  })
  const collectionsQuery = trpc.webflow.listCollections.useQuery(
    { siteId },
    { enabled: Boolean(siteId) }
  )
  const schemaQuery = trpc.webflow.getCollectionSchema.useQuery(
    { collectionId },
    { enabled: Boolean(collectionId) }
  )
  const mappingsQuery = trpc.webflow.getFieldMappings.useQuery(undefined, {
    enabled: Boolean(collectionId),
  })
  const testMutation = trpc.webflow.testConnection.useMutation()
  const updateSettingsMutation = trpc.webflow.updateSettings.useMutation({
    onSuccess: () => {
      statusQuery.refetch()
      onSaveSuccess()
      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' })
      setTimeout(() => setSaveStatus(null), 3000)
    },
    onError: (error) => {
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save settings' })
    },
  })
  const saveMappingsMutation = trpc.webflow.saveFieldMappings.useMutation({
    onSuccess: () => {
      mappingsQuery.refetch()
      setSaveStatus({ type: 'success', message: 'Field mappings saved successfully!' })
      setTimeout(() => setSaveStatus(null), 3000)
    },
    onError: (error) => {
      setSaveStatus({ type: 'error', message: error.message || 'Failed to save field mappings' })
    },
  })

  // Initialize from status
  useEffect(() => {
    if (statusQuery.data) {
      setSiteId(statusQuery.data.siteId || '')
      setCollectionId(statusQuery.data.collectionId || '')
      setAutoPublish(statusQuery.data.autoPublish || false)
      setAutoSync(statusQuery.data.autoSync || false)
    }
  }, [statusQuery.data])

  // Field mappings state
  const [mappings, setMappings] = useState<Record<string, string>>({})
  useEffect(() => {
    if (mappingsQuery.data?.mappings) {
      setMappings(mappingsQuery.data.mappings)
    }
  }, [mappingsQuery.data?.mappings])

  const curacelFields = mappingsQuery.data?.curacelFields || []
  const webflowFields = mappingsQuery.data?.webflowFields || []

  const handleSaveBasicConfig = () => {
    onSave({
      apiToken: apiToken.trim() || undefined,
      siteId,
      collectionId,
      autoPublish,
      autoSync,
    })
  }

  const handleUpdateSettings = () => {
    updateSettingsMutation.mutate({
      siteId,
      collectionId,
      autoPublish,
      autoSync,
    })
  }

  const handleSaveMappings = () => {
    saveMappingsMutation.mutate({ mappings })
  }

  const isConfigured = statusQuery.data?.isConnected
  const hasApiToken = Boolean((secrets as Record<string, boolean>)?.apiTokenSet)

  return (
    <div className="space-y-6">
      {/* Save Status Feedback */}
      {saveStatus && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${saveStatus.type === 'success' ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="text-sm">{saveStatus.message}</span>
        </div>
      )}

      {/* API Token Configuration */}
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="webflowApiToken">API Token *</Label>
          <Input
            id="webflowApiToken"
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder={hasApiToken ? 'Configured (leave blank to keep)' : 'Enter your Webflow API token'}
            disabled={!canEdit || busy}
          />
          {hasApiToken ? (
            <p className="text-xs text-muted-foreground">Saved.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Not set.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Get your API token from{' '}
            <a
              href="https://webflow.com/dashboard/account/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Webflow Dashboard → Integrations → API Access
            </a>
          </p>
        </div>

        {!isConfigured && (
          <div className="flex justify-end">
            <Button onClick={handleSaveBasicConfig} disabled={!canEdit || busy || !apiToken.trim()}>
              Save API Token
            </Button>
          </div>
        )}
      </div>

      {/* Site & Collection Selection */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CMS Configuration</CardTitle>
            <CardDescription>
              Select the Webflow site and collection where jobs will be published.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Site</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sitesQuery.refetch()}
                    disabled={sitesQuery.isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${sitesQuery.isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <Select value={siteId} onValueChange={setSiteId} disabled={!canEdit || busy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sitesQuery.data?.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.displayName || site.shortName || site.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Collection</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => collectionsQuery.refetch()}
                    disabled={!siteId || collectionsQuery.isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${collectionsQuery.isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <Select value={collectionId} onValueChange={setCollectionId} disabled={!canEdit || busy || !siteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionsQuery.data?.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="cursor-pointer">Auto-publish</Label>
                  <p className="text-xs text-muted-foreground">
                    Publish items to live site automatically
                  </p>
                </div>
                <Switch
                  checked={autoPublish}
                  onCheckedChange={setAutoPublish}
                  disabled={!canEdit || busy}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="cursor-pointer">Auto-sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Sync on job status changes
                  </p>
                </div>
                <Switch
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                  disabled={!canEdit || busy}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Test Connection
              </Button>
              <Button
                onClick={handleUpdateSettings}
                disabled={!canEdit || busy || updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>

            {testMutation.data && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${testMutation.data.success ? 'bg-success/10 text-success' : 'bg-red-50 text-red-700'}`}>
                {testMutation.data.success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Connection successful!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Connection failed: {testMutation.data.error}</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Field Mapping */}
      {isConfigured && collectionId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Field Mapping</CardTitle>
            <CardDescription>
              Map CuracelPeople job fields to your Webflow CMS collection fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schemaQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {curacelFields.map((field) => (
                  <div key={field.key} className="flex items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{field.type}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-[200px]">
                      <Select
                        value={mappings[field.key] || '__none__'}
                        onValueChange={(value) =>
                          setMappings((prev) => ({ ...prev, [field.key]: value === '__none__' ? '' : value }))
                        }
                        disabled={!canEdit || busy}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Webflow field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Not mapped --</SelectItem>
                          {webflowFields.map((wf) => (
                            <SelectItem key={wf.id} value={wf.slug}>
                              {wf.displayName} ({wf.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => schemaQuery.refetch()}
                disabled={schemaQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${schemaQuery.isFetching ? 'animate-spin' : ''}`} />
                Refresh Schema
              </Button>
              <Button
                onClick={handleSaveMappings}
                disabled={!canEdit || busy || saveMappingsMutation.isPending}
              >
                {saveMappingsMutation.isPending ? 'Saving...' : 'Save Mappings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Status */}
      {isConfigured && collectionId && (
        <SyncStatusCard />
      )}
    </div>
  )
}

function SyncStatusCard() {
  const syncStatusQuery = trpc.webflow.getAllJobsSyncStatus.useQuery()
  const syncAllMutation = trpc.webflow.syncAllJobs.useMutation({
    onSuccess: () => {
      syncStatusQuery.refetch()
    },
  })

  if (syncStatusQuery.isLoading) {
    return null
  }

  const summary = syncStatusQuery.data?.summary

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sync Status</CardTitle>
        <CardDescription>
          Status of job publishing to Webflow CMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{summary?.synced || 0}</div>
            <div className="text-xs text-success">Synced</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{summary?.pending || 0}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{summary?.failed || 0}</div>
            <div className="text-xs text-red-600">Failed</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">{summary?.notSynced || 0}</div>
            <div className="text-xs text-gray-600">Not Synced</div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
          >
            {syncAllMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All Active Jobs
              </>
            )}
          </Button>
        </div>

        {syncAllMutation.data && (
          <div className={`p-3 rounded-lg ${syncAllMutation.data.failed === 0 ? 'bg-success/10' : 'bg-yellow-50'}`}>
            <p className="text-sm">
              Synced {syncAllMutation.data.synced} jobs successfully.
              {syncAllMutation.data.failed > 0 && ` ${syncAllMutation.data.failed} failed.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
