'use client'

import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  XCircle,
  SkipForward,
  RefreshCw,
  User,
  Cloud,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Video,
  ClipboardList,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo, type ReactNode } from 'react'
import { formatDate, taskStatusColors, cn } from '@/lib/utils'
import type { OnboardingTask } from '@/lib/onboarding-tasks'

function EmployeeTaskItem({
  task,
  taskStatus,
}: {
  task: OnboardingTask
  taskStatus?: 'not_started' | 'in_progress' | 'completed'
}) {
  const statusLabel = taskStatus
    ? taskStatus === 'completed'
      ? 'Completed'
      : taskStatus === 'in_progress'
        ? 'In Progress'
        : 'Not Started'
    : 'Not tracked yet'

  const statusColor = taskStatus
    ? taskStatus === 'completed'
      ? 'bg-success/10 text-success-foreground'
      : taskStatus === 'in_progress'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-muted text-foreground/80'
    : 'bg-yellow-50 text-yellow-700'

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {task.url ? (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {task.title}
              <ExternalLink className="inline-block ml-1 h-3 w-3" />
            </a>
          ) : (
            <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
          )}
          {task.isConditional && (
            <Badge variant="outline" className="text-xs shrink-0">
              {task.conditionalLabel || 'Conditional'}
            </Badge>
          )}
        </div>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.notes}</p>
        )}
      </div>
      <Badge className={cn('ml-2 shrink-0', statusColor)}>{statusLabel}</Badge>
    </div>
  )
}

