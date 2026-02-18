'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ChevronDown, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type JobCandidateStage =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'HR_SCREEN'
  | 'TEAM_CHAT'
  | 'ADVISOR_CHAT'
  | 'TECHNICAL'
  | 'PANEL'
  | 'TRIAL'
  | 'CEO_CHAT'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ARCHIVED'

interface StageInfo {
  value: JobCandidateStage
  label: string
  isTerminal?: boolean // HIRED, REJECTED, WITHDRAWN, ARCHIVED cannot be moved from
}

const ALL_STAGES: StageInfo[] = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'HR_SCREEN', label: 'HR Screen' },
  { value: 'TEAM_CHAT', label: 'Team Chat' },
  { value: 'ADVISOR_CHAT', label: 'Advisor Chat' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'PANEL', label: 'Panel' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'CEO_CHAT', label: 'CEO Chat' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'HIRED', label: 'Hired', isTerminal: true },
  { value: 'REJECTED', label: 'Rejected', isTerminal: true },
  { value: 'WITHDRAWN', label: 'Withdrawn', isTerminal: true },
  { value: 'ARCHIVED', label: 'Archived', isTerminal: true },
]

const STAGE_ALIASES: Record<string, JobCandidateStage> = {
  SHORTLISTED: 'SHORTLISTED',
  SHORTLISTEDCANDIDATES: 'SHORTLISTED',
  SHORTLISTEDCANDIDATE: 'SHORTLISTED',
  SHORTLISTEDSTAGE: 'SHORTLISTED',
  SHORTLISTEDCANDIDATESSTAGE: 'SHORTLISTED',
  SHORTLISTEDCANDIDATESTAGE: 'SHORTLISTED',
  SHORTLISTEDSTAGES: 'SHORTLISTED',
  SHORTLISTEDCANDIDATESSTAGES: 'SHORTLISTED',
  SHORTLISTEDCANDIDATESTAGES: 'SHORTLISTED',
  SHORTLIST: 'SHORTLISTED',
  SHORTLISTEDCANDIDATESPOOL: 'SHORTLISTED',
  SHORTLISTEDCANDIDATEPOOL: 'SHORTLISTED',
  SHORTLISTEDPOOL: 'SHORTLISTED',
  SHORTLISTEDCANDIDATEPOOLSTAGE: 'SHORTLISTED',
  SHORTLISTEDCANDIDATESPOOLSTAGE: 'SHORTLISTED',
  SHORTLISTEDPOOLSTAGE: 'SHORTLISTED',
  SHORTLISTEDCANDIDATEPOOLSTAGES: 'SHORTLISTED',
  SHORTLISTEDCANDIDATESPOOLSTAGES: 'SHORTLISTED',
  SHORTLISTEDPOOLSTAGES: 'SHORTLISTED',
  PEOPLECHAT: 'HR_SCREEN',
  HRSCREEN: 'HR_SCREEN',
  CODINGTEST: 'TECHNICAL',
  TECHTEST: 'TECHNICAL',
  TEAMCHAT: 'TEAM_CHAT',
  ADVISORCHAT: 'ADVISOR_CHAT',
  CEOCHAT: 'CEO_CHAT',
}

const normalizeStageKey = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]+/g, '')

