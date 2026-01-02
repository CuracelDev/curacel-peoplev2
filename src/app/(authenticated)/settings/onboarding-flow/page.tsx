'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDown, ArrowUp, Plus, Trash2, RotateCcw, Pencil, FileSpreadsheet, RefreshCw, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, AlertCircle, Cloud, HardDrive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardDescription } from '@/components/ui/card'
import { useForm, Controller } from 'react-hook-form'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

type StepKind = 'MANUAL' | 'INTEGRATION'

type StepFormData = {
  kind: StepKind
  name: string
  description: string
  integrationAppId?: string
}

function inferKind(template: { type: string; appType: string | null; appId?: string | null }) {
  return template.type === 'AUTOMATED' && (template.appId || template.appType) ? 'INTEGRATION' : 'MANUAL'
}

export default function OnboardingFlowSettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Employee Onboarding Settings state
  const [sheetId, setSheetId] = useState('')
  const [sheetIdSaved, setSheetIdSaved] = useState(false)
  const [employeeTasksExpanded, setEmployeeTasksExpanded] = useState(true)
  const [peopleOpsTasksExpanded, setPeopleOpsTasksExpanded] = useState(true)

  const { data: templates, isLoading, refetch } = trpc.onboarding.getTaskTemplates.useQuery()

  // Employee tasks catalog
  const taskCatalogQuery = trpc.onboarding.getTaskCatalog.useQuery()
  const employeeTasks = taskCatalogQuery.data?.tasks ?? []
  const taskSections = taskCatalogQuery.data?.sections
  const taskSource = taskCatalogQuery.data?.source ?? 'static'
  const taskSyncError = taskCatalogQuery.data?.error
  const lastSynced = taskCatalogQuery.data?.lastSynced

  // Sync task catalog mutation
  const syncTaskCatalog = trpc.onboarding.syncTaskCatalog.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        taskCatalogQuery.refetch()
      }
    },
  })

  // Get onboarding settings (sheet ID)
  const settingsQuery = trpc.onboarding.getSettings.useQuery()
  const updateSettings = trpc.onboarding.updateSettings.useMutation({
    onSuccess: () => {
      setSheetIdSaved(true)
      setTimeout(() => setSheetIdSaved(false), 3000)
      settingsQuery.refetch()
    },
  })

  // Load sheet ID from settings
  useEffect(() => {
    if (settingsQuery.data?.sheetId) {
      setSheetId(settingsQuery.data.sheetId)
    }
  }, [settingsQuery.data?.sheetId])
  const appsQuery = trpc.integration.listApps.useQuery()
  const initApps = trpc.integration.initializeApps.useMutation({
    onSuccess: () => appsQuery.refetch(),
  })
  const initTriggered = useRef(false)

  useEffect(() => {
    if (appsQuery.isLoading || initApps.isPending || initTriggered.current) return
    const count = appsQuery.data?.length ?? 0
    if (count === 0) {
      initTriggered.current = true
      initApps.mutate()
    }
  }, [appsQuery.data, appsQuery.isLoading, initApps])

  const allApps = useMemo(
    () => (appsQuery.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [appsQuery.data]
  )

  const createTemplate = trpc.onboarding.createTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
      setIsDialogOpen(false)
      setEditingId(null)
      reset()
    },
  })

  const updateTemplate = trpc.onboarding.updateTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
      setIsDialogOpen(false)
      setEditingId(null)
      reset()
    },
  })

  const deleteTemplate = trpc.onboarding.deleteTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
    },
  })

  const moveTemplate = trpc.onboarding.moveTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
    },
  })

  const resetTemplates = trpc.onboarding.resetTaskTemplates.useMutation({
    onSuccess: async () => {
      await refetch()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StepFormData>({
    defaultValues: {
      kind: 'MANUAL',
      name: '',
      description: '',
    },
  })

  const kind = watch('kind')
  const selectedAppId = watch('integrationAppId')

  const openNew = () => {
    setEditingId(null)
    reset({ kind: 'MANUAL', name: '', description: '' })
    setIsDialogOpen(true)
  }

  const openEdit = (template: any) => {
    setEditingId(template.id)
    const stepKind = inferKind(template)
    setValue('kind', stepKind)
    setValue('name', template.name)
    setValue('description', template.description ?? '')
    const resolvedId =
      template.appId ||
      (template.appType ? allApps.find((a) => a.type === template.appType)?.id : undefined)
    setValue('integrationAppId', resolvedId)
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: StepFormData) => {
    if (data.kind === 'INTEGRATION' && !data.integrationAppId) return

    if (editingId) {
      await updateTemplate.mutateAsync({
        id: editingId,
        kind: data.kind,
        integrationAppId: data.kind === 'INTEGRATION' ? data.integrationAppId : undefined,
        name: data.name,
        description: data.description || null,
      })
      return
    }

    await createTemplate.mutateAsync({
      kind: data.kind,
      integrationAppId: data.kind === 'INTEGRATION' ? data.integrationAppId : undefined,
      name: data.name,
      description: data.description || undefined,
    })
  }

  const busy =
    createTemplate.isPending ||
    updateTemplate.isPending ||
    deleteTemplate.isPending ||
    moveTemplate.isPending ||
    resetTemplates.isPending

  const selectedApp = useMemo(() => (selectedAppId ? allApps.find((a) => a.id === selectedAppId) : undefined), [allApps, selectedAppId])

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Onboarding flow"
        description="Manage the default onboarding steps and their order."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => resetTemplates.mutate()}
              disabled={busy}
              title="Reset to defaults"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={openNew} disabled={busy}>
              <Plus className="mr-2 h-4 w-4" />
              Add step
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setPeopleOpsTasksExpanded(!peopleOpsTasksExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {peopleOpsTasksExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle>PeopleOps Tasks</CardTitle>
              <Badge variant="secondary">{templates?.length ?? 0} tasks</Badge>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetTemplates.mutate()}
                disabled={busy}
                title="Reset to defaults"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={openNew} disabled={busy}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Tasks that PeopleOps completes to onboard new employees
          </CardDescription>
        </CardHeader>
        {peopleOpsTasksExpanded && (
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="divide-y">
              {templates?.map((t, idx) => {
                const stepKind = inferKind(t)
                const isFirst = idx === 0
                const isLast = idx === (templates?.length ?? 0) - 1
                const appName = t.appId
                  ? allApps.find((a) => a.id === t.appId)?.name
                  : t.appType
                    ? allApps.find((a) => a.type === t.appType)?.name || t.appType
                    : null
                return (
                  <div key={t.id} className="px-3 py-2 flex items-center justify-between text-sm hover:bg-muted whitespace-nowrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-muted-foreground w-6">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <span className={`font-medium ${t.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {t.name}
                        </span>
                        {t.description && (
                          <span className="text-muted-foreground text-xs ml-2">{t.description}</span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          stepKind === 'INTEGRATION'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-muted/50 text-foreground border-border'
                        }
                      >
                        {stepKind === 'INTEGRATION'
                          ? appName || t.appType || 'App'
                          : 'Manual'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Switch
                        checked={Boolean(t.isActive)}
                        disabled={busy}
                        onCheckedChange={(checked) =>
                          updateTemplate.mutate({
                            id: t.id,
                            isActive: checked,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy || isFirst}
                        onClick={() => moveTemplate.mutate({ id: t.id, direction: 'UP' })}
                        title="Move up"
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy || isLast}
                        onClick={() => moveTemplate.mutate({ id: t.id, direction: 'DOWN' })}
                        title="Move down"
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => openEdit(t)}
                        title="Edit"
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          if (confirm('Delete this onboarding step?')) deleteTemplate.mutate(t.id)
                        }}
                        title="Delete"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {(!templates || templates.length === 0) && (
                <div className="p-6 text-center text-muted-foreground">
                  No onboarding steps yet. Click + to create one.
                </div>
              )}
            </div>
          )}
        </CardContent>
        )}
      </Card>

      {/* Employee Tasks Settings */}
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setEmployeeTasksExpanded(!employeeTasksExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {employeeTasksExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <FileSpreadsheet className="h-5 w-5 text-success" />
              <CardTitle>Employee Tasks</CardTitle>
              <Badge variant="secondary">{employeeTasks.length} tasks</Badge>
              {/* Source indicator */}
              {taskSource === 'sheet' ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                  <Cloud className="h-3 w-3" />
                  Google Sheet
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 gap-1">
                  <HardDrive className="h-3 w-3" />
                  Static
                </Badge>
              )}
            </div>
            {/* Sync button */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  syncTaskCatalog.mutate()
                }}
                disabled={syncTaskCatalog.isPending || taskCatalogQuery.isRefetching}
                title="Sync tasks from Google Sheet"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${(syncTaskCatalog.isPending || taskCatalogQuery.isRefetching) ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            </div>
          </div>
          <CardDescription>
            Tasks employees complete during onboarding (tracked via Google Sheet)
          </CardDescription>
          {/* Show sync status/errors */}
          {taskSyncError && (
            <div className="flex items-center gap-2 text-sm text-amber-600 mt-2">
              <AlertCircle className="h-4 w-4" />
              <span>{taskSyncError}</span>
            </div>
          )}
          {syncTaskCatalog.data && !syncTaskCatalog.data.success && syncTaskCatalog.data.error && (
            <div className="flex items-center gap-2 text-sm text-amber-600 mt-2">
              <AlertCircle className="h-4 w-4" />
              <span>{syncTaskCatalog.data.error}</span>
            </div>
          )}
          {syncTaskCatalog.data?.success && (
            <div className="flex items-center gap-2 text-sm text-success mt-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Synced {syncTaskCatalog.data.taskCount} tasks from Google Sheet</span>
            </div>
          )}
        </CardHeader>
        {employeeTasksExpanded && (
        <CardContent className="space-y-6">
          {/* Google Sheet Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="sheetId" className="text-sm font-medium">
                Google Sheet ID
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="sheetId"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="e.g. 1O2HGf186pgHLVpuZ1nMnI7OkJTEpIRxpT8dn8fJP_No"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => updateSettings.mutate({ sheetId: sheetId || null })}
                  disabled={updateSettings.isPending}
                >
                  {updateSettings.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : sheetIdSaved ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The ID from the Google Sheet URL (between /d/ and /edit)
              </p>
            </div>

            {settingsQuery.data?.sheetId && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-success">Sheet configured</span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${settingsQuery.data.sheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  Open Sheet <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Sheet structure instructions */}
            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-sm mb-2">Expected Sheet Structure</h4>
              <p className="text-xs text-muted-foreground mb-3">
                To sync tasks from Google Sheet, create a tab named <code className="bg-muted px-1 rounded">Task Catalog</code> with these columns:
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 px-2 font-medium">A: ID</th>
                      <th className="text-left py-1 px-2 font-medium">B: Section</th>
                      <th className="text-left py-1 px-2 font-medium">C: Title</th>
                      <th className="text-left py-1 px-2 font-medium">D: URL</th>
                      <th className="text-left py-1 px-2 font-medium">E: Notes</th>
                      <th className="text-left py-1 px-2 font-medium">F: Conditional</th>
                      <th className="text-left py-1 px-2 font-medium">G: Conditional Label</th>
                      <th className="text-left py-1 px-2 font-medium">H: Applies To</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr>
                      <td className="py-1 px-2">task_001</td>
                      <td className="py-1 px-2">todo</td>
                      <td className="py-1 px-2">Fill Biodata</td>
                      <td className="py-1 px-2">https://...</td>
                      <td className="py-1 px-2">Make a copy</td>
                      <td className="py-1 px-2">false</td>
                      <td className="py-1 px-2"></td>
                      <td className="py-1 px-2">all</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Section:</strong> todo, to_read, or to_watch | <strong>Applies To:</strong> all, full_time, or contract
              </p>
            </div>
          </div>

          {/* Employee Tasks Catalog */}
          <div className="border-t pt-6">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setEmployeeTasksExpanded(!employeeTasksExpanded)}
            >
              <div className="flex items-center gap-2">
                {employeeTasksExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">Employee Tasks Catalog</span>
                <Badge variant="secondary">{employeeTasks.length} tasks</Badge>
              </div>
            </button>

            {employeeTasksExpanded && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tasks that employees complete during their onboarding. Task completion is tracked via Google Sheet.
                </p>

                {taskSections && (
                  <div className="space-y-4">
                    {/* To Do Section */}
                    <div className="border rounded-lg">
                      <div className="p-3 bg-orange-50 border-b flex items-center gap-2">
                        <span className="font-medium text-orange-800">
                          {taskSections.todo.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {employeeTasks.filter((t) => t.section === 'todo').length} tasks
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {employeeTasks
                          .filter((t) => t.section === 'todo')
                          .map((task) => (
                            <div key={task.id} className="p-3 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium">{task.title}</span>
                                {task.isConditional && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {task.conditionalLabel}
                                  </Badge>
                                )}
                              </div>
                              {task.url && (
                                <a
                                  href={task.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* To Read Section */}
                    <div className="border rounded-lg">
                      <div className="p-3 bg-blue-50 border-b flex items-center gap-2">
                        <span className="font-medium text-blue-800">
                          {taskSections.to_read.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {employeeTasks.filter((t) => t.section === 'to_read').length} tasks
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {employeeTasks
                          .filter((t) => t.section === 'to_read')
                          .map((task) => (
                            <div key={task.id} className="p-3 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium">{task.title}</span>
                                {task.isConditional && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {task.conditionalLabel}
                                  </Badge>
                                )}
                              </div>
                              {task.url && (
                                <a
                                  href={task.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* To Watch Section */}
                    <div className="border rounded-lg">
                      <div className="p-3 bg-purple-50 border-b flex items-center gap-2">
                        <span className="font-medium text-purple-800">
                          {taskSections.to_watch.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {employeeTasks.filter((t) => t.section === 'to_watch').length} tasks
                        </Badge>
                      </div>
                      <div className="divide-y">
                        {employeeTasks
                          .filter((t) => t.section === 'to_watch')
                          .map((task) => (
                            <div key={task.id} className="p-3 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium">{task.title}</span>
                                {task.isConditional && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {task.conditionalLabel}
                                  </Badge>
                                )}
                              </div>
                              {task.url && (
                                <a
                                  href={task.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit step' : 'Add step'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update this onboarding step.'
                : 'Add a step to the default onboarding flow.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label className="text-sm font-medium">App step</Label>
              <Controller
                name="kind"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v as StepKind)
                      if (v === 'MANUAL') setValue('integrationAppId', undefined)
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual step</SelectItem>
                      <SelectItem value="INTEGRATION">App step</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {kind === 'INTEGRATION' && (
              <div>
                <Label className="text-sm font-medium">App</Label>
                {allApps.length === 0 ? (
                  <div className="mt-2 text-sm text-foreground/80">
                    No apps found. Initialize apps in{' '}
                    <Link className="text-blue-600 hover:underline" href="/integrations">
                      Applications
                    </Link>.
                  </div>
                ) : (
                  <Controller
                    name="integrationAppId"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          const appId = v as string
                          field.onChange(appId)
                          if (!editingId) {
                            const appName = allApps.find((a) => a.id === appId)?.name ?? 'this app'
                            const recommended = `Provision ${appName} access`
                            const currentName = (watch('name') || '').trim()
                            if (!currentName) setValue('name', recommended)
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select an app" />
                        </SelectTrigger>
                        <SelectContent>
                          {allApps.map((app) => (
                            <SelectItem key={app.id} value={app.id} disabled={!app.isEnabled}>
                              {app.name}
                              {app.connections.length > 0 ? ' (connected)' : ' (not connected)'}
                              {!app.isEnabled ? ' (disabled)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {errors.integrationAppId && (
                  <p className="text-sm text-red-500 mt-1">Select an integration app.</p>
                )}
                {selectedApp && selectedApp.connections.length === 0 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    This app is not connected yet; the step will fail until it’s connected in{' '}
                    <Link className="text-blue-600 hover:underline" href="/integrations">
                      Applications
                    </Link>.
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                className="mt-1"
                placeholder="e.g. Confirm laptop/hardware has been ordered"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                className="mt-1"
                placeholder="Optional details/instructions for this step."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  (kind === 'INTEGRATION' && !selectedAppId)
                }
              >
                {editingId ? 'Save' : 'Add step'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
