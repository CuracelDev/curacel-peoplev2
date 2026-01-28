'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/lib/trpc-client'
import { Sparkles, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Outcome {
  name: string
  description: string
  successCriteria: string[]
}

interface CreateScorecardDialogProps {
  jobDescriptionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: { mission: string; outcomes: Outcome[] }
  onSave: (data: { mission: string; outcomes: Outcome[] }) => void
}

export function CreateScorecardDialog({
  jobDescriptionId,
  open,
  onOpenChange,
  initialData,
  onSave,
}: CreateScorecardDialogProps) {
  const [mission, setMission] = useState('')
  const [outcomes, setOutcomes] = useState<Outcome[]>([
    { name: '', description: '', successCriteria: [''] },
  ])

  useEffect(() => {
    if (initialData) {
      setMission(initialData.mission)
      setOutcomes(initialData.outcomes)
    } else if (open) {
      setMission('')
      setOutcomes([{ name: '', description: '', successCriteria: [''] }])
    }
  }, [initialData, open])

  const generateFromJD = trpc.scorecard.generateFromJD.useMutation({
    onSuccess: (data) => {
      setMission(data.mission)
      setOutcomes(data.outcomes)
      toast.success('Scorecard generated! Review and edit as needed.')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate scorecard')
    },
  })

  const handleSave = () => {
    if (!mission.trim()) {
      toast.error('Mission statement is required')
      return
    }

    const validOutcomes = outcomes.filter(
      (o) => o.name.trim() && o.description.trim() && o.successCriteria.some((c) => c.trim())
    )

    if (validOutcomes.length === 0) {
      toast.error('At least one outcome with success criteria is required')
      return
    }

    // Clean up outcomes
    const cleanedOutcomes = validOutcomes.map((o) => ({
      ...o,
      successCriteria: o.successCriteria.filter((c) => c.trim()),
    }))

    onSave({ mission: mission.trim(), outcomes: cleanedOutcomes })
  }

  const updateOutcome = (index: number, field: keyof Outcome, value: any) => {
    const newOutcomes = [...outcomes]
    newOutcomes[index] = { ...newOutcomes[index], [field]: value }
    setOutcomes(newOutcomes)
  }

  const addOutcome = () => {
    setOutcomes([...outcomes, { name: '', description: '', successCriteria: [''] }])
  }

  const removeOutcome = (index: number) => {
    if (outcomes.length > 1) {
      setOutcomes(outcomes.filter((_, i) => i !== index))
    }
  }

  const addSuccessCriteria = (outcomeIndex: number) => {
    const newOutcomes = [...outcomes]
    newOutcomes[outcomeIndex].successCriteria.push('')
    setOutcomes(newOutcomes)
  }

  const updateSuccessCriteria = (outcomeIndex: number, criteriaIndex: number, value: string) => {
    const newOutcomes = [...outcomes]
    newOutcomes[outcomeIndex].successCriteria[criteriaIndex] = value
    setOutcomes(newOutcomes)
  }

  const removeSuccessCriteria = (outcomeIndex: number, criteriaIndex: number) => {
    const newOutcomes = [...outcomes]
    if (newOutcomes[outcomeIndex].successCriteria.length > 1) {
      newOutcomes[outcomeIndex].successCriteria = newOutcomes[outcomeIndex].successCriteria.filter(
        (_, i) => i !== criteriaIndex
      )
      setOutcomes(newOutcomes)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Scorecard</DialogTitle>
          <DialogDescription>
            Define the mission and key outcomes for this role. Use AI to generate a starting point
            or create from scratch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generate with AuntyPelz button */}
          <Button
            onClick={() => generateFromJD.mutate({ jobDescriptionId })}
            disabled={generateFromJD.isPending}
            variant="outline"
            className="w-full"
            type="button"
          >
            {generateFromJD.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating with AuntyPelz...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate with AuntyPelz
              </>
            )}
          </Button>

          {/* Mission field */}
          <div className="space-y-2">
            <Label>
              Mission Statement <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={3}
              placeholder="A clear, concise statement describing what this role needs to accomplish..."
            />
          </div>

          {/* Outcomes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Key Outcomes <span className="text-destructive">*</span>
              </Label>
              <Button onClick={addOutcome} variant="outline" size="sm" type="button">
                <Plus className="h-3 w-3 mr-1" />
                Add Outcome
              </Button>
            </div>

            {outcomes.map((outcome, outcomeIdx) => (
              <div
                key={outcomeIdx}
                className="border border-border rounded-lg p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Outcome name (e.g., Revenue Growth)"
                      value={outcome.name}
                      onChange={(e) => updateOutcome(outcomeIdx, 'name', e.target.value)}
                    />
                    <Textarea
                      placeholder="Detailed description of this outcome..."
                      value={outcome.description}
                      onChange={(e) => updateOutcome(outcomeIdx, 'description', e.target.value)}
                      rows={2}
                    />

                    {/* Success Criteria */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Success Criteria</Label>
                        <Button
                          onClick={() => addSuccessCriteria(outcomeIdx)}
                          variant="ghost"
                          size="sm"
                          type="button"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      {outcome.successCriteria.map((criteria, criteriaIdx) => (
                        <div key={criteriaIdx} className="flex items-center gap-2">
                          <Input
                            placeholder="Specific, measurable success criterion..."
                            value={criteria}
                            onChange={(e) =>
                              updateSuccessCriteria(outcomeIdx, criteriaIdx, e.target.value)
                            }
                            className="text-sm"
                          />
                          <Button
                            onClick={() => removeSuccessCriteria(outcomeIdx, criteriaIdx)}
                            variant="ghost"
                            size="icon"
                            disabled={outcome.successCriteria.length === 1}
                            type="button"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => removeOutcome(outcomeIdx)}
                    variant="ghost"
                    size="icon"
                    disabled={outcomes.length === 1}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} type="button">
            Save Scorecard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
