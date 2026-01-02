'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Headphones,
  Linkedin,
  Loader2,
  Mail,
  MessageSquare,
  Mic,
  Plus,
  Save,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  FileText,
  Building2,
  Briefcase,
  MapPin,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn, getInitials } from '@/lib/utils'
import { toast } from 'sonner'

// Rating descriptions
const ratingDescriptions = [
  { value: 1, label: 'Poor', description: 'Does not meet requirements', color: 'bg-destructive' },
  { value: 2, label: 'Below Average', description: 'Partially meets requirements', color: 'bg-orange-500' },
  { value: 3, label: 'Satisfactory', description: 'Meets requirements', color: 'bg-yellow-500' },
  { value: 4, label: 'Good', description: 'Exceeds some requirements', color: 'bg-success' },
  { value: 5, label: 'Excellent', description: 'Exceeds requirements', color: 'bg-success' },
]

type CustomQuestion = {
  id: string
  question: string
  answer: string
  score: number | null
}

export default function PublicInterviewPage() {
  const params = useParams()
  const token = params.token as string

  // Form state
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [overallRating, setOverallRating] = useState<number | null>(null)
  const [recommendation, setRecommendation] = useState<string>('')
  const [overallNotes, setOverallNotes] = useState('')
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  // Question responses (scores and notes for each interview question)
  const [questionResponses, setQuestionResponses] = useState<Record<string, { score: number | null; notes: string }>>({})
  const [expandedInterviewQuestion, setExpandedInterviewQuestion] = useState<string | null>(null)

  // Fetch interview data
  const {
    data: interviewData,
    isLoading,
    error,
    refetch,
  } = trpc.interview.getInterviewByToken.useQuery(
    { token },
    { enabled: !!token }
  )

  // Save draft mutation
  const saveDraftMutation = trpc.interview.saveInterviewerDraft.useMutation({
    onSuccess: (data) => {
      setLastSaved(new Date(data.savedAt))
      toast.success('Draft saved')
    },
    onError: (error) => {
      toast.error('Failed to save draft', {
        description: error.message,
      })
    },
  })

  // Submit evaluation mutation
  const submitMutation = trpc.interview.submitInterviewerFeedback.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      toast.error('Failed to submit evaluation', {
        description: error.message,
      })
    },
  })

  // Restore draft on load
  useEffect(() => {
    if (interviewData?.savedDraft) {
      const draft = interviewData.savedDraft
      if (draft.notes) {
        try {
          const parsed = JSON.parse(draft.notes as string)
          if (parsed.scores) setScores(parsed.scores)
          if (parsed.notes) setNotes(parsed.notes)
          if (parsed.overallNotes) setOverallNotes(parsed.overallNotes)
        } catch {
          // Legacy format - just notes string
          setOverallNotes(draft.notes as string)
        }
      }
      if (draft.overallRating) setOverallRating(draft.overallRating as number)
      if (draft.recommendation) setRecommendation(draft.recommendation as string)
      if (draft.customQuestions) {
        setCustomQuestions(draft.customQuestions as CustomQuestion[])
      }
      // Restore question responses
      if (draft.questionResponses) {
        setQuestionResponses(draft.questionResponses as Record<string, { score: number | null; notes: string }>)
      }
    }
    // Set expanded question to first rubric criteria or first interview question
    if (interviewData?.rubricCriteria && interviewData.rubricCriteria.length > 0) {
      setExpandedQuestion(interviewData.rubricCriteria[0].id)
    } else if (interviewData?.interviewQuestions && interviewData.interviewQuestions.length > 0) {
      setExpandedInterviewQuestion(interviewData.interviewQuestions[0].id)
    }
  }, [interviewData])

  const handleScoreChange = (questionId: string, score: number) => {
    setScores((prev) => ({ ...prev, [questionId]: score }))
  }

  const handleNotesChange = (questionId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [questionId]: value }))
  }

  // Handle interview question responses
  const handleQuestionResponseScore = (questionId: string, score: number) => {
    setQuestionResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], score, notes: prev[questionId]?.notes || '' },
    }))
  }

  const handleQuestionResponseNotes = (questionId: string, notesText: string) => {
    setQuestionResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], notes: notesText, score: prev[questionId]?.score ?? null },
    }))
  }

  const handleAddCustomQuestion = () => {
    if (!newQuestion.trim()) return
    setCustomQuestions((prev) => [
      ...prev,
      { id: `cq-${Date.now()}`, question: newQuestion, answer: '', score: null },
    ])
    setNewQuestion('')
  }

  const handleCustomQuestionChange = (
    id: string,
    field: 'question' | 'answer' | 'score',
    value: string | number | null
  ) => {
    setCustomQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    )
  }

  const handleRemoveCustomQuestion = (id: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleSaveDraft = useCallback(async () => {
    await saveDraftMutation.mutateAsync({
      token,
      scores,
      notes,
      overallRating: overallRating || undefined,
      recommendation,
      overallNotes,
      customQuestions,
      questionResponses,
    })
  }, [token, scores, notes, overallRating, recommendation, overallNotes, customQuestions, questionResponses, saveDraftMutation])

  // Auto-save every 30 seconds when there are changes
  useEffect(() => {
    const hasContent = Object.keys(scores).length > 0 || Object.keys(questionResponses).length > 0 || overallRating || recommendation || overallNotes
    if (!hasContent || interviewData?.evaluationStatus === 'SUBMITTED' || interviewData?.isLocked) return

    const interval = setInterval(() => {
      handleSaveDraft()
    }, 30000)

    return () => clearInterval(interval)
  }, [scores, questionResponses, overallRating, recommendation, overallNotes, interviewData?.evaluationStatus, interviewData?.isLocked, handleSaveDraft])

  const handleSubmit = async () => {
    // Validate rubric scores
    const rubricCriteria = interviewData?.rubricCriteria || []
    const missingScores = rubricCriteria.filter((q) => !scores[q.id])
    if (missingScores.length > 0) {
      toast.error('Please score all evaluation criteria before submitting')
      return
    }
    if (!overallRating) {
      toast.error('Please provide an overall rating')
      return
    }
    if (!recommendation) {
      toast.error('Please select a recommendation')
      return
    }

    await submitMutation.mutateAsync({
      token,
      scores,
      notes,
      overallRating,
      recommendation: recommendation as 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'STRONG_NO_HIRE',
      overallNotes,
      customQuestions,
      questionResponses,
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-semibold mb-2">Loading Interview</h1>
            <p className="text-muted-foreground">
              Please wait while we fetch the interview details...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              {error.message.includes('expired') ? (
                <Clock className="h-8 w-8 text-destructive" />
              ) : error.message.includes('revoked') ? (
                <Lock className="h-8 w-8 text-destructive" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">Unable to Access Interview</h1>
            <p className="text-foreground/80 mb-6">{error.message}</p>
            <p className="text-sm text-muted-foreground">
              Please contact the hiring team if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already submitted state
  if (interviewData?.evaluationStatus === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Evaluation Already Submitted</h1>
            <p className="text-foreground/80 mb-6">
              You have already submitted your evaluation for {interviewData.candidate.name}.
              Thank you for your feedback!
            </p>
            <p className="text-sm text-muted-foreground">
              You can close this window now.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Submitted successfully state (after submission)
  if (submitMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Evaluation Submitted!</h1>
            <p className="text-foreground/80 mb-6">
              Thank you for completing your interview evaluation for {interviewData?.candidate.name}.
              Your feedback has been recorded.
            </p>
            <p className="text-sm text-muted-foreground">
              You can close this window now.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!interviewData) {
    return null
  }

  const rubricCriteria = interviewData.rubricCriteria || []
  const candidateInitials = getInitials(interviewData.candidate.name)

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {interviewData.job?.title || 'Interview Evaluation'}
              </div>
              <h1 className="text-lg sm:text-xl font-bold">{interviewData.interview.stageName}</h1>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Interviewer: {interviewData.interviewer.name}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {interviewData?.isLocked ? (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  <Lock className="h-3 w-3 mr-1" />
                  Feedback Period Ended
                </Badge>
              ) : (
                <>
                  {lastSaved && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                      Saved: {lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={saveDraftMutation.isPending}
                    className="text-xs sm:text-sm"
                  >
                    {saveDraftMutation.isPending ? (
                      <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Save Draft</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="text-xs sm:text-sm"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Submit</span>
                    <span className="sm:hidden">Submit</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Candidate Card */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {candidateInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{interviewData.candidate.name}</h2>
                    {interviewData.candidate.email && (
                      <div className="flex items-center gap-1 text-foreground/80 text-sm">
                        <Mail className="h-4 w-4" />
                        {interviewData.candidate.email}
                      </div>
                    )}
                    {interviewData.candidate.phone && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {interviewData.candidate.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {interviewData.candidate.linkedinUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={
                              interviewData.candidate.linkedinUrl.startsWith('http')
                                ? interviewData.candidate.linkedinUrl
                                : `https://${interviewData.candidate.linkedinUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="h-4 w-4 mr-1" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                      {interviewData.candidate.resumeUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={interviewData.candidate.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Resume
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  {interviewData.job && (
                    <Badge className="bg-indigo-100 text-indigo-700">
                      {interviewData.job.title}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Previous Evaluations Summary */}
            {interviewData.previousEvaluations && interviewData.previousEvaluations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Previous Interview Evaluations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {interviewData.previousEvaluations.map((evaluation, idx) => (
                      <div key={idx} className="flex-1 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{evaluation.evaluatorName}</span>
                          <Badge
                            className={cn(
                              (evaluation.score || 0) >= 4 ? 'bg-success' : 'bg-warning'
                            )}
                          >
                            {evaluation.score}/5
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {evaluation.recommendation?.replace('_', ' ').toLowerCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rating Scale Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rating Scale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                  {ratingDescriptions.map((rating) => (
                    <div key={rating.value} className="text-center">
                      <div
                        className={cn(
                          'w-full h-8 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base mb-1',
                          rating.color
                        )}
                      >
                        {rating.value}
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium">{rating.label}</div>
                      <div className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">
                        {rating.description}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rubric Criteria Questions */}
            {rubricCriteria.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Evaluation Criteria</h3>

                {rubricCriteria.map((criteria, qIdx) => (
                  <Card
                    key={criteria.id}
                    className={cn(scores[criteria.id] && 'border-success/20 bg-success/10/30')}
                  >
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedQuestion(
                          expandedQuestion === criteria.id ? null : criteria.id
                        )
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                              scores[criteria.id]
                                ? 'bg-success text-white'
                                : 'bg-muted text-foreground/80'
                            )}
                          >
                            {scores[criteria.id] ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              qIdx + 1
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{criteria.name}</h4>
                            {criteria.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {criteria.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {scores[criteria.id] && (
                            <Badge
                              className={cn(
                                scores[criteria.id] >= 4
                                  ? 'bg-green-500'
                                  : scores[criteria.id] >= 3
                                  ? 'bg-warning'
                                  : 'bg-destructive'
                              )}
                            >
                              Score: {scores[criteria.id]}/5
                            </Badge>
                          )}
                          {expandedQuestion === criteria.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedQuestion === criteria.id && (
                      <CardContent className="border-t pt-4">
                        {/* Score Input */}
                        <div className="mb-4">
                          <Label className="text-sm font-medium mb-2 block">Your Score *</Label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                onClick={() => handleScoreChange(criteria.id, score)}
                                className={cn(
                                  'flex-1 h-12 rounded-lg font-bold text-lg transition-all',
                                  scores[criteria.id] === score
                                    ? ratingDescriptions[score - 1].color +
                                        ' text-white shadow-md'
                                    : 'bg-muted text-muted-foreground hover:bg-muted'
                                )}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Notes (Candidate&apos;s response and your observations)
                          </Label>
                          <Textarea
                            placeholder="Document the candidate's response and your observations..."
                            value={notes[criteria.id] || ''}
                            onChange={(e) => handleNotesChange(criteria.id, e.target.value)}
                            className="min-h-[100px]"
                          />
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : null}

            {/* Interview Questions Section */}
            {interviewData?.interviewQuestions && interviewData.interviewQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Interview Questions</h3>
                  {interviewData.isLocked && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                      <Lock className="h-3 w-3 mr-1" />
                      Read Only
                    </Badge>
                  )}
                </div>
                {interviewData.lockoutDate && !interviewData.isLocked && (
                  <p className="text-xs text-muted-foreground">
                    Responses can be edited until {new Date(interviewData.lockoutDate).toLocaleDateString()} at {new Date(interviewData.lockoutDate).toLocaleTimeString()}
                  </p>
                )}

                {interviewData.interviewQuestions.map((question, qIdx) => {
                  const response = questionResponses[question.id] || { score: null, notes: '' }
                  const isExpanded = expandedInterviewQuestion === question.id
                  const isAssignedToMe = question.isAssignedToMe
                  const isLocked = interviewData.isLocked

                  return (
                    <Card
                      key={question.id}
                      className={cn(
                        response.score && 'border-success/20 bg-success/5',
                        isAssignedToMe && !response.score && 'border-primary/30 bg-primary/5'
                      )}
                    >
                      <CardHeader
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedInterviewQuestion(isExpanded ? null : question.id)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                                response.score
                                  ? 'bg-success text-white'
                                  : isAssignedToMe
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground/80'
                              )}
                            >
                              {response.score ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                qIdx + 1
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    question.category === 'technical' && 'border-pink-300 bg-pink-50 text-pink-700',
                                    question.category === 'behavioral' && 'border-green-300 bg-green-50 text-green-700',
                                    question.category === 'situational' && 'border-indigo-300 bg-indigo-50 text-indigo-700',
                                    question.category === 'motivational' && 'border-amber-300 bg-amber-50 text-amber-700',
                                    question.category === 'culture' && 'border-cyan-300 bg-cyan-50 text-cyan-700'
                                  )}
                                >
                                  {question.category}
                                </Badge>
                                {isAssignedToMe && (
                                  <Badge className="bg-primary/10 text-primary text-xs">
                                    <Star className="h-3 w-3 mr-1 fill-primary" />
                                    Assigned to you
                                  </Badge>
                                )}
                                {question.assignedToInterviewerName && !isAssignedToMe && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    <User className="h-3 w-3 mr-1" />
                                    {question.assignedToInterviewerName}
                                  </Badge>
                                )}
                                {question.isRequired && (
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                )}
                              </div>
                              <h4 className="font-medium text-sm sm:text-base">{question.text}</h4>
                              {question.followUp && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  Follow-up: {question.followUp}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {response.score && (
                              <Badge
                                className={cn(
                                  response.score >= 4
                                    ? 'bg-green-500'
                                    : response.score >= 3
                                    ? 'bg-warning'
                                    : 'bg-destructive'
                                )}
                              >
                                {response.score}/5
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="border-t pt-4">
                          {/* Score Input */}
                          <div className="mb-4">
                            <Label className="text-sm font-medium mb-2 block">
                              Your Score {question.isRequired && <span className="text-destructive">*</span>}
                            </Label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((score) => (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => !isLocked && handleQuestionResponseScore(question.id, score)}
                                  disabled={isLocked}
                                  className={cn(
                                    'flex-1 h-12 rounded-lg font-bold text-lg transition-all',
                                    response.score === score
                                      ? ratingDescriptions[score - 1].color + ' text-white shadow-md'
                                      : 'bg-muted text-muted-foreground hover:bg-muted',
                                    isLocked && 'opacity-60 cursor-not-allowed'
                                  )}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              Notes (Candidate&apos;s response and your observations)
                            </Label>
                            <Textarea
                              placeholder="Document the candidate's response and your observations..."
                              value={response.notes}
                              onChange={(e) => !isLocked && handleQuestionResponseNotes(question.id, e.target.value)}
                              disabled={isLocked}
                              className={cn('min-h-[100px]', isLocked && 'opacity-60')}
                            />
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}

            {/* General Feedback Section (when no rubric and no questions) */}
            {(!interviewData?.rubricCriteria || interviewData.rubricCriteria.length === 0) &&
             (!interviewData?.interviewQuestions || interviewData.interviewQuestions.length === 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Interview Feedback</CardTitle>
                  <CardDescription>
                    No specific questions configured for this interview.
                    Please provide general feedback below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Provide your interview feedback and observations..."
                    value={overallNotes}
                    onChange={(e) => setOverallNotes(e.target.value)}
                    className="min-h-[200px]"
                    disabled={interviewData?.isLocked}
                  />
                </CardContent>
              </Card>
            )}

            {/* Custom Questions */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Custom Questions (Optional)</h3>
              </div>

              {customQuestions.map((cq) => (
                <Card key={cq.id} className="mb-4 border-dashed">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <Input
                        value={cq.question}
                        onChange={(e) =>
                          handleCustomQuestionChange(cq.id, 'question', e.target.value)
                        }
                        placeholder="Your custom question"
                        className="font-medium border-0 p-0 focus-visible:ring-0 text-base"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveCustomQuestion(cq.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mb-3">
                      <Label className="text-sm font-medium mb-2 block">Score</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleCustomQuestionChange(cq.id, 'score', score)}
                            className={cn(
                              'w-10 h-10 rounded-lg font-bold transition-all',
                              cq.score === score
                                ? ratingDescriptions[score - 1].color + ' text-white shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      placeholder="Candidate's response..."
                      value={cq.answer}
                      onChange={(e) => handleCustomQuestionChange(cq.id, 'answer', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2">
                <Input
                  placeholder="Add a custom question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomQuestion()}
                />
                <Button variant="outline" onClick={handleAddCustomQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Overall Evaluation */}
            <Card className="mt-8 border-2 border-indigo-200">
              <CardHeader>
                <CardTitle>Overall Evaluation</CardTitle>
                <CardDescription>Provide your final assessment and recommendation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Rating */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Overall Rating *</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setOverallRating(rating)}
                        className={cn(
                          'p-2 sm:p-4 rounded-lg border-2 transition-all text-center',
                          overallRating === rating
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-border hover:border-border'
                        )}
                      >
                        <div className="flex justify-center mb-1 sm:mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-3 w-3 sm:h-5 sm:w-5',
                                star <= rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/40'
                              )}
                            />
                          ))}
                        </div>
                        <div className="text-xs sm:text-sm font-medium">
                          {ratingDescriptions[rating - 1].label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Recommendation *</Label>
                  <RadioGroup
                    value={recommendation}
                    onValueChange={setRecommendation}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
                  >
                    <Label
                      htmlFor="strong-hire"
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        recommendation === 'STRONG_HIRE'
                          ? 'border-success bg-success/10'
                          : 'border-border hover:border-border'
                      )}
                    >
                      <RadioGroupItem value="STRONG_HIRE" id="strong-hire" />
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-5 w-5 text-success" />
                        <span className="font-medium">Strong Hire</span>
                      </div>
                    </Label>
                    <Label
                      htmlFor="hire"
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        recommendation === 'HIRE'
                          ? 'border-green-400 bg-success/10'
                          : 'border-border hover:border-border'
                      )}
                    >
                      <RadioGroupItem value="HIRE" id="hire" />
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-5 w-5 text-success" />
                        <span className="font-medium">Hire</span>
                      </div>
                    </Label>
                    <Label
                      htmlFor="maybe"
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        recommendation === 'MAYBE'
                          ? 'border-warning bg-warning/10'
                          : 'border-border hover:border-border'
                      )}
                    >
                      <RadioGroupItem value="MAYBE" id="maybe" />
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-warning" />
                        <span className="font-medium">Maybe / Need More Info</span>
                      </div>
                    </Label>
                    <Label
                      htmlFor="no-hire"
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        recommendation === 'NO_HIRE'
                          ? 'border-destructive/30 bg-destructive/10'
                          : 'border-border hover:border-border'
                      )}
                    >
                      <RadioGroupItem value="NO_HIRE" id="no-hire" />
                      <div className="flex items-center gap-2">
                        <ThumbsDown className="h-5 w-5 text-destructive" />
                        <span className="font-medium">No Hire</span>
                      </div>
                    </Label>
                    <Label
                      htmlFor="strong-no-hire"
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all sm:col-span-2',
                        recommendation === 'STRONG_NO_HIRE'
                          ? 'border-destructive bg-destructive/10'
                          : 'border-border hover:border-border'
                      )}
                    >
                      <RadioGroupItem value="STRONG_NO_HIRE" id="strong-no-hire" />
                      <div className="flex items-center gap-2">
                        <ThumbsDown className="h-5 w-5 text-destructive" />
                        <span className="font-medium">Strong No Hire</span>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {/* Overall Notes */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Summary Notes</Label>
                  <Textarea
                    placeholder="Provide your overall assessment, key strengths, concerns, and reasoning for your recommendation..."
                    value={overallNotes}
                    onChange={(e) => setOverallNotes(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Interview Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Interview Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="font-medium">
                    {interviewData.interview.scheduledAt
                      ? new Date(interviewData.interview.scheduledAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'TBD'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{interviewData.interview.duration} minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">
                    {interviewData.interview.stageName || interviewData.interview.stage}
                  </Badge>
                </div>
                {interviewData.interview.meetingLink && (
                  <Button variant="outline" className="w-full mt-2" asChild>
                    <a
                      href={interviewData.interview.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Meeting
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Panel Members */}
            {interviewData.panelMembers && interviewData.panelMembers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Panel Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {interviewData.panelMembers.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-foreground/80 text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          member.status === 'SUBMITTED' && 'text-success border-success/30',
                          member.status === 'IN_PROGRESS' && 'text-blue-600 border-blue-300',
                          member.status === 'PENDING' && 'text-muted-foreground'
                        )}
                      >
                        {member.status === 'SUBMITTED' ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : null}
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Criteria Scored</span>
                    <span className="font-medium">
                      {Object.keys(scores).length} / {rubricCriteria.length || 0}
                    </span>
                  </div>
                  {rubricCriteria.length > 0 && (
                    <>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{
                            width: `${
                              (Object.keys(scores).length / rubricCriteria.length) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {Object.keys(scores).length === rubricCriteria.length ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="text-success">All criteria scored</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-warning" />
                            <span className="text-warning">
                              {rubricCriteria.length - Object.keys(scores).length} remaining
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2 text-sm mt-2">
                    {overallRating ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-success">Overall rating provided</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <span className="text-warning">Overall rating required</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {recommendation ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-success">Recommendation selected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <span className="text-warning">Recommendation required</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
