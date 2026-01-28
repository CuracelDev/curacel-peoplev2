'use client'

import {
  Building2,
  Check,
  Clock,
  User,
  Star,
  Eye,
  FileText,
  Mail,
  Linkedin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import { useState } from 'react'

interface InterviewerQuestionResponse {
  interviewerId: string | null
  interviewerName: string
  interviewerEmail: string
  evaluationStatus: string
  overallRating: number | null
  recommendation: string | null
  evaluationNotes: string | null
  submittedAt: Date | null
  questionResponses: Record<string, { score: number | null; notes: string }> | null
  assignedQuestions: Array<{
    id: string
    text: string
    category: string
    isRequired: boolean
    isCustom: boolean
  }>
}

interface PeopleTeamViewProps {
  interviewData: {
    interview: {
      id: string
      stage: string
      stageName: string
      scheduledAt: Date | null
      duration: number
      meetingLink: string | null
    }
    candidate: {
      id: string
      name: string
      email: string | null
      phone: string | null
      linkedinUrl: string | null
      resumeUrl: string | null
    }
    job: {
      id: string
      title: string
      department: string | null
    } | null
    interviewQuestions: Array<{
      id: string
      text: string
      category: string
      isRequired: boolean
      isCustom: boolean
      assignedToInterviewerId: string | null
      assignedToInterviewerName: string | null
    }>
    interviewerQuestionResponses: InterviewerQuestionResponse[] | null
    panelMembers: Array<{
      id: string
      interviewerId: string | null
      name: string
      email: string
      role: string | null
      status: string
      overallRating: number | null
      recommendation: string | null
      submittedAt: Date | null
    }>
  }
}

// Rating star display
function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted-foreground text-sm">--</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-3.5 w-3.5',
            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating}/5</span>
    </div>
  )
}

// Question score display
function QuestionScore({ score }: { score: number | null }) {
  if (!score) return <span className="text-muted-foreground text-xs">Not scored</span>

  const colors = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-green-100 text-green-700',
    5: 'bg-green-100 text-green-700',
  }

  return (
    <Badge className={cn('text-xs', colors[score as keyof typeof colors])}>
      {score}/5
    </Badge>
  )
}

export function PeopleTeamView({ interviewData }: PeopleTeamViewProps) {
  const [expandedInterviewer, setExpandedInterviewer] = useState<string | null>(null)

  const candidateInitials = getInitials(interviewData.candidate.name)
  const submittedCount = interviewData.panelMembers.filter(m => m.status === 'SUBMITTED').length
  const totalInterviewers = interviewData.panelMembers.length

  // Find unassigned questions
  const unassignedQuestions = interviewData.interviewQuestions.filter(
    q => !q.assignedToInterviewerId && !q.assignedToInterviewerName
  )

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {interviewData.job?.title || 'Interview Review'}
              </div>
              <h1 className="text-lg sm:text-xl font-bold">{interviewData.interview.stageName}</h1>
              <div className="text-xs sm:text-sm text-muted-foreground">
                People Team View
              </div>
            </div>
            <Badge variant="outline" className="text-indigo-600 border-indigo-300 bg-indigo-50 w-fit">
              <Eye className="h-3 w-3 mr-1" />
              View Only
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Candidate Card */}
        <Card className="mb-6">
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

        {/* Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold">Interviewer Responses</div>
                  <div className="text-sm text-muted-foreground">
                    {submittedCount} of {totalInterviewers} submitted
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${totalInterviewers > 0 ? (submittedCount / totalInterviewers) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {totalInterviewers > 0 ? Math.round((submittedCount / totalInterviewers) * 100) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interviewer Responses */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Questions & Responses by Interviewer</h3>

          {interviewData.interviewerQuestionResponses?.map((interviewer) => {
            const isExpanded = expandedInterviewer === interviewer.interviewerEmail
            const questionResponses = interviewer.questionResponses || {}

            return (
              <Card key={interviewer.interviewerEmail} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedInterviewer(isExpanded ? null : interviewer.interviewerEmail)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(interviewer.interviewerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {interviewer.interviewerName}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              interviewer.evaluationStatus === 'SUBMITTED' && 'bg-success/10 text-success border-success/30',
                              interviewer.evaluationStatus === 'IN_PROGRESS' && 'bg-amber-100 text-amber-700 border-amber-300',
                              interviewer.evaluationStatus === 'PENDING' && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {interviewer.evaluationStatus === 'SUBMITTED' && <Check className="h-3 w-3 mr-1" />}
                            {interviewer.evaluationStatus}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {interviewer.assignedQuestions.length} questions assigned
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {interviewer.evaluationStatus === 'SUBMITTED' && (
                        <>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Overall Rating</div>
                            <RatingStars rating={interviewer.overallRating} />
                          </div>
                          {interviewer.recommendation && (
                            <Badge
                              className={cn(
                                'text-xs',
                                interviewer.recommendation === 'STRONG_HIRE' && 'bg-green-600',
                                interviewer.recommendation === 'HIRE' && 'bg-green-500',
                                interviewer.recommendation === 'MAYBE' && 'bg-amber-500',
                                interviewer.recommendation === 'NO_HIRE' && 'bg-red-500',
                                interviewer.recommendation === 'STRONG_NO_HIRE' && 'bg-red-600'
                              )}
                            >
                              {interviewer.recommendation.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </>
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
                  <CardContent className="border-t pt-4 space-y-4">
                    {/* Questions */}
                    {interviewer.assignedQuestions.length > 0 ? (
                      interviewer.assignedQuestions.map((question) => {
                        const response = questionResponses[question.id]
                        return (
                          <div key={question.id} className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
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
                                {question.isRequired && (
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                )}
                              </div>
                              <QuestionScore score={response?.score ?? null} />
                            </div>
                            <p className="text-sm font-medium mb-2">{question.text}</p>
                            {response?.notes ? (
                              <div className="text-sm text-muted-foreground bg-card p-3 rounded border">
                                <div className="text-xs font-medium text-foreground mb-1">Notes:</div>
                                {response.notes}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No notes recorded</p>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">No questions assigned to this interviewer</p>
                    )}

                    {/* Overall notes */}
                    {interviewer.evaluationNotes && (
                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="text-xs font-medium text-indigo-700 mb-1">Summary Notes:</div>
                        <p className="text-sm">{interviewer.evaluationNotes}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Unassigned Questions */}
          {unassignedQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Unassigned Questions ({unassignedQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unassignedQuestions.map((question) => (
                  <div key={question.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
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
                    </div>
                    <p className="text-sm">{question.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Interview Details Sidebar (at bottom on mobile) */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interview Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Scheduled</div>
              <div className="text-sm font-medium">
                {interviewData.interview.scheduledAt
                  ? new Date(interviewData.interview.scheduledAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'TBD'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="text-sm font-medium">{interviewData.interview.duration} minutes</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Type</div>
              <Badge variant="outline" className="mt-1">
                {interviewData.interview.stageName}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Questions</div>
              <div className="text-sm font-medium">{interviewData.interviewQuestions.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
