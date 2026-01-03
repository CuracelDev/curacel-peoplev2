'use client'

import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { ArrowLeft, Briefcase, Calendar, DollarSign, MapPin, Users, Target, Award, Network, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function JobDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const { data: job, isLoading } = trpc.job.getDetails.useQuery({ id: jobId })

  const [openSections, setOpenSections] = useState({
    overview: false,
    description: false,
    scorecard: false,
    competencies: false,
    pipeline: false,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-sm text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Job not found</p>
      </div>
    )
  }

  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return 'Not specified'

    const currency = job.salaryCurrency || 'USD'
    const frequency = job.salaryFrequency || 'annually'

    const min = job.salaryMin ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(job.salaryMin) : null

    const max = job.salaryMax ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(job.salaryMax) : null

    if (min && max) {
      return `${min} - ${max} ${frequency}`
    } else if (min) {
      return `${min}+ ${frequency}`
    } else if (max) {
      return `Up to ${max} ${frequency}`
    }
    return 'Not specified'
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
    if (!job.locations || !Array.isArray(job.locations)) return 'Not specified'

    const locations = job.locations as string[]

    if (locations.length === 0) return 'Not specified'
    if (locations.length === 1) return locations[0]
    if (locations.length === 2) return locations.join(' or ')
    return `${locations[0]} or ${locations.length - 1} other location${locations.length > 2 ? 's' : ''}`
  }

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    HIRED: 'bg-blue-100 text-blue-800',
  }

  const priorityLabels = {
    1: 'Low',
    2: 'Medium-Low',
    3: 'Medium',
    4: 'High',
    5: 'Urgent',
  }

  const priorityColors = {
    1: 'bg-gray-100 text-gray-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-orange-100 text-orange-700',
    5: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6 py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-8 w-8" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{job.title}</h1>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3">
                <div className="flex flex-col gap-2">
                  {job.createdAt && (
                    <span className="flex items-center gap-1.5 text-muted-foreground/80">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                      Posted {format(new Date(job.createdAt), 'MMM d, yyyy')}
                    </span>
                  )}
                  {job.deadline && (
                    <span className="flex items-center gap-1.5 text-muted-foreground/80">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                      Deadline {format(new Date(job.deadline), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {job.department || 'No Department'} · {formatLocations()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={`${statusColors[job.status as keyof typeof statusColors]} text-xs`}>
                  {job.status}
                </Badge>
                <Badge className={`${priorityColors[job.priority as keyof typeof priorityColors]} text-xs`}>
                  {priorityLabels[job.priority as keyof typeof priorityLabels]} Priority
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Candidates</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{job.stats.totalCandidates}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Pipeline</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{job.stats.activeCandidates}</p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{job.stats.avgScore || 'N/A'}</p>
            </div>
            <Award className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hired</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{job.stats.hired}</p>
            </div>
            <Briefcase className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Job Overview Section */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <Collapsible open={openSections.overview} onOpenChange={() => toggleSection('overview')}>
          <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Job Overview</h2>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-600" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-6 pb-6 space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Employment Details</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500">Employment Type</dt>
                        <dd className="text-sm text-gray-900 mt-0.5 capitalize">{job.employmentType || 'Not specified'}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500">Posted Date</dt>
                        <dd className="text-sm text-gray-900 mt-0.5">{format(new Date(job.createdAt), 'MMM d, yyyy')}</dd>
                      </div>
                    </div>
                    {job.deadline && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <dt className="text-xs text-gray-500">Application Deadline</dt>
                          <dd className="text-sm text-gray-900 mt-0.5">{format(new Date(job.deadline), 'MMM d, yyyy')}</dd>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500">Positions to Fill</dt>
                        <dd className="text-sm text-gray-900 mt-0.5">{job.hiresCount} {job.hiresCount === 1 ? 'position' : 'positions'}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500">Location(s)</dt>
                        <dd className="text-sm text-gray-900 mt-0.5">{formatLocations()}</dd>
                      </div>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Compensation & Ownership</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-xs text-gray-500">Salary Range</dt>
                        <dd className="text-sm text-gray-900 mt-0.5">{formatSalary()}</dd>
                      </div>
                    </div>
                    {formatEquity() && (
                      <div className="flex items-start gap-3">
                        <Award className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <dt className="text-xs text-gray-500">Equity</dt>
                          <dd className="text-sm text-gray-900 mt-0.5">{formatEquity()}</dd>
                        </div>
                      </div>
                    )}
                    {job.hiringManager && (
                      <div className="flex items-start gap-3">
                        <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <dt className="text-xs text-gray-500">Hiring Manager</dt>
                          <dd className="text-sm text-gray-900 mt-0.5">{job.hiringManager.fullName}</dd>
                          <dd className="text-xs text-gray-500 mt-0.5">{job.hiringManager.workEmail}</dd>
                        </div>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Job Description Section */}
      {job.jobDescription && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <Collapsible open={openSections.description} onOpenChange={() => toggleSection('description')}>
            <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Job Description</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{job.jobDescription.name}</p>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.jobDescription.content || '<p>No content available</p>' }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Scorecard Section */}
      {job.scorecard && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <Collapsible open={openSections.scorecard} onOpenChange={() => toggleSection('scorecard')}>
            <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Scorecard & Evaluation Criteria</h2>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 space-y-6">
                {/* Mission */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Mission</h3>
                  <p className="text-sm text-gray-900 leading-relaxed">{job.scorecard.mission}</p>
                </div>

                {/* Outcomes */}
                {job.scorecard.outcomes && Array.isArray(job.scorecard.outcomes) && (job.scorecard.outcomes as any[]).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Outcomes & Success Criteria</h3>
                    <div className="space-y-4">
                      {(job.scorecard.outcomes as Array<{
                        name: string
                        description: string
                        successCriteria: string[]
                      }>).map((outcome, idx) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-4">
                          <h4 className="text-sm font-semibold text-gray-900">{outcome.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{outcome.description}</p>
                          {outcome.successCriteria && outcome.successCriteria.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {outcome.successCriteria.map((criteria, cidx) => (
                                <li key={cidx} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>{criteria}</span>
                                </li>
                              ))}
                            </ul>
                          )}
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
        <div className="bg-white border border-gray-200 rounded-lg">
          <Collapsible open={openSections.competencies} onOpenChange={() => toggleSection('competencies')}>
            <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-gray-600" />
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Competency Requirements</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.competenciesByCore.length} {job.competenciesByCore.length === 1 ? 'competency area' : 'competency areas'}
                  </p>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6 space-y-6">
                {job.competenciesByCore.map((group) => (
                  <div key={group.coreCompetency.id} className="border-l-4 border-purple-500 pl-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">{group.coreCompetency.name}</h3>
                      {group.coreCompetency.description && (
                        <p className="text-xs text-gray-600 mt-1">{group.coreCompetency.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Source: {group.source.name}</span>
                        {group.coreCompetency.functionArea && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">{group.coreCompetency.functionArea}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {group.requirements.map((req) => (
                        <div key={req.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-900">{req.subCompetency.name}</h4>
                                {req.isRequired && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">Required</span>
                                )}
                              </div>
                              {req.subCompetency.description && (
                                <p className="text-xs text-gray-600 mt-1">{req.subCompetency.description}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded whitespace-nowrap">
                                {req.requiredLevelName}
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                req.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                req.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                req.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {req.priority}
                              </span>
                            </div>
                          </div>
                          {req.validationStage && (
                            <p className="text-xs text-gray-500 mt-2">
                              Validated in: <span className="font-medium">{req.validationStage.replace(/_/g, ' ')}</span>
                            </p>
                          )}
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
        <div className="bg-white border border-gray-200 rounded-lg">
          <Collapsible open={openSections.pipeline} onOpenChange={() => toggleSection('pipeline')}>
            <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Hiring Pipeline & Stages</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.hiringFlowSnapshot.flow?.name} (v{job.hiringFlowSnapshot.version})
                  </p>
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-6 pb-6">
                {job.stats.stageMetrics && job.stats.stageMetrics.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Hiring flow stages with counts */}
                    {job.stats.stageMetrics.map((stage, index) => {
                      const colors = [
                        { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', text: 'text-blue-600' },
                        { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-600', text: 'text-purple-600' },
                        { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-600', text: 'text-indigo-600' },
                        { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-600', text: 'text-pink-600' },
                        { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-600', text: 'text-cyan-600' },
                        { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-600', text: 'text-teal-600' },
                        { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-600', text: 'text-orange-600' },
                      ]
                      const color = colors[index % colors.length]

                      return (
                        <div
                          key={stage.stageEnum}
                          className={`${color.bg} border ${color.border} rounded-lg p-4`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-6 h-6 rounded-full ${color.badge} text-white text-xs font-bold flex items-center justify-center`}>
                              {index + 1}
                            </div>
                            <span className="text-xs font-medium text-gray-600">Stage {index + 1}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">{stage.name}</h4>
                          <p className={`text-2xl font-bold ${color.text}`}>{stage.count}</p>
                        </div>
                      )
                    })}

                    {/* Terminal stages - Hired and Active Pipeline */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
                          ✓
                        </div>
                        <span className="text-xs font-medium text-gray-600">Final</span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Hired</h4>
                      <p className="text-2xl font-bold text-green-600">{job.stats.hired}</p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs font-bold flex items-center justify-center">
                          ∑
                        </div>
                        <span className="text-xs font-medium text-gray-600">Total</span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Active Pipeline</h4>
                      <p className="text-2xl font-bold text-gray-600">{job.stats.activeCandidates}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No stages defined</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  )
}
