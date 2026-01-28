'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Target,
  Brain,
  Heart,
  Zap,
  Lightbulb,
  Loader2,
  History,
  ArrowRight,
  BarChart3,
  Shield,
  FileText,
  MessageSquare,
  ClipboardCheck,
  Link2,
  Briefcase,
  GraduationCap,
  User,
  GitBranch,
  Save,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

interface AuntyPelzAnalysisTabProps {
  candidateId: string
  candidateName: string
}

// Evidence source types for citations
type EvidenceSource = {
  type: 'resume' | 'interview' | 'assessment' | 'reference'
  label: string
  detail?: string
  score?: number
}

// Risk factor type
type RiskFactor = {
  risk: string
  severity: 'high' | 'medium' | 'low'
  mitigation: string
}

export function AuntyPelzAnalysisTab({ candidateId, candidateName }: AuntyPelzAnalysisTabProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [showScoreTimeline, setShowScoreTimeline] = useState(true)
  const [showRiskFactors, setShowRiskFactors] = useState(true)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [isSavingDecision, setIsSavingDecision] = useState(false)

  // Fetch latest analysis
  const { data: latestAnalysis, isLoading: latestLoading, refetch: refetchLatest } =
    trpc.auntyPelzAnalysis.getLatestAnalysis.useQuery({ candidateId })

  // Fetch all versions
  const { data: versions, refetch: refetchVersions } =
    trpc.auntyPelzAnalysis.listVersions.useQuery({ candidateId, limit: 20 })

  // Fetch sentiment history
  const { data: sentimentHistory } =
    trpc.auntyPelzAnalysis.getSentimentHistory.useQuery({ candidateId })

  // Regenerate mutation
  const regenerate = trpc.auntyPelzAnalysis.regenerateLatest.useMutation({
    onSuccess: () => {
      refetchLatest()
      refetchVersions()
    },
  })

  // Generate new analysis mutation
  const generateAnalysis = trpc.auntyPelzAnalysis.generateAnalysis.useMutation({
    onSuccess: () => {
      refetchLatest()
      refetchVersions()
    },
  })

  // Selected or latest analysis
  const analysis = selectedVersionId
    ? versions?.find(v => v.id === selectedVersionId)
    : latestAnalysis

  // Get full analysis if version selected
  const { data: fullAnalysis } = trpc.auntyPelzAnalysis.getById.useQuery(
    { id: selectedVersionId! },
    { enabled: !!selectedVersionId }
  )

  const displayAnalysis = selectedVersionId ? fullAnalysis : latestAnalysis

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
            (typeof record.risk === 'string' && record.risk) ||
            (typeof record.text === 'string' && record.text) ||
            ''
          const secondary =
            (typeof record.description === 'string' && record.description) ||
            (typeof record.mitigation === 'string' && record.mitigation) ||
            ''

          if (primary && secondary) return `${primary}: ${secondary}`
          return primary || secondary
        }

        return ''
      })
      .map((value) => value.trim())
      .filter(Boolean)
  }

  // Get recommendation styling
  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'STRONG_YES':
        return { bg: 'bg-success/10', text: 'text-success-foreground', icon: ThumbsUp }
      case 'YES':
        return { bg: 'bg-success/10', text: 'text-success', icon: ThumbsUp }
      case 'MAYBE':
        return { bg: 'bg-warning/10', text: 'text-warning', icon: HelpCircle }
      case 'NO':
        return { bg: 'bg-red-50', text: 'text-red-600', icon: ThumbsDown }
      case 'STRONG_NO':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: ThumbsDown }
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', icon: HelpCircle }
    }
  }

  // Get sentiment icon
  const getSentimentIcon = (score: number, change?: number) => {
    if (change && change > 5) return <TrendingUp className="h-4 w-4 text-success" />
    if (change && change < -5) return <TrendingDown className="h-4 w-4 text-red-500" />
    if (score > 30) return <TrendingUp className="h-4 w-4 text-success" />
    if (score < -30) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  // PRESS value labels
  const pressLabels: Record<string, { label: string; icon: React.ElementType }> = {
    passionateWork: { label: 'Passionate Work', icon: Heart },
    relentlessGrowth: { label: 'Relentless Growth', icon: TrendingUp },
    empoweredAction: { label: 'Empowered Action', icon: Zap },
    senseOfUrgency: { label: 'Sense of Urgency', icon: Target },
    seeingPossibilities: { label: 'Seeing Possibilities', icon: Lightbulb },
  }

  // Build score timeline data from versions
  const scoreTimelineData = versions
    ?.slice()
    .reverse()
    .map((v, idx) => ({
      version: `v${v.version}`,
      label: v.analysisType.replace('_', ' '),
      score: v.overallScore ?? 0,
      sentiment: v.sentimentScore ?? 0,
      date: format(new Date(v.createdAt), 'MMM d'),
      stage: v.triggerStage || 'Application',
    })) || []

  // Extract evidence sources from analysis data
  const extractEvidenceSources = (analysis: typeof displayAnalysis): EvidenceSource[] => {
    if (!analysis) return []
    const sources: EvidenceSource[] = []

    // Add resume-based evidence
    if (analysis.analysisType === 'APPLICATION_REVIEW' || analysis.analysisType === 'COMPREHENSIVE') {
      sources.push({
        type: 'resume',
        label: 'Resume Analysis',
        detail: 'Experience, skills, and education evaluated',
        score: analysis.scoreBreakdown ? (analysis.scoreBreakdown as Record<string, number>).experience : undefined,
      })
    }

    // Add interview-based evidence
    if (analysis.triggerStage && analysis.triggerStage !== 'APPLICATION') {
      sources.push({
        type: 'interview',
        label: `${analysis.triggerStage} Interview`,
        detail: 'Interviewer feedback and scoring',
        score: analysis.scoreBreakdown ? (analysis.scoreBreakdown as Record<string, number>).technicalSkills : undefined,
      })
    }

    // Add assessment evidence if comprehensive
    if (analysis.analysisType === 'COMPREHENSIVE') {
      sources.push({
        type: 'assessment',
        label: 'Assessments',
        detail: 'Technical and behavioral assessments',
        score: analysis.scoreBreakdown ? (analysis.scoreBreakdown as Record<string, number>).problemSolving : undefined,
      })
    }

    return sources
  }

  // Extract risk factors from concerns with severity
  const extractRiskFactors = (analysis: typeof displayAnalysis): RiskFactor[] => {
    if (!analysis) return []
    const concerns = normalizeTextList(analysis.concerns)
    const mustValidate = normalizeTextList(analysis.mustValidatePoints)

    const risks: RiskFactor[] = []

    // Convert concerns to risk factors with inferred severity
    concerns.forEach((concern, idx) => {
      const severity: RiskFactor['severity'] =
        concern.toLowerCase().includes('critical') || concern.toLowerCase().includes('major')
          ? 'high'
          : concern.toLowerCase().includes('minor') || concern.toLowerCase().includes('small')
            ? 'low'
            : 'medium'

      // Look for matching mitigation in must-validate points
      const mitigation = mustValidate[idx] || 'Address in next interview stage'

      risks.push({
        risk: concern,
        severity,
        mitigation,
      })
    })

    return risks.slice(0, 5) // Limit to top 5 risks
  }

  const evidenceSources = extractEvidenceSources(displayAnalysis)
  const riskFactors = extractRiskFactors(displayAnalysis)

  // Evidence icon mapping
  const evidenceIcons: Record<EvidenceSource['type'], React.ElementType> = {
    resume: FileText,
    interview: MessageSquare,
    assessment: ClipboardCheck,
    reference: User,
  }

  if (latestLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!displayAnalysis) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-12 w-12 text-indigo-300 mb-4" />
          <h3 className="font-medium text-lg mb-2">No Analysis Yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            Generate an AuntyPelz analysis of {candidateName}'s candidacy to get insights,
            recommendations, and scoring.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => generateAnalysis.mutate({
                candidateId,
                analysisType: 'APPLICATION_REVIEW',
                triggerEvent: 'manual',
              })}
              disabled={generateAnalysis.isPending}
            >
              {generateAnalysis.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Application Review
            </Button>
            <Button
              variant="outline"
              onClick={() => generateAnalysis.mutate({
                candidateId,
                analysisType: 'COMPREHENSIVE',
                triggerEvent: 'manual',
              })}
              disabled={generateAnalysis.isPending}
            >
              Comprehensive Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const recStyle = getRecommendationStyle(displayAnalysis.recommendation || 'HOLD')
  const RecIcon = recStyle.icon
  const recommendationLabel = (displayAnalysis.recommendation || 'HOLD').replace('_', ' ')
  const strengths = normalizeTextList(displayAnalysis.strengths)
  const concerns = normalizeTextList(displayAnalysis.concerns)
  const mustValidatePoints = normalizeTextList(displayAnalysis.mustValidatePoints)
  const nextStageQuestions = normalizeTextList(displayAnalysis.nextStageQuestions)
  const recommendations = normalizeTextList(displayAnalysis.recommendations)
  const overallScore = displayAnalysis.overallScore ?? 0
  const overallScoreLabel = displayAnalysis.overallScore ?? '—'
  const sentimentScore = displayAnalysis.sentimentScore ?? 0

  return (
    <div className="space-y-6">
      {/* Header with Version Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">AuntyPelz Analysis</h2>
          </div>
          {versions && versions.length > 1 && (
            <Select
              value={selectedVersionId || latestAnalysis?.id || ''}
              onValueChange={(id) => setSelectedVersionId(id === latestAnalysis?.id ? null : id)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2">
                      <span>v{v.version}</span>
                      {v.isLatest && (
                        <Badge variant="secondary" className="text-[10px]">Latest</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => regenerate.mutate({ candidateId })}
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Regenerate
        </Button>
      </div>

      {/* Main Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column - Analysis Content */}
        <div className="space-y-6">
          {/* Summary & Recommendation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Executive Summary</CardTitle>
                <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full', recStyle.bg)}>
                  <RecIcon className={cn('h-4 w-4', recStyle.text)} />
                  <span className={cn('font-medium text-sm', recStyle.text)}>
                    {recommendationLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((displayAnalysis.confidence || 0) * 100)}% confident)
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">{displayAnalysis.summary}</p>

              {/* Evidence Citations */}
              {evidenceSources.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Based on Evidence From
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {evidenceSources.map((source, idx) => {
                      const SourceIcon = evidenceIcons[source.type]
                      return (
                        <TooltipProvider key={idx}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1.5 cursor-help"
                              >
                                <SourceIcon className="h-3 w-3" />
                                <span>{source.label}</span>
                                {source.score !== undefined && (
                                  <span className="text-muted-foreground">
                                    ({source.score})
                                  </span>
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{source.detail}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Timeline Chart */}
          {scoreTimelineData.length > 1 && (
            <Collapsible open={showScoreTimeline} onOpenChange={setShowScoreTimeline}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                        Score Timeline
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {showScoreTimeline ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CardDescription>Track score changes across analysis versions</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scoreTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="version"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
                                    <div className="font-medium mb-1">{data.version} - {data.label}</div>
                                    <div className="text-muted-foreground">{data.date}</div>
                                    <div className="mt-2 space-y-1">
                                      <div className="flex items-center justify-between gap-4">
                                        <span>Score:</span>
                                        <span className={cn(
                                          'font-medium',
                                          data.score >= 80 ? 'text-success' :
                                          data.score >= 65 ? 'text-warning' : 'text-red-600'
                                        )}>
                                          {data.score}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <span>Sentiment:</span>
                                        <span>{data.sentiment > 0 ? '+' : ''}{data.sentiment}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="5 5" />
                          <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="5 5" />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="url(#scoreGradient)"
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-green-500" style={{ borderStyle: 'dashed' }} />
                        <span>Strong (80+)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed' }} />
                        <span>Moderate (65)</span>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Strengths & Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-success flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {concerns.map((concern, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning flex-shrink-0" />
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Risk Factors & Mitigations */}
          {riskFactors.length > 0 && (
            <Collapsible open={showRiskFactors} onOpenChange={setShowRiskFactors}>
              <Card className="border-amber-200 bg-amber-50/30">
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-amber-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-600" />
                        Risk Factors & Mitigations
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {showRiskFactors ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CardDescription>
                      {riskFactors.length} potential risk{riskFactors.length > 1 ? 's' : ''} identified with mitigation strategies
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {riskFactors.map((factor, i) => (
                      <div
                        key={i}
                        className={cn(
                          'p-3 rounded-lg border',
                          factor.severity === 'high'
                            ? 'bg-red-50 border-red-200'
                            : factor.severity === 'medium'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-gray-50 border-gray-200'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] uppercase',
                                  factor.severity === 'high'
                                    ? 'border-red-400 text-red-700'
                                    : factor.severity === 'medium'
                                      ? 'border-amber-400 text-amber-700'
                                      : 'border-gray-400 text-gray-700'
                                )}
                              >
                                {factor.severity} risk
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground mb-2">
                              {factor.risk}
                            </p>
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-muted-foreground font-medium">Mitigation:</span>
                              <span className="text-muted-foreground">{factor.mitigation}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Must Validate Points */}
          {mustValidatePoints.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Must Validate Points
                </CardTitle>
                <CardDescription>Areas to probe in upcoming interviews</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {mustValidatePoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Next Stage Questions */}
          {nextStageQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-purple-600" />
                  Suggested Questions for Next Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {nextStageQuestions.map((question, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-indigo-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Human Decision Capture */}
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                Your Decision
              </CardTitle>
              <CardDescription>
                Record your hiring decision and reasoning for this candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Decision Buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'STRONG_YES', label: 'Strong Yes', icon: ThumbsUp, className: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300' },
                  { value: 'YES', label: 'Yes', icon: ThumbsUp, className: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200' },
                  { value: 'MAYBE', label: 'Maybe', icon: HelpCircle, className: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200' },
                  { value: 'NO', label: 'No', icon: ThumbsDown, className: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' },
                  { value: 'STRONG_NO', label: 'Strong No', icon: ThumbsDown, className: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300' },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      className={cn('border', option.className)}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      {option.label}
                    </Button>
                  )
                })}
              </div>

              {/* Decision Notes */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Decision Notes (optional)
                </label>
                <Textarea
                  placeholder="Add your reasoning, key observations, or next steps..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* AI vs Human Comparison */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>AI recommends: <span className={cn('font-medium', recStyle.text)}>{recommendationLabel}</span></span>
                </div>
                <Button
                  size="sm"
                  disabled={isSavingDecision}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSavingDecision ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save Decision
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Scores & Metrics */}
        <div className="space-y-4">
          {/* Overall Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'text-4xl font-bold',
                  overallScore >= 80 ? 'text-success' :
                  overallScore >= 65 ? 'text-warning' : 'text-red-600'
                )}>
                  {overallScoreLabel}
                </div>
                <div className="flex-1">
                  <Progress
                    value={displayAnalysis.overallScore}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          {displayAnalysis.scoreBreakdown && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(displayAnalysis.scoreBreakdown as Record<string, number>).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                    <Progress value={value} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stage-by-Stage Score Comparison */}
          {scoreTimelineData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-600" />
                  Stage Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scoreTimelineData.map((stage, idx) => {
                  const prevScore = idx > 0 ? scoreTimelineData[idx - 1].score : null
                  const change = prevScore !== null ? stage.score - prevScore : null
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-12 text-xs text-muted-foreground">{stage.version}</div>
                      <div className="flex-1">
                        <Progress value={stage.score} className="h-2" />
                      </div>
                      <div className="w-8 text-right">
                        <span className={cn(
                          'text-xs font-medium',
                          stage.score >= 80 ? 'text-success' :
                          stage.score >= 65 ? 'text-warning' : 'text-red-600'
                        )}>
                          {stage.score}
                        </span>
                      </div>
                      <div className="w-12 text-right">
                        {change !== null && (
                          <span className={cn(
                            'text-xs',
                            change > 0 ? 'text-success' : change < 0 ? 'text-red-600' : 'text-gray-400'
                          )}>
                            {change > 0 ? '+' : ''}{change}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Overall trend:</span>
                    <span className={cn(
                      'font-medium flex items-center gap-1',
                      scoreTimelineData.length > 1 && scoreTimelineData[scoreTimelineData.length - 1].score > scoreTimelineData[0].score
                        ? 'text-success'
                        : scoreTimelineData.length > 1 && scoreTimelineData[scoreTimelineData.length - 1].score < scoreTimelineData[0].score
                          ? 'text-red-600'
                          : 'text-gray-600'
                    )}>
                      {scoreTimelineData.length > 1 && scoreTimelineData[scoreTimelineData.length - 1].score > scoreTimelineData[0].score ? (
                        <>
                          <TrendingUp className="h-3 w-3" />
                          Improving
                        </>
                      ) : scoreTimelineData.length > 1 && scoreTimelineData[scoreTimelineData.length - 1].score < scoreTimelineData[0].score ? (
                        <>
                          <TrendingDown className="h-3 w-3" />
                          Declining
                        </>
                      ) : (
                        <>
                          <Minus className="h-3 w-3" />
                          Stable
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sentiment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Sentiment
                {getSentimentIcon(sentimentScore, displayAnalysis.sentimentChange ?? undefined)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  'text-2xl font-bold',
                  sentimentScore > 30 ? 'text-success' :
                  sentimentScore < -30 ? 'text-red-600' : 'text-gray-600'
                )}>
                  {sentimentScore > 0 ? '+' : ''}{sentimentScore}
                </div>
                {displayAnalysis.sentimentChange !== null && displayAnalysis.sentimentChange !== 0 && (
                  <Badge variant={displayAnalysis.sentimentChange > 0 ? 'default' : 'destructive'}>
                    {displayAnalysis.sentimentChange > 0 ? '+' : ''}{displayAnalysis.sentimentChange}
                  </Badge>
                )}
              </div>
              {displayAnalysis.sentimentReason && (
                <p className="text-xs text-muted-foreground">{displayAnalysis.sentimentReason}</p>
              )}
            </CardContent>
          </Card>

          {/* PRESS Values */}
          {displayAnalysis.pressValues && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">PRESS Values Alignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(displayAnalysis.pressValues as Record<string, number>).map(([key, value]) => {
                  const info = pressLabels[key]
                  if (!info) return null
                  const Icon = info.icon
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs flex-1">{info.label}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={cn(
                              'h-2 w-2 rounded-full',
                              n <= value ? 'bg-indigo-500' : 'bg-gray-200'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Version History */}
          {versions && versions.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Version History
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllVersions(!showAllVersions)}
                    className="h-6 text-xs"
                  >
                    {showAllVersions ? 'Show Less' : `Show All (${versions.length})`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className={showAllVersions ? 'h-[200px]' : ''}>
                  <div className="space-y-2">
                    {(showAllVersions ? versions : versions.slice(0, 3)).map((v) => {
                      const versionSentimentScore = v.sentimentScore ?? 0
                      const versionSentimentChange = v.sentimentChange ?? undefined

                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVersionId(v.id === selectedVersionId ? null : v.id)}
                          className={cn(
                            'w-full text-left p-2 rounded-md text-xs transition-colors',
                            v.id === (selectedVersionId || latestAnalysis?.id)
                              ? 'bg-indigo-50 border border-indigo-200'
                              : 'hover:bg-muted'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">v{v.version}</span>
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">
                              {v.analysisType.replace('_', ' ')}
                            </Badge>
                            <span>Score: {v.overallScore}</span>
                            {getSentimentIcon(versionSentimentScore, versionSentimentChange)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Analysis Type</span>
                  <span className="font-medium">
                    {displayAnalysis.analysisType.replace('_', ' ')}
                  </span>
                </div>
                {displayAnalysis.triggerStage && (
                  <div className="flex justify-between">
                    <span>Trigger Stage</span>
                    <span className="font-medium">{displayAnalysis.triggerStage}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Generated</span>
                  <span className="font-medium">
                    {format(new Date(displayAnalysis.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                {displayAnalysis.aiProvider && (
                  <div className="flex justify-between">
                  <span>AuntyPelz Provider</span>
                    <span className="font-medium">{displayAnalysis.aiProvider}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
