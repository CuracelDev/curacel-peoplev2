'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  UserPlus,
  HelpCircle,
  Upload,
  ChevronRight,
  Star,
  UserMinus,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc-client'
import { format, formatDistanceToNow } from 'date-fns'

function getActivityIcon(type: string) {
  switch (type) {
    case 'new':
      return <UserPlus className="h-4 w-4" />
    case 'score':
      return <Star className="h-4 w-4" />
    case 'interview':
      return <Calendar className="h-4 w-4" />
    case 'reject':
      return <UserMinus className="h-4 w-4" />
    default:
      return <Users className="h-4 w-4" />
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'new':
      return 'bg-success/10 text-success'
    case 'score':
      return 'bg-amber-50 text-amber-600'
    case 'interview':
      return 'bg-indigo-50 text-indigo-600'
    case 'reject':
      return 'bg-red-50 text-red-600'
    default:
      return 'bg-muted/50 text-foreground/80'
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-success/10 text-success'
  if (score >= 60) return 'bg-warning/10 text-warning'
  return 'bg-destructive/10 text-destructive'
}

function getRankStyle(rank: number) {
  if (rank === 1) return 'bg-amber-100 text-amber-700'
  if (rank === 2) return 'bg-muted text-foreground/80'
  if (rank === 3) return 'bg-orange-100 text-orange-700'
  return 'bg-muted text-foreground/80'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = ['bg-green-500', 'bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500', 'bg-teal-500']
  const index = name.length % colors.length
  return colors[index]
}

export default function RecruitingDashboard() {
  const [selectedJob, setSelectedJob] = useState('all')

  // Fetch dashboard data from database
  const { data: dashboardStats, isLoading: statsLoading } = trpc.analytics.getDashboardStats.useQuery()
  const { data: pipelineData, isLoading: pipelineLoading } = trpc.analytics.getPipelineData.useQuery()
  const { data: topCandidates, isLoading: topLoading } = trpc.analytics.getTopCandidates.useQuery({ limit: 5 })

  // Build stats from dashboard data
  const stats = dashboardStats ? [
    { label: 'Active Jobs', value: dashboardStats.totalActiveJobs, change: 'this week', positive: true },
    { label: 'Total Candidates', value: dashboardStats.totalCandidates, change: 'in pipeline', positive: true },
    {
      label: 'In Interview',
      value: dashboardStats.candidatesByStage
        .filter(s => ['HR_SCREEN', 'TECHNICAL', 'TEAM_CHAT', 'PANEL'].includes(s.stage))
        .reduce((sum, s) => sum + s.count, 0),
      change: 'active interviews',
      positive: true,
    },
    {
      label: 'Pending Offer',
      value: dashboardStats.candidatesByStage.find(s => s.stage === 'OFFER')?.count || 0,
      change: 'awaiting decision',
      positive: true,
    },
  ] : []

  // Build pipeline stages from database
  const pipelineStages = pipelineData ? [
    { label: 'Applied', count: pipelineData.stages.find(s => s.stage === 'APPLIED')?.count || 0 },
    { label: 'People Chat', count: pipelineData.stages.find(s => s.stage === 'HR_SCREEN')?.count || 0 },
    { label: 'Coding Test', count: pipelineData.stages.find(s => s.stage === 'TECHNICAL')?.count || 0 },
    { label: 'Team Chat', count: pipelineData.stages.find(s => s.stage === 'TEAM_CHAT')?.count || 0 },
    { label: 'Offer', count: pipelineData.stages.find(s => s.stage === 'OFFER')?.count || 0 },
  ] : []

  // Build recent activity from database
  const recentActivity = dashboardStats?.recentActivity.map(activity => ({
    type: 'new',
    title: activity.name,
    description: `Stage: ${activity.stageDisplayName}${activity.job ? ` • ${activity.job.title}` : ''}`,
    time: formatDistanceToNow(new Date(activity.updatedAt), { addSuffix: true }),
  })) || []

  // Build upcoming interviews from database
  const upcomingInterviews = dashboardStats?.upcomingInterviews.map(interview => {
    const scheduledDate = interview.scheduledAt instanceof Date
      ? interview.scheduledAt
      : new Date(interview.scheduledAt)
    return {
      id: interview.id,
      candidate: interview.candidate.name,
      email: '',
      initials: getInitials(interview.candidate.name),
      color: getAvatarColor(interview.candidate.name),
      position: interview.candidate.job?.title || 'Unknown Position',
      stage: interview.stageName || interview.stage,
      stageBadge: 'secondary' as const,
      date: format(scheduledDate, 'MMM d, h:mm a'),
      dateSubtext: formatDistanceToNow(scheduledDate, { addSuffix: true }),
    }
  }) || []

  const conversionRate = pipelineData
    ? (pipelineData.hiresLast30Days / Math.max(pipelineData.applicationsLast30Days, 1) * 100).toFixed(1)
    : '0'

  if (statsLoading || pipelineLoading || topLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-4 sm:mb-6">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>
              <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
              <div className={`text-sm mt-2 flex items-center gap-1 ${stat.positive ? 'text-success' : 'text-red-600'}`}>
                {stat.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline and Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Pipeline Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
            <CardTitle className="text-base font-semibold">Pipeline Overview</CardTitle>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-auto">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                <SelectItem value="backend">Senior Backend Engineer</SelectItem>
                <SelectItem value="designer">Product Designer</SelectItem>
                <SelectItem value="growth">Growth Lead</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-center justify-between">
              {pipelineStages.map((stage, i) => (
                <div key={i} className="flex items-center">
                  <div className="text-center px-4">
                    <div className="text-2xl font-bold text-foreground">{stage.count}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stage.label}</div>
                  </div>
                  {i < pipelineStages.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Conversion Rate (30d)</span>
                <span>{conversionRate}%</span>
              </div>
              <Progress value={parseFloat(conversionRate)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Link href="/hiring/activity" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-1">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{activity.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{activity.description}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{activity.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Candidates and Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Top Candidates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
            <CardTitle className="text-base font-semibold">Top Candidates</CardTitle>
            <Link href="/hiring/candidates" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-1">
              {topCandidates && topCandidates.length > 0 ? (
                topCandidates.map((candidate, i) => (
                  <Link
                    key={candidate.id}
                    href={`/recruiting/candidates/${candidate.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${getRankStyle(i + 1)}`}>
                      {i + 1}
                    </div>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={getAvatarColor(candidate.name) + ' text-white text-xs'}>
                        {getInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{candidate.name}</div>
                      <div className="text-xs text-muted-foreground">{candidate.job?.title || 'No position'}</div>
                    </div>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm ${getScoreColor(candidate.score || 0)}`}>
                      {candidate.score || '-'}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No candidates with scores yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <Link href="/hiring/positions/new" className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Create New Job</div>
                <div className="text-xs text-muted-foreground">Set up a new hiring position</div>
              </div>
            </Link>

            <Link href="/hiring/candidates/new" className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-lg bg-sky-500 text-white flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Add Candidate</div>
                <div className="text-xs text-muted-foreground">Manually add a new candidate</div>
              </div>
            </Link>

            <Link href="/hiring/questions" className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-lg bg-success text-white flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Generate Questions</div>
                <div className="text-xs text-muted-foreground">AuntyPelz interview questions</div>
              </div>
            </Link>

            <button className="w-full flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Upload Transcript</div>
                <div className="text-xs text-muted-foreground">Import from Fireflies</div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Interviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
          <CardTitle className="text-base font-semibold">Upcoming Interviews</CardTitle>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Candidate</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Position</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date & Time</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Interviewers</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {upcomingInterviews.length > 0 ? (
                upcomingInterviews.map((interview, i) => (
                  <tr key={interview.id || i} className="border-b border-border hover:bg-muted">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={interview.color + ' text-white text-xs'}>
                            {interview.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{interview.candidate}</div>
                          <div className="text-xs text-muted-foreground">{interview.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm">{interview.position}</td>
                    <td className="py-4 px-4">
                      <Badge variant={interview.stageBadge}>
                        {interview.stage}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-sm">{interview.date}</div>
                      <div className="text-xs text-muted-foreground">{interview.dateSubtext}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex -space-x-2">
                        <Avatar className="h-7 w-7 border-2 border-white">
                          <AvatarFallback className="text-xs bg-indigo-600 text-white">
                            {interview.initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Button variant="outline" size="sm">Prepare</Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No upcoming interviews scheduled
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
