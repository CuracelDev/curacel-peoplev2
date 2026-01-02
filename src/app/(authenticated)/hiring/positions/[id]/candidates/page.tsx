'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
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
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

type ColumnKey = 'location' | 'source' | 'salary' | 'mbti'

const COLUMN_STORAGE_KEY = 'hiring.jobCandidates.visibleColumns'

const sourceLabels: Record<string, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
  RECRUITER: 'Recruiter',
  EXCELLER: 'Exceller',
}

const inboundLabels: Record<string, string> = {
  YC: 'YC',
  PEOPLEOS: 'PeopleOS',
  COMPANY_SITE: 'Company Site',
  OTHER: 'Other',
}

const outboundLabels: Record<string, string> = {
  LINKEDIN: 'LinkedIn',
  JOB_BOARDS: 'Job Boards',
  GITHUB: 'GitHub',
  TWITTER: 'Twitter',
  OTHER: 'Other',
}

const formatSource = (candidate: { source?: string | null; inboundChannel?: string | null; outboundChannel?: string | null }) => {
  if (!candidate.source) return '—'
  const base = sourceLabels[candidate.source] || candidate.source
  if (candidate.source === 'INBOUND' && candidate.inboundChannel) {
    return `${base} • ${inboundLabels[candidate.inboundChannel] || candidate.inboundChannel}`
  }
  if (candidate.source === 'OUTBOUND' && candidate.outboundChannel) {
    return `${base} • ${outboundLabels[candidate.outboundChannel] || candidate.outboundChannel}`
  }
  return base
}

