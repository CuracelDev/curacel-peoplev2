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

// Mock data
const stats = [
  { label: 'Active Jobs', value: 3, change: '+1 this week', positive: true },
  { label: 'Total Candidates', value: 47, change: '+12 this week', positive: true },
  { label: 'In Interview', value: 18, change: '+5 this week', positive: true },
  { label: 'Avg. Score', value: 72, change: '-3 from last week', positive: false },
]

const pipelineStages = [
  { label: 'Applied', count: 23 },
  { label: 'HR Screen', count: 15 },
  { label: 'Technical', count: 8 },
  { label: 'Panel', count: 5 },
  { label: 'Offer', count: 2 },
]

const recentActivity = [
  {
    type: 'new',
    title: 'New application received',
    description: 'Sarah Chen applied for Senior Backend Engineer',
    time: '2m ago',
  },
  {
    type: 'score',
    title: 'Score updated',
    description: 'James Okafor scored 87/100 after HR screen',
    time: '15m ago',
  },
  {
    type: 'interview',
    title: 'Interview completed',
    description: 'Technical interview with Michael Adeyemi',
    time: '1h ago',
  },
  {
    type: 'reject',
    title: 'Candidate rejected',
    description: 'David Kim did not proceed - culture fit',
    time: '2h ago',
  },
]

const topCandidates = [
  { name: 'James Okafor', position: 'Senior Backend Engineer', score: 87, initials: 'JO', color: 'bg-green-500' },
  { name: 'Emily Okonkwo', position: 'Product Designer', score: 85, initials: 'EO', color: 'bg-indigo-500' },
  { name: 'Sarah Chen', position: 'Senior Backend Engineer', score: 82, initials: 'SC', color: 'bg-sky-500' },
  { name: 'Michael Adeyemi', position: 'Growth Lead', score: 78, initials: 'MA', color: 'bg-amber-500' },
  { name: 'Amaka Abubakar', position: 'Senior Backend Engineer', score: 76, initials: 'AA', color: 'bg-pink-500' },
]

const upcomingInterviews = [
  {
    candidate: 'James Okafor',
    email: 'james.okafor@email.com',
    initials: 'JO',
    color: 'bg-green-500',
    position: 'Senior Backend Engineer',
    stage: 'Panel Interview',
    stageBadge: 'primary',
    date: 'Today, 2:00 PM',
    dateSubtext: 'In 2 hours',
    interviewers: ['HM', 'FA', '+2'],
  },
  {
    candidate: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    initials: 'SC',
    color: 'bg-sky-500',
    position: 'Senior Backend Engineer',
    stage: 'HR Screen',
    stageBadge: 'secondary',
    date: 'Tomorrow, 10:00 AM',
    dateSubtext: 'Dec 29',
    interviewers: ['TO'],
  },
  {
    candidate: 'Michael Adeyemi',
    email: 'm.adeyemi@email.com',
    initials: 'MA',
    color: 'bg-amber-500',
    position: 'Growth Lead',
    stage: 'Technical',
    stageBadge: 'warning',
    date: 'Dec 30, 3:00 PM',
    dateSubtext: 'In 2 days',
    interviewers: ['HM', 'CK'],
  },
]

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
      return 'bg-green-50 text-green-600'
    case 'score':
      return 'bg-amber-50 text-amber-600'
    case 'interview':
      return 'bg-indigo-50 text-indigo-600'
    case 'reject':
      return 'bg-red-50 text-red-600'
    default:
      return 'bg-gray-50 text-gray-600'
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-600'
  if (score >= 60) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}

function getRankStyle(rank: number) {
  if (rank === 1) return 'bg-amber-100 text-amber-700'
  if (rank === 2) return 'bg-gray-200 text-gray-600'
  if (rank === 3) return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-600'
}

export default function RecruitingDashboard() {
  const [selectedJob, setSelectedJob] = useState('all')

  return (
    <div className="p-3 sm:p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-4 sm:mb-6">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
              <div className="text-3xl font-semibold text-gray-900">{stat.value}</div>
              <div className={`text-sm mt-2 flex items-center gap-1 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
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
                    <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                    <div className="text-xs text-gray-500 mt-1">{stage.label}</div>
                  </div>
                  {i < pipelineStages.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Conversion Rate</span>
                <span>8.7%</span>
              </div>
              <Progress value={8.7} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Link href="/recruiting/activity" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-1">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{activity.title}</div>
                    <div className="text-sm text-gray-500 truncate">{activity.description}</div>
                  </div>
                  <div className="text-xs text-gray-400">{activity.time}</div>
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
            <Link href="/recruiting/candidates" className="text-sm text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-1">
              {topCandidates.map((candidate, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${getRankStyle(i + 1)}`}>
                    {i + 1}
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={candidate.color + ' text-white text-xs'}>
                      {candidate.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{candidate.name}</div>
                    <div className="text-xs text-gray-500">{candidate.position}</div>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm ${getScoreColor(candidate.score)}`}>
                    {candidate.score}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <Link href="/recruiting/positions/new" className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Create New Job</div>
                <div className="text-xs text-gray-500">Set up a new hiring position</div>
              </div>
            </Link>

            <Link href="/recruiting/candidates/new" className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-sky-500 text-white flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Add Candidate</div>
                <div className="text-xs text-gray-500">Manually add a new candidate</div>
              </div>
            </Link>

            <Link href="/recruiting/questions" className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Generate Questions</div>
                <div className="text-xs text-gray-500">AI-powered interview questions</div>
              </div>
            </Link>

            <button className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Upload Transcript</div>
                <div className="text-xs text-gray-500">Import from Fireflies</div>
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
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Interviewers</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {upcomingInterviews.map((interview, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={interview.color + ' text-white text-xs'}>
                          {interview.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{interview.candidate}</div>
                        <div className="text-xs text-gray-500">{interview.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm">{interview.position}</td>
                  <td className="py-4 px-4">
                    <Badge variant={interview.stageBadge as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {interview.stage}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-sm">{interview.date}</div>
                    <div className="text-xs text-gray-500">{interview.dateSubtext}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex -space-x-2">
                      {interview.interviewers.map((interviewer, j) => (
                        <Avatar key={j} className="h-7 w-7 border-2 border-white">
                          <AvatarFallback className={`text-xs ${j === 0 ? 'bg-indigo-600' : j === 1 ? 'bg-sky-500' : 'bg-green-500'} text-white`}>
                            {interviewer}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Button variant="outline" size="sm">Prepare</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
