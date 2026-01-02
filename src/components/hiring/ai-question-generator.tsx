'use client'

import { useState, useMemo } from 'react'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flag,
  Briefcase,
  MessageSquare,
  Plus,
  Check,
  Loader2,
  Brain,
  Info,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'

// Category color mapping
const categoryColors: Record<string, string> = {
  behavioral: 'bg-blue-100 text-blue-700',
  situational: 'bg-purple-100 text-purple-700',
  technical: 'bg-green-100 text-green-700',
  motivational: 'bg-orange-100 text-orange-700',
  culture: 'bg-pink-100 text-pink-700',
}

interface GeneratedQuestion {
  id: string
  text: string
  followUp: string
  category: string
  tags: string[]
  reasoning: string
  addressesCritical?: boolean
  isAIGenerated: boolean
}

interface SelectedQuestion {
  id?: string
  text: string
  category: string
  followUp?: string
  isCustom?: boolean
  saveToBank?: boolean
  isRequired?: boolean
}

interface AIQuestionGeneratorProps {
  candidateId: string
  interviewTypeId?: string
  jobId?: string
  onQuestionsAdded: (questions: SelectedQuestion[]) => void
  existingQuestionIds?: string[]
  compact?: boolean // For embedding in tabs/panels without card wrapper
}

