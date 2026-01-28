'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  Code,
  Palette,
  TrendingUp,
  Loader2,
  Users,
  Link as LinkIcon,
  Clipboard,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { PageActions } from '@/components/layout/page-actions'

function getJobIcon(department?: string | null) {
  const dept = department?.toLowerCase() || ''
  if (dept.includes('engineer') || dept.includes('tech') || dept.includes('dev')) {
    return <Code className="h-6 w-6" />
  }
  if (dept.includes('design') || dept.includes('product')) {
    return <Palette className="h-6 w-6" />
  }
  if (dept.includes('growth') || dept.includes('sales') || dept.includes('market')) {
    return <TrendingUp className="h-6 w-6" />
  }
  return <Briefcase className="h-6 w-6" />
}

function getJobIconBg(department?: string | null) {
  const dept = department?.toLowerCase() || ''
  if (dept.includes('engineer') || dept.includes('tech') || dept.includes('dev')) {
    return 'bg-gradient-to-br from-indigo-500 to-purple-600'
  }
  if (dept.includes('design') || dept.includes('product')) {
    return 'bg-gradient-to-br from-pink-500 to-rose-500'
  }
  if (dept.includes('growth') || dept.includes('sales') || dept.includes('market')) {
    return 'bg-gradient-to-br from-amber-500 to-red-500'
  }
  return 'bg-indigo-600'
}

type FilterStatus = 'all' | 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'HIRED'

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  PAUSED: 'Paused',
  HIRED: 'Hired',
}

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  HIRED: 'bg-blue-100 text-blue-700',
}

// Priority badge styles
const PRIORITY_BADGES: Record<number, { label: string; className: string }> = {
  1: { label: 'Low', className: 'bg-muted text-foreground/80' },
  2: { label: 'Normal', className: 'bg-blue-100 text-blue-700' },
  3: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
  4: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  5: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
}

// Score circle component for displaying average candidate score
function ScoreCircle({ score, label }: { score: number; label: string }) {
  const normalizedScore = Math.min(Math.max(score, 0), 100)

  return (
    <div
      className="relative flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${normalizedScore * 3.6}deg, hsl(var(--muted)) ${normalizedScore * 3.6}deg)`,
      }}
    >
      <div className="flex h-[100px] w-[100px] flex-col items-center justify-center rounded-full bg-white">
        <span className="text-[32px] font-bold leading-none text-foreground">{score}</span>
        <span className="mt-0.5 text-[12px] leading-none text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

