'use client'

import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  FileText,
  UserPlus,
  UserMinus,
  Calendar,
  TrendingUp,
  Briefcase,
  Target,
  MessageSquare,
  Upload,
  Plus,
  ArrowRight,
  ChevronRight,
  UserCheck,
  FileSignature,
  Clock,
  Star,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, getInitials } from '@/lib/utils'
import { useSession } from 'next-auth/react'

// Mock data for hiring stats (will be replaced with real API)
const hiringStats = {
  activeJobs: 3,
  totalCandidates: 47,
  inInterview: 18,
  avgScore: 72,
  jobsChange: '+1 this week',
  candidatesChange: '+12 this week',
  interviewChange: '+5 this week',
  scoreChange: '-3 from last week',
}

const pipelineData = {
  applied: 23,
  hrScreen: 15,
  technical: 8,
  panel: 5,
  offer: 2,
  conversionRate: 8.7,
}

const topCandidates = [
  { id: '1', name: 'James Okafor', position: 'Senior Backend Engineer', score: 87, initials: 'JO' },
  { id: '2', name: 'Emily Okonkwo', position: 'Product Designer', score: 85, initials: 'EO' },
  { id: '3', name: 'Sarah Chen', position: 'Senior Backend Engineer', score: 82, initials: 'SC' },
  { id: '4', name: 'Michael Adeyemi', position: 'Growth Lead', score: 78, initials: 'MA' },
  { id: '5', name: 'Amaka Abubakar', position: 'Senior Backend Engineer', score: 76, initials: 'AA' },
]

const recentActivity = [
  { type: 'application', title: 'New application received', description: 'Sarah Chen applied for Senior Backend Engineer', time: '2m ago', icon: UserPlus },
  { type: 'score', title: 'Score updated', description: 'James Okafor scored 87/100 after HR screen', time: '15m ago', icon: Star },
  { type: 'interview', title: 'Interview completed', description: 'Technical interview with Michael Adeyemi', time: '1h ago', icon: CheckCircle },
  { type: 'rejected', title: 'Candidate rejected', description: 'David Kim did not proceed - culture fit', time: '2h ago', icon: XCircle },
]