export function AIQuestionGenerator({
  candidateId,
  interviewTypeId,
  jobId,
  onQuestionsAdded,
  existingQuestionIds = [],
  compact = false,
}: AIQuestionGeneratorProps) {
  // State for context sources
  const [contextSources, setContextSources] = useState({
    includeAuntyPelzRecommendations: true,
    includeAuntyPelzMustValidate: true,
    includeAuntyPelzConcerns: true,
    includePreviousInterviews: [] as string[],
    includeJobRequirements: true,
    includeRedFlags: true,
  })

  // State for generation
  const [customPrompt, setCustomPrompt] = useState('')
  const [questionCount, setQuestionCount] = useState('10')
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showContextPanel, setShowContextPanel] = useState(false)
  const [expandedReasonings, setExpandedReasonings] = useState<Set<string>>(new Set())

  // Fetch candidate context
  const { data: context, isLoading: contextLoading } = trpc.question.getCandidateContext.useQuery(
    { candidateId, interviewTypeId },
    { enabled: !!candidateId }
  )

  // Generate questions mutation
  const generateMutation = trpc.question.generateAIQuestions.useMutation({
    onSuccess: (data) => {
      setGeneratedQuestions(data.questions as GeneratedQuestion[])
      // Select all by default
      setSelectedIds(new Set(data.questions.map(q => q.id)))
      toast.success(`Generated ${data.questions.length} questions for ${data.candidateName}`)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate questions')
    },
  })

  // Save questions mutation
  const saveQuestionsMutation = trpc.question.saveAIQuestions.useMutation()

  // Context counts for display
  const contextCounts = useMemo(() => {
    if (!context) return null
    return {
      recommendations: context.auntyPelz?.recommendations?.length || 0,
      mustValidate: (context.auntyPelz?.mustValidatePoints?.length || 0) + (context.candidate?.mustValidate?.length || 0),
      concerns: context.auntyPelz?.concerns?.length || 0,
      redFlags: context.candidate?.redFlags?.length || 0,
      previousInterviews: context.previousInterviews?.length || 0,
      hasJobRequirements: !!context.job?.description,
    }
  }, [context])

  // Has any critical data
  const hasCriticalData = useMemo(() => {
    if (!contextCounts) return false
    return contextCounts.mustValidate > 0 || contextCounts.concerns > 0 || contextCounts.redFlags > 0
  }, [contextCounts])

  // Handle generation
  const handleGenerate = () => {
    generateMutation.mutate({
      candidateId,
      interviewTypeId,
      jobId,
      count: parseInt(questionCount),
      contextSources: {
        ...contextSources,
        includePreviousInterviews: contextSources.includePreviousInterviews.length > 0
          ? contextSources.includePreviousInterviews
          : context?.previousInterviews?.map(i => i.id) || [],
      },
      customPrompt: customPrompt.trim() || undefined,
    })
  }

  // Handle adding selected questions
  const handleAddSelected = async () => {
    const selectedQuestions = generatedQuestions.filter(q => selectedIds.has(q.id))
    if (selectedQuestions.length === 0) {
      toast.error('No questions selected')
      return
    }

    try {
      // Save to question bank first (auto-save requirement)
      await saveQuestionsMutation.mutateAsync({
        questions: selectedQuestions.map(q => ({
          text: q.text,
          followUp: q.followUp || undefined,
          category: q.category as 'behavioral' | 'situational' | 'technical' | 'motivational' | 'culture',
          tags: q.tags || [],
        })),
        jobId,
        interviewTypeId,
      })

      // Add to interview
      onQuestionsAdded(selectedQuestions.map(q => ({
        text: q.text,
        category: q.category,
        followUp: q.followUp,
        isCustom: true,
        saveToBank: true,
        isRequired: q.addressesCritical || false,
      })))

      toast.success(`Added ${selectedQuestions.length} questions and saved to bank`)
      setGeneratedQuestions([])
      setSelectedIds(new Set())
    } catch {
      toast.error('Failed to save questions')
    }
  }

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Select/deselect all
  const selectAll = () => setSelectedIds(new Set(generatedQuestions.map(q => q.id)))
  const deselectAll = () => setSelectedIds(new Set())

  // Toggle reasoning expansion
  const toggleReasoning = (id: string) => {
    const newSet = new Set(expandedReasonings)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedReasonings(newSet)
  }

  // Toggle interview selection for context
  const toggleInterviewSelection = (interviewId: string) => {
    const current = contextSources.includePreviousInterviews
    if (current.includes(interviewId)) {
      setContextSources({
        ...contextSources,
        includePreviousInterviews: current.filter(id => id !== interviewId),
      })
    } else {
      setContextSources({
        ...contextSources,
        includePreviousInterviews: [...current, interviewId],
      })
    }
  }

  if (!candidateId) {
    if (compact) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select a candidate to generate AI-powered questions</p>
        </div>
      )
    }
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select a candidate to generate AI-powered questions</p>
        </CardContent>
      </Card>
    )
  }

  // Content for both compact and full modes
  const content = (
    <div className="space-y-4">
        {/* Context Sources Panel */}
        <Collapsible open={showContextPanel} onOpenChange={setShowContextPanel}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-primary/5">
              <span className="text-sm font-medium">Context Sources</span>
              <div className="flex items-center gap-2">
                {contextCounts && (
                  <span className="text-xs text-muted-foreground">
                    {[
                      contextCounts.recommendations > 0 && `${contextCounts.recommendations} recommendations`,
                      contextCounts.mustValidate > 0 && `${contextCounts.mustValidate} must-validate`,
                      contextCounts.concerns > 0 && `${contextCounts.concerns} concerns`,
                      contextCounts.redFlags > 0 && `${contextCounts.redFlags} red flags`,
                    ].filter(Boolean).join(' • ')}
                  </span>
                )}
                {showContextPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3">
            {contextLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : context ? (
              <div className="space-y-3">
                {/* AuntyPelz Recommendations */}
                {contextCounts && contextCounts.recommendations > 0 && (
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id="auntypelz-recommendations"
                      checked={contextSources.includeAuntyPelzRecommendations}
                      onCheckedChange={(checked) =>
                        setContextSources({ ...contextSources, includeAuntyPelzRecommendations: !!checked })
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="auntypelz-recommendations" className="flex items-center gap-2 cursor-pointer">
                        <Brain className="h-4 w-4 text-blue-500" />
                        AuntyPelz Recommendations
                        <Badge variant="secondary" className="text-xs">{contextCounts.recommendations}</Badge>
                      </Label>
                      {context.auntyPelz?.recommendations && context.auntyPelz.recommendations.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {context.auntyPelz.recommendations[0]}...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Must-Validate Points */}
                {contextCounts && contextCounts.mustValidate > 0 && (
                  <div className="flex items-start gap-3 p-2 rounded-lg bg-warning/5 hover:bg-warning/10">
                    <Checkbox
                      id="must-validate"
                      checked={contextSources.includeAuntyPelzMustValidate}
                      onCheckedChange={(checked) =>
                        setContextSources({ ...contextSources, includeAuntyPelzMustValidate: !!checked })
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="must-validate" className="flex items-center gap-2 cursor-pointer">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Must-Validate Points
                        <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                          {contextCounts.mustValidate} critical
                        </Badge>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Points that require verification in this interview
                      </p>
                    </div>
                  </div>
                )}

                {/* Concerns */}
                {contextCounts && contextCounts.concerns > 0 && (
                  <div className="flex items-start gap-3 p-2 rounded-lg bg-warning/5 hover:bg-warning/10">
                    <Checkbox
                      id="concerns"
                      checked={contextSources.includeAuntyPelzConcerns}
                      onCheckedChange={(checked) =>
                        setContextSources({ ...contextSources, includeAuntyPelzConcerns: !!checked })
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="concerns" className="flex items-center gap-2 cursor-pointer">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Concerns from Analysis
                        <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                          {contextCounts.concerns}
                        </Badge>
                      </Label>
                    </div>
                  </div>
                )}

                {/* Red Flags */}
                {contextCounts && contextCounts.redFlags > 0 && (
                  <div className="flex items-start gap-3 p-2 rounded-lg bg-red-50/50 hover:bg-red-50">
                    <Checkbox
                      id="red-flags"
                      checked={contextSources.includeRedFlags}
                      onCheckedChange={(checked) =>
                        setContextSources({ ...contextSources, includeRedFlags: !!checked })
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="red-flags" className="flex items-center gap-2 cursor-pointer">
                        <Flag className="h-4 w-4 text-red-500" />
                        Red Flags
                        <Badge variant="destructive" className="text-xs">
                          {contextCounts.redFlags} identified
                        </Badge>
                      </Label>
                    </div>
                  </div>
                )}

                {/* Previous Interviews */}
                {context.previousInterviews && context.previousInterviews.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      <MessageSquare className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Previous Interview Feedback</span>
                    </div>
                    {context.previousInterviews.map((interview) => (
                      <div key={interview.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 ml-4">
                        <Checkbox
                          id={`interview-${interview.id}`}
                          checked={contextSources.includePreviousInterviews.includes(interview.id)}
                          onCheckedChange={() => toggleInterviewSelection(interview.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`interview-${interview.id}`} className="cursor-pointer">
                            <span className="text-sm">{interview.stageName}</span>
                            {interview.feedback.length > 0 && (
                              <Badge variant="secondary" className="text-xs ml-2">
                                {interview.feedback.length} evaluation{interview.feedback.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Job Requirements */}
                {contextCounts?.hasJobRequirements && (
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id="job-requirements"
                      checked={contextSources.includeJobRequirements}
                      onCheckedChange={(checked) =>
                        setContextSources({ ...contextSources, includeJobRequirements: !!checked })
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="job-requirements" className="flex items-center gap-2 cursor-pointer">
                        <Briefcase className="h-4 w-4 text-green-500" />
                        Job Requirements
                      </Label>
                      {context.job && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {context.job.title}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* No AuntyPelz Analysis Warning */}
                {!context.auntyPelz && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span className="text-sm">
                      No AuntyPelz analysis available. Generate one from the candidate profile for better suggestions.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No context data available
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label htmlFor="custom-prompt" className="text-sm">
            Additional Context (optional)
          </Label>
          <Textarea
            id="custom-prompt"
            placeholder="E.g., Focus on their startup experience, probe their leadership style, verify technical depth in system design..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[60px] resize-none"
          />
        </div>

        {/* Generate Controls */}
        <div className="flex items-center gap-3">
          <Select value={questionCount} onValueChange={setQuestionCount}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 questions</SelectItem>
              <SelectItem value="10">10 questions</SelectItem>
              <SelectItem value="15">15 questions</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex-1"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Questions
              </>
            )}
          </Button>
        </div>

        {/* Critical Areas Notice */}
        {hasCriticalData && !generatedQuestions.length && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div className="text-sm text-warning-foreground">
              <p className="font-medium">Critical areas detected</p>
              <p className="text-xs mt-1">
                Generated questions will prioritize addressing red flags and must-validate points.
              </p>
            </div>
          </div>
        )}

        {/* Generated Questions Preview */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Generated Questions ({generatedQuestions.length})
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Clear
                </Button>
              </div>
            </div>

            <div className={cn("space-y-2 overflow-y-auto pr-2", compact ? "max-h-[300px]" : "max-h-[400px]")}>
              {generatedQuestions.map((question) => (
                <div
                  key={question.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    selectedIds.has(question.id)
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-primary/30',
                    question.addressesCritical && 'ring-1 ring-warning/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(question.id)}
                      onCheckedChange={() => toggleSelection(question.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn('text-xs', categoryColors[question.category] || 'bg-gray-100')}>
                            {question.category}
                          </Badge>
                          {question.addressesCritical && (
                            <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                              <Flag className="h-3 w-3 mr-1" />
                              Critical
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleSelection(question.id)}
                        >
                          {selectedIds.has(question.id) ? (
                            <X className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      <p className="text-sm">{question.text}</p>

                      {question.followUp && (
                        <p className="text-sm text-muted-foreground italic">
                          Follow-up: {question.followUp}
                        </p>
                      )}

                      {/* Reasoning (collapsible) */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto py-1 px-2 text-xs text-muted-foreground"
                              onClick={() => toggleReasoning(question.id)}
                            >
                              {expandedReasonings.has(question.id) ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Hide reasoning
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Why this question?
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p className="text-xs">{question.reasoning}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {expandedReasonings.has(question.id) && (
                        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          {question.reasoning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Selected Button */}
            <Button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0 || saveQuestionsMutation.isPending}
              className="w-full"
              size={compact ? "sm" : "default"}
            >
              {saveQuestionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Add {selectedIds.size} Selected Question{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
    </div>
  )

  // Return compact version (no card wrapper)
  if (compact) {
    return (
      <div>
        {/* Compact header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Generate with AuntyPelz</span>
          </div>
          {context && (
            <Badge variant="outline" className="text-xs">
              {context.candidateName}
            </Badge>
          )}
        </div>
        {content}
      </div>
    )
  }

  // Return full card version
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Generate with AuntyPelz</CardTitle>
              <CardDescription>
                AI-powered questions based on candidate context
              </CardDescription>
            </div>
          </div>
          {context && (
            <Badge variant="outline" className="text-xs">
              {context.candidateName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}
