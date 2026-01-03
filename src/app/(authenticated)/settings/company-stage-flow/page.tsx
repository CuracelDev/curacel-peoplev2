'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Plus, ChevronUp, ChevronDown, Trash2, RotateCcw, Check, ArrowRight } from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/lib/trpc-client'
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

export default function CompanyStageFlowPage() {
  const flowsQuery = trpc.companyStageFlow.list.useQuery()
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null)
  const [editedFlow, setEditedFlow] = useState<{
    name: string
    description: string
    stages: string[]
  } | null>(null)
  const [flowSaved, setFlowSaved] = useState(false)
  const [showFlowMappingDialog, setShowFlowMappingDialog] = useState(false)
  const [stageMapping, setStageMapping] = useState<Record<string, string | null>>({})
  const [originalStages, setOriginalStages] = useState<string[]>([])

  const updateFlowMutation = trpc.companyStageFlow.update.useMutation({
    onSuccess: () => {
      flowsQuery.refetch()
      setFlowSaved(true)
      setTimeout(() => setFlowSaved(false), 2000)
    },
  })

  const createFlowMutation = trpc.companyStageFlow.create.useMutation({
    onSuccess: () => {
      flowsQuery.refetch()
    },
  })

  // Set first flow as active when data loads
  useEffect(() => {
    if (!activeFlowId && flowsQuery.data && flowsQuery.data.length > 0) {
      setActiveFlowId(flowsQuery.data[0].id)
    }
  }, [flowsQuery.data, activeFlowId])

  const activeFlow = flowsQuery.data?.find((f) => f.id === activeFlowId)

  // Initialize editedFlow when activeFlow changes
  useEffect(() => {
    if (activeFlow && !editedFlow) {
      setEditedFlow({
        name: activeFlow.name,
        description: activeFlow.description || '',
        stages: [...activeFlow.stages],
      })
      setOriginalStages([...activeFlow.stages])
    }
  }, [activeFlowId, flowsQuery.data, editedFlow])

  const updateEditedFlow = (updates: Partial<typeof editedFlow>) => {
    if (!editedFlow) return
    setEditedFlow({ ...editedFlow, ...updates })
  }

  const updateStage = (index: number, value: string) => {
    if (!editedFlow) return
    const nextStages = editedFlow.stages.map((stage, i) =>
      i === index ? value : stage
    )
    updateEditedFlow({ stages: nextStages })
  }

  const addStage = () => {
    if (!editedFlow) return
    updateEditedFlow({ stages: [...editedFlow.stages, 'New Stage'] })
  }

  const removeStage = (index: number) => {
    if (!editedFlow || editedFlow.stages.length <= 1) return
    const nextStages = editedFlow.stages.filter((_, i) => i !== index)
    updateEditedFlow({ stages: nextStages })
  }

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (!editedFlow) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= editedFlow.stages.length) return
    const nextStages = [...editedFlow.stages]
    const temp = nextStages[index]
    nextStages[index] = nextStages[newIndex]
    nextStages[newIndex] = temp
    updateEditedFlow({ stages: nextStages })
  }

  const handleSaveFlows = async () => {
    if (!activeFlowId || !editedFlow) return

    // Check if stages have changed
    const stagesChanged = JSON.stringify(editedFlow.stages) !== JSON.stringify(originalStages)
    const hasEmployeesToMigrate = activeFlow && activeFlow.totalEmployees > 0 && stagesChanged

    if (hasEmployeesToMigrate) {
      // Show mapping dialog
      const initialMapping: Record<string, string | null> = {}
      for (const stage of originalStages) {
        initialMapping[stage] = editedFlow.stages.includes(stage) ? stage : null
      }
      setStageMapping(initialMapping)
      setShowFlowMappingDialog(true)
    } else {
      // No migration needed, save directly
      updateFlowMutation.mutate({
        id: activeFlowId,
        name: editedFlow.name,
        description: editedFlow.description || null,
        stages: editedFlow.stages,
      })
    }
  }

  const handleConfirmStageMapping = () => {
    if (!activeFlowId || !editedFlow) return
    updateFlowMutation.mutate({
      id: activeFlowId,
      name: editedFlow.name,
      description: editedFlow.description || null,
      stages: editedFlow.stages,
      stageMapping,
    })
  }

  const handleResetFlow = () => {
    if (!activeFlow) return
    setEditedFlow({
      name: activeFlow.name,
      description: activeFlow.description || '',
      stages: [...activeFlow.stages],
    })
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Company Stage Process"
        description="Define employee lifecycle stages from application to alumni. These stages power employee progression tracking, analytics, and AI insights."
        icon={<GitBranch className="h-5 w-5" />}
      />

      <Card>
        <CardHeader className="p-5 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Employee Lifecycle Stages</h2>
              <p className="text-sm text-muted-foreground">
                Edit the employee journey stages. Changes apply to employee detail pages, analytics, and progression tracking.
              </p>
            </div>
            <Button onClick={handleSaveFlows} disabled={updateFlowMutation.isPending} variant={flowSaved ? 'outline' : 'default'} className={flowSaved ? 'bg-success/10 text-success border-success/30' : ''}>
              {flowSaved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Flow tabs */}
          {flowsQuery.data && flowsQuery.data.length > 0 && (
            <Tabs value={activeFlowId ?? ''} onValueChange={setActiveFlowId} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${flowsQuery.data.length}, minmax(0, 1fr))` }}>
                {flowsQuery.data.map((flow) => (
                  <TabsTrigger key={flow.id} value={flow.id} className="relative">
                    {flow.name}
                    {flow.isDefault && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Default
                      </Badge>
                    )}
                    {flow.totalEmployees > 0 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {flow.totalEmployees} employees
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {!flowsQuery.data || flowsQuery.data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No company stage flows found. Create your first flow to get started.
            </div>
          ) : null}

          {activeFlow && editedFlow && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Flow Name</Label>
                  <Input
                    value={editedFlow.name}
                    onChange={(e) => updateEditedFlow({ name: e.target.value })}
                    placeholder="e.g., Standard, Executive, Contractor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editedFlow.description}
                    onChange={(e) => updateEditedFlow({ description: e.target.value })}
                    placeholder="Brief description of this flow"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lifecycle Stages</Label>
                  <Button variant="outline" size="sm" onClick={addStage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editedFlow?.stages ?? []).map((stage, index) => (
                    <div key={`${activeFlowId}-stage-${index}`} className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveStage(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveStage(index, 'down')}
                          disabled={index === (editedFlow?.stages.length ?? 0) - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="w-8 text-center text-sm text-muted-foreground">
                        {index + 1}
                      </div>
                      <Input
                        value={stage}
                        onChange={(e) => updateStage(index, e.target.value)}
                        placeholder="Stage name"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStage(index)}
                        disabled={(editedFlow?.stages.length ?? 0) <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Preview</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(editedFlow?.stages ?? []).map((stage, idx) => (
                    <Badge key={`preview-${idx}-${stage}`} variant="secondary">
                      {stage}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleResetFlow}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to saved
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage Mapping Dialog */}
      <Dialog open={showFlowMappingDialog} onOpenChange={setShowFlowMappingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Map Existing Stages</DialogTitle>
            <DialogDescription>
              {activeFlow?.totalEmployees} employee(s) are using this flow. Map old stages to new stages to migrate employees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-sm font-medium text-muted-foreground">
              <div>Old Stage</div>
              <div></div>
              <div>New Stage</div>
            </div>
            {originalStages.map((oldStage) => (
              <div key={oldStage} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <div className="px-3 py-2 bg-muted rounded-md text-sm">{oldStage}</div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={stageMapping[oldStage] ?? 'unmapped'}
                  onValueChange={(value) =>
                    setStageMapping((prev) => ({
                      ...prev,
                      [oldStage]: value === 'unmapped' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unmapped">
                      <span className="text-muted-foreground">Keep as legacy</span>
                    </SelectItem>
                    {(editedFlow?.stages ?? []).map((newStage) => (
                      <SelectItem key={newStage} value={newStage}>
                        {newStage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {editedFlow && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>New stages added:</strong>{' '}
                {editedFlow.stages
                  .filter((s) => !originalStages.includes(s))
                  .join(', ') || 'None'}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlowMappingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStageMapping}>
              Confirm & Migrate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