const upcomingInterviews = [
  { id: '1', candidate: 'James Okafor', email: 'james.okafor@email.com', position: 'Senior Backend Engineer', stage: 'Panel Interview', stageColor: 'bg-orange-100 text-orange-700', date: 'Today, 2:00 PM', relative: 'In 2 hours', interviewers: ['HK', 'JS'] },
  { id: '2', candidate: 'Sarah Chen', email: 'sarah.chen@email.com', position: 'Senior Backend Engineer', stage: 'HR Screen', stageColor: 'bg-gray-100 text-gray-700', date: 'Tomorrow, 10:00 AM', relative: 'Dec 29', interviewers: ['TG'] },
  { id: '3', candidate: 'Michael Adeyemi', email: 'm.adeyemi@email.com', position: 'Growth Lead', stage: 'Technical', stageColor: 'bg-purple-100 text-purple-700', date: 'Dec 30, 3:00 PM', relative: 'In 2 days', interviewers: ['HK', 'OK'] },
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery()
  const { data: onboardingProgress } = trpc.dashboard.getOnboardingProgress.useQuery()

  const firstName = session?.user?.name?.split(' ')[0] || 'there'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const employees = stats?.employees || { total: 0, active: 0 }
  const workflows = stats?.workflows || { pendingOnboarding: 0, pendingOffboarding: 0 }
  const contracts = stats?.offers || { draft: 0, sent: 0, viewed: 0, signed: 0, declined: 0 }
  const recentHires = stats?.recentHires || []
  const upcomingStarts = stats?.upcomingStarts || []

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
        <p className="text-gray-500">Here&apos;s what&apos;s happening with your hiring pipeline</p>
      </div>

      {/* Hiring Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Active Jobs</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.activeJobs}</span>
              <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {hiringStats.jobsChange}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Total Candidates</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.totalCandidates}</span>
              <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {hiringStats.candidatesChange}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">In Interview</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.inInterview}</span>
              <span className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {hiringStats.interviewChange}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Avg. Score</span>
              <span className="text-3xl font-bold mt-1">{hiringStats.avgScore}</span>
              <span className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 rotate-180" />
                {hiringStats.scoreChange}
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
              <span className="text-sm text-gray-500">Total Employees</span>
              <span className="text-3xl font-bold mt-1">{employees.total}</span>
              <span className="text-xs text-gray-500 mt-1">{employees.active} active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Pending Contracts</span>
              <span className="text-3xl font-bold mt-1">{(contracts.sent || 0) + (contracts.viewed || 0)}</span>
              <span className="text-xs text-gray-500 mt-1">{contracts.signed || 0} signed this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Onboarding</span>
              <span className="text-3xl font-bold mt-1">{workflows.pendingOnboarding}</span>
              <span className="text-xs text-gray-500 mt-1">in progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Offboarding</span>
              <span className="text-3xl font-bold mt-1">{workflows.pendingOffboarding}</span>
              <span className="text-xs text-gray-500 mt-1">scheduled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Pipeline Overview</CardTitle>
            <select className="text-sm border rounded-lg px-3 py-1.5 bg-white">
              <option>All Jobs</option>
            </select>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{pipelineData.applied}</p>
                  <p className="text-xs text-gray-500">Applied</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{pipelineData.hrScreen}</p>
                  <p className="text-xs text-gray-500">HR Screen</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{pipelineData.technical}</p>
                  <p className="text-xs text-gray-500">Technical</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{pipelineData.panel}</p>
                  <p className="text-xs text-gray-500">Panel</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold">{pipelineData.offer}</p>
                  <p className="text-xs text-gray-500">Offer</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Conversion Rate</span>
                <span className="text-sm font-medium">{pipelineData.conversionRate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"
                  style={{ width: `${pipelineData.conversionRate * 3}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <Link href="/recruiting/activity" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'application' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'score' ? 'bg-yellow-100 text-yellow-600' :
                    activity.type === 'interview' ? 'bg-green-100 text-green-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Candidates + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Top Candidates</CardTitle>
            <Link href="/recruiting/candidates" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCandidates.map((candidate, index) => (
                <Link key={candidate.id} href={`/recruiting/candidates/${candidate.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-400 w-4">{index + 1}</span>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={`text-xs font-medium ${
                        index === 0 ? 'bg-green-100 text-green-700' :
                        index === 1 ? 'bg-orange-100 text-orange-700' :
                        index === 2 ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {candidate.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{candidate.name}</p>
                      <p className="text-xs text-gray-500">{candidate.position}</p>
                    </div>
                    <span className={`text-sm font-semibold ${
                      candidate.score >= 85 ? 'text-green-600' :
                      candidate.score >= 75 ? 'text-orange-500' :
                      'text-gray-600'
                    }`}>
                      {candidate.score}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/recruiting/positions/new">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Create New Job</p>
                    <p className="text-xs text-gray-500">Set up a new hiring position</p>
                  </div>
                </div>
              </Link>

              <Link href="/recruiting/candidates/new">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <UserPlus className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Add Candidate</p>
                    <p className="text-xs text-gray-500">Manually add a new candidate</p>
                  </div>
                </div>
              </Link>

              <Link href="/recruiting/questions">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-green-100">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Generate Questions</p>
                    <p className="text-xs text-gray-500">AI-powered interview questions</p>
                  </div>
                </div>
              </Link>

              <Link href="/recruiting/transcripts">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Upload className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload Transcript</p>
                    <p className="text-xs text-gray-500">Import from Fireflies</p>
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
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            View Calendar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 font-medium">Candidate</th>
                  <th className="pb-3 font-medium">Position</th>
                  <th className="pb-3 font-medium">Stage</th>
                  <th className="pb-3 font-medium">Date & Time</th>
                  <th className="pb-3 font-medium">Interviewers</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {getInitials(interview.candidate)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{interview.candidate}</p>
                          <p className="text-xs text-gray-500">{interview.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-gray-900">{interview.position}</span>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className={interview.stageColor}>
                        {interview.stage}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <p className="text-sm font-medium text-gray-900">{interview.date}</p>
                      <p className="text-xs text-gray-500">{interview.relative}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex -space-x-2">
                        {interview.interviewers.map((initials, i) => (
                          <Avatar key={i} className="h-7 w-7 border-2 border-white">
                            <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <Button variant="outline" size="sm">Prepare</Button>
                    </td>
                  </tr>
                ))}
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
                <div className="w-24 text-sm text-gray-600">Draft</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${contracts.draft ? (contracts.draft / 10) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.draft || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm text-gray-600">Sent</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full"
                      style={{ width: `${contracts.sent ? (contracts.sent / 10) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.sent || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm text-gray-600">Viewed</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full"
                      style={{ width: `${contracts.viewed ? (contracts.viewed / 10) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.viewed || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm text-gray-600">Signed</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
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
                    <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{workflow.employee.fullName}</p>
                        <p className="text-sm text-gray-500">
                          Start: {workflow.employee.startDate ? formatDate(workflow.employee.startDate) : 'TBD'}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <div className="w-24">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${workflow.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600 w-10">{workflow.progress}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No active onboarding</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Hires + Upcoming Starts */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Recent Hires
            </CardTitle>
            <CardDescription>Started in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {recentHires && recentHires.length > 0 ? (
              <div className="space-y-3">
                {recentHires.map((employee) => (
                  <Link key={employee.id} href={`/employees/${employee.id}`}>
                    <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{employee.fullName}</p>
                        <p className="text-sm text-gray-500">{employee.jobTitle}</p>
                      </div>
                      <Badge variant="outline">{employee.department}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No recent hires</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              Upcoming Starts
            </CardTitle>
            <CardDescription>Starting in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingStarts && upcomingStarts.length > 0 ? (
              <div className="space-y-3">
                {upcomingStarts.map((employee) => (
                  <Link key={employee.id} href={`/employees/${employee.id}`}>
                    <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{employee.fullName}</p>
                        <p className="text-sm text-gray-500">{employee.jobTitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {employee.startDate ? formatDate(employee.startDate) : 'TBD'}
                        </p>
                        <Badge variant="outline">{employee.department}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No upcoming starts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
