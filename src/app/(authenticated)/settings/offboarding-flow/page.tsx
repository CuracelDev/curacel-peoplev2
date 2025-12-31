'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  RotateCcw,
  Pencil,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  User,
} from 'lucide-react'
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

export default function OffboardingFlowSettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [peopleOpsTasksExpanded, setPeopleOpsTasksExpanded] = useState(true)
  const [employeeTasksExpanded, setEmployeeTasksExpanded] = useState(true)
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false)
  const [employeeEditingId, setEmployeeEditingId] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState('')
  const [employeeDescription, setEmployeeDescription] = useState('')

  const { data: templates, isLoading, refetch } = trpc.offboarding.getTaskTemplates.useQuery()
  const employeeTasksQuery = trpc.offboarding.getEmployeeTasks.useQuery()
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

  const createTemplate = trpc.offboarding.createTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
      setIsDialogOpen(false)
      setEditingId(null)
      reset()
    },
  })

  const updateTemplate = trpc.offboarding.updateTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
      setIsDialogOpen(false)
      setEditingId(null)
      reset()
    },
  })

  const deleteTemplate = trpc.offboarding.deleteTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
    },
  })

  const moveTemplate = trpc.offboarding.moveTaskTemplate.useMutation({
    onSuccess: async () => {
      await refetch()
    },
  })

  const resetTemplates = trpc.offboarding.resetTaskTemplates.useMutation({
    onSuccess: async () => {
      await refetch()
    },
  })

  const createEmployeeTask = trpc.offboarding.createEmployeeTask.useMutation({
    onSuccess: async () => {
      await employeeTasksQuery.refetch()
      setEmployeeDialogOpen(false)
      setEmployeeEditingId(null)
      setEmployeeName('')
      setEmployeeDescription('')
    },
  })

  const updateEmployeeTask = trpc.offboarding.updateEmployeeTask.useMutation({
    onSuccess: async () => {
      await employeeTasksQuery.refetch()
      setEmployeeDialogOpen(false)
      setEmployeeEditingId(null)
      setEmployeeName('')
      setEmployeeDescription('')
    },
  })

  const deleteEmployeeTask = trpc.offboarding.deleteEmployeeTask.useMutation({
    onSuccess: async () => {
      await employeeTasksQuery.refetch()
    },
  })

  const moveEmployeeTask = trpc.offboarding.moveEmployeeTask.useMutation({
    onSuccess: async () => {
      await employeeTasksQuery.refetch()
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
  const selectedApp = useMemo(() => (selectedAppId ? allApps.find((a) => a.id === selectedAppId) : undefined), [allApps, selectedAppId])
  const employeeTasks = employeeTasksQuery.data ?? []
  const activeEmployeeTasks = employeeTasks.filter((task) => task.isActive).length
  const employeeTasksProgress = employeeTasks.length > 0
    ? Math.round((activeEmployeeTasks / employeeTasks.length) * 100)
    : 0
  const activeTemplates = templates?.filter((task) => task.isActive).length ?? 0
  const peopleOpsProgress = templates && templates.length > 0
    ? Math.round((activeTemplates / templates.length) * 100)
    : 0
  const peopleOpsProgressClass =
    peopleOpsProgress === 100 ? 'text-green-600' : peopleOpsProgress > 0 ? 'text-blue-600' : 'text-muted-foreground'
  const employeeTasksProgressClass =
    employeeTasksProgress === 100 ? 'text-green-600' : employeeTasksProgress > 0 ? 'text-blue-600' : 'text-muted-foreground'

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

  const closeEmployeeDialog = () => {
    setEmployeeDialogOpen(false)
    setEmployeeEditingId(null)
    setEmployeeName('')
    setEmployeeDescription('')
  }

  const openNewEmployeeTask = () => {
    setEmployeeEditingId(null)
    setEmployeeName('')
    setEmployeeDescription('')
    setEmployeeDialogOpen(true)
  }

  const openEditEmployeeTask = (task: any) => {
    setEmployeeEditingId(task.id)
    setEmployeeName(task.name || '')
    setEmployeeDescription(task.description || '')
    setEmployeeDialogOpen(true)
  }

  const submitEmployeeTask = async () => {
    const name = employeeName.trim()
    const description = employeeDescription.trim()
    if (!name) return

    if (employeeEditingId) {
      await updateEmployeeTask.mutateAsync({
        id: employeeEditingId,
        name,
        description: description ? description : null,
      })
      return
    }

    await createEmployeeTask.mutateAsync({
      name,
      description: description ? description : undefined,
    })
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

  const employeeBusy =
    createEmployeeTask.isPending ||
    updateEmployeeTask.isPending ||
    deleteEmployeeTask.isPending ||
    moveEmployeeTask.isPending

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Offboarding flow"
        description="Manage the default offboarding steps and their order."
        actions={
          <>
            <Button variant="outline" onClick={() => resetTemplates.mutate()} disabled={busy} title="Reset to defaults">
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
              <ClipboardList className="h-5 w-5 text-orange-500" />
              <CardTitle>PeopleOps Tasks</CardTitle>
              <Badge variant="secondary">{templates?.length ?? 0} tasks</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
              <span className={`font-medium ${peopleOpsProgressClass}`}>{peopleOpsProgress}%</span>
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
            Tasks that PeopleOps completes to offboard employees
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
                  const typeLabel = stepKind === 'INTEGRATION' ? appName || t.appType || 'App' : 'Manual'
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
                          {typeLabel}
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
                            if (confirm('Delete this offboarding step?')) deleteTemplate.mutate(t.id)
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
                    No offboarding steps yet. Click + to create one.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setEmployeeTasksExpanded(!employeeTasksExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {employeeTasksExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Employee Tasks</CardTitle>
              <Badge variant="secondary">{employeeTasks.length} tasks</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
              <span className={`font-medium ${employeeTasksProgressClass}`}>{employeeTasksProgress}%</span>
              <Button size="sm" onClick={openNewEmployeeTask} disabled={employeeBusy}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Tasks employees complete during offboarding
          </CardDescription>
        </CardHeader>
        {employeeTasksExpanded && (
          <CardContent className="p-0">
            {employeeTasksQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="divide-y">
                {employeeTasks.map((task, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === employeeTasks.length - 1
                  return (
                    <div key={task.id} className="px-3 py-2 flex items-center justify-between text-sm hover:bg-muted whitespace-nowrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-muted-foreground w-6">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <span className={`font-medium ${task.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                            {task.name}
                          </span>
                          {task.description && (
                            <span className="text-muted-foreground text-xs ml-2 truncate">{task.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Switch
                          checked={Boolean(task.isActive)}
                          disabled={employeeBusy}
                          onCheckedChange={(checked) =>
                            updateEmployeeTask.mutate({
                              id: task.id,
                              isActive: checked,
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={employeeBusy || isFirst}
                          onClick={() => moveEmployeeTask.mutate({ id: task.id, direction: 'UP' })}
                          title="Move up"
                          className="h-8 w-8 p-0"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={employeeBusy || isLast}
                          onClick={() => moveEmployeeTask.mutate({ id: task.id, direction: 'DOWN' })}
                          title="Move down"
                          className="h-8 w-8 p-0"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={employeeBusy}
                          onClick={() => openEditEmployeeTask(task)}
                          title="Edit"
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={employeeBusy}
                          onClick={() => {
                            if (confirm('Delete this employee task?')) deleteEmployeeTask.mutate(task.id)
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
                {employeeTasks.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground">
                    No employee tasks yet. Click + to add one.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit step' : 'Add step'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update this offboarding step.' : 'Add a step to the default offboarding flow.'}
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
                            const recommended = `Deprovision ${appName} access`
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
                {errors.integrationAppId && <p className="text-sm text-red-500 mt-1">Select an integration app.</p>}
                {selectedApp && selectedApp.connections.length === 0 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    This app is not connected yet; the step may not fully deprovision access until it’s connected in{' '}
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
                placeholder="e.g. Collect company equipment"
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || (kind === 'INTEGRATION' && !selectedAppId)}>
                {editingId ? 'Save' : 'Add step'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={employeeDialogOpen}
        onOpenChange={(open) => (open ? setEmployeeDialogOpen(true) : closeEmployeeDialog())}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{employeeEditingId ? 'Edit task' : 'Add task'}</DialogTitle>
            <DialogDescription>
              {employeeEditingId ? 'Update this employee task.' : 'Add a task for offboarding employees.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Task name</Label>
              <Input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. Handover Docs"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={employeeDescription}
                onChange={(e) => setEmployeeDescription(e.target.value)}
                placeholder="Optional details/instructions for this task."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEmployeeDialog} disabled={employeeBusy}>
              Cancel
            </Button>
            <Button onClick={submitEmployeeTask} disabled={!employeeName.trim() || employeeBusy}>
              {employeeBusy ? 'Saving...' : employeeEditingId ? 'Save task' : 'Add task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
