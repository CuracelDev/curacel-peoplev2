'use client'

import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  UserPlus,
  UserMinus,
  Calendar,
  TrendingUp,
  MessageSquare,
  Plus,
  ArrowRight,
  UserCheck,
  FileSignature,
  Activity,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { formatDate, getInitials } from '@/lib/utils'
import { formatAuditAction } from '@/lib/notifications'
import { useSession } from 'next-auth/react'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [selectedJobId, setSelectedJobId] = useState('all')
  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery()
  const { data: onboardingProgress } = trpc.dashboard.getOnboardingProgress.useQuery()
  const { data: hiringOverview } = trpc.dashboard.getHiringOverview.useQuery()
  const { data: jobs } = trpc.job.list.useQuery()
  const { data: pipelineData } = trpc.analytics.getPipelineData.useQuery(
    selectedJobId !== 'all' ? { jobId: selectedJobId } : undefined
  )
  const { data: topCandidates } = trpc.analytics.getTopCandidates.useQuery({ limit: 5 })
  const { data: recentActivity } = trpc.dashboard.getRecentActivity.useQuery()
  const { data: upcomingInterviews } = trpc.interview.getUpcoming.useQuery({ limit: 5 })

  const firstName = session?.user?.name?.split(' ')[0] || 'there'

  const employees = stats?.employees || { total: 0, active: 0 }
  const workflows = stats?.workflows || { pendingOnboarding: 0, pendingOffboarding: 0 }
  const contracts = stats?.offers || { draft: 0, sent: 0, viewed: 0, signed: 0, declined: 0 }
  const recentHires = stats?.recentHires || []
  const upcomingStarts = stats?.upcomingStarts || []
  const pipelineStages = pipelineData?.stages ?? []

  const stageCounts = useMemo(() => {
    return new Map(pipelineStages.map((stage) => [stage.stage, stage.count]))
  }, [pipelineStages])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const appliedCount = stageCounts.get('APPLIED') ?? 0
  const hrScreenCount = stageCounts.get('HR_SCREEN') ?? 0
  const technicalCount = stageCounts.get('TECHNICAL') ?? 0
  const panelCount = stageCounts.get('PANEL') ?? 0
  const offerCount = stageCounts.get('OFFER') ?? 0
  const hiredCount = stageCounts.get('HIRED') ?? 0

  const totalCandidates =
    hiringOverview?.totalCandidates ?? pipelineData?.totalCandidates ?? 0

  const conversionRate =
    totalCandidates > 0
      ? Math.round(((offerCount + hiredCount) / totalCandidates) * 100)
      : 0
  const conversionWidth = Math.min(conversionRate, 100)

  const hiringStats = {
    activeJobs: hiringOverview?.activeJobs ?? 0,
    totalCandidates,
    inInterview: hiringOverview?.inInterview ?? 0,
    avgScore: hiringOverview?.avgScore,
  }

  const formatDelta = (value: number | null | undefined, suffix: string) => {
    if (value == null) return 'No data yet'
    const sign = value > 0 ? '+' : ''
    return `${sign}${value} ${suffix}`
  }

  const deltaClass = (value: number | null | undefined) => {
    if (value == null || value === 0) return 'text-muted-foreground'
    return value > 0 ? 'text-success' : 'text-red-500'
  }

  const deltaIconClass = (value: number | null | undefined) => {
    if (value != null && value < 0) return 'rotate-180'
    return ''
  }

  const jobsDelta = hiringOverview?.changes.newJobsThisWeek ?? null
  const candidatesDelta = hiringOverview?.changes.newCandidatesThisWeek ?? null
  const interviewsDelta = hiringOverview?.changes.interviewsScheduledThisWeek ?? null

  const scoreDelta = hiringOverview?.changes.avgScoreDelta ?? null
  const scoreDeltaLabel =
    scoreDelta == null ? 'No score trend yet' : `${scoreDelta > 0 ? '+' : ''}${scoreDelta} from last week`
  const scoreDeltaClass =
    scoreDelta == null ? 'text-muted-foreground' : scoreDelta >= 0 ? 'text-success' : 'text-red-500'
  const scoreDeltaIconClass = scoreDelta != null && scoreDelta < 0 ? 'rotate-180' : ''

  const activityItems = (recentActivity ?? []).slice(0, 4).map((activity) => {
    const actionLabel = formatAuditAction(activity.action)
    const actorLabel = activity.actor?.name || activity.actor?.email || activity.actorEmail || 'System'
    const resourceLabel = activity.resourceType.replace(/_/g, ' ')
    const description = `${actorLabel} - ${resourceLabel}`

    const iconConfig = (() => {
      const actionValue = activity.action.toString()
      if (actionValue.includes('CANDIDATE') || actionValue.includes('APPLIC')) {
        return { icon: UserPlus, className: 'bg-blue-100 text-blue-600' }
      }
      if (actionValue.includes('INTERVIEW')) {
        return { icon: CheckCircle, className: 'bg-success/10 text-success' }
      }
      if (actionValue.includes('OFFER') || actionValue.includes('CONTRACT')) {
        return { icon: FileSignature, className: 'bg-indigo-100 text-indigo-600' }
      }
      if (actionValue.includes('ONBOARD')) {
        return { icon: UserCheck, className: 'bg-emerald-100 text-emerald-600' }
      }
      if (actionValue.includes('OFFBOARD')) {
        return { icon: UserMinus, className: 'bg-red-100 text-red-600' }
      }
      if (actionValue.includes('EMPLOYEE')) {
        return { icon: Users, className: 'bg-sky-100 text-sky-600' }
      }
      return { icon: Activity, className: 'bg-muted text-foreground' }
    })()

    return {
      id: activity.id,
      title: actionLabel,
      description,
      time: formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }),
      icon: iconConfig.icon,
      className: iconConfig.className,
    }
  })

  const upcomingInterviewRows = (upcomingInterviews ?? []).map((interview) => {
    const candidate = interview.candidate
    const stageClassMap: Record<string, string> = {
      HR_SCREEN: 'bg-muted text-foreground',
      TECHNICAL: 'bg-purple-100 text-purple-700',
      TEAM_CHAT: 'bg-success/10 text-success',
      ADVISOR_CHAT: 'bg-indigo-100 text-indigo-700',
      PANEL: 'bg-orange-100 text-orange-700',
      TRIAL: 'bg-blue-100 text-blue-700',
      CEO_CHAT: 'bg-pink-100 text-pink-700',
      OFFER: 'bg-emerald-100 text-emerald-700',
    }

    const scheduledAt = interview.scheduledAt ? new Date(interview.scheduledAt) : null
    const interviewers = Array.isArray(interview.interviewers) ? interview.interviewers : []
    const interviewerNames = interviewers
      .map((person) => {
        if (typeof person === 'string') return person
        if (person && typeof person === 'object' && 'name' in person) {
          return String((person as { name?: string }).name || '')
        }
        return ''
      })
      .filter(Boolean)
    const interviewerInitials = interviewerNames.map((name) => getInitials(name)).slice(0, 3)

    return {
      id: interview.id,
      candidateId: candidate?.id || '',
      candidateName: candidate?.name || 'Candidate',
      candidateEmail: candidate?.email || '',
      position: candidate?.job?.title || 'Role',
      stage: interview.stageDisplayName,
      stageClass: stageClassMap[interview.stage] || 'bg-muted text-foreground',
      date: scheduledAt ? format(scheduledAt, 'MMM d, h:mm a') : 'Unscheduled',
      relative: scheduledAt ? formatDistanceToNow(scheduledAt, { addSuffix: true }) : 'TBD',
      interviewers: interviewerInitials,
    }
  })

  const topCandidateRows = topCandidates ?? []

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your hiring pipeline</p>
      </div>

      {/* Hiring Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Active Jobs</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.activeJobs}</span>
              <span className={`text-xs mt-1 flex items-center gap-1 ${deltaClass(jobsDelta)}`}>
                <TrendingUp className="h-3 w-3" />
                {formatDelta(jobsDelta, 'this week')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Candidates</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.totalCandidates}</span>
              <span className={`text-xs mt-1 flex items-center gap-1 ${deltaClass(candidatesDelta)}`}>
                <TrendingUp className={`h-3 w-3 ${deltaIconClass(candidatesDelta)}`} />
                {formatDelta(candidatesDelta, 'this week')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">In Interview</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.inInterview}</span>
              <span className={`text-xs mt-1 flex items-center gap-1 ${deltaClass(interviewsDelta)}`}>
                <TrendingUp className={`h-3 w-3 ${deltaIconClass(interviewsDelta)}`} />
                {formatDelta(interviewsDelta, 'scheduled this week')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Avg. Score</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.avgScore ?? '-'}</span>
              <span className={`text-xs mt-1 flex items-center gap-1 ${scoreDeltaClass}`}>
                <TrendingUp className={`h-3 w-3 ${scoreDeltaIconClass}`} />
                {scoreDeltaLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* People Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Active Employees</span>
              <span className="text-3xl font-bold mt-1">{employees.active}</span>
              <span className="text-xs text-muted-foreground mt-1">{employees.total} total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Pending Contracts</span>
              <span className="text-3xl font-bold mt-1">{(contracts.sent || 0) + (contracts.viewed || 0)}</span>
              <span className="text-xs text-muted-foreground mt-1">{contracts.signed || 0} signed this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Onboarding</span>
              <span className="text-3xl font-bold mt-1">{workflows.pendingOnboarding}</span>
              <span className="text-xs text-muted-foreground mt-1">in progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Offboarding</span>
              <span className="text-3xl font-bold mt-1">{workflows.pendingOffboarding}</span>
              <span className="text-xs text-muted-foreground mt-1">scheduled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Pipeline Overview</CardTitle>
            <select
              className="text-sm border rounded-lg px-3 py-1.5 bg-card"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              <option value="all">All Jobs</option>
              {(jobs || []).map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{appliedCount}</p>
                  <p className="text-xs text-muted-foreground">Applied</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{hrScreenCount}</p>
                  <p className="text-xs text-muted-foreground">HR Screen</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{technicalCount}</p>
                  <p className="text-xs text-muted-foreground">Technical</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{panelCount}</p>
                  <p className="text-xs text-muted-foreground">Panel</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{offerCount}</p>
                  <p className="text-xs text-muted-foreground">Offer</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="text-sm font-medium">{conversionRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"
                  style={{ width: `${conversionWidth}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <Link href="/settings/audit" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityItems.length > 0 ? (
                activityItems.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${activity.className}`}>
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Candidates + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Top Candidates</CardTitle>
            <Link href="/hiring/candidates" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCandidateRows.length > 0 ? (
                topCandidateRows.map((candidate, index) => (
                  <Link key={candidate.id} href={`/recruiting/candidates/${candidate.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                      <span className="text-sm text-muted-foreground w-4">{index + 1}</span>
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={`text-xs font-medium ${
                          index === 0 ? 'bg-success/10 text-success' :
                          index === 1 ? 'bg-orange-100 text-orange-700' :
                          index === 2 ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {candidate.job?.title || candidate.currentRole || 'Role'}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${
                        (candidate.score ?? 0) >= 85 ? 'text-success' :
                        (candidate.score ?? 0) >= 75 ? 'text-orange-500' :
                        'text-foreground/80'
                      }`}>
                        {candidate.score ?? '-'}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No scored candidates yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/hiring/positions/new">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Create New Job</p>
                    <p className="text-xs text-muted-foreground">Set up a new hiring position</p>
                  </div>
                </div>
              </Link>

              <Link href="/hiring/candidates?add=1">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-muted">
                    <UserPlus className="h-5 w-5 text-foreground/80" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Add Candidate</p>
                    <p className="text-xs text-muted-foreground">Manually add a new candidate</p>
                  </div>
                </div>
              </Link>

              <Link href="/hiring/questions">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-success/10">
                    <MessageSquare className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Generate Questions</p>
                    <p className="text-xs text-muted-foreground">AuntyPelz interview questions</p>
                  </div>
                </div>
              </Link>

              <Link href="/hiring/interviews">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Schedule Interview</p>
                    <p className="text-xs text-muted-foreground">Plan upcoming interview slots</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Interviews */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Upcoming Interviews</CardTitle>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/hiring/interviews">
              <Calendar className="h-4 w-4" />
              View Calendar
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-medium">Candidate</th>
                  <th className="pb-3 font-medium">Position</th>
                  <th className="pb-3 font-medium">Stage</th>
                  <th className="pb-3 font-medium">Date & Time</th>
                  <th className="pb-3 font-medium">Interviewers</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingInterviewRows.length > 0 ? (
                  upcomingInterviewRows.map((interview) => (
                    <tr key={interview.id} className="hover:bg-muted">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {getInitials(interview.candidateName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{interview.candidateName}</p>
                            <p className="text-xs text-muted-foreground">{interview.candidateEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-foreground">{interview.position}</span>
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className={interview.stageClass}>
                          {interview.stage}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <p className="text-sm font-medium text-foreground">{interview.date}</p>
                        <p className="text-xs text-muted-foreground">{interview.relative}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex -space-x-2">
                          {interview.interviewers.length > 0 ? (
                            interview.interviewers.map((initials, i) => (
                              <Avatar key={i} className="h-7 w-7 border-2 border-white">
                                <AvatarFallback className="bg-muted text-foreground/80 text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">TBD</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        {interview.candidateId ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/recruiting/candidates/${interview.candidateId}/interviews/${interview.id}`}>
                              Prepare
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Prepare
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No upcoming interviews scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Contract Status + Active Onboarding */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Contract Status</CardTitle>
            <CardDescription>Current pipeline status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-24 text-sm text-foreground/80">Draft</div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${contracts.draft ? (contracts.draft / 10) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.draft || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm text-foreground/80">Sent</div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full"
                      style={{ width: `${contracts.sent ? (contracts.sent / 10) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.sent || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm text-foreground/80">Viewed</div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full"
                      style={{ width: `${contracts.viewed ? (contracts.viewed / 10) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.viewed || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm text-foreground/80">Signed</div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${contracts.signed ? (contracts.signed / 10) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.signed || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Active Onboarding</CardTitle>
            <CardDescription>Progress for new hires</CardDescription>
          </CardHeader>
          <CardContent>
            {onboardingProgress && onboardingProgress.length > 0 ? (
              <div className="space-y-4">
                {onboardingProgress.map((workflow) => (
                  <Link key={workflow.id} href={`/onboarding/${workflow.id}`}>
                    <div className="flex items-center p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{workflow.employee.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          Start: {workflow.employee.startDate ? formatDate(workflow.employee.startDate) : 'TBD'}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <div className="w-24">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${workflow.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-foreground/80 w-10">{workflow.progress}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No active onboarding</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Hires + Upcoming Starts */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Recent Hires
            </CardTitle>
            <CardDescription>Started in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {recentHires && recentHires.length > 0 ? (
              <div className="space-y-3">
                {recentHires.map((employee) => (
                  <Link key={employee.id} href={`/employees/${employee.id}`}>
                    <div className="flex items-center p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{employee.fullName}</p>
                        <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
                      </div>
                      <Badge variant="outline">{employee.department}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No recent hires</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Upcoming Starts
            </CardTitle>
            <CardDescription>Starting in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingStarts && upcomingStarts.length > 0 ? (
              <div className="space-y-3">
                {upcomingStarts.map((employee) => (
                  <Link key={employee.id} href={`/employees/${employee.id}`}>
                    <div className="flex items-center p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{employee.fullName}</p>
                        <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {employee.startDate ? formatDate(employee.startDate) : 'TBD'}
                        </p>
                        <Badge variant="outline">{employee.department}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No upcoming starts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
