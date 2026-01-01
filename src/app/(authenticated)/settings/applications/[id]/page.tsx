'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Settings2, TestTubeIcon, Plug } from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { WebflowConfigSection } from '@/components/settings/WebflowConfigSection'

// Helper to get app icon based on type
function getAppIcon(type: string, iconUrl?: string | null) {
  const commonProps = { width: 24, height: 24, className: 'w-6 h-6' }

  switch (type) {
    case 'SLACK':
      return <Image src="/logos/slack.png" alt="Slack" {...commonProps} />
    case 'GOOGLE_WORKSPACE':
      return <Image src="/logos/google.png" alt="Google Workspace" {...commonProps} />
    case 'GITHUB':
      return <Image src="/logos/github.png" alt="GitHub" {...commonProps} />
    case 'NOTION':
      return <Image src="/logos/notion.png" alt="Notion" {...commonProps} />
    case 'FIGMA':
      return <Image src="/logos/figma.png" alt="Figma" {...commonProps} />
    case 'LINEAR':
      return <Image src="/logos/linear.png" alt="Linear" {...commonProps} />
    case 'JIRA':
      return <Image src="/logos/jira.png" alt="Jira" {...commonProps} />
    case 'CONFLUENCE':
      return <Image src="/logos/confluence.png" alt="Confluence" {...commonProps} />
    case 'BITBUCKET':
      return <Image src="/logos/bitbucket.png" alt="Bitbucket" {...commonProps} />
    case 'PASSBOLT':
      return <Image src="/logos/passbolt.png" alt="Passbolt" {...commonProps} />
    case 'HUBSPOT':
      return <Image src="/logos/hubspot.png" alt="HubSpot" {...commonProps} />
    case 'STANDUPNINJA':
      return <Image src="/logos/standupninja.png" alt="StandupNinja" {...commonProps} />
    case 'FIREFLIES':
      return <Image src="/logos/fireflies.png" alt="Fireflies.ai" {...commonProps} />
    case 'WEBFLOW':
      return <Image src="/logos/webflow.png" alt="Webflow" {...commonProps} />
    default:
      if (iconUrl) {
        return <Image src={iconUrl} alt={type} {...commonProps} />
      }
      return <Plug className="w-6 h-6 text-muted-foreground" />
  }
}

