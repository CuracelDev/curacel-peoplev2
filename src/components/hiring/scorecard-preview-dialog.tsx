'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface ScorecardPreviewDialogProps {
  scorecard: {
    id: string
    mission: string
    outcomes: Array<{
      name: string
      description: string
      successCriteria: string[]
    }>
    job: {
      id: string
      title: string
      department: string | null
      status: string
    }
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScorecardPreviewDialog({
  scorecard,
  open,
  onOpenChange,
}: ScorecardPreviewDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scorecard Preview</DialogTitle>
        </DialogHeader>

        {scorecard && (
          <div className="space-y-6">
            {/* Job Info */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Job</div>
              <div className="font-semibold">{scorecard.job.title}</div>
              {scorecard.job.department && (
                <Badge variant="secondary" className="mt-2">
                  {scorecard.job.department}
                </Badge>
              )}
            </div>

            {/* Mission */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Mission Statement</div>
              <p className="text-sm leading-relaxed">{scorecard.mission}</p>
            </div>

            {/* Outcomes */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Key Outcomes ({(scorecard.outcomes as any[]).length})
              </div>
              <div className="space-y-4">
                {(scorecard.outcomes as Array<{
                  name: string
                  description: string
                  successCriteria: string[]
                }>).map((outcome, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="font-medium mb-2">{outcome.name}</div>
                    <p className="text-sm text-muted-foreground mb-3">{outcome.description}</p>
                    {outcome.successCriteria.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Success Criteria:
                        </div>
                        <ul className="space-y-1.5">
                          {outcome.successCriteria.map((criteria, critIdx) => (
                            <li key={critIdx} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span className="flex-1">{criteria}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
