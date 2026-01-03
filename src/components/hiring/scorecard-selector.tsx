'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc-client'
import { Sparkles, FileText, Plus, Info } from 'lucide-react'
import { ScorecardPreviewDialog } from './scorecard-preview-dialog'
import { CreateScorecardDialog } from './create-scorecard-dialog'
import { cn } from '@/lib/utils'

interface Outcome {
  name: string
  description: string
  successCriteria: string[]
}

interface ScorecardSelectorProps {
  jobDescriptionId: string | null
  value: {
    type: 'none' | 'existing' | 'new'
    existingScorecardId?: string
    scorecardData?: { mission: string; outcomes: Outcome[] }
  }
  onChange: (value: any) => void
  disabled?: boolean
}

export function ScorecardSelector({
  jobDescriptionId,
  value,
  onChange,
  disabled,
}: ScorecardSelectorProps) {
  const [showRecommended, setShowRecommended] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [previewScorecard, setPreviewScorecard] = useState<any>(null)

  const { data: recommendations, refetch: refetchRecommendations } = trpc.scorecard.getRecommendations.useQuery(
    { jobDescriptionId: jobDescriptionId! },
    { enabled: !!jobDescriptionId }
  )

  const { data: allScorecards, refetch: refetchAllScorecards } = trpc.scorecard.listForSelection.useQuery(
    undefined,
    { enabled: !showRecommended }
  )

  // Refetch when window regains focus (e.g., coming back from new tab)
  useEffect(() => {
    const handleFocus = () => {
      if (jobDescriptionId) {
        refetchRecommendations()
      }
      refetchAllScorecards()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [jobDescriptionId, refetchRecommendations, refetchAllScorecards])

  if (disabled || !jobDescriptionId) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg border flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Select a Job Description first to configure scorecard
        </div>
      </div>
    )
  }

  const scorecards = showRecommended ? recommendations : allScorecards
  const hasRecommendations = (recommendations?.length || 0) > 0

  return (
    <div className="space-y-4">
      <Label>Scorecard Configuration</Label>

      {/* Option buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant={value.type === 'existing' ? 'default' : 'outline'}
          onClick={() => onChange({ type: 'existing' })}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Select Existing
        </Button>
        <Button
          type="button"
          variant={value.type === 'new' ? 'default' : 'outline'}
          onClick={() => setShowCreateModal(true)}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Existing scorecard selection */}
      {value.type === 'existing' && (
        <div className="space-y-3">
          {hasRecommendations && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">
                  {showRecommended ? 'AI Recommended' : 'All Scorecards'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecommended(!showRecommended)}
              >
                {showRecommended ? 'Show All' : 'Show Recommended'}
              </Button>
            </div>
          )}

          <div className="grid gap-2">
            {(scorecards || []).map((scorecard) => (
              <button
                key={scorecard.id}
                type="button"
                onClick={() =>
                  onChange({
                    type: 'existing',
                    existingScorecardId: scorecard.id,
                    scorecardData: {
                      mission: scorecard.mission,
                      outcomes: scorecard.outcomes as Outcome[],
                    },
                  })
                }
                className={cn(
                  'p-3 border rounded-lg text-left transition-all',
                  value.existingScorecardId === scorecard.id
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-border hover:border-indigo-300'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{scorecard.job.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {scorecard.mission}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {scorecard.job.department && (
                        <Badge variant="secondary" className="text-xs">
                          {scorecard.job.department}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {(scorecard.outcomes as any[]).length} outcomes
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewScorecard(scorecard)
                    }}
                  >
                    Preview
                  </Button>
                </div>
              </button>
            ))}
          </div>

          {(!scorecards || scorecards.length === 0) && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {showRecommended
                ? 'No recommended scorecards found. Try "Show All".'
                : 'No scorecards available. Create your first one!'}
            </div>
          )}
        </div>
      )}

      {/* Selected summary */}
      {value.type === 'new' && value.scorecardData && (
        <div className="p-3 border border-indigo-500 bg-indigo-50/50 rounded-lg">
          <div className="text-sm font-medium mb-1">New Scorecard Created</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {value.scorecardData.mission}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setShowCreateModal(true)}
          >
            Edit Scorecard
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <ScorecardPreviewDialog
        scorecard={previewScorecard}
        open={!!previewScorecard}
        onOpenChange={(open) => !open && setPreviewScorecard(null)}
      />

      {/* Create Dialog */}
      {jobDescriptionId && (
        <CreateScorecardDialog
          jobDescriptionId={jobDescriptionId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          initialData={value.type === 'new' ? value.scorecardData : undefined}
          onSave={(data) => {
            onChange({ type: 'new', scorecardData: data })
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}