interface StageDropdownProps {
  currentStage: JobCandidateStage
  hiringFlowStages?: string[] | null // Stages from job hiring flow
  jobId?: string
  allowBackwardMovement?: boolean
  onStageChange: (stage: JobCandidateStage, skipAutoEmail: boolean, templateId?: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function StageDropdown({
  currentStage,
  hiringFlowStages,
  jobId,
  allowBackwardMovement = false,
  onStageChange,
  disabled = false,
  className,
}: StageDropdownProps) {
  const [loading, setLoading] = useState(false)
  const [skipAutoEmail, setSkipAutoEmail] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('auto')
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
  })

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    stage: JobCandidateStage
    stageLabel: string
  } | null>(null)

  const { data: templates, isLoading: loadingTemplates, refetch: refetchTemplates } = trpc.candidateEmail.listTemplates.useQuery(
    {
      stage: confirmDialog?.stage,
      jobId: jobId
    },
    {
      enabled: !!confirmDialog?.stage && !skipAutoEmail
    }
  )

  const createTemplate = trpc.candidateEmail.createTemplate.useMutation()

  // Reset template selection when dialog opens or templates load
  /* useEffect(() => {
    if (templates?.length) {
      const defaultTemplate = templates.find(t => t.isDefault)
      setSelectedTemplateId(defaultTemplate?.id || 'auto')
    } else {
      setSelectedTemplateId('auto')
    }
  }, [templates, confirmDialog?.open]) */

  // Get the current stage index in the standard progression
  const currentStageIndex = ALL_STAGES.findIndex((s) => s.value === currentStage)
  const currentStageInfo = ALL_STAGES[currentStageIndex]

  // Don't allow moving from terminal stages
  if (currentStageInfo?.isTerminal) {
    return null
  }

  // Build list of available stages
  const getAvailableStages = (): StageInfo[] => {
    // If hiring flow stages are specified, use them as the order
    if (hiringFlowStages && hiringFlowStages.length > 0) {
      // Map hiring flow stages to stage info
      const flowStageValues = hiringFlowStages
        .map((flowStage) => {
          const normalized = normalizeStageKey(flowStage)
          const alias = STAGE_ALIASES[normalized]
          const stage =
            (alias ? ALL_STAGES.find((s) => s.value === alias) : null) ||
            ALL_STAGES.find(
              (s) =>
                normalizeStageKey(s.value) === normalized ||
                normalizeStageKey(s.label) === normalized
            )
          return stage
        })
        .filter((s): s is StageInfo => s !== undefined)

      if (flowStageValues.length === 0) {
        return allowBackwardMovement
          ? ALL_STAGES.filter((s) => s.value !== currentStage)
          : ALL_STAGES.filter((s, index) => index > currentStageIndex)
      }

      // Add terminal stages at the end
      const terminalStages = ALL_STAGES.filter((s) => s.isTerminal)
      const allAvailableStages = [...flowStageValues, ...terminalStages]

      const currentIndex = allAvailableStages.findIndex((s) => s.value === currentStage)

      if (allowBackwardMovement) {
        // Can move to any stage except current
        return allAvailableStages.filter((s) => s.value !== currentStage)
      } else {
        // Can only move forward
        return allAvailableStages.filter((s, index) => index > currentIndex)
      }
    }

    // Fallback to standard progression if no hiring flow
    if (allowBackwardMovement) {
      // Can move to any stage except current and terminal stages
      return ALL_STAGES.filter((s) => s.value !== currentStage && !s.isTerminal).concat(
        ALL_STAGES.filter((s) => s.isTerminal)
      )
    } else {
      // Can only move forward in standard progression
      return ALL_STAGES.filter((s, index) => index > currentStageIndex)
    }
  }

  const availableStages = getAvailableStages()

  if (availableStages.length === 0) {
    return null
  }

  const handleStageClick = (stage: JobCandidateStage, stageLabel: string) => {
    setConfirmDialog({ open: true, stage, stageLabel })
    setSkipAutoEmail(false)
  }

  const handleConfirm = async () => {
    if (!confirmDialog) return

    setLoading(true)
    try {
      let templateIdToUse = selectedTemplateId === 'auto' ? undefined : selectedTemplateId

      if (isCreatingTemplate && !skipAutoEmail) {
        if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
          throw new Error('Please fill in all template fields')
        }

        const created = await createTemplate.mutateAsync({
          name: newTemplate.name,
          slug: newTemplate.name.toLowerCase().replace(/\s+/g, '-'),
          category: 'stage_transition',
          stage: confirmDialog?.stage,
          jobId: jobId || undefined,
          subject: newTemplate.subject,
          htmlBody: newTemplate.body,
        })
        templateIdToUse = created.id
      }

      await onStageChange(confirmDialog.stage, skipAutoEmail, templateIdToUse)
      setConfirmDialog(null)
      setIsCreatingTemplate(false)
      setNewTemplate({ name: '', subject: '', body: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            className={className}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Moving...
              </>
            ) : (
              <>
                Move to Stage
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {availableStages.map((stage, index) => {
            // Add separator before terminal stages
            const prevStage = availableStages[index - 1]
            const showSeparator =
              index > 0 && stage.isTerminal && !prevStage?.isTerminal

            return (
              <div key={stage.value}>
                {showSeparator && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => handleStageClick(stage.value, stage.label)}
                >
                  {stage.label}
                </DropdownMenuItem>
              </div>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmDialog?.open ?? false}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to {confirmDialog?.stageLabel}?</DialogTitle>
            <DialogDescription>
              This will move the candidate from{' '}
              <strong>{currentStageInfo?.label}</strong> to{' '}
              <strong>{confirmDialog?.stageLabel}</strong>.
              {!skipAutoEmail && (
                <span className="block mt-2">
                  An automated email will be sent to the candidate based on your
                  email settings for this stage.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="skip-email"
              checked={skipAutoEmail}
              onCheckedChange={(checked) => setSkipAutoEmail(checked === true)}
            />
            <Label
              htmlFor="skip-email"
              className="text-sm font-normal cursor-pointer"
            >
              Skip automated email notification
            </Label>
          </div>

          {!skipAutoEmail && (
            <div className="space-y-4 pt-4 border-t mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Email Template</Label>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}
                >
                  {isCreatingTemplate ? 'Cancel' : '+ Create New'}
                </Button>
              </div>

              {!isCreatingTemplate ? (
                <div className="space-y-2">
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                    disabled={loadingTemplates || loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Default (Auto-select)
                      </SelectItem>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.isDefault && '(Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {selectedTemplateId === 'auto'
                      ? "Changes happen automatically based on your stage settings."
                      : "Override the default email for this stage."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Template Name</Label>
                    <Input
                      placeholder="e.g. Reject after Technical Interview"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Email Subject</Label>
                    <Input
                      placeholder="Next steps with Curacel"
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Message Body</Label>
                    <Textarea
                      placeholder="Hi {{candidate.name}}, ..."
                      value={newTemplate.body}
                      onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                      className="min-h-[120px] text-sm py-2"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Use <code className="bg-muted px-1 rounded">{"{{candidate.name}}"}</code> to personalize.
                      Logo and footer will be added automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
