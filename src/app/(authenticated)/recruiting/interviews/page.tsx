'use client'

import { useState, useMemo } from 'react'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Calendar,
  MoreHorizontal,
  Loader2,
  Video,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, addDays, addHours, subDays } from 'date-fns'
import Link from 'next/link'

// Mock interview data for demonstration
const mockInterviews = [
  {
    id: 'mock-1',
    candidateId: 'cand-1',
    stage: 'HR_SCREEN',
    stageName: 'People Chat',
    scheduledAt: addDays(new Date(), 1),
    duration: 45,
    status: 'SCHEDULED',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    interviewers: [
      { name: 'Sarah Chen', email: 'sarah@curacel.co' },
    ],
    candidate: {
      id: 'cand-1',
      name: 'Oluwaseun Adeyemi',
      email: 'seun.adeyemi@gmail.com',
      job: { id: 'job-1', title: 'Senior Backend Engineer', department: 'Engineering' },
    },
  },
  {
    id: 'mock-2',
    candidateId: 'cand-2',
    stage: 'TEAM_CHAT',
    stageName: 'Team Chat',
    scheduledAt: addHours(new Date(), 3),
    duration: 60,
    status: 'SCHEDULED',
    meetingLink: 'https://meet.google.com/xyz-uvwx-yz',
    interviewers: [
      { name: 'David Okonkwo', email: 'david@curacel.co' },
      { name: 'Amara Nwosu', email: 'amara@curacel.co' },
    ],
    candidate: {
      id: 'cand-2',
      name: 'Chidinma Okafor',
      email: 'chidinma.okafor@outlook.com',
      job: { id: 'job-2', title: 'Product Manager', department: 'Product' },
    },
  },
  {
    id: 'mock-3',
    candidateId: 'cand-3',
    stage: 'PANEL',
    stageName: 'Panel Interview',
    scheduledAt: addDays(new Date(), 3),
    duration: 90,
    status: 'SCHEDULED',
    meetingLink: 'https://zoom.us/j/123456789',
    interviewers: [
      { name: 'Chinedu Eze', email: 'chinedu@curacel.co' },
      { name: 'Funke Ajayi', email: 'funke@curacel.co' },
      { name: 'Tunde Bakare', email: 'tunde@curacel.co' },
    ],
    candidate: {
      id: 'cand-3',
      name: 'Emeka Nnamdi',
      email: 'emeka.n@gmail.com',
      job: { id: 'job-1', title: 'Senior Backend Engineer', department: 'Engineering' },
    },
  },
  {
    id: 'mock-4',
    candidateId: 'cand-4',
    stage: 'CEO_CHAT',
    stageName: 'CEO Chat',
    scheduledAt: addDays(new Date(), 5),
    duration: 30,
    status: 'SCHEDULED',
    meetingLink: 'https://meet.google.com/ceo-meet-123',
    interviewers: [
      { name: 'Henry Mascot', email: 'henry@curacel.co' },
    ],
    candidate: {
      id: 'cand-4',
      name: 'Ngozi Uchenna',
      email: 'ngozi.uchenna@yahoo.com',
      job: { id: 'job-3', title: 'Head of Sales', department: 'Sales' },
    },
  },
  {
    id: 'mock-5',
    candidateId: 'cand-5',
    stage: 'HR_SCREEN',
    stageName: 'People Chat',
    scheduledAt: subDays(new Date(), 2),
    duration: 45,
    status: 'COMPLETED',
    meetingLink: null,
    interviewers: [
      { name: 'Sarah Chen', email: 'sarah@curacel.co' },
    ],
    candidate: {
      id: 'cand-5',
      name: 'Adaeze Igwe',
      email: 'adaeze.igwe@gmail.com',
      job: { id: 'job-2', title: 'Product Manager', department: 'Product' },
    },
  },
  {
    id: 'mock-6',
    candidateId: 'cand-6',
    stage: 'ADVISOR_CHAT',
    stageName: 'Advisor Chat',
    scheduledAt: addDays(new Date(), 2),
    duration: 45,
    status: 'SCHEDULED',
    meetingLink: 'https://meet.google.com/adv-chat-456',
    interviewers: [
      { name: 'External Advisor', email: 'advisor@partner.co' },
    ],
    candidate: {
      id: 'cand-6',
      name: 'Kelechi Amadi',
      email: 'kelechi.amadi@proton.me',
      job: { id: 'job-1', title: 'Senior Backend Engineer', department: 'Engineering' },
    },
  },
]

// Mock counts for demonstration
const mockCounts = {
  all: 6,
  HR_SCREEN: 2,
  TEAM_CHAT: 1,
  ADVISOR_CHAT: 1,
  PANEL: 1,
  CEO_CHAT: 1,
  upcoming: 5,
}

