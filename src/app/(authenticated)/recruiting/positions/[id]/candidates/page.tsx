'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Download,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

// Avatar color palette
const avatarColors = [
  'bg-green-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-blue-500',
  'bg-orange-500',
]

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getRelativeTime(date: Date | string) {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 5) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getScoreClass(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-600'
  if (score >= 60) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}

function getStageBadge(stage: string) {
  switch (stage) {
    case 'APPLIED':
      return <Badge variant="secondary" className="bg-muted text-foreground/80">Applied</Badge>
    case 'HR_SCREEN':
      return <Badge className="bg-indigo-100 text-indigo-600 hover:bg-indigo-100">HR Screen</Badge>
    case 'TECHNICAL':
      return <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100">Technical</Badge>
    case 'PANEL':
      return <Badge className="bg-green-100 text-green-600 hover:bg-green-100">Panel Interview</Badge>
    case 'OFFER':
      return <Badge className="bg-pink-100 text-pink-600 hover:bg-pink-100">Offer</Badge>
    case 'HIRED':
      return <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100">Hired</Badge>
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-600 hover:bg-red-100">Rejected</Badge>
    case 'WITHDRAWN':
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Withdrawn</Badge>
    default:
      return <Badge variant="secondary">{stage}</Badge>
  }
}

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-muted text-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  CLOSED: 'Closed',
}

