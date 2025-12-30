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
  CUSTOM: { label: 'Custom', color: 'bg-gray-100 text-gray-800', icon: FileText },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-gray-100 text-gray-600' },
  INVITED: { label: 'Invited', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
}

const recommendationConfig: Record<string, { label: string; color: string }> = {
  HIRE: { label: 'Hire', color: 'bg-green-100 text-green-800' },
  HOLD: { label: 'Hold', color: 'bg-yellow-100 text-yellow-800' },
  NO_HIRE: { label: 'No Hire', color: 'bg-red-100 text-red-800' },
}

export default function AssessmentsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
    { key: 'all', label: 'All Assessments', icon: ClipboardCheck },
    { key: 'CODING_TEST', label: 'Coding Tests', icon: Code },
    { key: 'KANDI_IO', label: 'Kandi.io', icon: Sparkles },
    { key: 'PERSONALITY_MBTI', label: 'MBTI', icon: Brain },
    { key: 'PERSONALITY_BIG5', label: 'Big 5', icon: Brain },
    { key: 'WORK_TRIAL', label: 'Work Trial', icon: Briefcase },
  ]

  // Score color based on value
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assessments</h1>
          <p className="text-sm text-gray-500">
            Track and manage candidate assessments
          </p>
        </div>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Send Assessment
        </Button>
      </div>

      {/* Type Filter Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {types.map((type) => {
          const Icon = type.icon
          return (
            <Card
              key={type.key}
              className={cn(
                'min-w-[140px] cursor-pointer transition-all hover:shadow-md',
                activeFilter === type.key && 'ring-2 ring-primary'
              )}
              onClick={() => setActiveFilter(type.key)}
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500 truncate">{type.label}</span>
                </div>
                <div className="text-xl font-bold">
                  {type.key === 'all'
                    ? counts?.all || 0
                    : counts?.[type.key] || 0}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : !assessments?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="font-medium text-gray-900">No assessments found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Send your first assessment to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Completed</TableHead>
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
                    <TableRow key={assessment.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Link
                          href={`/recruiting/candidates/${assessment.candidateId}`}
                          className="flex items-center gap-3"
                        >
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {assessment.candidate?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assessment.candidate?.job?.title || '-'}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {assessment.template.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-normal', type.color)}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {type.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('font-normal', status.color)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn('font-semibold', getScoreColor(assessment.overallScore))}>
                          {assessment.overallScore !== null ? `${assessment.overallScore}%` : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {recommendation ? (
                          <Badge className={cn('font-normal', recommendation.color)}>
                            {recommendation.label}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {assessment.inviteSentAt
                            ? format(new Date(assessment.inviteSentAt), 'MMM d, yyyy')
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {assessment.completedAt
                            ? format(new Date(assessment.completedAt), 'MMM d, yyyy')
                            : '-'}
                        </span>
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
    </div>
  )
}
