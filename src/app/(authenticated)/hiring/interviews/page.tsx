'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Search,
  Calendar,
  MoreHorizontal,
  Loader2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Play,
  BookOpen,
  Pencil,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ViewQuestionsDialog } from '@/components/hiring/view-questions-dialog'
import { EditInterviewDialog } from '@/components/hiring/edit-interview-dialog'
import { RescheduleDialog } from '@/components/hiring/reschedule-dialog'

// Default counts when no data
const defaultCounts = {
  all: 0,
  HR_SCREEN: 0,
  TEAM_CHAT: 0,
  ADVISOR_CHAT: 0,
  CEO_CHAT: 0,
  upcoming: 0,
}

// Stage display names and colors
const stageConfig: Record<string, { label: string; color: string }> = {
  HR_SCREEN: { label: 'People Chat', color: 'bg-blue-100 text-blue-800' },
  TEAM_CHAT: { label: 'Team Chat', color: 'bg-purple-100 text-purple-800' },
  ADVISOR_CHAT: { label: 'Advisor Chat', color: 'bg-indigo-100 text-indigo-800' },
  TECHNICAL: { label: 'Coding Test', color: 'bg-amber-100 text-amber-800' },
  CEO_CHAT: { label: 'CEO Chat', color: 'bg-pink-100 text-pink-800' },
  TRIAL: { label: 'Work Trial', color: 'bg-orange-100 text-orange-800' },
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-success/10 text-success', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-muted text-foreground', icon: XCircle },
  NO_SHOW: { label: 'No Show', color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
}

