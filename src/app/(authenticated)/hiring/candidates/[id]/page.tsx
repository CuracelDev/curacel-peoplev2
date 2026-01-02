'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Download,
  CheckCircle,
  Mail,
  Linkedin,
  Calendar,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  Shield,
  Users,
  Target,
  Brain,
  Sparkles,
  ChevronRight,
  Star,
  BarChart3,
  Heart,
  Activity,
  Info,
  Check,
  AlertCircle,
  HelpCircle,
  Mic,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { cn, getInitials } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { normalizeCandidateScoreWeights, type CandidateScoreComponent } from '@/lib/hiring/score-config'
import { format } from 'date-fns'
import { EmailTab } from '@/components/hiring/email-tab'
import { AuntyPelzAnalysisTab } from '@/components/hiring/auntypelz-analysis-tab'
import { toast } from 'sonner'

const normalizeStageKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const normalizeTextList = (items: unknown): string[] => {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        const primary =
          (typeof record.title === 'string' && record.title) ||
          (typeof record.name === 'string' && record.name) ||
          (typeof record.label === 'string' && record.label) ||
          (typeof record.question === 'string' && record.question) ||
          (typeof record.text === 'string' && record.text) ||
          ''
        const secondary =
          (typeof record.description === 'string' && record.description) ||
          ''

        if (primary && secondary) return `${primary}: ${secondary}`
        return primary || secondary
      }

      return ''
    })
    .map((value) => value.trim())
    .filter(Boolean)
}