export default function CandidatesListPage() {
  const params = useParams()
  const jobId = params.id as string
  const utils = trpc.useUtils()
  const { data: job, isLoading: jobLoading } = trpc.job.get.useQuery({ id: jobId })
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.job.listCandidates.useQuery({ jobId })
  const upgradeFlowMutation = trpc.hiringFlow.upgradeJobFlow.useMutation({
    onSuccess: () => {
      utils.job.get.invalidate({ id: jobId })
    },
  })

  const [selectedStage, setSelectedStage] = useState('all')
  const [sortBy, setSortBy] = useState('score-desc')
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const isLoading = jobLoading || candidatesLoading

  // Use real candidates from API
  const allCandidates = candidatesData?.candidates || []
  const counts = candidatesData?.counts || {
    all: 0,
    applied: 0,
    hrScreen: 0,
    technical: 0,
    panel: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  }

  // Get stages from hiring flow snapshot or use defaults
  const hiringFlowStages = useMemo(() => {
    if (job?.hiringFlowSnapshot?.stages) {
      return job.hiringFlowSnapshot.stages as string[]
    }
    // Fallback to default stages if no hiring flow is assigned
    return ['Apply', 'People Chat', 'Assessment', 'Team Chat', 'Trial', 'CEO Chat', 'Offer']
  }, [job?.hiringFlowSnapshot?.stages])

  // Build stages array from hiring flow
  const stages = useMemo(() => {
    const baseStages = [{ id: 'all', label: 'All', count: counts.all }]

    // Add stages from hiring flow
    hiringFlowStages.forEach((stage, index) => {
      baseStages.push({
        id: `STAGE_${index}`,
        label: stage,
        count: 0, // Will be calculated from candidates
      })
    })

    return baseStages
  }, [hiringFlowStages, counts.all])

  // Filter candidates by stage
  const stageFilteredCandidates = useMemo(() => {
    let filtered = allCandidates.filter((c) => {
      if (selectedStage === 'all') return true
      return c.stage === selectedStage
    })

    // Sort candidates
    switch (sortBy) {
      case 'score-desc':
        filtered = [...filtered].sort((a, b) => (b.score || 0) - (a.score || 0))
        break
      case 'score-asc':
        filtered = [...filtered].sort((a, b) => (a.score || 0) - (b.score || 0))
        break
      case 'date':
        filtered = [...filtered].sort((a, b) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        )
        break
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return filtered
  }, [allCandidates, selectedStage, sortBy])

  // Calculate pagination
  const totalCandidates = stageFilteredCandidates.length
  const totalPages = Math.ceil(totalCandidates / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCandidates)
  const filteredCandidates = stageFilteredCandidates.slice(startIndex, endIndex)

  // Reset to page 1 when stage or page size changes
  const handleStageChange = (stage: string) => {
    setSelectedStage(stage)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size))
    setCurrentPage(1)
  }

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(filteredCandidates.map((c) => c.id))
    }
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return null
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getLocationSummary = (locations: unknown) => {
    const locs = Array.isArray(locations) ? locations : []
    if (locs.length === 0) return 'Location TBD'
    if (locs.length === 1) return locs[0]
    return `${locs.length} locations`
  }

  // Calculate avg score from candidates
  const avgScore = useMemo(() => {
    const candidatesWithScores = allCandidates.filter((c) => c.score != null)
    if (candidatesWithScores.length === 0) return 0
    return Math.round(
      candidatesWithScores.reduce((sum, c) => sum + (c.score || 0), 0) / candidatesWithScores.length
    )
  }, [allCandidates])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-foreground">Job not found</h2>
        <p className="text-muted-foreground mt-2">The job you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/recruiting/positions">
          <Button className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Job Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {job.title}
              {job.hiresCount > 1 ? ` (${job.hiresCount})` : ''}
            </h1>
            <Badge className={cn(STATUS_BADGES[job.status], 'hover:bg-opacity-100')}>
              {STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.department || 'No Department'} &middot; {getLocationSummary(job.locations)}
            {job.createdAt && <> &middot; Posted {formatDate(job.createdAt)}</>}
            {job.deadline && <> &middot; Deadline {formatDate(job.deadline)}</>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Score Distribution */}
          <div className="text-center">
            <div className="flex items-end gap-0.5 h-10">
              {[15, 25, 45, 80, 100, 70, 40, 20].map((height, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 rounded-t bg-indigo-500',
                    height >= 70 ? 'opacity-100' : 'opacity-30'
                  )}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Score Distribution</div>
          </div>
          <div className="text-center pl-4 border-l border-border">
            <div className="text-3xl font-bold text-foreground">{avgScore}</div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Flow Outdated Banner */}
      {job.flowOutdated && job.hiringFlowSnapshot?.flow && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Hiring flow has been updated
              </p>
              <p className="text-xs text-amber-700">
                This job is using version {job.currentVersion} of the &quot;{job.hiringFlowSnapshot.flow.name}&quot; flow.
                Version {job.latestVersion} is now available.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => upgradeFlowMutation.mutate({ jobId })}
            disabled={upgradeFlowMutation.isPending}
          >
            {upgradeFlowMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Update to v{job.latestVersion}
          </Button>
        </div>
      )}

      {/* Hiring Flow Info */}
      {job.hiringFlowSnapshot?.flow && (
        <div className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{job.hiringFlowSnapshot.flow.name}</span>
          {' '}flow • {hiringFlowStages.length} stages
          {!job.flowOutdated && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Up to date
            </span>
          )}
        </div>
      )}

      {/* Stats Row - Always fits in 1 row */}
      <div className="flex gap-3 min-w-0 mb-6">
        {stages.map((stage) => (
          <Card
            key={stage.id}
            className={cn(
              'flex-1 min-w-0 p-4 cursor-pointer transition-all border-0 shadow-sm',
              selectedStage === stage.id && 'ring-2 ring-indigo-500'
            )}
            onClick={() => handleStageChange(stage.id)}
          >
            <div className="text-xs text-muted-foreground mb-1 truncate">{stage.label}</div>
            <div className="text-xl font-bold text-foreground">{stage.count}</div>
          </Card>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score-desc">Score (High to Low)</SelectItem>
            <SelectItem value="score-asc">Score (Low to High)</SelectItem>
            <SelectItem value="date">Applied Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Link href={`/recruiting/positions/${jobId}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Job
          </Button>
        </Link>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Candidate
        </Button>
      </div>

      {/* Candidates Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-3 px-4 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                    onChange={toggleAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                  Score
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Candidate
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Stage
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Applied
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className={cn(
                    'border-b border-border hover:bg-muted cursor-pointer',
                    selectedCandidates.includes(candidate.id) && 'bg-indigo-50/50'
                  )}
                >
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleCandidate(candidate.id)
                      }}
                      className="rounded border-border"
                    />
                  </td>
                  <td className={cn('py-4 px-4 text-center font-bold text-base', getScoreClass(candidate.score || 0))}>
                    {candidate.score ?? '-'}
                  </td>
                  <td className="py-4 px-4">
                    <Link href={`/recruiting/candidates/${candidate.id}`} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className={cn(getAvatarColor(candidate.name), 'text-white text-[10px]')}>
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{candidate.name}</span>
                    </Link>
                  </td>
                  <td className="py-4 px-4">{getStageBadge(candidate.stage)}</td>
                  <td className="py-4 px-4 text-sm text-foreground/80">
                    {formatDate(candidate.appliedAt)}
                  </td>
                  <td className="py-4 px-4 text-sm text-foreground/80">
                    {getRelativeTime(candidate.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {totalCandidates === 0 ? 0 : startIndex + 1}-{endIndex} of {totalCandidates} candidates
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[80px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedCandidates.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-4">
          <span className="font-medium">{selectedCandidates.length} selected</span>
          <Button size="sm" className="bg-green-500 hover:bg-green-600">
            Advance to Next Stage
          </Button>
          <Button variant="outline" size="sm" className="text-muted-foreground/60 border-gray-600 hover:bg-gray-800">
            Reject
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-white"
            onClick={() => setSelectedCandidates([])}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
