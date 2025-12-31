'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent } from '@/components/ui/card'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Search,
  ClipboardCheck,
  MoreHorizontal,
  Loader2,
  User,
  Send,
  FileText,
  ExternalLink,
  RefreshCw,
  Eye,
  Upload,
  Code,
  Brain,
  Briefcase,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'

// Type display names and colors
const typeConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  CODING_TEST: { label: 'Coding Test', color: 'bg-amber-100 text-amber-800', icon: Code },
  KANDI_IO: { label: 'Kandi.io', color: 'bg-purple-100 text-purple-800', icon: Sparkles },
  PERSONALITY_MBTI: { label: 'MBTI', color: 'bg-blue-100 text-blue-800', icon: Brain },
  PERSONALITY_BIG5: { label: 'Big 5', color: 'bg-indigo-100 text-indigo-800', icon: Brain },
  WORK_TRIAL: { label: 'Work Trial', color: 'bg-green-100 text-green-800', icon: Briefcase },
  CUSTOM: { label: 'Custom', color: 'bg-muted text-foreground', icon: FileText },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-muted text-foreground/80' },
  INVITED: { label: 'Invited', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
}

const recommendationConfig: Record<string, { label: string; color: string }> = {
  HIRE: { label: 'Hire', color: 'bg-green-100 text-green-800' },
  HOLD: { label: 'Hold', color: 'bg-yellow-100 text-yellow-800' },
  NO_HIRE: { label: 'No Hire', color: 'bg-red-100 text-red-800' },
}

type Assessment = NonNullable<ReturnType<typeof trpc.assessment.list.useQuery>['data']>[number]