export default function PositionsPage() {
  const { data: teams } = trpc.team.listForSelect.useQuery()
  const { data: jobs, isLoading, refetch } = trpc.job.list.useQuery()
  const { data: counts } = trpc.job.getCounts.useQuery()
  const { data: recruitingSettings } = trpc.hiringSettings.get.useQuery()

  const [filter, setFilter] = useState<FilterStatus>('all')
  const [department, setDepartment] = useState('all')
  const scoreDisplay = recruitingSettings?.jobScoreDisplay ?? 'average'

  const filteredJobs = (jobs || []).filter((job) => {
    if (filter !== 'all' && job.status !== filter) return false
    if (department !== 'all' && job.department !== department) return false
    return true
  })

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

  const copyPublicLink = (jobId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/careers/${jobId}`
    navigator.clipboard.writeText(url)
    toast.success('Public application link copied to clipboard!')
  }

  return (
    <div className="py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
      <PageActions>
        <Link href="/hiring/positions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </PageActions>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        {(['all', 'ACTIVE', 'DRAFT', 'PAUSED', 'HIRED'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              filter === status
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-card text-foreground/80 border-border hover:border-border'
            )}
          >
            {STATUS_LABELS[status]} ({status === 'all' ? counts?.all ?? 0 : counts?.[status.toLowerCase() as keyof typeof counts] ?? 0})
          </button>
        ))}
        <div className="flex-1" />
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {(teams || []).map((team) => (
              <SelectItem key={team.id} value={team.name}>
                {team.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Jobs List */}
      {!isLoading && (
        <div className="flex flex-col gap-4">
          {filteredJobs.map((job) => {
            // Use real stats from the job data
            const stats = job.stats || {
              applicants: 0,
              inReview: 0,
              interviewing: 0,
              offerStage: 0,
              avgScore: 0,
              maxScore: 0,
            }
            const stageBreakdown = (job as { stageBreakdown?: Array<{ label: string; count: number }> }).stageBreakdown || []
            const summaryStages = stageBreakdown.length > 0
              ? stageBreakdown.slice(0, 4)
              : [
                { label: 'Applicants', count: stats.applicants },
                { label: 'In Review', count: stats.inReview },
                { label: 'Interviewing', count: stats.interviewing },
                { label: 'Offer Stage', count: stats.offerStage },
              ]
            const scoreValue = scoreDisplay === 'max' ? stats.maxScore : stats.avgScore
            const scoreLabel = scoreDisplay === 'max' ? 'max score' : 'avg score'

            return (
              <div
                key={job.id}
                className="bg-card border border-border rounded-xl p-5 flex gap-5 transition-all hover:border-indigo-500 hover:shadow-md relative"
              >
                <div className={cn('hidden sm:flex w-12 h-12 rounded-lg items-center justify-center text-white flex-shrink-0', getJobIconBg(job.department))}>
                  {getJobIcon(job.department)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={`/recruiting/positions/${job.id}/candidates`}>
                      <h3 className="text-[18px] font-semibold hover:text-indigo-600 transition-colors">
                        {job.title}
                        {job.hiresCount > 1 ? ` (${job.hiresCount})` : ''}
                      </h3>
                    </Link>
                    <Badge className={cn(STATUS_BADGES[job.status], 'hover:bg-opacity-100')}>
                      {STATUS_LABELS[job.status]}
                    </Badge>
                    {job.priority && job.priority !== 3 && (
                      <Badge className={cn(PRIORITY_BADGES[job.priority]?.className || PRIORITY_BADGES[3].className, 'hover:bg-opacity-100')}>
                        {PRIORITY_BADGES[job.priority]?.label || 'Medium'}
                      </Badge>
                    )}
                  </div>

                  {/* Copy Link Component */}
                  <div className="flex items-center gap-4 mt-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        copyPublicLink(job.id)
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 font-medium bg-indigo-50 px-2 py-0.5 rounded transition-colors group"
                    >
                      <Clipboard className="h-3 w-3 group-hover:scale-110 transition-transform" />
                      Copy Public Link
                    </button>
                    <a
                      href={`/careers/${job.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-muted-foreground hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Public Page
                    </a>
                  </div>

                  {/* Location under title */}
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {getLocationSummary(job.locations)}
                  </div>

                  {/* Job Meta - Team and Dates */}
                  <div className="flex gap-4 mt-3 flex-wrap">
                    {job.department && (
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {job.department}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Posted {formatDate(job.createdAt)}
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        Deadline {formatDate(job.deadline)}
                      </div>
                    )}
                  </div>

                  {/* Job Stats */}
                  <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6 mt-4 pt-4 border-t border-border">
                    {summaryStages.map((stage) => (
                      <Link
                        key={stage.label}
                        href={`/hiring/positions/${job.id}/candidates?stage=all`}
                        className="text-center transition-colors hover:text-indigo-600"
                      >
                        <div className="text-[20px] font-semibold leading-none">{stage.count}</div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">{stage.label}</div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Score Circle */}
                <div className="hidden sm:flex flex-col items-end justify-start">
                  <ScoreCircle score={scoreValue} label={scoreLabel} />
                </div>
              </div>
            )
          })}

          {/* Empty State */}
          {filteredJobs.length === 0 && !isLoading && (
            <div className="bg-muted/50 border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-1">No jobs found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filter !== 'all' || department !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first job posting'}
              </p>
              <Link href="/hiring/positions/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            </div>
          )}

          {/* Create New Job Card - only show if there are existing jobs */}
          {filteredJobs.length > 0 && (
            <Link
              href="/hiring/positions/new"
              className="bg-muted/50 border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center min-h-[160px] transition-all hover:border-indigo-500 hover:bg-indigo-50/30"
            >
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-3">
                <Plus className="h-6 w-6" />
              </div>
              <div className="font-semibold text-foreground">Create New Job</div>
              <div className="text-[13px] text-muted-foreground mt-1">Set up a new hiring position</div>
            </Link>
          )}
        </div>
      )
      }
    </div >
  )
}