export default function InterviewsPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null)
  const [viewQuestionsOpen, setViewQuestionsOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState<typeof interviews[0] | null>(null)

  // Fetch interviews
  const { data: dbInterviews, isLoading } = trpc.interview.list.useQuery({
    stage: activeFilter !== 'all' ? activeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    search: searchQuery || undefined,
  })

  // Fetch counts
  const { data: dbCounts } = trpc.interview.getCounts.useQuery()

  // Mutations
  const utils = trpc.useUtils()
  const cancelMutation = trpc.interview.cancel.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate()
      utils.interview.getCounts.invalidate()
      setCancelDialogOpen(false)
      setSelectedInterviewId(null)
      toast.success('Interview cancelled')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel interview')
    },
  })

  // Action handlers
  const handleCancelInterview = () => {
    if (selectedInterviewId) {
      cancelMutation.mutate({ id: selectedInterviewId, reason: 'Cancelled by user' })
    }
  }

  // Use DB interviews directly
  const interviews = dbInterviews ?? []

  // Use DB counts or default
  const counts = dbCounts ?? defaultCounts

  // Filter stages for display
  const stages = [
    { key: 'all', label: 'All' },
    { key: 'HR_SCREEN', label: 'People Chat' },
    { key: 'TEAM_CHAT', label: 'Team Chat' },
    { key: 'ADVISOR_CHAT', label: 'Advisor Chat' },
    { key: 'CEO_CHAT', label: 'CEO Chat' },
  ]

  // Format date display
  const formatInterviewDate = (date: Date | null) => {
    if (!date) return 'Not scheduled'
    const d = new Date(date)
    if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`
    if (isTomorrow(d)) return `Tomorrow at ${format(d, 'h:mm a')}`
    if (isPast(d)) return format(d, 'MMM d, yyyy')
    return format(d, 'MMM d, yyyy h:mm a')
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter Cards */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-nowrap">
          {stages.map((stage) => (
            <button
              key={stage.key}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                activeFilter === stage.key
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground/80 hover:bg-muted'
              )}
              onClick={() => setActiveFilter(stage.key)}
            >
              {stage.label}
              <span className={cn(
                'ml-1.5 px-1 py-0.5 rounded text-[10px]',
                activeFilter === stage.key
                  ? 'bg-card/20'
                  : 'bg-muted'
              )}>
                {stage.key === 'all'
                  ? counts?.all || 0
                  : (counts as Record<string, number>)?.[stage.key] || 0}
              </span>
            </button>
          ))}
        </div>
        <Link href="/hiring/interviews/schedule">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate or team..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="NO_SHOW">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interviews Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !interviews?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/60 mb-4" />
              <h3 className="font-medium text-foreground">No interviews found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Schedule your first interview to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Interviewers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((interview) => {
                  const stage = stageConfig[interview.stage] || { label: interview.stage, color: 'bg-muted text-foreground' }
                  const status = statusConfig[interview.status] || statusConfig.SCHEDULED
                  const StatusIcon = status.icon

                  return (
                    <TableRow
                      key={interview.id}
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => router.push(`/recruiting/candidates/${interview.candidateId}/interviews/${interview.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {interview.candidate?.name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{interview.candidate?.job?.title || '-'}</div>
                          <div className="text-muted-foreground">{interview.candidate?.job?.department || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-normal', stage.color)}>
                          {stage.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <div className="text-xs whitespace-nowrap">
                            <div className={cn(
                              interview.scheduledAt && isPast(new Date(interview.scheduledAt)) && interview.status === 'SCHEDULED'
                                ? 'text-destructive'
                                : ''
                            )}>
                              {formatInterviewDate(interview.scheduledAt)}
                            </div>
                            {interview.duration && (
                              <div className="text-muted-foreground text-[10px]">
                                {interview.duration} min
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {interview.interviewers && Array.isArray(interview.interviewers) ? (
                          <div className="flex -space-x-2">
                            {(interview.interviewers as Array<{ name: string; email?: string; profileImageUrl?: string | null }>).slice(0, 3).map((interviewer, i) => (
                              <Avatar
                                key={i}
                                className="h-7 w-7 border-2 border-white"
                                title={interviewer.name}
                              >
                                {interviewer.profileImageUrl && (
                                  <AvatarImage src={interviewer.profileImageUrl} alt={interviewer.name} />
                                )}
                                <AvatarFallback className="bg-muted text-xs font-medium">
                                  {interviewer.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {(interview.interviewers as unknown[]).length > 3 && (
                              <div className="h-7 w-7 rounded-full bg-muted border-2 border-white flex items-center justify-center text-xs text-muted-foreground">
                                +{(interview.interviewers as unknown[]).length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-normal', status.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(interview.status === 'SCHEDULED' || interview.status === 'IN_PROGRESS') && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedInterview(interview)
                                    setRescheduleDialogOpen(true)
                                  }}
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Reschedule
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedInterview(interview)
                                    setViewQuestionsOpen(true)
                                  }}
                                >
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  View Questions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedInterview(interview)
                                    setEditDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedInterviewId(interview.id)
                                    setCancelDialogOpen(true)
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                            {interview.status === 'COMPLETED' && (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedInterview(interview)
                                    setViewQuestionsOpen(true)
                                  }}
                                >
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  View Questions
                                </DropdownMenuItem>
                                {interview.recordingUrl ? (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(interview.recordingUrl as string, '_blank')
                                    }}
                                  >
                                    <Play className="h-4 w-4 mr-2" />
                                    View Fireflies
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Play className="h-4 w-4 mr-2" />
                                    Fireflies unavailable
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Interview Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Interview</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this interview? This action cannot be undone.
              The candidate and interviewers will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Interview</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInterview}
              className="bg-destructive hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Interview'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Questions Dialog */}
      {selectedInterview && (
        <ViewQuestionsDialog
          open={viewQuestionsOpen}
          onOpenChange={setViewQuestionsOpen}
          interviewId={selectedInterview.id}
          interviewers={selectedInterview.interviewers as Array<{ id?: string; employeeId?: string; name: string; email?: string }> || []}
        />
      )}

      {/* Edit Interview Dialog */}
      {selectedInterview && (
        <EditInterviewDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          interview={{
            id: selectedInterview.id,
            scheduledAt: selectedInterview.scheduledAt ? new Date(selectedInterview.scheduledAt) : null,
            duration: selectedInterview.duration,
            meetingLink: selectedInterview.meetingLink,
            feedback: selectedInterview.feedback,
            interviewers: selectedInterview.interviewers as Array<{ employeeId?: string; name: string; email: string }> || [],
            interviewTypeId: (selectedInterview as { interviewTypeId?: string | null }).interviewTypeId,
            stageName: (selectedInterview as { stageName?: string | null }).stageName,
          }}
          onSuccess={() => {
            utils.interview.list.invalidate()
            utils.interview.getCounts.invalidate()
          }}
        />
      )}

      {/* Reschedule Dialog */}
      {selectedInterview && (
        <RescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          interviewId={selectedInterview.id}
          currentScheduledAt={selectedInterview.scheduledAt ? new Date(selectedInterview.scheduledAt) : undefined}
          currentDuration={selectedInterview.duration || 60}
          onSuccess={() => {
            utils.interview.list.invalidate()
            utils.interview.getCounts.invalidate()
          }}
        />
      )}
    </div>
  )
}
