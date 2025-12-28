'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Briefcase,
  MapPin,
  Calendar,
  Star,
  Code,
  Palette,
  TrendingUp,
} from 'lucide-react'
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

// Mock data
const jobs = [
  {
    id: '1',
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    location: 'Remote',
    postedDate: 'Dec 15, 2025',
    avgScore: 74,
    status: 'active',
    icon: 'engineering',
    stats: {
      applicants: 24,
      inReview: 8,
      interviewing: 5,
      offerStage: 1,
    },
  },
  {
    id: '2',
    title: 'Product Designer',
    department: 'Design',
    location: 'Lagos, Nigeria',
    postedDate: 'Dec 10, 2025',
    avgScore: 68,
    status: 'active',
    icon: 'design',
    stats: {
      applicants: 15,
      inReview: 5,
      interviewing: 3,
      offerStage: 0,
    },
  },
  {
    id: '3',
    title: 'Growth Lead',
    department: 'Growth',
    location: 'Hybrid',
    postedDate: 'Dec 20, 2025',
    avgScore: 71,
    status: 'active',
    icon: 'growth',
    stats: {
      applicants: 8,
      inReview: 4,
      interviewing: 2,
      offerStage: 0,
    },
  },
]

function getJobIcon(type: string) {
  switch (type) {
    case 'engineering':
      return <Code className="h-6 w-6" />
    case 'design':
      return <Palette className="h-6 w-6" />
    case 'growth':
      return <TrendingUp className="h-6 w-6" />
    default:
      return <Briefcase className="h-6 w-6" />
  }
}

function getJobIconBg(type: string) {
  switch (type) {
    case 'engineering':
      return 'bg-gradient-to-br from-indigo-500 to-purple-600'
    case 'design':
      return 'bg-gradient-to-br from-pink-500 to-rose-500'
    case 'growth':
      return 'bg-gradient-to-br from-amber-500 to-red-500'
    default:
      return 'bg-indigo-600'
  }
}

type FilterStatus = 'all' | 'active' | 'draft' | 'closed'

export default function PositionsPage() {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [department, setDepartment] = useState('all')

  const filteredJobs = jobs.filter((job) => {
    if (filter !== 'all' && job.status !== filter) return false
    if (department !== 'all' && job.department.toLowerCase() !== department) return false
    return true
  })

  const counts = {
    all: jobs.length,
    active: jobs.filter((j) => j.status === 'active').length,
    draft: jobs.filter((j) => j.status === 'draft').length,
    closed: jobs.filter((j) => j.status === 'closed').length,
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500">Manage your open positions and hiring pipelines</p>
        </div>
        <Link href="/recruiting/positions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-6">
        {(['all', 'active', 'draft', 'closed'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              filter === status
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
          </button>
        ))}
        <div className="flex-1" />
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      <div className="flex flex-col gap-4">
        {filteredJobs.map((job) => (
          <Link
            key={job.id}
            href={`/recruiting/positions/${job.id}/candidates`}
            className="bg-white border border-gray-200 rounded-xl p-5 flex gap-5 transition-all hover:border-indigo-500 hover:shadow-md"
          >
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0', getJobIconBg(job.icon))}>
              {getJobIcon(job.icon)}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{job.title}</h3>
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                  Active
                </Badge>
              </div>

              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Briefcase className="h-3.5 w-3.5" />
                  {job.department}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Posted {job.postedDate}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Star className="h-3.5 w-3.5" />
                  Avg Score: {job.avgScore}
                </div>
              </div>

              <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900">{job.stats.applicants}</div>
                  <div className="text-xs text-gray-500">Applicants</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900">{job.stats.inReview}</div>
                  <div className="text-xs text-gray-500">In Review</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900">{job.stats.interviewing}</div>
                  <div className="text-xs text-gray-500">Interviewing</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900">{job.stats.offerStage}</div>
                  <div className="text-xs text-gray-500">Offer Stage</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(#6366f1 ${job.avgScore * 3.6}deg, #e5e7eb ${job.avgScore * 3.6}deg)`,
                }}
              >
                <div className="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center">
                  <div className="text-xl font-bold text-gray-900">{job.avgScore}</div>
                  <div className="text-[10px] text-gray-500">avg score</div>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* Create New Job Card */}
        <Link
          href="/recruiting/positions/new"
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center min-h-[200px] transition-all hover:border-indigo-500 hover:bg-indigo-50/30"
        >
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-3">
            <Plus className="h-6 w-6" />
          </div>
          <div className="font-semibold text-gray-700">Create New Job</div>
          <div className="text-sm text-gray-500 mt-1">Set up a new hiring position</div>
        </Link>
      </div>
    </div>
  )
}
