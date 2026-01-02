'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Headphones,
  Mail,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  Star,
  Trash2,
  User,
  Users,
  Video,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Link2,
  Loader2,
  AlertCircle,
  CalendarX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Search,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn, getInitials } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { RescheduleDialog } from '@/components/hiring/reschedule-dialog'
import { AddInterviewerDialog } from '@/components/hiring/add-interviewer-dialog'
import { EditInterviewDialog } from '@/components/hiring/edit-interview-dialog'

// Rating scale component
function RatingScale({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null
  onChange?: (value: number) => void
  disabled?: boolean
}) {
  const ratings = [
    { value: 1, label: 'Poor', color: 'bg-red-500' },
    { value: 2, label: 'Below Avg', color: 'bg-orange-500' },
    { value: 3, label: 'Meets', color: 'bg-yellow-500' },
    { value: 4, label: 'Good', color: 'bg-success' },
    { value: 5, label: 'Excellent', color: 'bg-success' },
  ]

  return (
    <div className="flex gap-2">
      {ratings.map((rating) => (
        <button
          key={rating.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(rating.value)}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all',
            value === rating.value
              ? `${rating.color} text-white shadow-md`
              : 'bg-muted text-muted-foreground hover:bg-muted',
            disabled && 'cursor-default'
          )}
          title={rating.label}
        >
          {rating.value}
        </button>
      ))}
    </div>
  )
}

// Avatar colors based on name hash
function getAvatarColor(name: string) {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    SCHEDULED: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
    COMPLETED: { label: 'Completed', className: 'bg-success/10 text-success' },
    CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700' },
    NO_SHOW: { label: 'No Show', className: 'bg-red-100 text-red-700' },
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }

  return <Badge className={cn('text-xs', config.className)}>{config.label}</Badge>
}

