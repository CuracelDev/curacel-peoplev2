'use client'

import { useMemo } from 'react'
import { trpc } from '@/lib/trpc-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Loader2,
  User,
  Star,
  MessageSquare,
} from 'lucide-react'

interface ViewQuestionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interviewId: string
  interviewers?: Array<{ id?: string; employeeId?: string; name: string; email?: string }>
}

const categoryConfig: Record<string, { name: string; color: string }> = {
  situational: { name: 'Situational', color: 'bg-indigo-100 text-indigo-700' },
  behavioral: { name: 'Behavioral', color: 'bg-success/10 text-success' },
  motivational: { name: 'Motivational', color: 'bg-amber-100 text-amber-700' },
  technical: { name: 'Technical', color: 'bg-pink-100 text-pink-700' },
  culture: { name: 'Culture', color: 'bg-cyan-100 text-cyan-700' },
}

export function ViewQuestionsDialog({
  open,
  onOpenChange,
  interviewId,
  interviewers = [],
}: ViewQuestionsDialogProps) {
  // Fetch assigned questions
  const { data: questions, isLoading } = trpc.interview.getAssignedQuestions.useQuery(
    { interviewId },
    { enabled: open && !!interviewId }
  )

  // Group questions by interviewer
  const groupedQuestions = useMemo(() => {
    if (!questions) return { unassigned: [], byInterviewer: {} as Record<string, typeof questions> }

    const byInterviewer: Record<string, typeof questions> = {}
    const unassigned: typeof questions = []

    for (const q of questions) {
      if (q.assignedToInterviewerId) {
        if (!byInterviewer[q.assignedToInterviewerId]) {
          byInterviewer[q.assignedToInterviewerId] = []
        }
        byInterviewer[q.assignedToInterviewerId].push(q)
      } else {
        unassigned.push(q)
      }
    }

    return { unassigned, byInterviewer }
  }, [questions])

  // Get interviewer name by ID
  const getInterviewerName = (interviewerId: string) => {
    // First check if any question has the name
    const questionWithName = questions?.find(q => q.assignedToInterviewerId === interviewerId)
    if (questionWithName?.assignedToInterviewerName) {
      return questionWithName.assignedToInterviewerName
    }
    // Fall back to interviewers prop
    const interviewer = interviewers.find(
      i => (i.employeeId === interviewerId || i.id === interviewerId)
    )
    return interviewer?.name || 'Unknown Interviewer'
  }

  const totalQuestions = questions?.length || 0
  const hasAssignments = Object.keys(groupedQuestions.byInterviewer).length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Interview Questions
            {totalQuestions > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalQuestions} total
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Questions prepared for this interview
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !questions?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground font-medium">No questions assigned</p>
            <p className="text-xs text-muted-foreground mt-1">
              Questions can be added when editing the interview
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-6">
              {/* Questions grouped by interviewer */}
              {hasAssignments && (
                <>
                  {Object.entries(groupedQuestions.byInterviewer).map(([interviewerId, interviewerQuestions]) => (
                    <div key={interviewerId}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">
                          {getInterviewerName(interviewerId)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {interviewerQuestions?.length || 0} question{(interviewerQuestions?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="space-y-2 ml-9">
                        {interviewerQuestions?.map((q, idx) => (
                          <QuestionItem key={q.id} question={q} index={idx} />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Unassigned questions */}
              {groupedQuestions.unassigned.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-sm text-muted-foreground">
                      {hasAssignments ? 'Unassigned' : 'Questions'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {groupedQuestions.unassigned.length} question{groupedQuestions.unassigned.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-2 ml-9">
                    {groupedQuestions.unassigned.map((q, idx) => (
                      <QuestionItem key={q.id} question={q} index={idx} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface QuestionItemProps {
  question: {
    id: string
    text: string
    category: string
    followUp?: string | null
    isRequired: boolean
    isCustom: boolean
  }
  index: number
}

function QuestionItem({ question, index }: QuestionItemProps) {
  const category = categoryConfig[question.category] || { name: question.category, color: 'bg-gray-100 text-gray-700' }

  return (
    <div className="p-3 border rounded-lg bg-muted/20">
      <div className="flex items-start gap-2">
        <span className="text-xs text-muted-foreground font-medium mt-0.5">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <Badge className={cn('text-[10px] px-1.5 py-0', category.color)}>
              {category.name}
            </Badge>
            {question.isCustom && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Custom
              </Badge>
            )}
            {question.isRequired && (
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            )}
          </div>
          <p className="text-sm leading-snug">{question.text}</p>
          {question.followUp && (
            <p className="text-xs text-muted-foreground mt-1.5 italic">
              Follow-up: {question.followUp}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