function csvToList(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function listToCsv(value: string[] | undefined | null) {
  return (value ?? []).join(', ')
}

function normalizeList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

export default function ApplicationSettingsDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const appId = params?.id

  const appQuery = trpc.integration.getApp.useQuery(appId!, { enabled: Boolean(appId) })
  const summaryQuery = trpc.integration.getConnectionSummary.useQuery(appId!, { enabled: Boolean(appId) })
  const meQuery = trpc.user.me.useQuery()
  const jiraListsEnabled = Boolean(
    appId &&
      appQuery.data?.type === 'JIRA' &&
      (summaryQuery.data?.secrets as { apiTokenSet?: boolean } | undefined)?.apiTokenSet
  )
  const jiraProductsQuery = trpc.integration.listJiraProducts.useQuery(appId, {
    enabled: jiraListsEnabled,
  })
  const jiraGroupsQuery = trpc.integration.listJiraGroups.useQuery(appId, {
    enabled: jiraListsEnabled,
  })

  const upsert = trpc.integration.upsertConnectionConfig.useMutation({
    onSuccess: async () => {
      await appQuery.refetch()
      await summaryQuery.refetch()
      setSaveStatus({ kind: 'success', message: 'Saved.' })
      setSlackBotToken('')
      setSlackAdminToken('')
      setBitbucketApiToken('')
      setJiraApiToken('')
      setHubspotScimToken('')
      setPassboltApiToken('')
    },
    onError: (err) => {
      setSaveStatus({ kind: 'error', message: err.message || 'Failed to save.' })
    },
  })

  const testConnection = trpc.integration.testConnection.useMutation()
  const disconnect = trpc.integration.deleteConnection.useMutation({
    onSuccess: async () => {
      await appQuery.refetch()
      await summaryQuery.refetch()
    },
  })

  const [saveStatus, setSaveStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [testProgress, setTestProgress] = useState(0)

  const app = appQuery.data
  const summary = summaryQuery.data
  const connectionId = app?.connections?.find((c) => c.isActive)?.id ?? app?.connections?.[0]?.id

  const busy = upsert.isPending || testConnection.isPending || disconnect.isPending

  const type = app?.type
  const role = meQuery.data?.role
  const canEdit = role === 'SUPER_ADMIN' || role === 'IT_ADMIN'

  const initial = useMemo(() => {
    const cfg = (summary?.config ?? {}) as Record<string, unknown>
    return {
      googleDomain: (cfg.domain as string) || '',
      googleAdminEmail: (cfg.adminEmail as string) || '',
      slackTeamId: (cfg.teamId as string) || '',
      slackDefaultChannels: listToCsv((cfg.defaultChannels as string[]) || []),
      bitbucketWorkspace: (cfg.workspace as string) || '',
      bitbucketUsername: (cfg.username as string) || '',
      jiraBaseUrl: (cfg.baseUrl as string) || '',
      jiraAdminEmail: (cfg.adminEmail as string) || '',
      jiraProducts: Array.isArray(cfg.products)
        ? (cfg.products as string[])
        : typeof cfg.products === 'string'
          ? csvToList(cfg.products)
          : [],
      jiraDefaultGroups: Array.isArray(cfg.defaultGroups)
        ? (cfg.defaultGroups as string[])
        : typeof cfg.defaultGroups === 'string'
          ? csvToList(cfg.defaultGroups)
          : [],
      passboltMode:
        (cfg.mode as string) ||
        ((cfg.baseUrl as string) ? 'API' : '') ||
        ((cfg.cliPath as string) ? 'CLI' : '') ||
        'CLI',
      passboltBaseUrl: (cfg.baseUrl as string) || '',
      passboltCliPath: (cfg.cliPath as string) || '',
      passboltCliUser: (cfg.cliUser as string) || '',
      passboltDefaultRole: (cfg.defaultRole as string) || 'user',
    }
  }, [summary?.config])

  const [googleDomain, setGoogleDomain] = useState('')
  const [googleAdminEmail, setGoogleAdminEmail] = useState('')
  const [googleServiceAccountKey, setGoogleServiceAccountKey] = useState('')

  const [slackBotToken, setSlackBotToken] = useState('')
  const [slackAdminToken, setSlackAdminToken] = useState('')
  const [slackTeamId, setSlackTeamId] = useState('')
  const [slackDefaultChannels, setSlackDefaultChannels] = useState('')

  const [bitbucketWorkspace, setBitbucketWorkspace] = useState('')
  const [bitbucketUsername, setBitbucketUsername] = useState('')
  const [bitbucketApiToken, setBitbucketApiToken] = useState('')

  const [jiraBaseUrl, setJiraBaseUrl] = useState('')
  const [jiraAdminEmail, setJiraAdminEmail] = useState('')
  const [jiraApiToken, setJiraApiToken] = useState('')
  const [jiraProducts, setJiraProducts] = useState<string[]>([])
  const [jiraDefaultGroups, setJiraDefaultGroups] = useState<string[]>([])
  const [jiraGroupSearch, setJiraGroupSearch] = useState('')

  const [hubspotScimToken, setHubspotScimToken] = useState('')

  const [passboltMode, setPassboltMode] = useState<'API' | 'CLI'>('CLI')
  const [passboltBaseUrl, setPassboltBaseUrl] = useState('')
  const [passboltApiToken, setPassboltApiToken] = useState('')
  const [passboltCliPath, setPassboltCliPath] = useState('')
  const [passboltCliUser, setPassboltCliUser] = useState('')
  const [passboltDefaultRole, setPassboltDefaultRole] = useState<'user' | 'admin'>('user')

  const [firefliesApiKey, setFirefliesApiKey] = useState('')

  const [didInit, setDidInit] = useState(false)
  useEffect(() => {
    if (didInit) return
    if (!summaryQuery.data) return
    setGoogleDomain(initial.googleDomain)
    setGoogleAdminEmail(initial.googleAdminEmail)
    setSlackTeamId(initial.slackTeamId)
    setSlackDefaultChannels(initial.slackDefaultChannels)
    setBitbucketWorkspace(initial.bitbucketWorkspace)
    setBitbucketUsername(initial.bitbucketUsername)
    setJiraBaseUrl(initial.jiraBaseUrl)
    setJiraAdminEmail(initial.jiraAdminEmail)
    setJiraProducts(initial.jiraProducts)
    setJiraDefaultGroups(initial.jiraDefaultGroups)
    setPassboltMode(initial.passboltMode === 'API' ? 'API' : 'CLI')
    setPassboltBaseUrl(initial.passboltBaseUrl)
    setPassboltCliPath(initial.passboltCliPath)
    setPassboltCliUser(initial.passboltCliUser)
    setPassboltDefaultRole(initial.passboltDefaultRole === 'admin' ? 'admin' : 'user')
    setDidInit(true)
  }, [didInit, initial, summaryQuery.data])

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

  const jiraProductsOptions = useMemo(() => {
    const products = jiraProductsQuery.data?.products ?? []
    return [...products].sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key))
  }, [jiraProductsQuery.data?.products])

  const jiraGroups = useMemo(() => {
    const groups = jiraGroupsQuery.data?.groups ?? []
    return [...groups].sort((a, b) => a.name.localeCompare(b.name))
  }, [jiraGroupsQuery.data?.groups])

  const filteredJiraGroups = useMemo(() => {
    const query = jiraGroupSearch.trim().toLowerCase()
    if (!query) return jiraGroups
    return jiraGroups.filter((group) => group.name.toLowerCase().includes(query))
  }, [jiraGroupSearch, jiraGroups])

  const selectedJiraProductSet = useMemo(() => new Set(jiraProducts), [jiraProducts])
  const selectedJiraGroupSet = useMemo(() => new Set(jiraDefaultGroups), [jiraDefaultGroups])

  if (!appId) {
    return (
      <div className="p-6">
        <p className="text-sm text-foreground/80">No application id provided.</p>
      </div>
    )
  }

  if (appQuery.isLoading || summaryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!app || appQuery.isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-red-600">Failed to load application.</p>
        <Button variant="outline" onClick={() => router.push('/settings/applications')}>
          Back
        </Button>
      </div>
    )
  }

  const hasConnection = Boolean(connectionId)

  const connectionLabel = (() => {
    if (!hasConnection) return { text: 'Not connected', tone: 'neutral' as const }
    if (testConnection.isPending) return { text: 'Testing...', tone: 'neutral' as const }
    if (testConnection.data?.success === true) return { text: 'Connected', tone: 'success' as const }
    if (testConnection.data && !testConnection.data.success) return { text: 'Configured (Disconnected)', tone: 'error' as const }
    if (summary?.lastTestStatus === 'SUCCESS') return { text: 'Connected', tone: 'success' as const }
    if (summary?.lastTestStatus === 'FAILED') return { text: 'Configured (Disconnected)', tone: 'error' as const }
    return { text: 'Configured', tone: 'neutral' as const }
  })()
  const secrets = summary?.secrets ?? {}

  function save() {
    setSaveStatus(null)
    if (!type) return

    if (type === 'GOOGLE_WORKSPACE') {
      upsert.mutate({
        appId,
        domain: googleDomain.trim() || undefined,
        config: {
          domain: googleDomain.trim() || undefined,
          adminEmail: googleAdminEmail.trim() || undefined,
          serviceAccountKey: googleServiceAccountKey.trim() || undefined,
        },
      })
      return
    }

    if (type === 'SLACK') {
      upsert.mutate({
        appId,
        domain: slackTeamId.trim() || undefined,
        config: {
          botToken: slackBotToken.trim() || undefined,
          adminToken: slackAdminToken.trim() || undefined,
          teamId: slackTeamId.trim() || undefined,
          defaultChannels: csvToList(slackDefaultChannels),
        },
      })
      return
    }

    if (type === 'BITBUCKET') {
      const workspace = bitbucketWorkspace.trim()
      const username = bitbucketUsername.trim()
      const secret = bitbucketApiToken.trim()
      const config: Record<string, unknown> = {
        workspace: workspace || undefined,
        username: username || undefined,
      }
      if (secret) {
        config.apiToken = secret
      }
      upsert.mutate({
        appId,
        domain: workspace || undefined,
        config,
      })
      return
    }

    if (type === 'JIRA') {
      upsert.mutate({
        appId,
        domain: jiraBaseUrl.trim() || undefined,
        config: {
          baseUrl: jiraBaseUrl.trim() || undefined,
          adminEmail: jiraAdminEmail.trim() || undefined,
          apiToken: jiraApiToken.trim() || undefined,
          products: normalizeList(jiraProducts),
          defaultGroups: normalizeList(jiraDefaultGroups),
        },
      })
      return
    }

    if (type === 'HUBSPOT') {
      upsert.mutate({
        appId,
        config: {
          scimToken: hubspotScimToken.trim() || undefined,
        },
      })
      return
    }

    if (type === 'PASSBOLT') {
      const mode = passboltMode
      const config: Record<string, unknown> = {
        mode,
        defaultRole: passboltDefaultRole,
      }
      if (mode === 'API') {
        config.baseUrl = passboltBaseUrl.trim() || undefined
        config.apiToken = passboltApiToken.trim() || undefined
      } else {
        config.cliPath = passboltCliPath.trim() || undefined
        config.cliUser = passboltCliUser.trim() || undefined
      }
      upsert.mutate({
        appId,
        domain: mode === 'API' ? passboltBaseUrl.trim() || undefined : passboltCliPath.trim() || undefined,
        config,
      })
      return
    }

    if (type === 'FIREFLIES') {
      upsert.mutate({
        appId,
        config: {
          apiKey: firefliesApiKey.trim() || undefined,
        },
      })
      return
    }

    // Note: WEBFLOW is handled by WebflowConfigSection component
  }

  const canSave = (() => {
    if (!type) return false
    if (type === 'GOOGLE_WORKSPACE') {
      return Boolean(
        googleDomain.trim() &&
          googleAdminEmail.trim() &&
          (googleServiceAccountKey.trim() || (secrets as any).serviceAccountKeySet)
      )
    }
    if (type === 'SLACK') {
      return Boolean(slackBotToken.trim() || (secrets as any).botTokenSet)
    }
    if (type === 'BITBUCKET') {
      const secretSet = Boolean((secrets as any).apiTokenSet || (secrets as any).appPasswordSet)
      const hasNewToken = bitbucketApiToken.trim().length > 0
      // Username/email is required for API tokens (Basic Auth)
      return Boolean(
        bitbucketWorkspace.trim() &&
          bitbucketUsername.trim() &&
          (hasNewToken || secretSet)
      )
    }
    if (type === 'JIRA') {
      return Boolean(jiraBaseUrl.trim() && jiraAdminEmail.trim() && (jiraApiToken.trim() || (secrets as any).apiTokenSet))
    }
    if (type === 'HUBSPOT') {
      return Boolean(hubspotScimToken.trim() || (secrets as any).scimTokenSet)
    }
    if (type === 'PASSBOLT') {
      if (passboltMode === 'API') {
        return Boolean(passboltBaseUrl.trim() && (passboltApiToken.trim() || (secrets as any).apiTokenSet))
      }
      return Boolean(passboltCliPath.trim())
    }
    if (type === 'FIREFLIES') {
      return Boolean(firefliesApiKey.trim() || (secrets as any).apiKeySet)
    }
    if (type === 'WEBFLOW') {
      // Webflow uses its own save mechanism via WebflowConfigSection
      return true
    }
    return false
  })()

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title={app.name}
        description={app.description || 'Configure connection and provisioning.'}
        titleClassName="text-2xl font-bold text-foreground truncate"
        icon={getAppIcon(app.type, app.iconUrl)}
        backHref="/settings/applications"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => testConnection.mutate(appId)}
              disabled={busy || !hasConnection}
            >
              <TestTubeIcon className="mr-2 h-4 w-4" />
              {testConnection.isPending ? 'Testing...' : 'Test connection'}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/integrations/${app.id}`}>
                <Settings2 className="mr-2 h-4 w-4" />
                View app
              </Link>
            </Button>
          </>
        }
      />

      {saveStatus ? (
        <Card>
          <CardContent className="p-4">
            <p className={`text-sm ${saveStatus.kind === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {saveStatus.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {testConnection.isPending ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-foreground/80">Testing connection...</p>
            <Progress value={testProgress} className="h-2" />
          </CardContent>
        </Card>
      ) : null}

      {!canEdit ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              You are signed in as <span className="font-medium">{role || 'unknown'}</span>. Only IT Admin or Super Admin can
              save application credentials.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {testConnection.data ? (
        <Card>
          <CardContent className="p-4">
            {testConnection.data.success ? (
              <p className="text-sm text-green-700">Connection OK.</p>
            ) : (
              <p className="text-sm text-red-700">Connection failed: {testConnection.data.error || 'Unknown error'}</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Secrets are stored encrypted. For security, existing secrets are never shown; leave secret fields blank to keep the current value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {connectionLabel.tone === 'success' ? (
                <Badge className="bg-green-100 text-green-800">{connectionLabel.text}</Badge>
              ) : connectionLabel.tone === 'error' ? (
                <Badge className="bg-red-100 text-red-800">{connectionLabel.text}</Badge>
              ) : (
                <Badge variant="secondary">{connectionLabel.text}</Badge>
              )}
              {app.isEnabled ? <Badge className="bg-blue-100 text-blue-800">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}
            </div>
            {hasConnection ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!connectionId) return
                  if (confirm('Disconnect this application? It will also be disabled.')) {
                    disconnect.mutate(connectionId)
                  }
                }}
                disabled={busy}
              >
                Disconnect
              </Button>
            ) : null}
          </div>

          {type === 'GOOGLE_WORKSPACE' ? (
            <div className="grid gap-4">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="googleDomain">Workspace domain *</Label>
                  <Input
                    id="googleDomain"
                    value={googleDomain}
                    onChange={(e) => setGoogleDomain(e.target.value)}
                    placeholder="yourcompany.com"
                    disabled={!canEdit || busy}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="googleAdminEmail">Admin email *</Label>
                  <Input
                    id="googleAdminEmail"
                    value={googleAdminEmail}
                    onChange={(e) => setGoogleAdminEmail(e.target.value)}
                    placeholder="admin@yourcompany.com"
                    disabled={!canEdit || busy}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="googleServiceAccountKey">Service account key JSON *</Label>
                <Textarea
                  id="googleServiceAccountKey"
                  value={googleServiceAccountKey}
                  onChange={(e) => setGoogleServiceAccountKey(e.target.value)}
                  placeholder={(secrets as any)?.serviceAccountKeySet ? 'Configured (leave blank to keep)' : '{"type":"service_account", ...}'}
                  disabled={!canEdit || busy}
                  className="min-h-[160px] font-mono text-xs"
                />
                {(secrets as any)?.serviceAccountKeySet ? (
                  <p className="text-xs text-muted-foreground">Saved.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not set.</p>
                )}
              </div>
            </div>
          ) : null}

          {type === 'SLACK' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="slackBotToken">Bot token *</Label>
                <Input
                  id="slackBotToken"
                  type="password"
                  value={slackBotToken}
                  onChange={(e) => setSlackBotToken(e.target.value)}
                  placeholder={(secrets as any)?.botTokenSet ? 'Configured (leave blank to keep)' : 'xoxb-…'}
                  disabled={!canEdit || busy}
                />
                {(secrets as any)?.botTokenSet ? <p className="text-xs text-muted-foreground">Saved.</p> : <p className="text-xs text-muted-foreground">Not set.</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slackAdminToken">Admin token (optional)</Label>
                <Input
                  id="slackAdminToken"
                  type="password"
                  value={slackAdminToken}
                  onChange={(e) => setSlackAdminToken(e.target.value)}
                  placeholder={(secrets as any)?.adminTokenSet ? 'Configured (leave blank to keep)' : 'xoxp-…'}
                  disabled={!canEdit || busy}
                />
                {(secrets as any)?.adminTokenSet ? <p className="text-xs text-muted-foreground">Saved.</p> : <p className="text-xs text-muted-foreground">Not set.</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slackTeamId">Workspace ID (teamId)</Label>
                <Input
                  id="slackTeamId"
                  value={slackTeamId}
                  onChange={(e) => setSlackTeamId(e.target.value)}
                  placeholder="T0123ABCDEF (optional)"
                  disabled={!canEdit || busy}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slackDefaultChannels">Default channels</Label>
                <Input
                  id="slackDefaultChannels"
                  value={slackDefaultChannels}
                  onChange={(e) => setSlackDefaultChannels(e.target.value)}
                  placeholder="#general, #engineering (optional)"
                  disabled={!canEdit || busy}
                />
              </div>
            </div>
          ) : null}

          {type === 'BITBUCKET' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="bbWorkspace">Workspace *</Label>
                <Input
                  id="bbWorkspace"
                  value={bitbucketWorkspace}
                  onChange={(e) => setBitbucketWorkspace(e.target.value)}
                  placeholder="your-workspace-slug"
                  disabled={!canEdit || busy}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bbUsername">Atlassian account email *</Label>
                <Input
                  id="bbUsername"
                  value={bitbucketUsername}
                  onChange={(e) => setBitbucketUsername(e.target.value)}
                  placeholder="you@company.com"
                  disabled={!canEdit || busy}
                />
                <p className="text-xs text-muted-foreground">
                  The email associated with the Atlassian account that created the API token.
                </p>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="bbPassword">API token *</Label>
                <Input
                  id="bbPassword"
                  type="password"
                  value={bitbucketApiToken}
                  onChange={(e) => setBitbucketApiToken(e.target.value)}
                  placeholder={(secrets as any)?.apiTokenSet || (secrets as any)?.appPasswordSet ? 'Configured (leave blank to keep)' : 'ATATTxxxxx...'}
                  disabled={!canEdit || busy}
                />
                {(secrets as any)?.apiTokenSet || (secrets as any)?.appPasswordSet ? (
                  <p className="text-xs text-muted-foreground">Saved.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not set.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Create a Bitbucket API token at bitbucket.org (Personal settings → API tokens). Required scopes: account, workspace, repositories, pullrequest (read/write as needed).
                </p>
              </div>
            </div>
          ) : null}

          {type === 'JIRA' ? (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="jiraBaseUrl">Base URL *</Label>
                  <Input
                    id="jiraBaseUrl"
                    value={jiraBaseUrl}
                    onChange={(e) => setJiraBaseUrl(e.target.value)}
                    placeholder="https://your-domain.atlassian.net"
                    disabled={!canEdit || busy}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jiraAdminEmail">Admin email *</Label>
                  <Input
                    id="jiraAdminEmail"
                    value={jiraAdminEmail}
                    onChange={(e) => setJiraAdminEmail(e.target.value)}
                    placeholder="admin@company.com"
                    disabled={!canEdit || busy}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jiraApiToken">API token *</Label>
                  <Input
                    id="jiraApiToken"
                    type="password"
                    value={jiraApiToken}
                    onChange={(e) => setJiraApiToken(e.target.value)}
                    placeholder={(secrets as any)?.apiTokenSet ? 'Configured (leave blank to keep)' : '********'}
                    disabled={!canEdit || busy}
                  />
                  {(secrets as any)?.apiTokenSet ? (
                    <p className="text-xs text-muted-foreground">Saved.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not set.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Products</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => jiraProductsQuery.refetch()}
                    disabled={!jiraListsEnabled || busy || jiraProductsQuery.isFetching}
                  >
                    Refresh
                  </Button>
                </div>
                {!jiraListsEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    Save your Jira credentials to load products and groups.
                  </p>
                ) : null}
                {jiraProductsQuery.data?.error ? (
                  <p className="text-xs text-red-600">Failed to load products: {jiraProductsQuery.data.error}</p>
                ) : null}
                {jiraListsEnabled ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {jiraProductsOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products found.</p>
                    ) : (
                      jiraProductsOptions.map((product) => (
                        <div
                          key={product.key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.key}</p>
                          </div>
                          <Switch
                            checked={selectedJiraProductSet.has(product.key)}
                            onCheckedChange={(checked) => {
                              setJiraProducts((prev) => {
                                const next = new Set(prev)
                                if (checked) {
                                  next.add(product.key)
                                } else {
                                  next.delete(product.key)
                                }
                                return Array.from(next)
                              })
                            }}
                            disabled={!canEdit || busy}
                          />
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
                {jiraProductsOptions.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const keys = jiraProductsOptions.map((product) => product.key)
                        setJiraProducts((prev) => {
                          const allSelected = keys.length > 0 && keys.every((key) => prev.includes(key))
                          return allSelected ? [] : keys
                        })
                      }}
                      disabled={!canEdit || busy || jiraProductsOptions.length === 0}
                    >
                      {jiraProductsOptions.every((product) => selectedJiraProductSet.has(product.key)) ? 'Clear all' : 'Select all'}
                    </Button>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Selected products are assigned when creating Jira users. If none are selected, Jira defaults apply.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Default groups</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => jiraGroupsQuery.refetch()}
                    disabled={!jiraListsEnabled || busy || jiraGroupsQuery.isFetching}
                  >
                    Refresh
                  </Button>
                </div>
                {!jiraListsEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    Save your Jira credentials to load products and groups.
                  </p>
                ) : null}
                {jiraListsEnabled ? (
                  <>
                    <Input
                      value={jiraGroupSearch}
                      onChange={(e) => setJiraGroupSearch(e.target.value)}
                      placeholder="Search Jira groups"
                      disabled={!canEdit || busy || jiraGroupsQuery.isFetching}
                    />
                    {jiraGroupsQuery.data?.error ? (
                      <p className="text-xs text-red-600">Failed to load groups: {jiraGroupsQuery.data.error}</p>
                    ) : null}
                    <div className="grid gap-2 md:grid-cols-2">
                      {filteredJiraGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No groups found.</p>
                      ) : (
                        filteredJiraGroups.map((group) => (
                          <div
                            key={group.name}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                          >
                            <p className="text-sm text-foreground">{group.name}</p>
                            <Switch
                              checked={selectedJiraGroupSet.has(group.name)}
                              onCheckedChange={(checked) => {
                                setJiraDefaultGroups((prev) => {
                                  const next = new Set(prev)
                                  if (checked) {
                                    next.add(group.name)
                                  } else {
                                    next.delete(group.name)
                                  }
                                  return Array.from(next)
                                })
                              }}
                              disabled={!canEdit || busy}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {type === 'HUBSPOT' ? (
            <div className="grid gap-2">
              <Label htmlFor="hubspotScimToken">Private app token *</Label>
              <Input
                id="hubspotScimToken"
                type="password"
                value={hubspotScimToken}
                onChange={(e) => setHubspotScimToken(e.target.value)}
                placeholder={(secrets as any)?.scimTokenSet ? 'Configured (leave blank to keep)' : 'pat-********'}
                disabled={!canEdit || busy}
              />
              {(secrets as any)?.scimTokenSet ? (
                <p className="text-xs text-muted-foreground">Saved.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not set.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use a HubSpot private app access token with settings.users.read and settings.users.write scopes.
              </p>
            </div>
          ) : null}

          {type === 'PASSBOLT' ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Connection mode</Label>
                <Select value={passboltMode} onValueChange={(value) => setPassboltMode(value as 'API' | 'CLI')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="API">API (JWT/API token)</SelectItem>
                    <SelectItem value="CLI">CLI (self-hosted server)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Use API mode if your Passbolt instance exposes JWT/API authentication. Use CLI if Curacel runs on the same server as Passbolt.
                </p>
              </div>

              {passboltMode === 'API' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="passboltBaseUrl">Passbolt base URL *</Label>
                    <Input
                      id="passboltBaseUrl"
                      value={passboltBaseUrl}
                      onChange={(e) => setPassboltBaseUrl(e.target.value)}
                      placeholder="https://warden.curacel.ai"
                      disabled={!canEdit || busy}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="passboltApiToken">API token / JWT *</Label>
                    <Input
                      id="passboltApiToken"
                      type="password"
                      value={passboltApiToken}
                      onChange={(e) => setPassboltApiToken(e.target.value)}
                      placeholder={(secrets as any)?.apiTokenSet ? 'Configured (leave blank to keep)' : '********'}
                      disabled={!canEdit || busy}
                    />
                    {(secrets as any)?.apiTokenSet ? (
                      <p className="text-xs text-muted-foreground">Saved.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not set.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="passboltCliPath">Passbolt install path *</Label>
                    <Input
                      id="passboltCliPath"
                      value={passboltCliPath}
                      onChange={(e) => setPassboltCliPath(e.target.value)}
                      placeholder="/var/www/passbolt"
                      disabled={!canEdit || busy}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="passboltCliUser">Run as user (optional)</Label>
                    <Input
                      id="passboltCliUser"
                      value={passboltCliUser}
                      onChange={(e) => setPassboltCliUser(e.target.value)}
                      placeholder="www-data"
                      disabled={!canEdit || busy}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-2 md:max-w-xs">
                <Label>Default role</Label>
                <Select
                  value={passboltDefaultRole}
                  onValueChange={(value) => setPassboltDefaultRole(value as 'user' | 'admin')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                Webhook provisioning remains available as a fallback from the View app screen.
              </p>
            </div>
          ) : null}

          {type === 'FIREFLIES' ? (
            <div className="grid gap-2">
              <Label htmlFor="firefliesApiKey">API key *</Label>
              <Input
                id="firefliesApiKey"
                type="password"
                value={firefliesApiKey}
                onChange={(e) => setFirefliesApiKey(e.target.value)}
                placeholder={(secrets as any)?.apiKeySet ? 'Configured (leave blank to keep)' : 'Enter your Fireflies API key'}
                disabled={!canEdit || busy}
              />
              {(secrets as any)?.apiKeySet ? (
                <p className="text-xs text-muted-foreground">Saved.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not set.</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from <a href="https://app.fireflies.ai/integrations/custom" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Fireflies.ai Integrations</a>.
                This is used to automatically attach meeting transcripts to interviews.
              </p>
            </div>
          ) : null}

          {type === 'WEBFLOW' ? (
            <WebflowConfigSection
              appId={appId}
              secrets={secrets as Record<string, unknown>}
              canEdit={canEdit}
              busy={busy}
              onSave={(config) => {
                upsert.mutate({
                  appId,
                  config: {
                    apiToken: config.apiToken,
                    siteId: config.siteId,
                    collectionId: config.collectionId,
                    autoPublish: config.autoPublish,
                    autoSync: config.autoSync,
                  },
                })
              }}
              onSaveSuccess={() => {
                summaryQuery.refetch()
              }}
            />
          ) : null}

          {type && !['SLACK', 'BITBUCKET', 'JIRA', 'HUBSPOT', 'PASSBOLT', 'FIREFLIES', 'WEBFLOW', 'GOOGLE_WORKSPACE'].includes(type) ? (
            <p className="text-sm text-foreground/80">
              This application currently supports webhook-based provisioning via the "View app" page.
            </p>
          ) : null}

          {type !== 'WEBFLOW' && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.push('/settings/applications')} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!canEdit || !canSave || busy}>
                {upsert.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
