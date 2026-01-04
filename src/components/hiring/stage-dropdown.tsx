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

interface StageDropdownProps {
  currentStage: JobCandidateStage
  hiringFlowStages?: string[] | null // Stages from job hiring flow
  allowBackwardMovement?: boolean
  onStageChange: (stage: JobCandidateStage, skipAutoEmail: boolean) => Promise<void>
  disabled?: boolean
  className?: string
}

export function StageDropdown({
  currentStage,
  hiringFlowStages,
  allowBackwardMovement = false,
  onStageChange,
  disabled = false,
  className,
}: StageDropdownProps) {
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    stage: JobCandidateStage
    stageLabel: string
  } | null>(null)
  const [skipAutoEmail, setSkipAutoEmail] = useState(false)

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
          // Normalize flow stage name to enum value
          const normalized = flowStage.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
          // Find matching stage
          const stage = ALL_STAGES.find((s) => s.value === normalized || s.label === flowStage)
          return stage
        })
        .filter((s): s is StageInfo => s !== undefined)

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
      await onStageChange(confirmDialog.stage, skipAutoEmail)
      setConfirmDialog(null)
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