export default function AssessmentsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)

  // Fetch assessments
  const { data: assessments, isLoading } = trpc.assessment.list.useQuery({
    type: activeFilter !== 'all' ? activeFilter as any : undefined,
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    search: searchQuery || undefined,
  })

  // Fetch counts
  const { data: counts } = trpc.assessment.getCounts.useQuery()

  // Filter types for display
  const types = [
    { key: 'all', label: 'All' },
    { key: 'CODING_TEST', label: 'Coding Tests' },
    { key: 'KANDI_IO', label: 'Kandi.io' },
    { key: 'PERSONALITY_MBTI', label: 'MBTI' },
    { key: 'PERSONALITY_BIG5', label: 'Big 5' },
    { key: 'WORK_TRIAL', label: 'Work Trial' },
  ]

  // Score color based on value
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter Cards */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {types.map((type) => (
            <button
              key={type.key}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeFilter === type.key
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground/80 hover:bg-muted'
              )}
              onClick={() => setActiveFilter(type.key)}
            >
              {type.label}
              <span className={cn(
                'ml-2 px-1.5 py-0.5 rounded text-xs',
                activeFilter === type.key
                  ? 'bg-card/20'
                  : 'bg-muted'
              )}>
                {type.key === 'all'
                  ? counts?.all || 0
                  : counts?.[type.key] || 0}
              </span>
            </button>
          ))}
        </div>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Send Assessment
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate name..."
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
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="INVITED">Invited</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assessments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !assessments?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/60 mb-4" />
              <h3 className="font-medium text-foreground">No assessments found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Send your first assessment to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Candidate</TableHead>
                  <TableHead className="w-[160px]">Assessment</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead className="w-[120px]">Recommendation</TableHead>
                  <TableHead className="w-[100px]">Sent</TableHead>
                  <TableHead className="w-[100px]">Completed</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => {
                  const type = typeConfig[assessment.template.type] || typeConfig.CUSTOM
                  const status = statusConfig[assessment.status] || statusConfig.NOT_STARTED
                  const recommendation = assessment.recommendation
                    ? recommendationConfig[assessment.recommendation]
                    : null
                  const TypeIcon = type.icon

                  return (
                    <TableRow
                      key={assessment.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAssessment(assessment)}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {assessment.candidate?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {assessment.candidate?.job?.title || '-'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-sm font-medium truncate">
                          {assessment.template.name}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={cn('font-normal', type.color)}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {type.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={cn('font-normal', status.color)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn('font-semibold', getScoreColor(assessment.overallScore))}>
                          {assessment.overallScore !== null ? `${assessment.overallScore}%` : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        {recommendation ? (
                          <Badge className={cn('font-normal', recommendation.color)}>
                            {recommendation.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {assessment.inviteSentAt
                            ? format(new Date(assessment.inviteSentAt), 'MMM d, yyyy')
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {assessment.completedAt
                            ? format(new Date(assessment.completedAt), 'MMM d, yyyy')
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedAssessment(assessment)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {assessment.template.externalUrl && (
                              <DropdownMenuItem>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Assessment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Resend Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Result
                            </DropdownMenuItem>
                            {assessment.template.type === 'WORK_TRIAL' && (
                              <DropdownMenuItem>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Sync Dashboard
                              </DropdownMenuItem>
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

      {/* Assessment Detail Sheet */}
      <Sheet open={!!selectedAssessment} onOpenChange={(open) => !open && setSelectedAssessment(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedAssessment && (() => {
            const type = typeConfig[selectedAssessment.template.type] || typeConfig.CUSTOM
            const status = statusConfig[selectedAssessment.status] || statusConfig.NOT_STARTED
            const recommendation = selectedAssessment.recommendation
              ? recommendationConfig[selectedAssessment.recommendation]
              : null
            const TypeIcon = type.icon

            return (
              <>
                <SheetHeader className="pb-4 border-b">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <SheetTitle className="text-lg">
                        {selectedAssessment.candidate?.name || 'Unknown'}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedAssessment.candidate?.job?.title || 'No position'}
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="py-6 space-y-6">
                  {/* Assessment Info */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Assessment</h4>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="font-medium">{selectedAssessment.template.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <Badge className={cn('font-normal', type.color)}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {type.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge className={cn('font-normal', status.color)}>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Score & Recommendation */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Results</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-1">Score</div>
                        <div className={cn('text-2xl font-bold', getScoreColor(selectedAssessment.overallScore))}>
                          {selectedAssessment.overallScore !== null ? `${selectedAssessment.overallScore}%` : '-'}
                        </div>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground mb-1">Recommendation</div>
                        {recommendation ? (
                          <Badge className={cn('font-normal text-base px-3 py-1', recommendation.color)}>
                            {recommendation.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground">Invite Sent</div>
                          <div className="font-medium">
                            {selectedAssessment.inviteSentAt
                              ? format(new Date(selectedAssessment.inviteSentAt), 'MMM d, yyyy \'at\' h:mm a')
                              : 'Not sent yet'}
                          </div>
                        </div>
                      </div>
                      {selectedAssessment.startedAt && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">Started</div>
                            <div className="font-medium">
                              {format(new Date(selectedAssessment.startedAt), 'MMM d, yyyy \'at\' h:mm a')}
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedAssessment.completedAt && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div className="flex-1">
                            <div className="text-sm text-green-700">Completed</div>
                            <div className="font-medium text-green-800">
                              {format(new Date(selectedAssessment.completedAt), 'MMM d, yyyy \'at\' h:mm a')}
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedAssessment.expiresAt && !selectedAssessment.completedAt && (
                        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <div className="flex-1">
                            <div className="text-sm text-amber-700">Expires</div>
                            <div className="font-medium text-amber-800">
                              {format(new Date(selectedAssessment.expiresAt), 'MMM d, yyyy \'at\' h:mm a')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedAssessment.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Notes</h4>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{selectedAssessment.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t space-y-3">
                    <Button asChild className="w-full">
                      <Link href={`/recruiting/candidates/${selectedAssessment.candidateId}`}>
                        <User className="h-4 w-4 mr-2" />
                        View Candidate Profile
                      </Link>
                    </Button>
                    {selectedAssessment.template.externalUrl && (
                      <Button variant="outline" className="w-full" asChild>
                        <a href={selectedAssessment.template.externalUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Assessment Platform
                        </a>
                      </Button>
                    )}
                    {selectedAssessment.status !== 'COMPLETED' && (
                      <Button variant="outline" className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Resend Invite
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