function EmployeeTaskSection({
  title,
  icon,
  tasks,
  taskProgress,
}: {
  title: string
  icon: ReactNode
  tasks: OnboardingTask[]
  taskProgress: Map<string, 'not_started' | 'in_progress' | 'completed'>
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="border rounded-lg">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {icon}
          <span className="font-medium text-foreground">{title}</span>
          <Badge variant="secondary" className="text-xs">
            {tasks.length} tasks
          </Badge>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t">
          {tasks.map((task) => (
            <EmployeeTaskItem
              key={task.id}
              task={task}
              taskStatus={taskProgress.get(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OnboardingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.id as string
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [skipReason, setSkipReason] = useState('')
  const [sendByodAgreement, setSendByodAgreement] = useState(false)
  const [peopleOpsTasksExpanded, setPeopleOpsTasksExpanded] = useState(true)
  const [employeeTasksExpanded, setEmployeeTasksExpanded] = useState(true)

  const { data: workflow, isLoading, refetch } = trpc.onboarding.getById.useQuery(workflowId)
  const { data: apps } = trpc.integration.listApps.useQuery()
  const taskCatalogQuery = trpc.onboarding.getTaskCatalog.useQuery()
  const bitbucketApp = apps?.find((app) => app.type === 'BITBUCKET')
  const { data: bitbucketRules } = trpc.integration.listRules.useQuery(bitbucketApp?.id, {
    enabled: Boolean(bitbucketApp?.id),
  })
  const { data: bitbucketOptions } = trpc.integration.listBitbucketOptions.useQuery(bitbucketApp?.id ?? '', {
    enabled: Boolean(bitbucketApp?.id),
  })
  const employeeSheetQuery = trpc.onboarding.getEmployeeSheetData.useQuery(
    {
      fullName: workflow?.employee?.fullName || undefined,
      email: workflow?.employee?.workEmail || workflow?.employee?.personalEmail || undefined,
    },
    { enabled: Boolean(workflow?.employee) }
  )
  
  const runTask = trpc.onboarding.runAutomatedTask.useMutation({
    onSuccess: () => refetch(),
  })
  
  const completeTask = trpc.onboarding.completeManualTask.useMutation({
    onSuccess: () => refetch(),
  })
  
  const skipTask = trpc.onboarding.skipTask.useMutation({
    onSuccess: () => {
      setSkipDialogOpen(false)
      setSkipReason('')
      setSendByodAgreement(false)
      refetch()
    },
  })

  // Check if the selected task is a device-related task (must be before early returns)
  const selectedTask = workflow?.tasks.find((t: { id: string }) => t.id === selectedTaskId)
  const isDeviceTask = useMemo(() => {
    if (!selectedTask) return false
    const name = (selectedTask as { name: string }).name.toLowerCase()
    return name.includes('laptop') || name.includes('hardware') || name.includes('device') || name.includes('ship')
  }, [selectedTask])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workflow not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  const completedPeopleOpsTasks = workflow.tasks.filter(
    (t) => t.status === 'SUCCESS' || t.status === 'SKIPPED'
  ).length
  const peopleOpsProgress = workflow.tasks.length > 0
    ? Math.round((completedPeopleOpsTasks / workflow.tasks.length) * 100)
    : 0

  const employeeTasks = taskCatalogQuery.data?.tasks ?? []
  const taskSections = taskCatalogQuery.data?.sections
  const tasksBySection = {
    todo: employeeTasks.filter((t) => t.section === 'todo'),
    toRead: employeeTasks.filter((t) => t.section === 'to_read'),
    toWatch: employeeTasks.filter((t) => t.section === 'to_watch'),
  }
  const employeeTaskProgress = new Map<string, 'not_started' | 'in_progress' | 'completed'>()
  const employeeSheetData = employeeSheetQuery.data?.data
  const employeeTasksProgress = employeeSheetData?.completionPercent ?? 0
  const employeeTasksLastUpdated = employeeSheetData?.lastUpdated

  const progressParts: number[] = []
  if (workflow.tasks.length > 0) progressParts.push(peopleOpsProgress)
  if (employeeTasks.length > 0) progressParts.push(employeeTasksProgress)
  const overallProgress = progressParts.length
    ? Math.round(progressParts.reduce((sum, value) => sum + value, 0) / progressParts.length)
    : 0

  const getTaskIcon = (task: typeof workflow.tasks[0]) => {
    if (task.automationType?.includes('google')) {
      return <Cloud className="h-5 w-5 text-blue-500" />
    }
    if (task.automationType?.includes('slack')) {
      return <MessageSquare className="h-5 w-5 text-purple-500" />
    }
    return <User className="h-5 w-5 text-muted-foreground" />
  }

  const appIdByType = (() => {
    const map = new Map<string, string>()
    for (const a of apps ?? []) map.set(a.type, a.id)
    return map
  })()

  const getSettingsAppLink = (task: typeof workflow.tasks[0]) => {
    const cfg = (task.automationConfig as any) ?? {}
    const appId: string | undefined = cfg.appId
    if (typeof appId === 'string' && appId) return `/settings/applications/${appId}`

    const appTypeFromCfg: string | undefined = cfg.appType
    if (typeof appTypeFromCfg === 'string' && appTypeFromCfg) {
      const mapped = appIdByType.get(appTypeFromCfg)
      if (mapped) return `/settings/applications/${mapped}`
    }

    if (task.automationType?.includes('google')) {
      const mapped = appIdByType.get('GOOGLE_WORKSPACE')
      if (mapped) return `/settings/applications/${mapped}`
    }

    if (task.automationType?.includes('slack')) {
      const mapped = appIdByType.get('SLACK')
      if (mapped) return `/settings/applications/${mapped}`
    }

    return null
  }

  const isMissingConnection = (task: typeof workflow.tasks[0]) => {
    const msg = (task.statusMessage || '').toLowerCase()
    return msg.includes('no active connection') || msg.includes('not connected') || msg.includes('application not connected')
  }

  const isBitbucketTask = (task: typeof workflow.tasks[0]) => {
    const cfg = (task.automationConfig as any) ?? {}
    if (task.automationType?.includes('bitbucket')) return true
    if (cfg.appType === 'BITBUCKET') return true
    if (cfg.appId && bitbucketApp?.id && cfg.appId === bitbucketApp.id) return true
    return false
  }

  const renderBitbucketRules = () => {
    if (!bitbucketApp) {
      return <span className="text-sm text-muted-foreground">Bitbucket app not initialized.</span>
    }
    if (!bitbucketRules || bitbucketRules.length === 0) {
      return (
        <span className="text-sm text-destructive">
          No Bitbucket provisioning rules found. Add rules with groups or repositories + permissions.
        </span>
      )
    }

    return (
      <div className="space-y-2">
        {bitbucketRules.map((rule) => {
          const provisionData = (rule.provisionData as any) ?? {}
          const groups = Array.isArray(provisionData.groups) ? provisionData.groups : []
          const repos = Array.isArray(provisionData.repositories) ? provisionData.repositories : []
          return (
            <div key={rule.id} className="rounded-md border border-border bg-muted/50 p-2">
              <div className="text-xs text-foreground/80">
                {rule.name} · Priority {rule.priority} · {rule.isActive ? 'Active' : 'Inactive'}
              </div>
              {groups.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {groups.map((group: string, idx: number) => (
                    <span key={`${group}-${idx}`} className="text-xs text-foreground">
                      {group}
                    </span>
                  ))}
                </div>
              ) : null}
              {repos.length > 0 ? (
                <div className={`mt-1 flex flex-wrap gap-2 ${groups.length ? 'pt-1' : ''}`}>
                  {repos.map((repo: any, idx: number) => (
                    <span key={`${repo.repoSlug ?? 'repo'}-${idx}`} className="text-xs text-foreground">
                      {repo.repoSlug || 'Unknown repo'} — {repo.permission || 'read'}
                    </span>
                  ))}
                </div>
              ) : null}
              {groups.length === 0 && repos.length === 0 ? (
                <div className="mt-1 text-xs text-muted-foreground">No groups or repositories configured in this rule.</div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  const renderBitbucketOptions = () => {
    if (!bitbucketApp) {
      return <span className="text-xs text-muted-foreground">Bitbucket app not initialized.</span>
    }
    if (!bitbucketOptions) {
      return <span className="text-xs text-muted-foreground">Loading Bitbucket teams...</span>
    }
    if (bitbucketOptions.error) {
      return <span className="text-xs text-destructive">{bitbucketOptions.error}</span>
    }

    const groups = Array.isArray(bitbucketOptions.groups) ? bitbucketOptions.groups : []
    const repositories = Array.isArray(bitbucketOptions.repositories) ? bitbucketOptions.repositories : []
    const maxItems = 8

    return (
      <div className="space-y-2">
        <div>
          <p className="text-xs text-foreground/80">Teams</p>
          {groups.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {groups.slice(0, maxItems).map((group: any) => {
                const label = group.name && group.slug && group.name !== group.slug
                  ? `${group.name} (${group.slug})`
                  : (group.name || group.slug)
                return (
                  <span key={group.slug || label} className="text-xs text-foreground">
                    {label}
                  </span>
                )
              })}
              {groups.length > maxItems && (
                <span className="text-xs text-muted-foreground">+{groups.length - maxItems} more</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">No teams found in this workspace.</div>
          )}
        </div>
        <div>
          <p className="text-xs text-foreground/80">Repositories</p>
          {repositories.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {repositories.slice(0, maxItems).map((repo: any) => {
                const label = repo.name && repo.slug && repo.name !== repo.slug
                  ? `${repo.name} (${repo.slug})`
                  : (repo.name || repo.slug)
                return (
                  <span key={repo.slug || label} className="text-xs text-foreground">
                    {label}
                  </span>
                )
              })}
              {repositories.length > maxItems && (
                <span className="text-xs text-muted-foreground">+{repositories.length - maxItems} more</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">No repositories found in this workspace.</div>
          )}
        </div>
      </div>
    )
  }

  const handleSkipTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setSendByodAgreement(false)
    setSkipDialogOpen(true)
  }

  const confirmSkipTask = () => {
    if (selectedTaskId && skipReason) {
      skipTask.mutate({
        taskId: selectedTaskId,
        reason: skipReason,
        sendByodAgreement: isDeviceTask ? sendByodAgreement : undefined,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            Onboarding: {workflow.employee.fullName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {workflow.employee.jobTitle} • {workflow.employee.department}
          </p>
        </div>
        <Badge className={
          workflow.status === 'COMPLETED' ? 'bg-success/10 text-success-foreground' :
          workflow.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
          workflow.status === 'FAILED' ? 'bg-destructive/10 text-destructive-foreground' :
          'bg-muted text-foreground'
        }>
          {workflow.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className="text-sm font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                PeopleOps: {peopleOpsProgress}% • Employee: {employeeTasksProgress}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {workflow.employee.startDate ? formatDate(workflow.employee.startDate) : 'TBD'}
              </p>
            </div>
            <Link href={`/employees/${workflow.employee.id}`}>
              <Button variant="outline" size="sm">
                View Employee
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* PeopleOps Tasks */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none py-4"
          onClick={() => setPeopleOpsTasksExpanded(!peopleOpsTasksExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {peopleOpsTasksExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <ClipboardList className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">PeopleOps Tasks</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {workflow.tasks.length} tasks
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  'font-medium',
                  peopleOpsProgress === 100
                    ? 'text-success'
                    : peopleOpsProgress > 0
                      ? 'text-blue-600'
                      : 'text-muted-foreground'
                )}
              >
                {peopleOpsProgress}%
              </span>
            </div>
          </div>
          <CardDescription>Complete these tasks to finish onboarding</CardDescription>
        </CardHeader>
        {peopleOpsTasksExpanded && (
          <CardContent className="pt-0">
            <div className="border rounded-lg divide-y">
              {workflow.tasks.map((task) => {
                const taskAppType = task.automationType?.includes('google')
                  ? 'GOOGLE_WORKSPACE'
                  : task.automationType?.includes('slack')
                    ? 'SLACK'
                    : (task.automationConfig as any)?.appType
                const provisionedAccount = workflow.employee.appAccounts?.find(
                  (acc) => acc.app.type === taskAppType
                )

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'px-2 py-2',
                      task.status === 'SUCCESS' && 'bg-success/10',
                      task.status === 'FAILED' && 'bg-destructive/10',
                      task.status === 'IN_PROGRESS' && 'bg-blue-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="mt-0.5">{getTaskIcon(task)}</div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground truncate block">{task.name}</span>
                          {task.status === 'SUCCESS' && provisionedAccount && (
                            <span className="text-xs text-success truncate block">
                              {provisionedAccount.externalEmail || provisionedAccount.externalUsername}
                            </span>
                          )}
                          {task.statusMessage && task.status !== 'SUCCESS' && (
                            <span
                              className={cn(
                                'text-xs truncate block',
                                task.status === 'FAILED' ? 'text-destructive' : 'text-muted-foreground'
                              )}
                            >
                              {task.statusMessage}
                            </span>
                          )}
                          {isBitbucketTask(task) && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-foreground/80">Bitbucket provisioning rules</p>
                              <div className="mt-1">{renderBitbucketRules()}</div>
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-foreground/80">
                                  Bitbucket teams and repositories
                                </p>
                                <div className="mt-1">{renderBitbucketOptions()}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {task.type}
                        </Badge>
                        {task.status === 'SUCCESS' && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {task.status === 'FAILED' && <XCircle className="h-4 w-4 text-destructive" />}
                        {task.status === 'IN_PROGRESS' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                        {task.status === 'SKIPPED' && <SkipForward className="h-4 w-4 text-muted-foreground" />}
                        {task.status === 'PENDING' && (
                          <>
                            {task.type === 'AUTOMATED' ? (
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  runTask.mutate({ taskId: task.id })
                                }}
                                disabled={runTask.isPending}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Run
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  completeTask.mutate({ taskId: task.id })
                                }}
                                disabled={completeTask.isPending}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Complete
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSkipTask(task.id)
                              }}
                            >
                              <SkipForward className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {task.status === 'FAILED' && task.type === 'AUTOMATED' && (
                          <>
                            {isMissingConnection(task) && getSettingsAppLink(task) ? (
                              <Link href={getSettingsAppLink(task)!} onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline" className="h-7 text-xs">
                                  Connect
                                </Button>
                              </Link>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                runTask.mutate({ taskId: task.id })
                              }}
                              disabled={runTask.isPending}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Retry
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSkipTask(task.id)
                              }}
                            >
                              <SkipForward className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Employee Tasks */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none py-4"
          onClick={() => setEmployeeTasksExpanded(!employeeTasksExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {employeeTasksExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">{workflow.employee.fullName} Tasks</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {employeeTasks.length} tasks
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {employeeTasksLastUpdated && (
                <span className="text-muted-foreground">Updated: {employeeTasksLastUpdated}</span>
              )}
              <span
                className={cn(
                  'font-medium',
                  employeeTasksProgress === 100
                    ? 'text-success'
                    : employeeTasksProgress > 0
                      ? 'text-blue-600'
                      : 'text-muted-foreground'
                )}
              >
                {employeeTasksProgress}%
              </span>
            </div>
          </div>
          <CardDescription>Personal onboarding tasks for the employee to complete</CardDescription>
        </CardHeader>
        {employeeTasksExpanded && (
          <CardContent>
            <div className="space-y-4">
              {!employeeSheetData && !employeeSheetQuery.isLoading && (
                <p className="text-sm text-yellow-600">
                  Employee not found in Google Sheet. Make sure the sheet has this employee&apos;s data.{' '}
                  <button onClick={() => employeeSheetQuery.refetch()} className="text-blue-600 hover:underline">
                    Refresh
                  </button>
                </p>
              )}
              {employeeSheetData && (
                <div className="flex justify-end">
                  <button
                    onClick={() => employeeSheetQuery.refetch()}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    disabled={employeeSheetQuery.isFetching}
                  >
                    <RefreshCw className={cn('h-3 w-3', employeeSheetQuery.isFetching && 'animate-spin')} />
                    Refresh
                  </button>
                </div>
              )}
              <div className="space-y-3">
                <EmployeeTaskSection
                  title={taskSections?.todo.title || 'To Do'}
                  icon={<ClipboardList className="h-4 w-4 text-orange-500" />}
                  tasks={tasksBySection.todo}
                  taskProgress={employeeTaskProgress}
                />
                <EmployeeTaskSection
                  title={taskSections?.to_read.title || 'To Read'}
                  icon={<FileText className="h-4 w-4 text-blue-500" />}
                  tasks={tasksBySection.toRead}
                  taskProgress={employeeTaskProgress}
                />
                <EmployeeTaskSection
                  title={taskSections?.to_watch.title || 'To Watch'}
                  icon={<Video className="h-4 w-4 text-purple-500" />}
                  tasks={tasksBySection.toWatch}
                  taskProgress={employeeTaskProgress}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* App Accounts */}
      {workflow.employee.appAccounts && workflow.employee.appAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provisioned Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {workflow.employee.appAccounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {account.app.type === 'GOOGLE_WORKSPACE' ? (
                    <Cloud className="h-6 w-6 text-blue-500" />
                  ) : (
                    <MessageSquare className="h-6 w-6 text-purple-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{account.app.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {account.externalEmail || account.externalUsername || 'Pending'}
                    </p>
                  </div>
                  <Badge className={taskStatusColors[account.status]}>
                    {account.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Task</DialogTitle>
            <DialogDescription>
              Please provide a reason for skipping this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Reason for skipping..."
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
            />
            {isDeviceTask && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="byod-toggle" className="text-sm font-medium text-foreground">
                      Send BYOD Agreement
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Employee will use their own device - send BYOD undertaking form for signature
                    </p>
                  </div>
                  <Switch
                    id="byod-toggle"
                    checked={sendByodAgreement}
                    onCheckedChange={setSendByodAgreement}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSkipTask} disabled={!skipReason || skipTask.isPending}>
              {skipTask.isPending ? 'Skipping...' : 'Skip Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