// Stage display names and colors
const stageConfig: Record<string, { label: string; color: string }> = {
  HR_SCREEN: { label: 'People Chat', color: 'bg-blue-100 text-blue-800' },
  TEAM_CHAT: { label: 'Team Chat', color: 'bg-purple-100 text-purple-800' },
  ADVISOR_CHAT: { label: 'Advisor Chat', color: 'bg-indigo-100 text-indigo-800' },
  TECHNICAL: { label: 'Coding Test', color: 'bg-amber-100 text-amber-800' },
  PANEL: { label: 'Panel', color: 'bg-green-100 text-green-800' },
  CEO_CHAT: { label: 'CEO Chat', color: 'bg-pink-100 text-pink-800' },
  TRIAL: { label: 'Work Trial', color: 'bg-orange-100 text-orange-800' },
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  NO_SHOW: { label: 'No Show', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

export default function InterviewsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch interviews
  const { data: dbInterviews, isLoading } = trpc.interview.list.useQuery({
    stage: activeFilter !== 'all' ? activeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    search: searchQuery || undefined,
  })

  // Fetch counts
  const { data: dbCounts } = trpc.interview.getCounts.useQuery()

  // Use mock data as fallback when no DB data
  const interviews = useMemo(() => {
    if (dbInterviews && dbInterviews.length > 0) return dbInterviews

    // Filter mock data based on active filter and status
    let filtered = [...mockInterviews]
    if (activeFilter !== 'all') {
      filtered = filtered.filter(i => i.stage === activeFilter)
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter)
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(i =>
        i.candidate.name.toLowerCase().includes(query) ||
        i.candidate.job.title.toLowerCase().includes(query) ||
        i.candidate.job.department?.toLowerCase().includes(query)
      )
    }
    return filtered
  }, [dbInterviews, activeFilter, statusFilter, searchQuery])

  // Use mock counts as fallback
  const counts = dbCounts && dbCounts.all > 0 ? dbCounts : mockCounts

  // Filter stages for display (Coding Test is not an interview type)
  const stages = [
    { key: 'all', label: 'All Interviews' },
    { key: 'HR_SCREEN', label: 'People Chat' },
    { key: 'TEAM_CHAT', label: 'Team Chat' },
    { key: 'ADVISOR_CHAT', label: 'Advisor Chat' },
    { key: 'PANEL', label: 'Panel' },
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Interviews</h1>
          <p className="text-sm text-gray-500">
            Manage and track all candidate interviews
          </p>
        </div>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Stage Filter Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <Card
            key={stage.key}
            className={cn(
              'min-w-[140px] cursor-pointer transition-all hover:shadow-md border-2',
              activeFilter === stage.key
                ? 'border-primary bg-primary/5'
                : 'border-transparent'
            )}
            onClick={() => setActiveFilter(stage.key)}
          >
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 truncate">{stage.label}</div>
              <div className="text-xl font-bold mt-1">
                {stage.key === 'all'
                  ? counts?.all || 0
                  : (counts as Record<string, number>)?.[stage.key] || 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !interviews?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900">No interviews found</h3>
              <p className="text-sm text-gray-500 mt-1">
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
                  const stage = stageConfig[interview.stage] || { label: interview.stage, color: 'bg-gray-100 text-gray-800' }
                  const status = statusConfig[interview.status] || statusConfig.SCHEDULED
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={interview.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Link
                          href={`/recruiting/candidates/${interview.candidateId}`}
                          className="flex items-center gap-3"
                        >
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {interview.candidate?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {interview.candidate?.email}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{interview.candidate?.job?.title || '-'}</div>
                          <div className="text-gray-500">{interview.candidate?.job?.department || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-normal', stage.color)}>
                          {stage.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div className={cn(
                              interview.scheduledAt && isPast(new Date(interview.scheduledAt)) && interview.status === 'SCHEDULED'
                                ? 'text-red-600'
                                : ''
                            )}>
                              {formatInterviewDate(interview.scheduledAt)}
                            </div>
                            {interview.duration && (
                              <div className="text-gray-500 text-xs">
                                {interview.duration} min
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {interview.interviewers && Array.isArray(interview.interviewers) ? (
                          <div className="flex -space-x-2">
                            {(interview.interviewers as Array<{ name: string; email?: string }>).slice(0, 3).map((interviewer, i) => (
                              <div
                                key={i}
                                className="h-7 w-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                                title={interviewer.name}
                              >
                                {interviewer.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                            ))}
                            {(interview.interviewers as unknown[]).length > 3 && (
                              <div className="h-7 w-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                                +{(interview.interviewers as unknown[]).length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
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
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Video className="h-4 w-4 mr-2" />
                              Join Meeting
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
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
    </div>
  )
}
