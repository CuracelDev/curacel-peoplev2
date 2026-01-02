'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Loader2, Mail, Clock, Bell, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'

const STAGES = [
  { value: 'APPLIED', label: 'Applied', description: 'When candidate applies for the job' },
  { value: 'HR_SCREEN', label: 'People Chat', description: 'Initial HR screening stage' },
  { value: 'TECHNICAL', label: 'Technical Assessment', description: 'Technical evaluation stage' },
  { value: 'TEAM_CHAT', label: 'Team Chat', description: 'Team interview stage' },
  { value: 'ADVISOR_CHAT', label: 'Advisor Chat', description: 'Advisor meeting stage' },
  { value: 'PANEL', label: 'Panel Interview', description: 'Panel evaluation stage' },
  { value: 'TRIAL', label: 'Trial', description: 'Trial period stage' },
  { value: 'CEO_CHAT', label: 'CEO Chat', description: 'CEO meeting stage' },
  { value: 'OFFER', label: 'Offer', description: 'Offer extended stage' },
  { value: 'REJECTED', label: 'Rejected', description: 'Rejection notification' },
]

type StageConfig = {
  enabled: boolean
  delayMinutes: number
  templateId?: string
  reminderEnabled?: boolean
  reminderDelayHours?: number
}

export function AutoSendStageSettings() {
  const [stageConfigs, setStageConfigs] = useState<Record<string, StageConfig>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  const { data: emailSettings, isLoading } = trpc.emailSettings.get.useQuery()
  const { data: templates } = trpc.candidateEmail.listTemplates.useQuery({
    category: 'stage_notification',
  })
  const updateSettings = trpc.emailSettings.updateAutoSendStages.useMutation()

  useEffect(() => {
    if (emailSettings?.autoSendStages) {
      setStageConfigs(emailSettings.autoSendStages as Record<string, StageConfig>)
    }
  }, [emailSettings])

  const handleStageConfigChange = (
    stage: string,
    field: keyof StageConfig,
    value: boolean | number | string | undefined
  ) => {
    setStageConfigs((prev) => ({
      ...prev,
      [stage]: {
        ...(prev[stage] || { enabled: false, delayMinutes: 0 }),
        [field]: value,
      },
    }))
  }

  const toggleStageExpanded = (stage: string) => {
    setExpandedStages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stage)) {
        newSet.delete(stage)
      } else {
        newSet.add(stage)
      }
      return newSet
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings.mutateAsync({ autoSendStages: stageConfigs })
      toast.success('Auto-send settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const enabledCount = Object.values(stageConfigs).filter((c) => c?.enabled).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Auto-Send Email Settings
        </CardTitle>
        <CardDescription>
          Configure automatic email sending when candidates move between stages.{' '}
          {enabledCount > 0 && (
            <span className="text-primary font-medium">
              {enabledCount} stage{enabledCount !== 1 ? 's' : ''} enabled
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAGES.map((stage) => {
          const config = stageConfigs[stage.value] || {
            enabled: false,
            delayMinutes: 0,
            reminderEnabled: false,
            reminderDelayHours: 72,
          }
          const isExpanded = expandedStages.has(stage.value)

          return (
            <Collapsible
              key={stage.value}
              open={isExpanded && config.enabled}
              onOpenChange={() => config.enabled && toggleStageExpanded(stage.value)}
            >
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {config.enabled ? (
                      <CollapsibleTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                    ) : (
                      <div className="w-6" />
                    )}
                    <div>
                      <Label className="text-sm font-medium">{stage.label}</Label>
                      <p className="text-xs text-muted-foreground">{stage.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {config.enabled && config.delayMinutes > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {config.delayMinutes} min delay
                      </span>
                    )}
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        handleStageConfigChange(stage.value, 'enabled', checked)
                      }
                    />
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3" />
                          Delay before sending (minutes)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={1440}
                          value={config.delayMinutes}
                          onChange={(e) =>
                            handleStageConfigChange(
                              stage.value,
                              'delayMinutes',
                              parseInt(e.target.value) || 0
                            )
                          }
                          placeholder="0 (immediate)"
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                          0 = immediate, up to 1440 (24 hours)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs">
                          <Mail className="h-3 w-3" />
                          Email Template
                        </Label>
                        <Select
                          value={config.templateId || 'default'}
                          onValueChange={(value) =>
                            handleStageConfigChange(
                              stage.value,
                              'templateId',
                              value === 'default' ? undefined : value
                            )
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Use default template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Use default for stage</SelectItem>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label className="text-sm">Follow-up reminders</Label>
                          <p className="text-xs text-muted-foreground">
                            Auto-send reminder if no response
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={config.reminderEnabled || false}
                        onCheckedChange={(checked) =>
                          handleStageConfigChange(stage.value, 'reminderEnabled', checked)
                        }
                      />
                    </div>

                    {config.reminderEnabled && (
                      <div className="space-y-2 pl-6">
                        <Label className="text-xs">Send reminder after (hours)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={168}
                          value={config.reminderDelayHours || 72}
                          onChange={(e) =>
                            handleStageConfigChange(
                              stage.value,
                              'reminderDelayHours',
                              parseInt(e.target.value) || 72
                            )
                          }
                          className="h-9 w-32"
                        />
                        <p className="text-xs text-muted-foreground">
                          1-168 hours (1 hour to 7 days)
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
