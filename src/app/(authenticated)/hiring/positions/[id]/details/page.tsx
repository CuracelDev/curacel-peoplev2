'use client'

import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  Target,
  Award,
  Network,
  Edit2,
  Share2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function JobDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const { data: job, isLoading } = trpc.job.getDetails.useQuery({ id: jobId })

  const [openSections, setOpenSections] = useState({
    overview: true,
    description: true,
    scorecard: false,
    competencies: false,
    pipeline: true,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Skeleton Loading State
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 border border-indigo-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-4">
              <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-9 w-32 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white border border-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white border border-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Job not found</h3>
            <p className="text-sm text-gray-500 mt-1">This position may have been removed or doesn't exist.</p>
          </div>
          <Button onClick={() => router.push('/hiring/positions')} variant="outline">
            View All Positions
          </Button>
        </div>
      </div>
    )
  }

  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return 'Compensation not specified'

    const currency = job.salaryCurrency || 'USD'
    const frequency = job.salaryFrequency || 'annually'

    const min = job.salaryMin
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
        }).format(job.salaryMin)
      : null

    const max = job.salaryMax
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
        }).format(job.salaryMax)
      : null

    if (min && max) {
      return `${min} - ${max} ${frequency}`
    } else if (min) {
      return `${min}+ ${frequency}`
    } else if (max) {
      return `Up to ${max} ${frequency}`
    }
    return 'Compensation not specified'
  }

  const formatEquity = () => {
    if (!job.equityMin && !job.equityMax) return null

    if (job.equityMin && job.equityMax) {
      return `${job.equityMin}% - ${job.equityMax}%`
    } else if (job.equityMin) {
      return `${job.equityMin}%+`
    } else if (job.equityMax) {
      return `Up to ${job.equityMax}%`
    }
    return null
  }

  const formatLocations = () => {
    if (!job.locations || !Array.isArray(job.locations)) return 'Remote'

    const locations = job.locations as string[]

    if (locations.length === 0) return 'Remote'
    if (locations.length === 1) return locations[0]
    if (locations.length === 2) return locations.join(' • ')
    return `${locations[0]} +${locations.length - 1} more`
  }

  const statusConfig = {
    DRAFT: {
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: Circle,
      label: 'Draft',
    },
    ACTIVE: {
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      label: 'Active',
    },
    PAUSED: {
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Circle,
      label: 'Paused',
    },
    HIRED: {
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: CheckCircle2,
      label: 'Hired',
    },
  }

  const priorityConfig = {
    1: { label: 'Low Priority', className: 'bg-gray-50 text-gray-600 border-gray-200' },
    2: { label: 'Medium-Low', className: 'bg-blue-50 text-blue-600 border-blue-200' },
    3: { label: 'Medium', className: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    4: { label: 'High Priority', className: 'bg-orange-50 text-orange-600 border-orange-200' },
    5: { label: 'Urgent', className: 'bg-red-50 text-red-600 border-red-200' },
  }

  const status = statusConfig[job.status as keyof typeof statusConfig]
  const priority = priorityConfig[job.priority as keyof typeof priorityConfig]
  const StatusIcon = status.icon

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 shadow-sm">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -right-4 w-96 h-96 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-96 h-96 bg-gradient-to-tr from-blue-200 to-cyan-200 rounded-full blur-3xl" />
        </div>

        <div className="relative px-6 sm:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Link href="/hiring/positions" className="hover:text-indigo-600 transition-colors">
              Positions
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">{job.title}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title & Meta */}
            <div className="flex-1 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border', status.className)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  <Badge className={cn('border', priority.className)}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {priority.label}
                  </Badge>
                  {job.isPublic && (
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                  {job.title}
                  {job.hiresCount > 1 && (
                    <span className="ml-3 text-2xl text-gray-500 font-normal">
                      ({job.hiresCount} positions)
                    </span>
                  )}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" />
                    <span>{job.department || 'No Department'}</span>
                  </div>
                  <div className="hidden sm:block text-gray-300">•</div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{formatLocations()}</span>
                  </div>
                  <div className="hidden sm:block text-gray-300">•</div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {format(new Date(job.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  {job.deadline && (
                    <>
                      <div className="hidden sm:block text-gray-300">•</div>
                      <div className="flex items-center gap-1.5 text-orange-600 font-medium">
                        <Calendar className="h-4 w-4" />
                        <span>Deadline {format(new Date(job.deadline), 'MMM d, yyyy')}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href={`/hiring/positions/${jobId}/candidates`}>
                <Button variant="outline" size="default" className="gap-2">
                  <Users className="h-4 w-4" />
                  View Candidates
                </Button>
              </Link>
              <Button variant="outline" size="default" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="default" size="default" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Edit2 className="h-4 w-4" />
                Edit Job
              </Button>
            </div>
          </div>

          {/* Action Buttons - Mobile */}
          <div className="flex lg:hidden gap-2 mt-6">
            <Link href={`/hiring/positions/${jobId}/candidates`} className="flex-1">
              <Button variant="outline" size="default" className="w-full gap-2">
                <Users className="h-4 w-4" />
                Candidates
              </Button>
            </Link>
            <Button variant="default" size="default" className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 border border-blue-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-700 font-medium">
                <TrendingUp className="h-3 w-3" />
                <span>All time</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform">
                {job.stats.totalCandidates}
              </p>
              <p className="text-sm font-medium text-gray-600">Total Candidates</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 border border-emerald-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-600 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <TrendingUp className="h-3 w-3" />
                <span>Active</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform">
                {job.stats.activeCandidates}
              </p>
              <p className="text-sm font-medium text-gray-600">In Pipeline</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 border border-purple-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs text-purple-700 font-medium">
                <span>Average</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform">
                {job.stats.avgScore || '—'}
              </p>
              <p className="text-sm font-medium text-gray-600">Candidate Score</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 border border-orange-200 hover:shadow-lg transition-all duration-300 cursor-pointer">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200 rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-600 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs text-orange-700 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span>Success</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform">
                {job.stats.hired}
              </p>
              <p className="text-sm font-medium text-gray-600">Hired</p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Overview Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
        <Collapsible open={openSections.overview} onOpenChange={() => toggleSection('overview')}>
          <CollapsibleTrigger className="w-full group">
            <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Job Overview</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Employment details and compensation</p>
                </div>
              </div>
              {openSections.overview ? (
                <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Employment Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                      Employment Details
                    </h3>
                    <dl className="space-y-4">
                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Briefcase className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employment Type</dt>
                          <dd className="text-sm font-medium text-gray-900 mt-1 capitalize">
                            {job.employmentType || 'Not specified'}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Positions</dt>
                          <dd className="text-sm font-medium text-gray-900 mt-1">
                            {job.hiresCount} {job.hiresCount === 1 ? 'opening' : 'openings'}
                          </dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <MapPin className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location(s)</dt>
                          <dd className="text-sm font-medium text-gray-900 mt-1">{formatLocations()}</dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Calendar className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Posted</dt>
                          <dd className="text-sm font-medium text-gray-900 mt-1">
                            {format(new Date(job.createdAt), 'MMMM d, yyyy')}
                          </dd>
                        </div>
                      </div>

                      {job.deadline && (
                        <div className="flex items-start gap-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Calendar className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <dt className="text-xs font-medium text-orange-700 uppercase tracking-wide">Deadline</dt>
                            <dd className="text-sm font-semibold text-orange-900 mt-1">
                              {format(new Date(job.deadline), 'MMMM d, yyyy')}
                            </dd>
                          </div>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Compensation & Team */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-emerald-600 rounded-full" />
                      Compensation
                    </h3>
                    <dl className="space-y-4">
                      <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Salary Range</dt>
                          <dd className="text-sm font-medium text-gray-900 mt-1">{formatSalary()}</dd>
                        </div>
                      </div>

                      {formatEquity() && (
                        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <Award className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Equity</dt>
                            <dd className="text-sm font-medium text-gray-900 mt-1">{formatEquity()}</dd>
                          </div>
                        </div>
                      )}
                    </dl>
                  </div>

                  {job.hiringManager && (
                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600 rounded-full" />
                        Hiring Manager
                      </h3>
                      <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                          {job.hiringManager.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{job.hiringManager.fullName}</p>
                          <p className="text-xs text-gray-600 mt-1">{job.hiringManager.workEmail}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Job Description Section */}
      {job.jobDescription && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <Collapsible open={openSections.description} onOpenChange={() => toggleSection('description')}>
            <CollapsibleTrigger className="w-full group">
              <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-sm">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900">Job Description</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{job.jobDescription.name}</p>
                  </div>
                </div>
                {openSections.description ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                <div
                  className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                  dangerouslySetInnerHTML={{ __html: job.jobDescription.content || '<p class="text-gray-500 italic">No content available</p>' }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Scorecard Section */}
      {job.scorecard && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <Collapsible open={openSections.scorecard} onOpenChange={() => toggleSection('scorecard')}>
            <CollapsibleTrigger className="w-full group">
              <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-sm">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900">Scorecard & Success Criteria</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Mission and expected outcomes</p>
                  </div>
                </div>
                {openSections.scorecard ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                {/* Mission */}
                <div className="relative p-6 rounded-xl bg-gradient-to-br from-orange-50 via-white to-red-50 border border-orange-200">
                  <div className="absolute top-4 right-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Target className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-orange-600 rounded-full" />
                    Mission
                  </h3>
                  <p className="text-base leading-relaxed text-gray-800 font-medium pr-12">{job.scorecard.mission}</p>
                </div>

                {/* Outcomes */}
                {job.scorecard.outcomes && Array.isArray(job.scorecard.outcomes) && (job.scorecard.outcomes as any[]).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                      Success Outcomes
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {(
                        job.scorecard.outcomes as Array<{
                          name: string
                          description: string
                          successCriteria: string[]
                        }>
                      ).map((outcome, idx) => (
                        <div
                          key={idx}
                          className="group relative p-5 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                        >
                          <div className="absolute -left-2 top-6 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white" />
                          <div className="pl-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">{outcome.name}</h4>
                            <p className="text-sm text-gray-600 leading-relaxed mb-3">{outcome.description}</p>
                            {outcome.successCriteria && outcome.successCriteria.length > 0 && (
                              <div className="space-y-2 pt-3 border-t border-gray-100">
                                {outcome.successCriteria.map((criteria, cidx) => (
                                  <div key={cidx} className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 leading-relaxed">{criteria}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Competency Requirements Section */}
      {job.competenciesByCore && job.competenciesByCore.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <Collapsible open={openSections.competencies} onOpenChange={() => toggleSection('competencies')}>
            <CollapsibleTrigger className="w-full group">
              <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-sm">
                    <Network className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900">Competency Requirements</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.competenciesByCore.length} competency {job.competenciesByCore.length === 1 ? 'area' : 'areas'}
                    </p>
                  </div>
                </div>
                {openSections.competencies ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                {job.competenciesByCore.map((group, groupIdx) => (
                  <div
                    key={group.coreCompetency.id}
                    className="relative p-6 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50"
                  >
                    <div className="mb-5">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-base font-bold text-gray-900">{group.coreCompetency.name}</h3>
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          {group.source.name}
                        </Badge>
                      </div>
                      {group.coreCompetency.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">{group.coreCompetency.description}</p>
                      )}
                      {group.coreCompetency.functionArea && (
                        <p className="text-xs text-purple-600 font-medium mt-2">
                          Function: {group.coreCompetency.functionArea}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {group.requirements.map((req, reqIdx) => (
                        <div
                          key={req.id}
                          className="group/req relative p-4 rounded-lg border border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-gray-900">{req.subCompetency.name}</h4>
                                {req.isRequired && (
                                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              {req.subCompetency.description && (
                                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                                  {req.subCompetency.description}
                                </p>
                              )}
                              {req.validationStage && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>
                                    Validated in:{' '}
                                    <span className="font-medium text-gray-700">
                                      {req.validationStage.replace(/_/g, ' ')}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-semibold">
                                {req.requiredLevelName}
                              </Badge>
                              <Badge
                                className={cn(
                                  'text-xs font-semibold',
                                  req.priority === 'CRITICAL' && 'bg-red-100 text-red-700 border-red-200',
                                  req.priority === 'HIGH' && 'bg-orange-100 text-orange-700 border-orange-200',
                                  req.priority === 'MEDIUM' && 'bg-yellow-100 text-yellow-700 border-yellow-200',
                                  req.priority === 'LOW' && 'bg-gray-100 text-gray-700 border-gray-200'
                                )}
                              >
                                {req.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Hiring Pipeline Section */}
      {job.hiringFlowSnapshot && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <Collapsible open={openSections.pipeline} onOpenChange={() => toggleSection('pipeline')}>
            <CollapsibleTrigger className="w-full group">
              <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-sm">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900">Hiring Pipeline</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.hiringFlowSnapshot.flow?.name} • Version {job.hiringFlowSnapshot.version}
                    </p>
                  </div>
                </div>
                {openSections.pipeline ? (
                  <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                {job.stages && job.stages.length > 0 ? (
                  <>
                    {/* Visual Pipeline Stages */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Interview Stages</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {job.stages.map((stage, index) => (
                          <div
                            key={index}
                            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                            style={{
                              animationDelay: `${index * 50}ms`,
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                  <span className="text-sm font-bold text-white">{index + 1}</span>
                                </div>
                                <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                                  Stage {index + 1}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white leading-tight">{stage}</h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pipeline Metrics */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Metrics</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200 group hover:shadow-md transition-shadow">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200 rounded-full blur-xl opacity-50" />
                          <div className="relative">
                            <p className="text-2xl font-bold text-blue-900">{job.stats.applied}</p>
                            <p className="text-xs font-medium text-blue-700 mt-1">Applied</p>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 border border-purple-200 group hover:shadow-md transition-shadow">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-200 rounded-full blur-xl opacity-50" />
                          <div className="relative">
                            <p className="text-2xl font-bold text-purple-900">{job.stats.inReview}</p>
                            <p className="text-xs font-medium text-purple-700 mt-1">In Review</p>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 border border-orange-200 group hover:shadow-md transition-shadow">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-200 rounded-full blur-xl opacity-50" />
                          <div className="relative">
                            <p className="text-2xl font-bold text-orange-900">{job.stats.offerStage}</p>
                            <p className="text-xs font-medium text-orange-700 mt-1">Offer</p>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200 group hover:shadow-md transition-shadow">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200 rounded-full blur-xl opacity-50" />
                          <div className="relative">
                            <p className="text-2xl font-bold text-emerald-900">{job.stats.hired}</p>
                            <p className="text-xs font-medium text-emerald-700 mt-1">Hired</p>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 border border-gray-200 group hover:shadow-md transition-shadow">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gray-200 rounded-full blur-xl opacity-50" />
                          <div className="relative">
                            <p className="text-2xl font-bold text-gray-900">{job.stats.activeCandidates}</p>
                            <p className="text-xs font-medium text-gray-700 mt-1">Active</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <svg
                        className="h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No pipeline stages configured</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  )
}