export default function CandidateProfilePage() {
  const params = useParams()
  const candidateId = params.id as string
  const [activeTab, setActiveTab] = useState('overview')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState<
    null | 'advance' | 'reject' | 'decision'
  >(null)
  const [exporting, setExporting] = useState(false)
  const [decisionInitialized, setDecisionInitialized] = useState(false)

  // Fetch candidate profile from database
  const { data: profileData, isLoading } = trpc.job.getCandidateProfile.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )

  const { data: scoreSettings } = trpc.hiringSettings.get.useQuery()
  const { data: latestAnalysis } = trpc.auntyPelzAnalysis.getLatestAnalysis.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )
  const utils = trpc.useUtils()
  const updateCandidate = trpc.job.updateCandidate.useMutation({
    onSuccess: () => {
      utils.job.getCandidateProfile.invalidate({ candidateId })
    },
  })

  const scoreWeights = useMemo(
    () => {
      if (!scoreSettings?.candidateScoreWeights) {
        return []
      }

      return normalizeCandidateScoreWeights(
        scoreSettings.candidateScoreWeights as CandidateScoreComponent[] | null
      )
    },
    [scoreSettings?.candidateScoreWeights]
  )

  const candidate = useMemo(() => {
    if (!profileData?.candidate) return null

    const c = profileData.candidate
    const evalSummary = profileData.evaluationSummary
    const interviews = profileData.interviews ?? []
    const assessments = profileData.assessments ?? []

    const average = (values: number[]) =>
      values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null

    // Parse JSON fields with type safety
    const workExperience = Array.isArray(c.workExperience)
      ? (c.workExperience as Array<Record<string, unknown>>).map((item) => ({
          title: typeof item?.title === 'string' ? item.title : null,
          company: typeof item?.company === 'string' ? item.company : null,
          startDate: typeof item?.startDate === 'string' ? item.startDate : null,
          endDate: typeof item?.endDate === 'string' ? item.endDate : null,
          isCurrent: typeof item?.isCurrent === 'boolean' ? item.isCurrent : false,
          description: typeof item?.description === 'string' ? item.description : null,
          highlights: Array.isArray(item?.highlights)
            ? item.highlights.filter((highlight): highlight is string => typeof highlight === 'string')
            : [],
          skills: Array.isArray(item?.skills)
            ? item.skills.filter((skill): skill is string => typeof skill === 'string')
            : [],
        }))
      : []
    const education = Array.isArray(c.education)
      ? (c.education as Array<Record<string, unknown>>).map((item) => ({
          degree: typeof item?.degree === 'string' ? item.degree : '',
          field: typeof item?.field === 'string' ? item.field : '',
          institution: typeof item?.institution === 'string' ? item.institution : '',
          honors: typeof item?.honors === 'string' ? item.honors : '',
          years: typeof item?.years === 'string' ? item.years : '',
        }))
      : []
    const skillsData = (c.skills as {
      languages?: string[]
      databases?: string[]
      infrastructure?: string[]
      frameworks?: string[]
    }) || {}
    const skills = {
      languages: Array.isArray(skillsData.languages) ? skillsData.languages : [],
      databases: Array.isArray(skillsData.databases) ? skillsData.databases : [],
      infrastructure: Array.isArray(skillsData.infrastructure) ? skillsData.infrastructure : [],
      frameworks: Array.isArray(skillsData.frameworks) ? skillsData.frameworks : [],
    }
    const pressValuesScores = c.pressValuesScores as Record<string, number> | null
    const competencyScores = (c.competencyScores as Record<string, number> | null) || null
    const personalityProfile = (c.personalityProfile as Record<string, number> | null) || null
    const teamFitAnalysis = c.teamFitAnalysis as { strengths?: unknown; considerations?: unknown } | null

    const normalizePressScore = (value?: number | null) => {
      if (typeof value !== 'number') return null
      const normalized = value <= 5 ? value * 20 : value
      return Math.round(normalized)
    }

    const getPressRating = (score: number) => (
      score >= 80 ? 'Strong' : score >= 60 ? 'Moderate' : 'Needs Review'
    )

    // Map PRESS values from scores object to array format
    const pressValues = pressValuesScores ? [
      { letter: 'P', name: 'Passionate', score: normalizePressScore(pressValuesScores.passionate) },
      { letter: 'R', name: 'Relentless', score: normalizePressScore(pressValuesScores.relentless) },
      { letter: 'E', name: 'Empowered', score: normalizePressScore(pressValuesScores.empowered) },
      { letter: 'S', name: 'Sense of Urgency', score: normalizePressScore(pressValuesScores.senseOfUrgency) },
      { letter: 'S', name: 'Seeing Possibilities', score: normalizePressScore(pressValuesScores.seeingPossibilities) },
    ]
      .filter((value) => typeof value.score === 'number')
      .map((value) => ({
        ...value,
        score: value.score as number,
        rating: getPressRating(value.score as number),
      })) : []

    const pressValuesAvg = typeof c.pressValuesAvg === 'number'
      ? Math.round(c.pressValuesAvg)
      : pressValues.length > 0
        ? Math.round(pressValues.reduce((sum, v) => sum + v.score, 0) / pressValues.length)
        : null

    // Build interview evaluations from database
    const interviewScoreLookup = new Map<string, number>()
    for (const interview of interviews) {
      const score = interview.overallScore ?? interview.score ?? null
      if (typeof score === 'number') {
        interviewScoreLookup.set(interview.stage, score)
      }
    }

    const interviewEvaluations = (evalSummary?.byStage || []).map((stage) => {
      const rawAverage = stage.averageScore
      const scaledAverage = typeof rawAverage === 'number'
        ? Math.round(rawAverage <= 5 ? rawAverage * 20 : rawAverage)
        : null
      const overallScore = interviewScoreLookup.get(stage.stage) ?? scaledAverage
      const interviewForStage = interviews.find((interview) => interview.stage === stage.stage)
      const interviewDate = interviewForStage?.completedAt || interviewForStage?.scheduledAt
      const date = interviewDate ? format(new Date(interviewDate), 'MMM d, yyyy') : null

      return {
        stage: stage.stageName || stage.stage,
        stageType: stage.stage,
        date,
        overallScore,
        evaluators: stage.evaluators.map((e) => ({
          name: e.name,
          role: e.role || 'Interviewer',
          overallRating: e.overallRating,
          recommendation: e.recommendation || 'PENDING',
          notes: e.notes || '',
          criteria: e.criteriaScores.map((cs) => ({
            name: cs.name,
            score: cs.score,
            maxScore: 5,
            notes: cs.notes || '',
          })),
        })),
      }
    })

    const interviewAverage = average(
      interviews
        .map((interview) => interview.overallScore ?? interview.score)
        .filter((score): score is number => typeof score === 'number')
    )

    const assessmentAverage = average(
      assessments
        .map((assessment) => assessment.overallScore ?? assessment.qualityScore ?? assessment.completionPercent)
        .filter((score): score is number => typeof score === 'number')
    )

    const competencyAverage = competencyScores
      ? average(Object.values(competencyScores).filter((score) => typeof score === 'number'))
      : null

    const personalityAverage = personalityProfile
      ? average(Object.values(personalityProfile).filter((score) => typeof score === 'number'))
      : null

    const recommendationStrengths = normalizeTextList(
      evalSummary?.aiRecommendation?.strengths ?? c.recommendationStrengths
    )

    const recommendationRisks = Array.isArray(evalSummary?.aiRecommendation?.risks)
      ? (evalSummary?.aiRecommendation?.risks as Array<{ risk: string; mitigation: string }>)
      : Array.isArray(c.recommendationRisks)
        ? (c.recommendationRisks as Array<{ risk: string; mitigation: string }>)
        : []

    const flowStages = Array.isArray(c.job?.hiringFlowSnapshot?.stages)
      ? (c.job?.hiringFlowSnapshot?.stages as string[])
      : []
    const flowStageKeys = flowStages.map((stage) => normalizeStageKey(stage))
    const candidateStageName = c.customStageName || c.stageDisplayName || c.stage
    const candidateStageKey = candidateStageName ? normalizeStageKey(candidateStageName) : ''
    const candidateStageIndex = candidateStageKey ? flowStageKeys.indexOf(candidateStageKey) : -1

    const interviewsByStage = new Map<string, typeof interviews[number]>()
    const completedStageKeys = new Set<string>()
    const currentStageKeys = new Set<string>()

    for (const interview of interviews) {
      const key = normalizeStageKey(interview.stageName || interview.stageDisplayName || interview.stage)
      if (!key) continue

      const existing = interviewsByStage.get(key)
      const existingDate = existing?.completedAt || existing?.scheduledAt || existing?.createdAt
      const nextDate = interview.completedAt || interview.scheduledAt || interview.createdAt
      if (!existing || (nextDate && (!existingDate || nextDate > existingDate))) {
        interviewsByStage.set(key, interview)
      }

      if (interview.status === 'COMPLETED') {
        completedStageKeys.add(key)
      } else if (interview.status === 'IN_PROGRESS' || interview.status === 'SCHEDULED') {
        currentStageKeys.add(key)
      }
    }

    const assessmentsByStage = new Map<string, typeof assessments[number]>()
    const assessmentStageKeys = flowStages
      .filter((stage) => /assessment|test|case|exercise|trial/i.test(stage))
      .map((stage) => normalizeStageKey(stage))
    const sortedAssessments = [...assessments].sort((a, b) => {
      const aDate = a.completedAt || a.startedAt || a.createdAt
      const bDate = b.completedAt || b.startedAt || b.createdAt
      return (aDate?.getTime() || 0) - (bDate?.getTime() || 0)
    })

    assessmentStageKeys.forEach((key, index) => {
      const assessment = sortedAssessments[index]
      if (!assessment) return
      assessmentsByStage.set(key, assessment)

      if (assessment.status === 'COMPLETED') {
        completedStageKeys.add(key)
      } else if (assessment.status === 'IN_PROGRESS') {
        currentStageKeys.add(key)
      }
    })

    let lastCompletedIndex = -1
    flowStageKeys.forEach((key, index) => {
      const stageName = flowStages[index]
      const isAppliedStage = /apply|applied/i.test(stageName) && c.appliedAt
      if (completedStageKeys.has(key) || isAppliedStage) {
        lastCompletedIndex = index
      }
    })

    const currentStageIndex = flowStageKeys.findIndex((key) => currentStageKeys.has(key))

    let displayStageIndex = candidateStageIndex
    if (displayStageIndex < 0 && currentStageIndex >= 0) {
      displayStageIndex = currentStageIndex
    }
    if (displayStageIndex < 0) {
      displayStageIndex = lastCompletedIndex
    }

    const isHiredStage = c.stage === 'HIRED' || candidateStageKey.includes('hired')
    if (candidateStageIndex > -1 && lastCompletedIndex > -1 && candidateStageIndex > lastCompletedIndex + 1) {
      displayStageIndex = lastCompletedIndex
    }
    if (isHiredStage && c.decisionStatus !== 'HIRE' && lastCompletedIndex >= 0) {
      displayStageIndex = lastCompletedIndex
    }

    const stageTimeline = flowStages.map((stage, index) => {
      const key = flowStageKeys[index]
      const interview = interviewsByStage.get(key)
      const assessment = assessmentsByStage.get(key)
      const score = interview?.overallScore ?? interview?.score ?? assessment?.overallScore ?? assessment?.qualityScore ?? null
      const rawDate =
        interview?.completedAt ||
        interview?.scheduledAt ||
        assessment?.completedAt ||
        assessment?.startedAt ||
        (/apply|applied/i.test(stage) ? c.appliedAt : null)
      const date = rawDate ? format(new Date(rawDate), 'MMM d, yyyy') : null

      let status: 'completed' | 'current' | 'upcoming' = 'upcoming'
      if (completedStageKeys.has(key)) {
        status = 'completed'
      } else if (currentStageKeys.has(key)) {
        status = 'current'
      } else if (displayStageIndex >= 0) {
        if (index < displayStageIndex) {
          status = 'completed'
        } else if (index === displayStageIndex) {
          status = 'current'
        }
      }

      return {
        name: stage,
        score,
        date,
        status,
      }
    })

    const stageLabel = displayStageIndex >= 0 ? flowStages[displayStageIndex] : candidateStageName

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || null,
      linkedinUrl: c.linkedinUrl || null,
      currentRole: workExperience[0]?.title || null,
      currentCompany: workExperience[0]?.company || null,
      yearsOfExperience: typeof c.yearsOfExperience === 'number' ? c.yearsOfExperience : null,
      location: c.location || null,
      position: c.job?.title || null,
      job: c.job || null,
      stage: stageLabel || null,
      rawStage: c.stage,
      score: typeof c.score === 'number' ? c.score : null,
      appliedDate: c.appliedAt ? format(new Date(c.appliedAt), 'MMM d, yyyy') : null,
      color: 'bg-indigo-600',
      mbtiType: c.mbtiType || null,
      experienceMatchScore: c.experienceMatchScore ?? null,
      skillsMatchScore: c.skillsMatchScore ?? null,
      domainFitScore: c.domainFitScore ?? null,
      educationScore: c.educationScore ?? null,
      scoreExplanation: c.scoreExplanation || null,
      resumeSummary: c.resumeSummary || c.bio || null,
      workExperience,
      education,
      skills,
      whyCuracel: c.coverLetter || c.whyCuracel || null,
      salaryExpMin: c.salaryExpMin ?? null,
      salaryExpMax: c.salaryExpMax ?? null,
      noticePeriod: c.noticePeriod || null,
      pressValues,
      pressValuesAvg,
      competencyScores: competencyScores || {},
      personalityProfile: personalityProfile || {},
      competencyAverage,
      personalityAverage,
      interviewAverage,
      assessmentAverage,
      teamFitStrengths: normalizeTextList(teamFitAnalysis?.strengths),
      teamFitConsiderations: normalizeTextList(teamFitAnalysis?.considerations),
      stageTimeline,
      mustValidate: normalizeTextList(c.mustValidate),
      documents: (profileData.documents as Array<{
        id: string
        name: string
        type: string
        url: string
        uploadedAt: string
      }>) || [],
      assessments,
      recommendation: evalSummary?.recommendation || c.recommendation || null,
      recommendationConfidence: evalSummary?.aiRecommendation?.confidence ?? c.recommendationConfidence ?? null,
      recommendationSummary: evalSummary?.aiRecommendation?.summary || c.recommendationSummary || null,
      recommendationStrengths,
      recommendationRisks,
      decisionStatus: c.decisionStatus || null,
      decisionNotes: c.decisionNotes || null,
      interviewEvaluations,
    }
  }, [profileData])

  const scoreComponents = useMemo(() => {
    if (!candidate) return []

    const getScoreValue = (key: CandidateScoreComponent['id']) => {
      switch (key) {
        case 'experienceMatchScore':
          return candidate.experienceMatchScore
        case 'skillsMatchScore':
          return candidate.skillsMatchScore
        case 'domainFitScore':
          return candidate.domainFitScore
        case 'educationScore':
          return candidate.educationScore
        case 'pressValuesAvg':
          return candidate.pressValuesAvg
        case 'interviewAverage':
          return candidate.interviewAverage
        case 'assessmentAverage':
          return candidate.assessmentAverage
        case 'competencyAverage':
          return candidate.competencyAverage
        case 'personalityAverage':
          return candidate.personalityAverage
        default:
          return null
      }
    }

    return scoreWeights
      .filter((component) => component.enabled)
      .map((component) => {
        const value = getScoreValue(component.id)
        if (typeof value !== 'number') return null

        return {
          ...component,
          value,
        }
      })
      .filter((component): component is CandidateScoreComponent & { value: number } => component !== null)
  }, [candidate, scoreWeights])

  const overallScore = useMemo(() => {
    if (scoreComponents.length === 0) return null
    const totalWeight = scoreComponents.reduce((sum, component) => sum + component.weight, 0)
    if (totalWeight <= 0) return null
    const weightedTotal = scoreComponents.reduce(
      (sum, component) => sum + component.value * component.weight,
      0
    )
    return Math.round(weightedTotal / totalWeight)
  }, [scoreComponents])

  useEffect(() => {
    if (!candidate || decisionInitialized) return
    if (candidate.decisionStatus && candidate.decisionStatus !== 'PENDING') {
      setSelectedDecision(candidate.decisionStatus)
    }
    if (candidate.decisionNotes) {
      setDecisionNotes(candidate.decisionNotes)
    }
    setDecisionInitialized(true)
  }, [candidate, decisionInitialized])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-sm text-muted-foreground">
        Candidate profile not found.
      </div>
    )
  }

  const displayScore = overallScore
  const analysisStrengths = normalizeTextList(latestAnalysis?.strengths)
  const analysisConcerns = normalizeTextList(latestAnalysis?.concerns)

  const handleExportProfile = async () => {
    if (!candidateId) return
    try {
      setExporting(true)
      const response = await fetch(`/api/recruiting/candidates/${candidateId}/export`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(errorText || 'Failed to export profile')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const disposition = response.headers.get('content-disposition')
      const fileMatch = disposition?.match(/filename=\"([^\"]+)\"/)
      const safeName = candidate?.name
        ? candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : 'candidate'
      const fallbackName = `candidate-profile-${safeName || 'export'}.pdf`

      link.href = url
      link.download = fileMatch?.[1] || fallbackName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Candidate profile PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export profile')
    } finally {
      setExporting(false)
    }
  }

  const handleStageUpdate = async (stage: 'OFFER' | 'REJECTED', successMessage: string) => {
    if (updateCandidate.isPending) return
    setActionInFlight(stage === 'OFFER' ? 'advance' : 'reject')
    try {
      await updateCandidate.mutateAsync({ id: candidateId, stage })
      toast.success(successMessage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update candidate')
    } finally {
      setActionInFlight(null)
    }
  }

  const handleSubmitDecision = async () => {
    if (!selectedDecision || updateCandidate.isPending) return
    setActionInFlight('decision')
    try {
      await updateCandidate.mutateAsync({
        id: candidateId,
        decisionStatus: selectedDecision as 'HIRE' | 'HOLD' | 'NO_HIRE',
        decisionNotes: decisionNotes.trim() ? decisionNotes.trim() : null,
      })
      toast.success('Decision saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save decision')
    } finally {
      setActionInFlight(null)
    }
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl flex-shrink-0">
                <AvatarFallback className={cn(candidate.color, 'text-white text-xl sm:text-2xl font-semibold rounded-xl')}>
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>

              {/* Score - visible on mobile next to avatar */}
              {typeof displayScore === 'number' && (
                <div className="text-center p-3 bg-success/10 rounded-xl border border-success/20 sm:hidden">
                  <div className="text-3xl font-bold text-success">{displayScore}</div>
                  <div className="text-xs text-muted-foreground">Overall Score</div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold mb-1">{candidate.name}</h1>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3">
                {candidate.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{candidate.email}</span>
                  </span>
                )}
                {candidate.linkedinUrl && (
                  <a
                    href={`https://${candidate.linkedinUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700"
                  >
                    <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                    LinkedIn
                  </a>
                )}
                {candidate.appliedDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    {candidate.appliedDate}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {candidate.position && (
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">{candidate.position}</Badge>
                )}
                {candidate.stage && (
                  <Badge className="bg-success/10 text-success hover:bg-success/10 text-xs">{candidate.stage}</Badge>
                )}
                {candidate.mbtiType && (
                  <Badge variant="secondary" className="text-xs">{candidate.mbtiType}</Badge>
                )}
              </div>
            </div>

            {/* Score - hidden on mobile, shown on desktop */}
            {typeof displayScore === 'number' && (
              <div className="hidden sm:block text-center p-4 bg-success/10 rounded-xl border border-success/20 flex-shrink-0">
                <div className="text-4xl font-bold text-success">{displayScore}</div>
                <div className="text-xs text-muted-foreground">Overall Score</div>
                <div className="text-[10px] text-success-foreground mt-1">Weighted from profile inputs</div>
              </div>
            )}

            <div className="flex sm:flex-col gap-2">
              <Link href={`/recruiting/candidates/${candidateId}/stages/panel`} className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                  <FileText className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">View Stages</span>
                </Button>
              </Link>
              <Link href="/hiring/questions" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                  <HelpCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Generate Questions</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs sm:text-sm"
                onClick={handleExportProfile}
                disabled={exporting}
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export Profile</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-full">
            <TabsTrigger value="overview" className="flex-1 justify-center text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="application" className="flex-1 justify-center text-xs sm:text-sm">Application</TabsTrigger>
            <TabsTrigger value="stages" className="flex-1 justify-center text-xs sm:text-sm">Interviews</TabsTrigger>
            <TabsTrigger value="assessments" className="flex-1 justify-center text-xs sm:text-sm">Assessments</TabsTrigger>
            <TabsTrigger value="values" className="flex-1 justify-center text-xs sm:text-sm">Values</TabsTrigger>
            <TabsTrigger value="email" className="flex-1 justify-center text-xs sm:text-sm">Email</TabsTrigger>
            <TabsTrigger value="auntypelz" className="flex-1 justify-center text-xs sm:text-sm">AuntyPelz</TabsTrigger>
            <TabsTrigger value="decision" className="flex-1 justify-center text-xs sm:text-sm">Decision</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Main Column */}
            <div className="space-y-4">
              {/* AuntyPelz Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-indigo-600" />
                    AuntyPelz's Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {latestAnalysis ? (
                    <>
                      <p className="text-sm text-foreground/80 mb-4">{latestAnalysis.summary}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <div className="font-semibold text-success mb-3">Strengths</div>
                          {analysisStrengths.length > 0 ? (
                            analysisStrengths.map((strength, i) => (
                              <div key={i} className="flex items-start gap-2 py-2">
                                <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{strength}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">No strengths captured yet.</div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-amber-600 mb-3">Areas to Explore</div>
                          {analysisConcerns.length > 0 ? (
                            analysisConcerns.map((area, i) => (
                              <div key={i} className="flex items-start gap-2 py-2">
                                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{area}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">No concerns captured yet.</div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No AuntyPelz summary yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scoreComponents.length > 0 ? (
                    scoreComponents.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-36">
                          <div className="text-sm text-foreground/80">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground">Weight {item.weight}%</div>
                        </div>
                        <div className="flex-1">
                          <Progress value={item.value} className="h-2" />
                        </div>
                        <span className="w-10 text-right font-semibold text-sm">{item.value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No scoring inputs yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* PRESS Values Alignment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    PRESS Values Alignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.pressValues.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                      {candidate.pressValues.map((value, i) => (
                        <div key={i} className="text-center p-3 sm:p-4 bg-muted/50 rounded-xl">
                          <div className="text-xl sm:text-2xl font-bold text-indigo-600 mb-1">{value.letter}</div>
                          <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{value.name}</div>
                          <div className={cn(
                            'text-xs sm:text-sm font-semibold mt-2',
                            value.rating === 'Strong' ? 'text-success' : value.rating === 'Moderate' ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {value.rating}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No PRESS values recorded yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* AuntyPelz Recommendation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    AuntyPelz Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.recommendation || candidate.recommendationSummary ? (
                    <div className="p-5 bg-success/10 border border-success/20 rounded-xl text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded-full font-semibold text-sm mb-3">
                        <Check className="h-4 w-4" />
                        {candidate.recommendation?.replace(/_/g, ' ') || 'Recommendation'}
                      </div>
                      <div className="text-sm text-foreground/80">
                        {typeof candidate.recommendationConfidence === 'number' && (
                          <strong>Confidence: {candidate.recommendationConfidence}%</strong>
                        )}
                        {candidate.recommendationSummary && (
                          <span className="block mt-2">{candidate.recommendationSummary}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No AuntyPelz recommendation yet.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Stage Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Stage Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.stageTimeline.length > 0 ? (
                    <div className="relative">
                      {candidate.stageTimeline.map((stage, i) => (
                        <div key={i} className="flex gap-4 pb-5 last:pb-0 relative">
                          {i < candidate.stageTimeline.length - 1 && (
                            <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />
                          )}
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                            stage.status === 'completed' && 'bg-success text-white',
                            stage.status === 'current' && 'bg-indigo-600 text-white shadow-[0_0_0_4px_rgba(99,102,241,0.2)]',
                            stage.status === 'upcoming' && 'bg-muted text-muted-foreground'
                          )}>
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{stage.name}</span>
                              {typeof stage.score === 'number' && (
                                <span className={cn(
                                  'px-2 py-0.5 rounded text-xs font-semibold',
                                  stage.score >= 80 ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-600'
                                )}>
                                  {stage.score}
                                </span>
                              )}
                            </div>
                            {stage.date && (
                              <div className="text-xs text-muted-foreground">
                                {stage.date}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No hiring flow data available.</div>
                  )}
                </CardContent>
              </Card>

              {/* Must Validate */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Must Validate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.mustValidate.length > 0 ? (
                    candidate.mustValidate.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 py-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No validation items yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Quick Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      candidate.currentRole
                        ? { label: 'Current Role', value: candidate.currentRole }
                        : null,
                      candidate.currentCompany
                        ? { label: 'Current Company', value: candidate.currentCompany }
                        : null,
                      typeof candidate.yearsOfExperience === 'number'
                        ? { label: 'Experience', value: `${candidate.yearsOfExperience} years` }
                        : null,
                      candidate.noticePeriod
                        ? { label: 'Notice Period', value: candidate.noticePeriod }
                        : null,
                      typeof candidate.salaryExpMin === 'number' && typeof candidate.salaryExpMax === 'number'
                        ? { label: 'Salary Expectation', value: `$${candidate.salaryExpMin.toLocaleString()} - $${candidate.salaryExpMax.toLocaleString()}` }
                        : null,
                      candidate.mbtiType
                        ? { label: 'MBTI', value: candidate.mbtiType }
                        : null,
                    ]
                      .filter((item): item is { label: string; value: string } => Boolean(item))
                      .map((item) => (
                        <div key={item.label} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.documents.length > 0 ? (
                    candidate.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer">
                        <FileText className="h-4 w-4 text-red-500" />
                        <span className="flex-1 text-sm">{doc.name}</span>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Application Tab */}
        <TabsContent value="application" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              {/* Application Score Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Application Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {[
                    { label: 'Experience Match', score: candidate.experienceMatchScore },
                    { label: 'Skills Match', score: candidate.skillsMatchScore },
                    { label: 'Domain Fit', score: candidate.domainFitScore },
                    { label: 'Education', score: candidate.educationScore },
                  ].filter((item) => typeof item.score === 'number').length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        {[
                          { label: 'Experience Match', score: candidate.experienceMatchScore },
                          { label: 'Skills Match', score: candidate.skillsMatchScore },
                          { label: 'Domain Fit', score: candidate.domainFitScore },
                          { label: 'Education', score: candidate.educationScore },
                        ]
                          .filter((item): item is { label: string; score: number } => typeof item.score === 'number')
                          .map((item) => (
                            <div key={item.label} className="text-center p-3 bg-muted/50 rounded-lg">
                              <div className={cn(
                                'text-2xl font-bold',
                                item.score >= 80 ? 'text-success' : item.score >= 65 ? 'text-amber-600' : 'text-red-600'
                              )}>
                                {item.score}
                              </div>
                              <div className="text-xs text-muted-foreground">{item.label}</div>
                            </div>
                          ))}
                      </div>
                      {candidate.scoreExplanation ? (
                        <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg">
                          {candidate.scoreExplanation}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No score explanation available.</p>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No application score inputs yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.resumeSummary ? (
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {candidate.resumeSummary}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No resume summary available.</p>
                  )}
                </CardContent>
              </Card>

              {/* Work Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {candidate.workExperience.length > 0 ? (
                    candidate.workExperience.map((exp, i) => (
                      <div key={i} className={cn(i > 0 && 'pt-6 border-t')}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{exp.title}</h4>
                            <div className="text-sm text-muted-foreground">{exp.company}</div>
                          </div>
                          {(exp.startDate || exp.endDate) && (
                            <Badge variant={exp.isCurrent ? 'default' : 'secondary'}>
                              {exp.startDate || '—'} - {exp.endDate || 'Present'}
                            </Badge>
                          )}
                        </div>
                        {Array.isArray(exp.highlights) && exp.highlights.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1 mb-3">
                            {exp.highlights.map((h, j) => (
                              <li key={j}>{h}</li>
                            ))}
                          </ul>
                        )}
                        {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {exp.skills.map((skill, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No work experience provided yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Education</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.education.length > 0 ? (
                    candidate.education.map((edu, i) => (
                      <div key={i} className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{edu.degree} {edu.field}</h4>
                          <div className="text-sm text-muted-foreground">{edu.institution}</div>
                          {edu.honors && (
                            <Badge variant="outline" className="mt-1 text-xs text-success border-success/30">
                              {edu.honors}
                            </Badge>
                          )}
                        </div>
                        {edu.years && (
                          <span className="text-sm text-muted-foreground">{edu.years}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No education records yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Why Curacel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why Curacel?</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.whyCuracel ? (
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {candidate.whyCuracel}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No response provided yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.skills.languages.length > 0 ||
                  candidate.skills.frameworks.length > 0 ||
                  candidate.skills.databases.length > 0 ||
                  candidate.skills.infrastructure.length > 0 ? (
                    <>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Languages & Frameworks</div>
                        <div className="flex flex-wrap gap-1.5">
                          {[...candidate.skills.languages, ...candidate.skills.frameworks].map((skill, i) => (
                            <Badge key={i} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Databases</div>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.skills.databases.map((skill, i) => (
                            <Badge key={i} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Infrastructure</div>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.skills.infrastructure.map((skill, i) => (
                            <Badge key={i} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No skills listed yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Application Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    typeof candidate.salaryExpMin === 'number' && typeof candidate.salaryExpMax === 'number'
                      ? { label: 'Salary Expectation', value: `$${candidate.salaryExpMin.toLocaleString()} - $${candidate.salaryExpMax.toLocaleString()}` }
                      : null,
                    candidate.noticePeriod
                      ? { label: 'Notice Period', value: candidate.noticePeriod }
                      : null,
                    candidate.mbtiType
                      ? { label: 'MBTI Type', value: candidate.mbtiType }
                      : null,
                    typeof candidate.yearsOfExperience === 'number'
                      ? { label: 'Years of Experience', value: `${candidate.yearsOfExperience} years` }
                      : null,
                  ]
                    .filter((item): item is { label: string; value: string } => Boolean(item))
                    .map((item, index, arr) => (
                      <div
                        key={item.label}
                        className={cn('flex justify-between py-2 text-sm', index < arr.length - 1 && 'border-b')}
                      >
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  {(!candidate.noticePeriod &&
                    candidate.salaryExpMin === null &&
                    candidate.salaryExpMax === null &&
                    !candidate.mbtiType &&
                    candidate.yearsOfExperience === null) && (
                    <div className="text-sm text-muted-foreground">No application details yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Must Validate */}
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Must Validate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {candidate.mustValidate.length > 0 ? (
                      candidate.mustValidate.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-amber-800">No validation items yet.</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Interview Stages Tab */}
        <TabsContent value="stages" className="mt-6">
          {candidate.interviewEvaluations.length > 0 ? (
            <div className="space-y-6">
            {candidate.interviewEvaluations.map((evaluation, evalIdx) => (
              <Card key={evalIdx} className="hover:border-indigo-300 transition-colors">
                <Link href={`/recruiting/candidates/${candidateId}/interviews/${evaluation.stageType.toLowerCase()}`}>
                  <CardHeader className="pb-4 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {evaluation.stage}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                        {evaluation.date && <Badge variant="outline">{evaluation.date}</Badge>}
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">
                          <Mic className="h-3 w-3 mr-1" />
                          Fireflies
                        </Badge>
                      </div>
                      {typeof evaluation.overallScore === 'number' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Overall Score:</span>
                          <Badge className={cn(
                            'text-lg px-3 py-1',
                            evaluation.overallScore >= 85 ? 'bg-success' :
                            evaluation.overallScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          )}>
                            {evaluation.overallScore}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Link>
                <CardContent>
                  <div className="space-y-6">
                    {evaluation.evaluators.map((evaluator, evIdx) => {
                      const rating = typeof evaluator.overallRating === 'number' ? evaluator.overallRating : null

                      return (
                      <div key={evIdx} className={cn(evIdx > 0 && 'pt-6 border-t')}>
                        {/* Evaluator Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-medium">
                                {getInitials(evaluator.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">{evaluator.name}</div>
                              <div className="text-sm text-muted-foreground">{evaluator.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Rating</div>
                              {rating !== null ? (
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={cn(
                                        'h-4 w-4',
                                        star <= rating
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-muted-foreground/40'
                                      )}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">No rating yet</div>
                              )}
                            </div>
                            {evaluator.recommendation && (
                              <Badge className={cn(
                                evaluator.recommendation === 'STRONG_HIRE' || evaluator.recommendation === 'STRONG_ADVANCE'
                                  ? 'bg-success'
                                  : evaluator.recommendation === 'HIRE' || evaluator.recommendation === 'ADVANCE'
                                  ? 'bg-success'
                                  : evaluator.recommendation === 'HOLD'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              )}>
                                {evaluator.recommendation.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Criteria Scores */}
                        <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                            {evaluator.criteria.map((criterion, cIdx) => (
                              <div key={cIdx} className="text-center">
                                <div className="text-[10px] sm:text-xs text-muted-foreground mb-2">{criterion.name}</div>
                                <div className="flex justify-center gap-0.5 mb-1">
                                  {[1, 2, 3, 4, 5].map((dot) => (
                                    <div
                                      key={dot}
                                      className={cn(
                                        'w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full',
                                        dot <= criterion.score
                                          ? criterion.score >= 4
                                            ? 'bg-success'
                                            : criterion.score >= 3
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                          : 'bg-muted'
                                      )}
                                    />
                                  ))}
                                </div>
                                <div className="text-xs font-semibold">
                                  {criterion.score}/{criterion.maxScore}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        {evaluator.notes && (
                          <div className="flex items-start gap-2 text-sm text-foreground/80">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span>{evaluator.notes}</span>
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Summary Card */}
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm text-indigo-600 font-medium">Interview Summary</div>
                      <div className="text-lg font-semibold">
                        {candidate.interviewEvaluations.length} stages completed with {
                          candidate.interviewEvaluations.reduce((acc, e) => acc + e.evaluators.length, 0)
                        } evaluator assessments
                      </div>
                    </div>
                  </div>
                  <Link href={`/recruiting/candidates/${candidateId}/stages/panel`}>
                    <Button variant="outline">
                      View Full Details
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              <p>No interview evaluations yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="mt-6">
          {candidate.assessments.length > 0 ? (
            <div className="space-y-4">
              {candidate.assessments.map((assessment) => (
                <Card key={assessment.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{assessment.template?.name || 'Assessment'}</span>
                      <Badge variant="outline" className="text-xs">
                        {assessment.status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Score</span>
                      <span className="font-medium text-foreground">
                        {typeof assessment.overallScore === 'number'
                          ? assessment.overallScore
                          : typeof assessment.qualityScore === 'number'
                            ? assessment.qualityScore
                            : '—'}
                      </span>
                    </div>
                    {assessment.completedAt && (
                      <div className="flex items-center justify-between">
                        <span>Completed</span>
                        <span className="font-medium text-foreground">
                          {format(new Date(assessment.completedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {assessment.summary && (
                      <p className="text-foreground/80">{assessment.summary}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              <p>No assessments yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Values & Fit Tab */}
        <TabsContent value="values" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PRESS Values */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  PRESS Values Alignment
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Average: {typeof candidate.pressValuesAvg === 'number' ? `${candidate.pressValuesAvg}%` : '—'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.pressValues.length > 0 ? (
                  candidate.pressValues.map((value, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        {value.letter}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{value.name}</span>
                          <span className="font-semibold">{value.score}%</span>
                        </div>
                        <Progress value={value.score} className="h-2" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No PRESS values recorded yet.</div>
                )}
              </CardContent>
            </Card>

            {/* Competency Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  Competency Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(candidate.competencyScores).length > 0 ? (
                  [
                    { key: 'systemDesign', label: 'System Design' },
                    { key: 'technicalLeadership', label: 'Technical Leadership' },
                    { key: 'problemSolving', label: 'Problem Solving' },
                    { key: 'communication', label: 'Communication' },
                    { key: 'domainKnowledge', label: 'Domain Knowledge' },
                  ].map((comp) => {
                    const value = candidate.competencyScores[comp.key as keyof typeof candidate.competencyScores]
                    if (typeof value !== 'number') return null
                    return (
                      <div key={comp.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{comp.label}</span>
                          <span className={cn(
                            'font-semibold',
                            value >= 80 ? 'text-success' : value >= 65 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {value}%
                          </span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-muted-foreground">No competency scores yet.</div>
                )}
              </CardContent>
            </Card>

            {/* Personality Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-indigo-600" />
                  Personality Profile (OCEAN)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(candidate.personalityProfile).length > 0 ? (
                  [
                    { key: 'openness', label: 'Openness', description: 'Creative, curious' },
                    { key: 'conscientiousness', label: 'Conscientiousness', description: 'Organized, reliable' },
                    { key: 'extraversion', label: 'Extraversion', description: 'Outgoing, energetic' },
                    { key: 'agreeableness', label: 'Agreeableness', description: 'Cooperative, trusting' },
                    { key: 'neuroticism', label: 'Neuroticism', description: 'Emotional stability (inverted)' },
                  ].map((trait) => {
                    const value = candidate.personalityProfile[trait.key as keyof typeof candidate.personalityProfile]
                    if (typeof value !== 'number') return null
                    return (
                      <div key={trait.key}>
                        <div className="flex justify-between text-sm mb-1">
                          <div>
                            <span className="font-medium">{trait.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{trait.description}</span>
                          </div>
                          <span className="font-semibold">
                            {value}%
                          </span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-muted-foreground">No personality profile yet.</div>
                )}
              </CardContent>
            </Card>

            {/* Team Fit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Team Fit Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-success mb-2">Strengths</h4>
                  <ul className="space-y-2">
                    {candidate.teamFitStrengths.length > 0 ? (
                      candidate.teamFitStrengths.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No strengths captured yet.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-amber-600 mb-2">Considerations</h4>
                  <ul className="space-y-2">
                    {candidate.teamFitConsiderations.length > 0 ? (
                      candidate.teamFitConsiderations.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No considerations captured yet.</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="mt-6">
          <EmailTab
            candidateId={candidate.id}
            candidateName={candidate.name}
            candidateEmail={candidate.email}
            jobId={candidate.job?.id}
            jobTitle={candidate.job?.title}
          />
        </TabsContent>

        {/* AuntyPelz Analysis Tab */}
        <TabsContent value="auntypelz" className="mt-6">
          <AuntyPelzAnalysisTab
            candidateId={candidate.id}
            candidateName={candidate.name}
          />
        </TabsContent>

        {/* Decision Tab */}
        <TabsContent value="decision" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              {/* AuntyPelz Recommendation */}
              <Card className="border-2 border-success/30 bg-success/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AuntyPelz Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.recommendation || candidate.recommendationSummary ? (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        <Badge className="text-lg px-4 py-2 bg-success">
                          <ThumbsUp className="h-5 w-5 mr-2" />
                          {(candidate.recommendation || 'PENDING').replace(/_/g, ' ')}
                        </Badge>
                        {typeof candidate.recommendationConfidence === 'number' && (
                          <div>
                            <div className="text-sm text-muted-foreground">Confidence</div>
                            <div className="text-xl font-bold">{candidate.recommendationConfidence}%</div>
                          </div>
                        )}
                      </div>
                      {candidate.recommendationSummary && (
                        <p className="text-sm text-foreground leading-relaxed">
                          {candidate.recommendationSummary}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No AuntyPelz recommendation yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Strengths & Risks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-success">Key Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {candidate.recommendationStrengths.length > 0 ? (
                        candidate.recommendationStrengths.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">No strengths available yet.</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-amber-600">Risks & Mitigations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {candidate.recommendationRisks.length > 0 ? (
                        candidate.recommendationRisks.map((item, i) => (
                          <li key={i} className="text-sm">
                            <div className="flex items-start gap-2 text-amber-700">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {item.risk}
                            </div>
                            <div className="ml-6 text-muted-foreground text-xs mt-1">
                              Mitigation: {item.mitigation}
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">No risks logged yet.</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Human Decision */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Decision</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mb-4">
                    <Button
                      variant={selectedDecision === 'HIRE' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        selectedDecision === 'HIRE' && 'bg-success hover:bg-success'
                      )}
                      onClick={() => setSelectedDecision('HIRE')}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Hire
                    </Button>
                    <Button
                      variant={selectedDecision === 'HOLD' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        selectedDecision === 'HOLD' && 'bg-amber-500 hover:bg-amber-600'
                      )}
                      onClick={() => setSelectedDecision('HOLD')}
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Hold
                    </Button>
                    <Button
                      variant={selectedDecision === 'NO_HIRE' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        selectedDecision === 'NO_HIRE' && 'bg-red-500 hover:bg-red-600'
                      )}
                      onClick={() => setSelectedDecision('NO_HIRE')}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      No Hire
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Add notes about your decision..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button
                    className="mt-4 w-full"
                    disabled={!selectedDecision || actionInFlight === 'decision'}
                    onClick={handleSubmitDecision}
                  >
                    Submit Decision
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Score Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {typeof candidate.score === 'number' && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Application Score</span>
                      <span className="font-semibold text-success">{candidate.score}</span>
                    </div>
                  )}
                  {typeof candidate.pressValuesAvg === 'number' && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">PRESS Values Avg</span>
                      <span className="font-semibold">{candidate.pressValuesAvg}%</span>
                    </div>
                  )}
                  {typeof candidate.recommendationConfidence === 'number' && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-muted-foreground">AuntyPelz Confidence</span>
                      <span className="font-semibold">{candidate.recommendationConfidence}%</span>
                    </div>
                  )}
                  {typeof candidate.score !== 'number' &&
                    typeof candidate.pressValuesAvg !== 'number' &&
                    typeof candidate.recommendationConfidence !== 'number' && (
                      <div className="text-sm text-muted-foreground">No scoring summary yet.</div>
                    )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    disabled={actionInFlight === 'advance'}
                    onClick={() => handleStageUpdate('OFFER', 'Candidate moved to Offer')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Advance to Offer
                  </Button>
                  <Link href={`/recruiting/interviews/schedule?candidateId=${candidateId}`}>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Final Interview
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    disabled={actionInFlight === 'reject'}
                    onClick={() => handleStageUpdate('REJECTED', 'Candidate marked as rejected')}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Send Rejection
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