export default function InterviewDetailPage() {
  const params = useParams()
  const candidateId = params.id as string
  const interviewId = params.interviewId as string

  // UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedInterviewer, setExpandedInterviewer] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [addInterviewerDialogOpen, setAddInterviewerDialogOpen] = useState(false)
  const [removeInterviewerDialogOpen, setRemoveInterviewerDialogOpen] = useState(false)
  const [interviewerToRemove, setInterviewerToRemove] = useState<{ email: string; name: string } | null>(null)
  const [transcriptSearchTerm, setTranscriptSearchTerm] = useState('')
  const [showTranscriptSearch, setShowTranscriptSearch] = useState(false)

  // Fetch interview data
  const {
    data: interview,
    isLoading,
    error,
    refetch,
  } = trpc.interview.get.useQuery(
    { id: interviewId },
    { enabled: !!interviewId }
  )

  // Mutations
  const utils = trpc.useUtils()

  const updateStatusMutation = trpc.interview.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Interview status updated')
      utils.interview.get.invalidate({ id: interviewId })
      utils.interview.list.invalidate()
    },
    onError: (error) => {
      toast.error('Failed to update status', { description: error.message })
    },
  })

  const cancelMutation = trpc.interview.cancel.useMutation({
    onSuccess: () => {
      toast.success('Interview cancelled')
      setCancelDialogOpen(false)
      utils.interview.get.invalidate({ id: interviewId })
      utils.interview.list.invalidate()
    },
    onError: (error) => {
      toast.error('Failed to cancel interview', { description: error.message })
    },
  })

  const removeInterviewerMutation = trpc.interview.removeInterviewer.useMutation({
    onSuccess: () => {
      toast.success('Interviewer removed')
      setRemoveInterviewerDialogOpen(false)
      setInterviewerToRemove(null)
      utils.interview.get.invalidate({ id: interviewId })
    },
    onError: (error) => {
      toast.error('Failed to remove interviewer', { description: error.message })
    },
  })

  const generateTokensMutation = trpc.interview.generateMissingTokens.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`Generated ${data.created} interviewer link(s)`)
      } else {
        toast.info('All interviewers already have links')
      }
      utils.interview.get.invalidate({ id: interviewId })
    },
    onError: (error) => {
      toast.error('Failed to generate links', { description: error.message })
    },
  })

  const resendEmailMutation = trpc.interview.resendInterviewerEmail.useMutation({
    onSuccess: () => {
      toast.success('Interview invite email sent')
    },
    onError: (error) => {
      toast.error('Failed to send email', { description: error.message })
    },
  })

  const {
    data: assignedQuestions,
    isLoading: questionsLoading,
  } = trpc.interview.getAssignedQuestions.useQuery(
    { interviewId },
    { enabled: !!interviewId }
  )

  // Derived data
  const interviewers = useMemo(() => {
    if (!interview?.interviewers) return []
    // interviewers is stored as JSON
    const raw = interview.interviewers as Array<{
      employeeId?: string
      name: string
      email: string
      role?: string
    }>
    return raw.map((i) => ({
      id: i.employeeId || i.email,
      name: i.name,
      email: i.email,
      role: i.role || 'Interviewer',
      avatar: getAvatarColor(i.name),
    }))
  }, [interview?.interviewers])

  // Evaluations mapped by evaluator
  const evaluationsByInterviewer = useMemo(() => {
    if (!interview?.evaluations) return {}
    const map: Record<string, typeof interview.evaluations[number]> = {}
    for (const evaluation of interview.evaluations) {
      const key = evaluation.evaluatorEmail || evaluation.evaluatorName || 'unknown'
      map[key] = evaluation
    }
    return map
  }, [interview?.evaluations])

  // Calculate overall score
  const overallScore = useMemo(() => {
    if (!interview?.evaluations || interview.evaluations.length === 0) return null
    const totalScore = interview.evaluations.reduce((sum, ev) => sum + (ev.overallScore || 0), 0)
    return Math.round((totalScore / interview.evaluations.length) * 20) // Convert 1-5 to percentage
  }, [interview?.evaluations])

  // Split tokens by type
  const peopleTeamToken = useMemo(() => {
    return interview?.interviewerTokens?.find((t: { tokenType?: string }) => t.tokenType === 'PEOPLE_TEAM')
  }, [interview?.interviewerTokens])

  const interviewerTokens = useMemo(() => {
    return interview?.interviewerTokens?.filter((t: { tokenType?: string }) => t.tokenType !== 'PEOPLE_TEAM') || []
  }, [interview?.interviewerTokens])

  const hasTokens = interviewerTokens.length > 0 || !!peopleTeamToken
  const hasInterviewers = interviewers.length > 0

  // Generate People Team link
  const peopleTeamLink = useMemo(() => {
    if (!peopleTeamToken) return null
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/interview/${peopleTeamToken.token}`
  }, [peopleTeamToken])

  const handleGenerateTokens = () => {
    generateTokensMutation.mutate({ interviewId })
  }

  const handleCopyPeopleTeamLink = () => {
    if (!peopleTeamLink) {
      toast.error('No People Team link available. Generate links first.')
      return
    }
    navigator.clipboard.writeText(peopleTeamLink)
    setCopiedLink(true)
    toast.success('People Team link copied to clipboard')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyInterviewerLink = (token: { token: string; interviewerName: string }) => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/interview/${token.token}`
    navigator.clipboard.writeText(link)
    toast.success(`Link copied for ${token.interviewerName}`)
  }

  const handleMarkComplete = () => {
    updateStatusMutation.mutate({ id: interviewId, status: 'COMPLETED' })
  }

  const handleCancelInterview = () => {
    cancelMutation.mutate({ id: interviewId })
  }

  const handleJoinMeeting = () => {
    if (interview?.meetingLink) {
      window.open(interview.meetingLink, '_blank')
    } else {
      toast.error('No meeting link available')
    }
  }

  const handleRemoveInterviewer = () => {
    if (interviewerToRemove) {
      removeInterviewerMutation.mutate({
        interviewId,
        email: interviewerToRemove.email,
      })
    }
  }

  const openRemoveInterviewerDialog = (email: string, name: string) => {
    setInterviewerToRemove({ email, name })
    setRemoveInterviewerDialogOpen(true)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading interview...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Interview</h3>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No data state
  if (!interview) {
    return (
      <div className="py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <CalendarX className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Interview Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This interview may have been deleted or you don't have access.
            </p>
            <Button asChild>
              <Link href="/hiring/interviews">View All Interviews</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scheduledDate = interview.scheduledAt ? new Date(interview.scheduledAt) : new Date()
  const isUpcoming = scheduledDate > new Date() && interview.status === 'SCHEDULED'
  const isPast = scheduledDate < new Date()

  // Get interviewer names with their statuses from tokens (calculated inline to avoid hook ordering issues)
  const tokensMap = new Map(
    interviewerTokens.map((t: { interviewerEmail: string; evaluationStatus: string }) => [
      t.interviewerEmail,
      t.evaluationStatus,
    ])
  )
  const interviewerNames = interviewers
    .map((interviewer) => {
      const status = tokensMap.get(interviewer.email) || 'PENDING'
      const statusLabel =
        status === 'SUBMITTED'
          ? 'Completed'
          : status === 'IN_PROGRESS'
          ? 'In Progress'
          : 'Pending'
      return `${interviewer.name} (${statusLabel})`
    })
    .join(', ')

  return (
    <div className="pt-3 pb-3 sm:pt-4 sm:pb-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
      {/* Header Card */}
      <Card className="mb-6">
        <CardContent className="pt-8 pb-5 px-5 sm:pt-9">
          {/* Title and Stage Badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold">
                {interview.stageDisplayName || interview.stageName || interview.stage}
              </h1>
              <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 px-2.5 py-0.5">
                <span className="flex items-center gap-1.5 text-xs">
                  <span>●</span>
                  Stage {interview.stageNumber || 5} of {interview.totalStages || 6}
                </span>
              </Badge>
            </div>

            {/* Navigation */}
            {(interview.previousInterviewId || interview.nextInterviewId) && (
              <div className="flex items-center">
                {interview.previousInterviewId && (
                  <Link href={`/hiring/candidates/${candidateId}/interviews/${interview.previousInterviewId}`}>
                    <Button variant="ghost" size="sm" className="text-muted-foreground text-xs hover:text-foreground">
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      Previous
                    </Button>
                  </Link>
                )}
                {interview.previousInterviewId && interview.nextInterviewId && (
                  <span className="text-xs text-muted-foreground">/</span>
                )}
                {interview.nextInterviewId && (
                  <Link href={`/hiring/candidates/${candidateId}/interviews/${interview.nextInterviewId}`}>
                    <Button variant="ghost" size="sm" className="text-muted-foreground text-xs hover:text-foreground">
                      Next
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Candidate Link */}
          <div className="mb-2">
            <span className="text-sm text-muted-foreground">Candidate: </span>
            <Link
              href={`/hiring/candidates/${candidateId}`}
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
            >
              {interview.candidate.name}
            </Link>
          </div>

          {/* Interview Details */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(scheduledDate, 'MMMM d, yyyy \'at\' h:mm a')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {interview.duration} minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Interviewers: {interviewerNames || 'None assigned'}
              </span>
            </div>

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {peopleTeamLink && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        window.open(peopleTeamLink, '_blank')
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Interview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {interview.status === 'SCHEDULED' && (
                  <>
                    <DropdownMenuItem onClick={() => setRescheduleDialogOpen(true)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleMarkComplete}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCancelDialogOpen(true)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Interview
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    window.open(`/api/hiring/interviews/${interviewId}/export`, '_blank')
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.info('Email summary functionality coming soon')
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Summary
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="flex min-w-max justify-start gap-6 border-b bg-transparent p-0">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm data-[state=active]:border-primary data-[state=active]:text-primary">
              Overview
            </TabsTrigger>
            <TabsTrigger value="questions" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm data-[state=active]:border-primary data-[state=active]:text-primary">
              Questions
            </TabsTrigger>
            <TabsTrigger value="fireflies" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm data-[state=active]:border-primary data-[state=active]:text-primary">
              <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Fireflies</span>
            </TabsTrigger>
            <TabsTrigger value="interviewers" className="rounded-none border-b-2 border-transparent px-0 pb-3 text-xs sm:text-sm data-[state=active]:border-primary data-[state=active]:text-primary">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Interviewers</span> ({interviewers.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-[1fr_380px] gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Transcript */}
              <Card>
                <CardHeader className="py-4 px-5">
                  <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Interview Transcript
                    </CardTitle>
                    <div className="flex gap-2">
                      {interview.transcriptUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(interview.transcriptUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Fireflies
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTranscriptSearch(!showTranscriptSearch)}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>
                  </div>
                  {showTranscriptSearch && (
                    <div className="mt-3">
                      <Input
                        placeholder="Search transcript..."
                        value={transcriptSearchTerm}
                        onChange={(e) => setTranscriptSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="max-h-96 overflow-y-auto border rounded-md p-4">
                    {interview.firefliesTranscript ? (
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {transcriptSearchTerm ? (
                          (() => {
                            const parts = interview.firefliesTranscript.split(
                              new RegExp(`(${transcriptSearchTerm})`, 'gi')
                            )
                            return parts.map((part, i) =>
                              part.toLowerCase() === transcriptSearchTerm.toLowerCase() ? (
                                <mark key={i} className="bg-yellow-200 text-foreground">
                                  {part}
                                </mark>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )
                          })()
                        ) : (
                          interview.firefliesTranscript
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No transcript available yet</p>
                        <p className="text-xs mt-1">
                          {interview.transcriptUrl ? (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => window.open(interview.transcriptUrl, '_blank')}
                              className="h-auto p-0 text-xs"
                            >
                              View on Fireflies
                            </Button>
                          ) : (
                            'Transcript will appear here after the interview is recorded'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rubric Scoring */}
              <Card>
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Interview Rubric
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {interview.evaluations && interview.evaluations.length > 0 && interview.evaluations[0].criteriaScores?.length > 0 ? (
                    interview.evaluations[0].criteriaScores.map((criteriaScore) => (
                      <div key={criteriaScore.id}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">{criteriaScore.criteria.name}</span>
                          <span className="font-semibold text-sm">{criteriaScore.score}/5</span>
                        </div>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              disabled
                              className={cn(
                                'w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-medium transition-all',
                                criteriaScore.score === score
                                  ? score >= 4
                                    ? 'bg-success border-success text-white'
                                    : score === 3
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'bg-red-500 border-red-500 text-white'
                                  : 'border-border'
                              )}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No rubric scores available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Score Summary */}
              <div className="flex items-center gap-4 p-4 bg-success/10 border border-success/20 rounded-xl">
                <div className="text-4xl font-bold text-success">{overallScore || 'N/A'}</div>
                <div>
                  <div className="font-semibold">Stage Score</div>
                  <div className="text-sm text-success">
                    {interview.stageDisplayName || interview.stageName || interview.stage}
                  </div>
                </div>
              </div>

              {/* AuntyPelz Analysis */}
              <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-200">
                <CardContent className="p-5">
                  <Badge className="bg-indigo-600 mb-3">
                    <Star className="h-3 w-3 mr-1" />
                    AuntyPelz Analysis
                  </Badge>
                  <h4 className="font-semibold mb-3">Key Insights</h4>
                  {interview.firefliesSummary ? (
                    <p className="text-sm text-foreground/80 mb-4">
                      {interview.firefliesSummary}
                    </p>
                  ) : (
                    <p className="text-sm text-foreground/80 mb-4">
                      AI analysis will appear here once the interview transcript is available.
                    </p>
                  )}

                  {interview.firefliesHighlights && interview.firefliesHighlights.length > 0 && (
                    <>
                      <h4 className="font-semibold mb-2 text-success">Strengths Observed</h4>
                      <ul className="text-sm text-foreground/80 mb-4 list-disc pl-4 space-y-1">
                        {interview.firefliesHighlights.slice(0, 3).map((highlight, i) => (
                          <li key={i}>{highlight}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {interview.firefliesActionItems && interview.firefliesActionItems.length > 0 && (
                    <>
                      <h4 className="font-semibold mb-2 text-amber-600">Areas to Note</h4>
                      <ul className="text-sm text-foreground/80 list-disc pl-4 space-y-1">
                        {interview.firefliesActionItems.slice(0, 2).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interview Questions</CardTitle>
              <CardDescription>
                Questions assigned to this interview and their interviewer assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {questionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : assignedQuestions && assignedQuestions.length > 0 ? (
                <div className="space-y-3">
                  {assignedQuestions.map((question, index) => (
                    <div key={question.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">Q{index + 1}</Badge>
                            {question.category && (
                              <Badge variant="outline" className="capitalize">
                                {question.category}
                              </Badge>
                            )}
                            {question.isRequired && (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                Required
                              </Badge>
                            )}
                            {question.wasAsked && (
                              <Badge className="bg-success/10 text-success hover:bg-success/10">
                                Asked
                              </Badge>
                            )}
                          </div>
                          <div className="font-medium text-foreground">{question.text}</div>
                          {question.followUp && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Follow-up: {question.followUp}
                            </div>
                          )}
                          {question.tags && question.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {question.tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">Assigned to</div>
                          <div>{question.assignedToInterviewerName || 'Unassigned'}</div>
                          {typeof question.rating === 'number' && (
                            <div className="mt-2">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Rating</div>
                              <div className="font-semibold text-foreground">{question.rating}/5</div>
                            </div>
                          )}
                        </div>
                      </div>
                      {question.notes && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          Notes: {question.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                  <p className="text-sm">No questions assigned to this interview yet.</p>
                  <p className="text-xs mt-1">
                    Assign questions from the Question Bank or add custom questions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fireflies Tab */}
        <TabsContent value="fireflies" className="mt-6">
          <Card className="text-center py-12">
            <CardContent>
              <Mic className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recording Available</h3>
              <p className="text-muted-foreground mb-4">
                Fireflies integration will be available in Phase 6.
              </p>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Fireflies
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interviewers Tab */}
        <TabsContent value="interviewers" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">
              {interviewers.length} Interviewer{interviewers.length !== 1 ? 's' : ''}
            </h3>
            <Button variant="outline" size="sm" onClick={() => setAddInterviewerDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Interviewer
            </Button>
          </div>

          {interviewers.length > 0 ? (
            <div className="space-y-4">
              {interviewers.map((interviewer) => {
                const evaluation = evaluationsByInterviewer[interviewer.email]
                return (
                  <Card key={interviewer.id}>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedInterviewer(
                          expandedInterviewer === interviewer.id ? null : interviewer.id
                        )
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={cn(interviewer.avatar, 'text-white')}>
                              {getInitials(interviewer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {interviewer.name}
                              {evaluation ? (
                                <Badge variant="outline" className="text-success border-success/30">
                                  <Check className="h-3 w-3 mr-1" />
                                  Submitted
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  Pending
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{interviewer.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {evaluation && (
                            <>
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={cn(
                                        'h-4 w-4',
                                        star <= (evaluation.overallScore || 0)
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-muted-foreground/40'
                                      )}
                                    />
                                  ))}
                                </div>
                                <div className="text-xs text-muted-foreground">Overall Rating</div>
                              </div>
                              {evaluation.recommendation && (
                                <Badge
                                  className={cn(
                                    evaluation.recommendation === 'STRONG_HIRE' && 'bg-green-600',
                                    evaluation.recommendation === 'HIRE' && 'bg-green-500',
                                    evaluation.recommendation === 'MAYBE' && 'bg-amber-500',
                                    evaluation.recommendation === 'NO_HIRE' && 'bg-red-500',
                                    evaluation.recommendation === 'STRONG_NO_HIRE' && 'bg-red-600'
                                  )}
                                >
                                  {evaluation.recommendation.replace('_', ' ')}
                                </Badge>
                              )}
                            </>
                          )}
                          {expandedInterviewer === interviewer.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedInterviewer === interviewer.id && (
                      <CardContent className="border-t pt-4">
                        {evaluation ? (
                          <>
                            {/* Notes */}
                            {evaluation.overallNotes && (
                              <div className="mb-6">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                  Notes
                                </h4>
                                <p className="text-sm">{evaluation.overallNotes}</p>
                              </div>
                            )}

                            {/* Criteria Scores */}
                            {evaluation.criteriaScores && evaluation.criteriaScores.length > 0 && (
                              <div className="mb-6">
                                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                                  Criteria Scores
                                </h4>
                                <div className="space-y-3">
                                  {evaluation.criteriaScores.map((cs) => (
                                    <div
                                      key={cs.id}
                                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-sm">
                                            {cs.criteria?.name || 'Criteria'}
                                          </span>
                                          <RatingScale value={cs.score} disabled />
                                        </div>
                                        {cs.notes && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {cs.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <p className="text-sm">Evaluation not yet submitted</p>
                          </div>
                        )}

                        {/* Interviewer Link */}
                        {(() => {
                          const token = interviewerTokens.find(
                            (t: { interviewerEmail: string }) => t.interviewerEmail === interviewer.email
                          )
                          if (token) {
                            return (
                              <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center gap-2">
                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Interview Link</span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs ml-auto',
                                      token.evaluationStatus === 'SUBMITTED' && 'bg-success/10 text-success border-success/30',
                                      token.evaluationStatus === 'IN_PROGRESS' && 'bg-amber-100 text-amber-700 border-amber-300',
                                      token.evaluationStatus === 'PENDING' && 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {token.evaluationStatus === 'SUBMITTED' ? 'Submitted' :
                                     token.evaluationStatus === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyInterviewerLink(token)
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                    Copy Link
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={resendEmailMutation.isPending}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      resendEmailMutation.mutate({ tokenId: token.id })
                                    }}
                                  >
                                    {resendEmailMutation.isPending ? (
                                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    ) : (
                                      <Send className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Send
                                  </Button>
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              openRemoveInterviewerDialog(interviewer.email, interviewer.name)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Interviewers Assigned</h3>
                <p className="text-muted-foreground mb-4">
                  Add interviewers to collect their feedback on this candidate.
                </p>
                <Button onClick={() => setAddInterviewerDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interviewer
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <RescheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        interviewId={interviewId}
        currentScheduledAt={interview.scheduledAt ?? undefined}
        currentDuration={interview.duration ?? undefined}
      />

      {/* Edit Interview Dialog */}
      <EditInterviewDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        interview={{
          id: interview.id,
          scheduledAt: interview.scheduledAt ? new Date(interview.scheduledAt) : null,
          duration: interview.duration,
          meetingLink: interview.meetingLink,
          googleMeetLink: (interview as { googleMeetLink?: string | null }).googleMeetLink,
          feedback: interview.feedback,
          interviewers: interview.interviewers as Array<{ employeeId?: string; name: string; email: string }> || [],
          interviewTypeId: (interview as { interviewTypeId?: string | null }).interviewTypeId,
          stageName: (interview as { stageName?: string | null }).stageName,
        }}
        onSuccess={() => {
          utils.interview.get.invalidate({ id: interviewId })
          utils.interview.list.invalidate()
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Interview</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this interview with {interview.candidate.name}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Interview</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInterview}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Interviewer Dialog */}
      <AddInterviewerDialog
        open={addInterviewerDialogOpen}
        onOpenChange={setAddInterviewerDialogOpen}
        interviewId={interviewId}
      />

      {/* Remove Interviewer Confirmation Dialog */}
      <AlertDialog open={removeInterviewerDialogOpen} onOpenChange={setRemoveInterviewerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Interviewer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {interviewerToRemove?.name} as an interviewer?
              Their feedback link will be revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Interviewer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveInterviewer}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeInterviewerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Interviewer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