const formatSalary = (candidate: { salaryExpMin?: number | null; salaryExpMax?: number | null; salaryExpCurrency?: string | null }) => {
  const min = candidate.salaryExpMin ?? null
  const max = candidate.salaryExpMax ?? null
  if (!min && !max) return '—'
  const currency = candidate.salaryExpCurrency || 'USD'
  const formatValue = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
    } catch (error) {
      return `${currency} ${value}`
    }
  }
  if (min && max) return `${formatValue(min)}–${formatValue(max)}`
  if (min) return `From ${formatValue(min)}`
  return `Up to ${formatValue(max as number)}`
}

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
  if (score >= 80) return 'bg-success/10 text-success'
  if (score >= 60) return 'bg-warning/10 text-warning'
  return 'bg-destructive/10 text-destructive'
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
      return <Badge className="bg-success/10 text-success hover:bg-success/10">Panel Interview</Badge>
    case 'OFFER':
      return <Badge className="bg-pink-100 text-pink-600 hover:bg-pink-100">Offer</Badge>
    case 'HIRED':
      return <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100">Hired</Badge>
    case 'REJECTED':
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">Rejected</Badge>
    case 'WITHDRAWN':
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Withdrawn</Badge>
    default:
      return <Badge variant="secondary">{stage}</Badge>
  }
}

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
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
  const searchParams = useSearchParams()
  const { data: job, isLoading: jobLoading } = trpc.job.get.useQuery({ id: jobId })
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.job.listCandidates.useQuery({ jobId })
  const updateCandidateStage = trpc.job.updateCandidate.useMutation({
    onSuccess: () => {
      utils.job.listCandidates.invalidate({ jobId })
    },
  })
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
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    location: false,
    source: false,
    salary: false,
    mbti: false,
  })

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

  const stages = useMemo(() => ([
    { id: 'all', label: 'Applicants', count: counts.all },
    { id: 'applied', label: 'In Review', count: counts.applied },
    {
      id: 'interviewing',
      label: 'Interviewing',
      count: counts.hrScreen + counts.technical + counts.panel,
    },
    { id: 'offer', label: 'Offer Stage', count: counts.offer },
  ]), [counts])

  // Filter candidates by stage
  const stageFilteredCandidates = useMemo(() => {
    let filtered = allCandidates.filter((c) => {
      if (selectedStage === 'all') return true
      if (selectedStage === 'applied') return c.stage === 'APPLIED'
      if (selectedStage === 'interviewing') {
        return ['HR_SCREEN', 'TECHNICAL', 'PANEL'].includes(c.stage)
      }
      if (selectedStage === 'offer') return c.stage === 'OFFER'
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
  const optionalColumns = useMemo(() => ([
    { key: 'location', label: 'Country', render: (candidate: typeof filteredCandidates[number]) => candidate.location || '—' },
    { key: 'source', label: 'Source', render: (candidate: typeof filteredCandidates[number]) => formatSource(candidate) },
    { key: 'salary', label: 'Salary', render: (candidate: typeof filteredCandidates[number]) => formatSalary(candidate) },
    { key: 'mbti', label: 'MBTI', render: (candidate: typeof filteredCandidates[number]) => candidate.mbtiType || '—' },
  ]), [filteredCandidates])
  const visibleOptionalColumns = optionalColumns.filter((column) => visibleColumns[column.key])

  // Reset to page 1 when stage or page size changes
  const handleStageChange = (stage: string) => {
    setSelectedStage(stage)
    setCurrentPage(1)
  }

  useEffect(() => {
    const stageParam = searchParams.get('stage')
    if (!stageParam) return
    const normalized = stageParam.toLowerCase()
    const stageMap: Record<string, string> = {
      all: 'all',
      applicants: 'all',
      applied: 'applied',
      'in-review': 'applied',
      interviewing: 'interviewing',
      offer: 'offer',
      'offer-stage': 'offer',
    }
    const nextStage = stageMap[normalized]
    if (nextStage && nextStage !== selectedStage) {
      setSelectedStage(nextStage)
      setCurrentPage(1)
    }
  }, [searchParams, selectedStage])

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size))
    setCurrentPage(1)
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as Partial<Record<ColumnKey, boolean>>
      setVisibleColumns((prev) => ({ ...prev, ...parsed }))
    } catch (error) {
      console.error('Failed to parse column preferences', error)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

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
        <Link href="/hiring/positions">
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
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-warning/5 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning-foreground">
                Hiring flow has been updated
              </p>
              <p className="text-xs text-warning-foreground/80">
                This job is using version {job.currentVersion} of the &quot;{job.hiringFlowSnapshot.flow.name}&quot; flow.
                Version {job.latestVersion} is now available.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-warning/30 text-warning hover:bg-warning/10"
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
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success-foreground">
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
            <div className="mt-2 text-xl font-bold text-foreground">{stage.count}</div>
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
                {visibleOptionalColumns.map((column) => (
                  <th
                    key={column.key}
                    className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Applied
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center justify-between gap-2">
                    <span>Last Updated</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {optionalColumns.map((column) => (
                          <DropdownMenuCheckboxItem
                            key={column.key}
                            checked={visibleColumns[column.key]}
                            onCheckedChange={(checked) => {
                              setVisibleColumns((prev) => ({
                                ...prev,
                                [column.key]: Boolean(checked),
                              }))
                            }}
                          >
                            {column.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                    <div className="flex items-center gap-2">
                      <Link href={`/recruiting/candidates/${candidate.id}`} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={cn(getAvatarColor(candidate.name), 'text-white text-[10px]')}>
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex flex-col">
                        <Link href={`/recruiting/candidates/${candidate.id}`} className="font-medium text-sm">
                          {candidate.name}
                        </Link>
                        {candidate.linkedinUrl && (
                          <a
                            href={candidate.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-[#0A66C2] hover:text-[#004182]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="inline-flex h-3 w-3" aria-hidden="true">
                              <svg viewBox="0 0 24 24" role="img" aria-label="" fill="currentColor">
                                <path d="M4.98 3.5C4.98 4.88 3.88 6 2.49 6 1.12 6 0 4.88 0 3.5 0 2.12 1.12 1 2.49 1c1.39 0 2.49 1.12 2.49 2.5zM.5 24h3.99V7.98H.5V24zM8.98 7.98h3.83v2.16h.05c.53-1 1.83-2.16 3.77-2.16 4.03 0 4.77 2.65 4.77 6.1V24h-3.99v-8.62c0-2.06-.03-4.71-2.87-4.71-2.87 0-3.31 2.24-3.31 4.56V24H8.98V7.98z" />
                              </svg>
                            </span>
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">{getStageBadge(candidate.stage)}</td>
                  {visibleOptionalColumns.map((column) => (
                    <td key={column.key} className="py-4 px-4 text-sm text-foreground/80">
                      {column.render(candidate)}
                    </td>
                  ))}
                  <td className="py-4 px-4 text-sm text-foreground/80">
                    {formatDate(candidate.appliedAt)}
                  </td>
                  <td className="py-4 px-4 text-sm text-foreground/80">
                    <div className="flex items-center justify-between gap-2">
                      <span>{getRelativeTime(candidate.updatedAt)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateCandidateStage.mutate({ id: candidate.id, stage: 'ARCHIVED' })}
                          >
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateCandidateStage.mutate({ id: candidate.id, stage: 'REJECTED' })}
                          >
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
          <Button size="sm" className="bg-success hover:bg-success">
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
