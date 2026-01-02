'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, XCircle, Loader2, Settings } from 'lucide-react'

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const appId = params?.id

  const utils = trpc.useUtils()
  const getApp = trpc.integration.getApp.useQuery(appId!, { enabled: Boolean(appId) })
  const googleGroupsQuery = trpc.integration.listGoogleWorkspaceGroups.useQuery(appId!, {
    enabled: Boolean(appId && getApp.data?.type === 'GOOGLE_WORKSPACE'),
  })
  const bitbucketOptionsQuery = trpc.integration.listBitbucketOptions.useQuery(appId!, {
    enabled: Boolean(appId && getApp.data?.type === 'BITBUCKET'),
  })
  const jiraBoardsQuery = trpc.integration.listJiraBoards.useQuery(appId!, {
    enabled: Boolean(appId && getApp.data?.type === 'JIRA'),
  })
  const jiraGroupsQuery = trpc.integration.listJiraGroups.useQuery(appId!, {
    enabled: Boolean(appId && getApp.data?.type === 'JIRA'),
  })
  const [provisionUrl, setProvisionUrl] = useState('')
  const [deprovisionUrl, setDeprovisionUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [testUrl, setTestUrl] = useState('')
  const [connectionState, setConnectionState] = useState<'unknown' | 'testing' | 'connected' | 'disconnected'>('unknown')
  const [lastConnectionError, setLastConnectionError] = useState<string | null>(null)
  const [hasAutoTested, setHasAutoTested] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [bitbucketRuleScope, setBitbucketRuleScope] = useState<'ALL' | 'DEPARTMENT' | 'JOB_TITLE'>('ALL')
  const [bitbucketRuleValue, setBitbucketRuleValue] = useState('')
  const [bitbucketGroupSearch, setBitbucketGroupSearch] = useState('')
  const [bitbucketRepoSearch, setBitbucketRepoSearch] = useState('')
  const [selectedBitbucketGroups, setSelectedBitbucketGroups] = useState<string[]>([])
  const [selectedBitbucketRepos, setSelectedBitbucketRepos] = useState<Record<string, 'read' | 'write' | 'admin'>>({})
  const [googleRuleScope, setGoogleRuleScope] = useState<'ALL' | 'DEPARTMENT' | 'JOB_TITLE'>('ALL')
  const [googleRuleValue, setGoogleRuleValue] = useState('')
  const [googleGroupSearch, setGoogleGroupSearch] = useState('')
  const [selectedGoogleGroups, setSelectedGoogleGroups] = useState<string[]>([])
  const [jiraRuleScope, setJiraRuleScope] = useState<
    'ALL' | 'DEPARTMENT' | 'JOB_TITLE' | 'JIRA_BOARD' | 'MANAGER'
  >('ALL')
  const [jiraRuleValue, setJiraRuleValue] = useState('')
  const [jiraGroupSearch, setJiraGroupSearch] = useState('')
  const [selectedJiraGroups, setSelectedJiraGroups] = useState<string[]>([])
  const [jiraBoardSearch, setJiraBoardSearch] = useState('')
  const [selectedJiraBoards, setSelectedJiraBoards] = useState<string[]>([])
  const [jiraBoardRoleById, setJiraBoardRoleById] = useState<Record<string, string>>({})
  const [jiraRolesByProjectId, setJiraRolesByProjectId] = useState<
    Record<string, { roles: Array<{ id: string; name: string }>; error?: string }>
  >({})
  const [showWebhookSetup, setShowWebhookSetup] = useState(false)
  const testConnection = trpc.integration.testConnection.useMutation({
    onSuccess: (data) => {
      setConnectionState(data.success ? 'connected' : 'disconnected')
      setLastConnectionError(data.success ? null : data.error || 'Connection failed')
    },
    onError: (error) => {
      setConnectionState('disconnected')
      setLastConnectionError(error.message || 'Connection failed')
    },
  })
  const toggleApp = trpc.integration.toggleApp.useMutation({
    onSuccess: () => getApp.refetch(),
  })
  const createConnection = trpc.integration.createConnection.useMutation({
    onSuccess: () => getApp.refetch(),
  })
  const updateConnection = trpc.integration.updateConnection.useMutation({
    onSuccess: () => getApp.refetch(),
  })
  const deleteConnection = trpc.integration.deleteConnection.useMutation({
    onSuccess: () => getApp.refetch(),
  })
  const createRule = trpc.integration.createRule.useMutation({
    onSuccess: () => {
      getApp.refetch()
      setBitbucketRuleValue('')
      setBitbucketGroupSearch('')
      setBitbucketRepoSearch('')
      setSelectedBitbucketGroups([])
      setSelectedBitbucketRepos({})
      setGoogleRuleValue('')
      setSelectedGoogleGroups([])
      setJiraRuleValue('')
      setSelectedJiraGroups([])
      setSelectedJiraBoards([])
      setJiraBoardRoleById({})
    },
  })
  const deleteRule = trpc.integration.deleteRule.useMutation({
    onSuccess: () => getApp.refetch(),
  })

  const hasConnection = useMemo(() => (getApp.data?.connections?.length || 0) > 0, [getApp.data])
  const activeAccountsCount = getApp.data?._count?.accounts ?? 0
  const rulesCount = getApp.data?._count?.provisioningRules ?? getApp.data?.provisioningRules?.length ?? 0
  const primaryConnection = getApp.data?.connections?.[0]

  useEffect(() => {
    if (!getApp.data?.id) return
    // We don't decrypt on the client; instead, keep fields empty until user sets them.
    // If you want to prefill, add a dedicated API to return sanitized connection config.
    setProvisionUrl('')
    setDeprovisionUrl('')
    setApiKey('')
    setTestUrl('')
  }, [getApp.data?.id, primaryConnection?.id])

  useEffect(() => {
    setConnectionState('unknown')
    setLastConnectionError(null)
    setHasAutoTested(false)
  }, [appId, primaryConnection?.id])

  useEffect(() => {
    if (!hasConnection) {
      setConnectionState('unknown')
      setLastConnectionError(null)
      return
    }
    if (hasAutoTested || testConnection.isPending || !appId) return
    setHasAutoTested(true)
    setConnectionState('testing')
    setLastConnectionError(null)
    testConnection.mutate(appId)
  }, [appId, hasAutoTested, hasConnection, testConnection.isPending, testConnection])

  useEffect(() => {
    if (connectionState !== 'testing') {
      setTestProgress(0)
      return
    }
    setTestProgress(15)
    const interval = setInterval(() => {
      setTestProgress((prev) => (prev >= 85 ? prev : prev + Math.floor(Math.random() * 10) + 5))
    }, 300)
    return () => clearInterval(interval)
  }, [connectionState])

  const googleGroups = useMemo(() => {
    const groups = googleGroupsQuery.data?.groups ?? []
    return [...groups].sort((a, b) => a.name.localeCompare(b.name))
  }, [googleGroupsQuery.data?.groups])
  const filteredGoogleGroups = useMemo(() => {
    const query = googleGroupSearch.trim().toLowerCase()
    if (!query) return googleGroups
    return googleGroups.filter((group) => {
      return (
        group.name.toLowerCase().includes(query) ||
        group.email.toLowerCase().includes(query)
      )
    })
  }, [googleGroups, googleGroupSearch])
  const selectedGoogleGroupSet = useMemo(() => new Set(selectedGoogleGroups), [selectedGoogleGroups])

  const jiraBoards = useMemo(() => {
    const boards = jiraBoardsQuery.data?.boards ?? []
    return [...boards].sort((a, b) => a.name.localeCompare(b.name))
  }, [jiraBoardsQuery.data?.boards])
  const jiraBoardsById = useMemo(() => {
    const map = new Map<string, (typeof jiraBoards)[number]>()
    for (const board of jiraBoards) {
      map.set(String(board.id), board)
    }
    return map
  }, [jiraBoards])
  const filteredJiraBoards = useMemo(() => {
    const query = jiraBoardSearch.trim().toLowerCase()
    if (!query) return jiraBoards
    return jiraBoards.filter((board) => board.name.toLowerCase().includes(query))
  }, [jiraBoards, jiraBoardSearch])
  const jiraGroups = useMemo(() => {
    const groups = jiraGroupsQuery.data?.groups ?? []
    return [...groups].sort((a, b) => a.name.localeCompare(b.name))
  }, [jiraGroupsQuery.data?.groups])
  const filteredJiraGroups = useMemo(() => {
    const query = jiraGroupSearch.trim().toLowerCase()
    if (!query) return jiraGroups
    return jiraGroups.filter((group) => group.name.toLowerCase().includes(query))
  }, [jiraGroups, jiraGroupSearch])
  const selectedJiraGroupSet = useMemo(() => new Set(selectedJiraGroups), [selectedJiraGroups])
  const selectedJiraBoardDetails = useMemo(() => {
    return selectedJiraBoards
      .map((id) => jiraBoardsById.get(id))
      .filter(Boolean) as Array<(typeof jiraBoards)[number]>
  }, [jiraBoardsById, selectedJiraBoards])
  const bitbucketGroups = useMemo(() => {
    const groups = bitbucketOptionsQuery.data?.groups ?? []
    return [...groups].sort((a, b) => a.name.localeCompare(b.name))
  }, [bitbucketOptionsQuery.data?.groups])
  const filteredBitbucketGroups = useMemo(() => {
    const query = bitbucketGroupSearch.trim().toLowerCase()
    if (!query) return bitbucketGroups
    return bitbucketGroups.filter((group) => group.name.toLowerCase().includes(query))
  }, [bitbucketGroupSearch, bitbucketGroups])
  const bitbucketRepos = useMemo(() => {
    const repos = bitbucketOptionsQuery.data?.repositories ?? []
    return [...repos].sort((a, b) => a.name.localeCompare(b.name))
  }, [bitbucketOptionsQuery.data?.repositories])
  const filteredBitbucketRepos = useMemo(() => {
    const query = bitbucketRepoSearch.trim().toLowerCase()
    if (!query) return bitbucketRepos
    return bitbucketRepos.filter((repo) => repo.name.toLowerCase().includes(query))
  }, [bitbucketRepoSearch, bitbucketRepos])
  const selectedBitbucketGroupSet = useMemo(() => new Set(selectedBitbucketGroups), [selectedBitbucketGroups])
  const selectedBitbucketRepoEntries = useMemo(
    () => Object.entries(selectedBitbucketRepos),
    [selectedBitbucketRepos]
  )

  useEffect(() => {
    if (jiraRuleScope === 'JIRA_BOARD' && selectedJiraBoards.length > 1) {
      setSelectedJiraBoards((prev) => (prev.length ? [prev[0]] : []))
    }
  }, [jiraRuleScope, selectedJiraBoards.length])

  if (!appId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">No app id provided.</p>
      </div>
    )
  }

  if (getApp.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (getApp.isError || !getApp.data) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-destructive">Failed to load integration.</p>
        <Button variant="outline" onClick={() => router.push('/integrations')}>
          Back to Applications
        </Button>
      </div>
    )
  }

  const app = getApp.data

  const effectiveEnabled = hasConnection && app.isEnabled
  const canCreateGoogleRule =
    selectedGoogleGroups.length > 0 &&
    (googleRuleScope === 'ALL' || Boolean(googleRuleValue.trim())) &&
    !createRule.isPending
  const canCreateBitbucketRule = (() => {
    const hasGroups = selectedBitbucketGroups.length > 0
    const hasRepos = Object.keys(selectedBitbucketRepos).length > 0
    const hasCondition = bitbucketRuleScope === 'ALL' || Boolean(bitbucketRuleValue.trim())
    return (hasGroups || hasRepos) && hasCondition && !createRule.isPending
  })()
  const canCreateJiraRule = (() => {
    const hasGroups = selectedJiraGroups.length > 0
    const hasBoards = selectedJiraBoards.length > 0
    const hasCondition =
      jiraRuleScope === 'ALL' ||
      jiraRuleScope === 'MANAGER' ||
      (jiraRuleScope === 'JIRA_BOARD' ? selectedJiraBoards.length === 1 : Boolean(jiraRuleValue.trim()))
    const missingRoles = selectedJiraBoards.some((boardId) => !jiraBoardRoleById[boardId])
    return (hasGroups || hasBoards) && hasCondition && !missingRoles && !createRule.isPending
  })()

  function toggleGoogleGroup(email: string) {
    setSelectedGoogleGroups((prev) => (
      prev.includes(email) ? prev.filter((g) => g !== email) : [...prev, email]
    ))
  }

  function toggleBitbucketGroup(slug: string) {
    setSelectedBitbucketGroups((prev) => (
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]
    ))
  }

  function toggleBitbucketRepo(repoSlug: string) {
    setSelectedBitbucketRepos((prev) => {
      const next = { ...prev }
      if (next[repoSlug]) {
        delete next[repoSlug]
      } else {
        next[repoSlug] = 'read'
      }
      return next
    })
  }

  function setBitbucketRepoPermission(repoSlug: string, permission: 'read' | 'write' | 'admin') {
    setSelectedBitbucketRepos((prev) => ({ ...prev, [repoSlug]: permission }))
  }

  function toggleJiraGroup(name: string) {
    setSelectedJiraGroups((prev) => (
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    ))
  }

  async function loadJiraRolesForBoard(boardId: string) {
    if (!appId) return
    const board = jiraBoardsById.get(boardId)
    const projectId = board?.projectId
    if (!projectId || jiraRolesByProjectId[projectId]) return
    const response = await utils.integration.listJiraProjectRoles.fetch({ appId, projectId })
    setJiraRolesByProjectId((prev) => ({
      ...prev,
      [projectId]: { roles: response.roles, error: response.error },
    }))
    if (response.roles.length > 0) {
      setJiraBoardRoleById((prev) => {
        if (prev[boardId]) return prev
        return { ...prev, [boardId]: response.roles[0].id }
      })
    }
  }

  function toggleJiraBoard(boardId: string) {
    setSelectedJiraBoards((prev) => {
      const isSingle = jiraRuleScope === 'JIRA_BOARD'
      const exists = prev.includes(boardId)
      const next = exists ? prev.filter((id) => id !== boardId) : isSingle ? [boardId] : [...prev, boardId]
      return next
    })
    void loadJiraRolesForBoard(boardId)
  }

  function selectAllJiraBoards() {
    const allIds = jiraBoards.map((board) => String(board.id))
    setSelectedJiraBoards(allIds)
    for (const id of allIds) {
      void loadJiraRolesForBoard(id)
    }
  }

  function clearJiraBoards() {
    setSelectedJiraBoards([])
  }

  function describeCondition(condition: Record<string, unknown>, boardName?: string) {
    if (!condition || typeof condition !== 'object' || Object.keys(condition).length === 0) {
      return 'All employees'
    }
    if (condition.jiraManager === true) return 'Managers'
    if (typeof condition.jiraBoardId === 'string') {
      return boardName ? `Jira board: ${boardName}` : 'Jira board'
    }
    if (typeof condition.department === 'string') return `Team: ${condition.department}`
    if (typeof condition.jobTitle === 'string') return `Role: ${condition.jobTitle}`
    return 'Custom rule'
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{app.name}</h1>
          <p className="text-sm text-muted-foreground">{app.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={effectiveEnabled}
            disabled={!hasConnection}
            onCheckedChange={(checked) => toggleApp.mutate({ appId, isEnabled: checked })}
          />
          <Link href="/integrations">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>Manage the connection for this application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {!hasConnection ? (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Not connected</span>
                  </>
                ) : connectionState === 'testing' ? (
                  <>
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    <span className="text-sm">Testing connection...</span>
                  </>
                ) : connectionState === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="text-sm">Connected</span>
                  </>
                ) : connectionState === 'disconnected' ? (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm">Configured (Disconnected)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Configured</span>
                  </>
                )}
              </div>
              {hasConnection && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConnectionState('testing')
                      setLastConnectionError(null)
                      testConnection.mutate(app.id)
                    }}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending ? 'Testing...' : 'Test Connection'}
                  </Button>
                  {primaryConnection ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteConnection.mutate(primaryConnection.id)}
                      disabled={deleteConnection.isPending}
                    >
                      Disconnect
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
            {connectionState === 'testing' && (
              <div className="px-3">
                <Progress value={testProgress} className="h-2" />
              </div>
            )}
            {connectionState === 'disconnected' && lastConnectionError ? (
              <p className="px-3 text-xs text-destructive">{lastConnectionError}</p>
            ) : null}

            {app.type === 'BITBUCKET' ? (
              <div className="rounded-lg border border-dashed p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Bitbucket connection</p>
                <p className="text-xs text-muted-foreground">
                  Configure Bitbucket credentials in Settings. Provisioning rules below use workspace groups and repositories.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/settings/applications/${app.id}`}>Open Settings</Link>
                </Button>
              </div>
            ) : (
              <>
                {app.type === 'PASSBOLT' ? (
                  <div className="rounded-lg border border-dashed p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">Passbolt connection</p>
                    <p className="text-xs text-muted-foreground">
                      Configure Passbolt API or CLI credentials in Settings. Webhook setup below remains a fallback option.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/settings/applications/${app.id}`}>Open Settings</Link>
                    </Button>
                  </div>
                ) : null}

                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {app.type === 'PASSBOLT' ? 'Webhook setup (fallback)' : 'Webhook setup (no-code)'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Provide URLs your system exposes to provision/deprovision access.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowWebhookSetup((prev) => !prev)}
                      >
                        {showWebhookSetup ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                  </div>

                  {showWebhookSetup && (
                    <>
                      <div className="grid gap-3">
                        <div className="grid gap-1">
                          <Label htmlFor="provisionUrl">Provision URL</Label>
                          <Input
                            id="provisionUrl"
                            value={provisionUrl}
                            onChange={(e) => setProvisionUrl(e.target.value)}
                            placeholder="https://your-api.com/hooks/provision"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="deprovisionUrl">Deprovision URL</Label>
                          <Input
                            id="deprovisionUrl"
                            value={deprovisionUrl}
                            onChange={(e) => setDeprovisionUrl(e.target.value)}
                            placeholder="https://your-api.com/hooks/deprovision"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="apiKey">API key (optional)</Label>
                          <Input
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Bearer token or shared secret"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="testUrl">Test URL (optional)</Label>
                          <Input
                            id="testUrl"
                            value={testUrl}
                            onChange={(e) => setTestUrl(e.target.value)}
                            placeholder="https://your-api.com/health"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setProvisionUrl('')
                            setDeprovisionUrl('')
                            setApiKey('')
                            setTestUrl('')
                          }}
                          disabled={createConnection.isPending || updateConnection.isPending}
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={() => {
                            const config: Record<string, unknown> = {
                              webhook: {
                                provisionUrl: provisionUrl.trim() || undefined,
                                deprovisionUrl: deprovisionUrl.trim() || undefined,
                                apiKey: apiKey.trim() || undefined,
                                testUrl: testUrl.trim() || undefined,
                              },
                            }
                            if (primaryConnection) {
                              updateConnection.mutate({ connectionId: primaryConnection.id, config })
                            } else {
                              createConnection.mutate({ appId: app.id, config })
                            }
                          }}
                          disabled={
                            (!provisionUrl.trim() && !deprovisionUrl.trim() && !testUrl.trim()) ||
                            createConnection.isPending ||
                            updateConnection.isPending
                          }
                        >
                          {primaryConnection ? 'Save' : 'Connect'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Provision/deprovision requests include employee details as JSON.
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="text-sm text-muted-foreground">
              <p>
                Active accounts:{' '}
                <span className="font-semibold text-foreground">{activeAccountsCount}</span>
              </p>
              <p>
                Provisioning rules:{' '}
                <span className="font-semibold text-foreground">{rulesCount}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provisioning Rules</CardTitle>
            <CardDescription>Rules that apply when provisioning this app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {app.type === 'GOOGLE_WORKSPACE' && (
              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Map employees to Google groups</p>
                  <p className="text-xs text-muted-foreground">
                    Map all employees, a team (department), or a role (job title) to one or more Google groups.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <Label>Who should be added</Label>
                    <Select value={googleRuleScope} onValueChange={(value) => setGoogleRuleScope(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All employees</SelectItem>
                        <SelectItem value="DEPARTMENT">Team (Department)</SelectItem>
                        <SelectItem value="JOB_TITLE">Role (Job title)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{googleRuleScope === 'ALL' ? 'Condition' : 'Match value'}</Label>
                    <Input
                      value={googleRuleScope === 'ALL' ? 'All employees' : googleRuleValue}
                      onChange={(e) => setGoogleRuleValue(e.target.value)}
                      disabled={googleRuleScope === 'ALL'}
                      placeholder={googleRuleScope === 'DEPARTMENT' ? 'e.g. Engineering' : 'e.g. Manager'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Google groups</Label>
                  <Input
                    value={googleGroupSearch}
                    onChange={(e) => setGoogleGroupSearch(e.target.value)}
                    placeholder="Search groups"
                  />
                  <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-2">
                    {googleGroupsQuery.isLoading && (
                      <p className="text-xs text-muted-foreground">Loading groups...</p>
                    )}
                    {googleGroupsQuery.data?.error && (
                      <p className="text-xs text-destructive">{googleGroupsQuery.data.error}</p>
                    )}
                    {!googleGroupsQuery.isLoading && !googleGroupsQuery.data?.error && filteredGoogleGroups.length === 0 && (
                      <p className="text-xs text-muted-foreground">No groups found.</p>
                    )}
                    {filteredGoogleGroups.map((group) => (
                      <label
                        key={group.email}
                        className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedGoogleGroupSet.has(group.email)}
                          onChange={() => toggleGoogleGroup(group.email)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{group.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Selected groups: <span className="font-semibold text-foreground">{selectedGoogleGroups.length}</span>
                  </p>
                  <Button
                    onClick={() => {
                      const trimmedValue = googleRuleValue.trim()
                      const condition =
                        googleRuleScope === 'ALL'
                          ? {}
                          : googleRuleScope === 'DEPARTMENT'
                            ? { department: trimmedValue }
                            : { jobTitle: trimmedValue }
                      const groupLabels = selectedGoogleGroups
                        .map((email) => googleGroups.find((group) => group.email === email)?.name || email)
                        .join(', ')
                      const scopeLabel =
                        googleRuleScope === 'ALL'
                          ? 'All employees'
                          : googleRuleScope === 'DEPARTMENT'
                            ? `Team: ${trimmedValue}`
                            : `Role: ${trimmedValue}`

                      createRule.mutate({
                        appId: app.id,
                        name: `${scopeLabel} -> ${groupLabels || 'Groups'}`,
                        description: `Add ${scopeLabel.toLowerCase()} to ${groupLabels || 'selected groups'}.`,
                        condition,
                        provisionData: { groups: selectedGoogleGroups },
                        priority: 0,
                        isActive: true,
                      })
                    }}
                    disabled={!canCreateGoogleRule}
                  >
                    Add rule
                  </Button>
                </div>
              </div>
            )}

            {app.type === 'BITBUCKET' && (
              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Map employees to Bitbucket access</p>
                  <p className="text-xs text-muted-foreground">
                    Assign workspace groups and repository permissions based on team or role.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <Label>Who should be added</Label>
                    <Select value={bitbucketRuleScope} onValueChange={(value) => setBitbucketRuleScope(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All employees</SelectItem>
                        <SelectItem value="DEPARTMENT">Team (Department)</SelectItem>
                        <SelectItem value="JOB_TITLE">Role (Job title)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{bitbucketRuleScope === 'ALL' ? 'Condition' : 'Match value'}</Label>
                    <Input
                      value={bitbucketRuleScope === 'ALL' ? 'All employees' : bitbucketRuleValue}
                      onChange={(e) => setBitbucketRuleValue(e.target.value)}
                      disabled={bitbucketRuleScope === 'ALL'}
                      placeholder={bitbucketRuleScope === 'DEPARTMENT' ? 'e.g. Engineering' : 'e.g. Manager'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Workspace groups</Label>
                  <Input
                    value={bitbucketGroupSearch}
                    onChange={(e) => setBitbucketGroupSearch(e.target.value)}
                    placeholder="Search groups"
                  />
                  <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-2">
                    {bitbucketOptionsQuery.isLoading && (
                      <p className="text-xs text-muted-foreground">Loading groups...</p>
                    )}
                    {bitbucketOptionsQuery.data?.error && (
                      <p className="text-xs text-destructive">{bitbucketOptionsQuery.data.error}</p>
                    )}
                    {!bitbucketOptionsQuery.isLoading &&
                      !bitbucketOptionsQuery.data?.error &&
                      filteredBitbucketGroups.length === 0 && (
                        <p className="text-xs text-muted-foreground">No groups found.</p>
                      )}
                    {filteredBitbucketGroups.map((group) => (
                      <label
                        key={group.slug}
                        className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedBitbucketGroupSet.has(group.slug)}
                          onChange={() => toggleBitbucketGroup(group.slug)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{group.slug}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Repositories</Label>
                  <Input
                    value={bitbucketRepoSearch}
                    onChange={(e) => setBitbucketRepoSearch(e.target.value)}
                    placeholder="Search repositories"
                  />
                  <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-2">
                    {bitbucketOptionsQuery.isLoading && (
                      <p className="text-xs text-muted-foreground">Loading repositories...</p>
                    )}
                    {bitbucketOptionsQuery.data?.error && (
                      <p className="text-xs text-destructive">{bitbucketOptionsQuery.data.error}</p>
                    )}
                    {!bitbucketOptionsQuery.isLoading &&
                      !bitbucketOptionsQuery.data?.error &&
                      filteredBitbucketRepos.length === 0 && (
                        <p className="text-xs text-muted-foreground">No repositories found.</p>
                      )}
                    {filteredBitbucketRepos.map((repo) => {
                      const selectedPermission = selectedBitbucketRepos[repo.slug]
                      return (
                        <div
                          key={repo.slug}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-muted"
                        >
                          <label className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={Boolean(selectedPermission)}
                              onChange={() => toggleBitbucketRepo(repo.slug)}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{repo.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{repo.slug}</p>
                            </div>
                          </label>
                          <Select
                            value={selectedPermission || 'read'}
                            onValueChange={(value) => setBitbucketRepoPermission(repo.slug, value as 'read' | 'write' | 'admin')}
                            disabled={!selectedPermission}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="read">Read</SelectItem>
                              <SelectItem value="write">Write</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Selected groups: <span className="font-semibold text-foreground">{selectedBitbucketGroups.length}</span>{' '}
                    · Repositories: <span className="font-semibold text-foreground">{selectedBitbucketRepoEntries.length}</span>
                  </p>
                  <Button
                    onClick={() => {
                      const trimmedValue = bitbucketRuleValue.trim()
                      const condition =
                        bitbucketRuleScope === 'ALL'
                          ? {}
                          : bitbucketRuleScope === 'DEPARTMENT'
                            ? { department: trimmedValue }
                            : { jobTitle: trimmedValue }
                      const groupLabels = selectedBitbucketGroups
                        .map((slug) => bitbucketGroups.find((group) => group.slug === slug)?.name || slug)
                        .join(', ')
                      const repoLabels = selectedBitbucketRepoEntries
                        .map(([slug]) => bitbucketRepos.find((repo) => repo.slug === slug)?.name || slug)
                        .join(', ')
                      const scopeLabel =
                        bitbucketRuleScope === 'ALL'
                          ? 'All employees'
                          : bitbucketRuleScope === 'DEPARTMENT'
                            ? `Team: ${trimmedValue}`
                            : `Role: ${trimmedValue}`

                      createRule.mutate({
                        appId: app.id,
                        name: `${scopeLabel} -> ${groupLabels || repoLabels || 'Bitbucket access'}`,
                        description: `Add ${scopeLabel.toLowerCase()} to ${groupLabels || repoLabels || 'selected Bitbucket access'}.`,
                        condition,
                        provisionData: {
                          groups: selectedBitbucketGroups,
                          repositories: selectedBitbucketRepoEntries.map(([repoSlug, permission]) => ({
                            repoSlug,
                            permission,
                          })),
                        },
                        priority: 0,
                        isActive: true,
                      })
                    }}
                    disabled={!canCreateBitbucketRule}
                  >
                    Add rule
                  </Button>
                </div>
              </div>
            )}

            {app.type === 'JIRA' && (
              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Map employees to Jira access</p>
                  <p className="text-xs text-muted-foreground">
                    Assign Jira groups and project roles based on team, role, or a Jira board selection.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <Label>Who should be added</Label>
                    <Select value={jiraRuleScope} onValueChange={(value) => setJiraRuleScope(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All employees</SelectItem>
                        <SelectItem value="DEPARTMENT">Team (Department)</SelectItem>
                        <SelectItem value="JOB_TITLE">Role (Job title)</SelectItem>
                        <SelectItem value="JIRA_BOARD">Selected Jira board</SelectItem>
                        <SelectItem value="MANAGER">Managers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {jiraRuleScope === 'DEPARTMENT' || jiraRuleScope === 'JOB_TITLE' ? (
                    <div className="space-y-2">
                      <Label>Match value</Label>
                      <Input
                        value={jiraRuleValue}
                        onChange={(e) => setJiraRuleValue(e.target.value)}
                        placeholder={jiraRuleScope === 'DEPARTMENT' ? 'e.g. Engineering' : 'e.g. Manager'}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Input value="Use board selection or manager toggle below." disabled />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Jira groups</Label>
                  <Input
                    value={jiraGroupSearch}
                    onChange={(e) => setJiraGroupSearch(e.target.value)}
                    placeholder="Search groups"
                  />
                  <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-2">
                    {jiraGroupsQuery.isLoading && (
                      <p className="text-xs text-muted-foreground">Loading groups...</p>
                    )}
                    {jiraGroupsQuery.data?.error && (
                      <p className="text-xs text-destructive">{jiraGroupsQuery.data.error}</p>
                    )}
                    {!jiraGroupsQuery.isLoading && !jiraGroupsQuery.data?.error && filteredJiraGroups.length === 0 && (
                      <p className="text-xs text-muted-foreground">No groups found.</p>
                    )}
                    {filteredJiraGroups.map((group) => (
                      <label
                        key={group.name}
                        className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedJiraGroupSet.has(group.name)}
                          onChange={() => toggleJiraGroup(group.name)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Boards and project roles</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={jiraBoardSearch}
                      onChange={(e) => setJiraBoardSearch(e.target.value)}
                      placeholder="Search boards"
                      className="min-w-[220px]"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={selectAllJiraBoards} disabled={jiraBoards.length === 0}>
                      Select all
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearJiraBoards}>
                      Clear
                    </Button>
                    {jiraRuleScope === 'JIRA_BOARD' ? (
                      <span className="text-xs text-muted-foreground">Select exactly one board.</span>
                    ) : null}
                  </div>
                  <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-2">
                    {jiraBoardsQuery.isLoading && (
                      <p className="text-xs text-muted-foreground">Loading boards...</p>
                    )}
                    {jiraBoardsQuery.data?.error && (
                      <p className="text-xs text-destructive">{jiraBoardsQuery.data.error}</p>
                    )}
                    {!jiraBoardsQuery.isLoading && !jiraBoardsQuery.data?.error && filteredJiraBoards.length === 0 && (
                      <p className="text-xs text-muted-foreground">No boards found.</p>
                    )}
                    {filteredJiraBoards.map((board) => {
                      const boardId = String(board.id)
                      return (
                        <label
                          key={boardId}
                          className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedJiraBoards.includes(boardId)}
                            onChange={() => toggleJiraBoard(boardId)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{board.name}</p>
                            {board.projectKey ? (
                              <p className="text-xs text-muted-foreground truncate">{board.projectKey}</p>
                            ) : null}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {selectedJiraBoardDetails.length > 0 && (
                  <div className="space-y-2">
                    <Label>Project roles (permission level)</Label>
                    <div className="space-y-3">
                      {selectedJiraBoardDetails.map((board) => {
                        const boardId = String(board.id)
                        const projectId = board.projectId
                        const roleInfo = projectId ? jiraRolesByProjectId[projectId] : undefined
                        const roles = roleInfo?.roles ?? []
                        return (
                          <div key={boardId} className="grid gap-2 rounded-md border border-border p-3">
                            <div className="text-sm font-medium text-foreground">{board.name}</div>
                            {!projectId ? (
                              <p className="text-xs text-muted-foreground">Project information not available for this board.</p>
                            ) : roleInfo?.error ? (
                              <p className="text-xs text-destructive">{roleInfo.error}</p>
                            ) : roles.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Loading roles...</p>
                            ) : (
                              <Select
                                value={jiraBoardRoleById[boardId] || ''}
                                onValueChange={(value) =>
                                  setJiraBoardRoleById((prev) => ({ ...prev, [boardId]: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Selected groups:{' '}
                    <span className="font-semibold text-foreground">{selectedJiraGroups.length}</span>{' '}
                    · Selected boards:{' '}
                    <span className="font-semibold text-foreground">{selectedJiraBoards.length}</span>
                  </p>
                  <Button
                    onClick={() => {
                      const trimmedValue = jiraRuleValue.trim()
                      const condition =
                        jiraRuleScope === 'ALL'
                          ? {}
                          : jiraRuleScope === 'DEPARTMENT'
                            ? { department: trimmedValue }
                            : jiraRuleScope === 'JOB_TITLE'
                              ? { jobTitle: trimmedValue }
                              : jiraRuleScope === 'JIRA_BOARD'
                                ? { jiraBoardId: selectedJiraBoards[0] }
                                : { jiraManager: true }

                      const selectedRoles = selectedJiraBoardDetails
                        .map((board) => {
                          const boardId = String(board.id)
                          const roleId = jiraBoardRoleById[boardId]
                          if (!roleId) return null
                          const projectId = board.projectId
                          if (!projectId) return null
                          const roleInfo = jiraRolesByProjectId[projectId]
                          const roleName = roleInfo?.roles.find((role) => role.id === roleId)?.name
                          return {
                            boardId,
                            boardName: board.name,
                            projectId,
                            projectKey: board.projectKey,
                            projectName: board.projectName,
                            roleId,
                            roleName,
                          }
                        })
                        .filter(Boolean) as Array<{
                        boardId: string
                        boardName: string
                        projectId: string
                        projectKey?: string
                        projectName?: string
                        roleId: string
                        roleName?: string
                      }>

                      const groupLabels = selectedJiraGroups.join(', ')
                      const roleLabels = (selectedRoles as Array<{ boardName: string; roleName?: string }>)
                        .map((role) => `${role.boardName}${role.roleName ? ` (${role.roleName})` : ''}`)
                        .join(', ')
                      const scopeLabel =
                        jiraRuleScope === 'ALL'
                          ? 'All employees'
                          : jiraRuleScope === 'DEPARTMENT'
                            ? `Team: ${trimmedValue}`
                            : jiraRuleScope === 'JOB_TITLE'
                              ? `Role: ${trimmedValue}`
                              : jiraRuleScope === 'JIRA_BOARD'
                                ? `Board: ${selectedJiraBoardDetails[0]?.name || 'Selected'}`
                                : 'Managers'

                      createRule.mutate({
                        appId: app.id,
                        name: `${scopeLabel} -> ${groupLabels || roleLabels || 'Jira access'}`,
                        description: `Add ${scopeLabel.toLowerCase()} to ${groupLabels || roleLabels || 'selected Jira access'}.`,
                        condition,
                        provisionData: {
                          groups: selectedJiraGroups,
                          projectRoles: selectedRoles,
                        },
                        priority: 0,
                        isActive: true,
                      })
                    }}
                    disabled={!canCreateJiraRule}
                  >
                    Add rule
                  </Button>
                </div>
              </div>
            )}

            {app.provisioningRules.length === 0 && (
              <p className="text-sm text-muted-foreground">No rules configured yet.</p>
            )}
            {app.provisioningRules.map((rule) => {
              const provisionData = (rule.provisionData ?? {}) as Record<string, unknown>
              const groups = Array.isArray(provisionData.groups)
                ? (provisionData.groups as string[])
                : []
              const repositories = Array.isArray(provisionData.repositories)
                ? (provisionData.repositories as Array<{ repoSlug: string; permission?: string }>)
                : []
              const projectRoles = Array.isArray(provisionData.projectRoles)
                ? (provisionData.projectRoles as Array<{ boardName?: string; roleName?: string }>)
                : []
              const condition = rule.condition as Record<string, unknown>
              const boardName =
                typeof condition.jiraBoardId === 'string'
                  ? jiraBoardsById.get(condition.jiraBoardId)?.name
                  : undefined
              return (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {describeCondition(condition, boardName)}
                      </p>
                      {groups.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {groups.map((group) => (
                            <span key={group} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80">
                              {group}
                            </span>
                          ))}
                        </div>
                      )}
                      {projectRoles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {projectRoles.map((role, index) => (
                            <span
                              key={`${role.boardName || 'board'}-${role.roleName || 'role'}-${index}`}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80"
                            >
                              {role.boardName || 'Board'}{role.roleName ? ` · ${role.roleName}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {repositories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {repositories.map((repo) => (
                            <span
                              key={`${repo.repoSlug}-${repo.permission || 'read'}`}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80"
                            >
                              {repo.repoSlug}{repo.permission ? ` · ${repo.permission}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRule.mutate(rule.id)}
                        disabled={deleteRule.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            <Link href="/integrations/rules">
              <Button variant="outline" className="w-full">
                Manage Rules
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
