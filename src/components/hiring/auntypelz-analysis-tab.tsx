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
} from 'lucide-react'
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

export function AuntyPelzAnalysisTab({ candidateId, candidateName }: AuntyPelzAnalysisTabProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [showAllVersions, setShowAllVersions] = useState(false)

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
        return { bg: 'bg-green-100', text: 'text-green-700', icon: ThumbsUp }
      case 'YES':
        return { bg: 'bg-green-50', text: 'text-green-600', icon: ThumbsUp }
      case 'MAYBE':
        return { bg: 'bg-amber-50', text: 'text-amber-600', icon: HelpCircle }
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
    if (change && change > 5) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change && change < -5) return <TrendingDown className="h-4 w-4 text-red-500" />
    if (score > 30) return <TrendingUp className="h-4 w-4 text-green-500" />
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

  const recStyle = getRecommendationStyle(displayAnalysis.recommendation)
  const RecIcon = recStyle.icon
  const strengths = normalizeTextList(displayAnalysis.strengths)
  const concerns = normalizeTextList(displayAnalysis.concerns)
  const mustValidatePoints = normalizeTextList(displayAnalysis.mustValidatePoints)
  const nextStageQuestions = normalizeTextList(displayAnalysis.nextStageQuestions)
  const recommendations = normalizeTextList(displayAnalysis.recommendations)

  return (
    <div className="space-y-6">
      {/* Header with Version Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">BlueAI Analysis</h2>
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
                    {displayAnalysis.recommendation.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((displayAnalysis.confidence || 0) * 100)}% confident)
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">{displayAnalysis.summary}</p>
            </CardContent>
          </Card>

          {/* Strengths & Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {concerns.map((concern, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

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
                  displayAnalysis.overallScore >= 80 ? 'text-green-600' :
                  displayAnalysis.overallScore >= 65 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {displayAnalysis.overallScore}
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

          {/* Sentiment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                Sentiment
                {getSentimentIcon(displayAnalysis.sentimentScore, displayAnalysis.sentimentChange)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  'text-2xl font-bold',
                  displayAnalysis.sentimentScore > 30 ? 'text-green-600' :
                  displayAnalysis.sentimentScore < -30 ? 'text-red-600' : 'text-gray-600'
                )}>
                  {displayAnalysis.sentimentScore > 0 ? '+' : ''}{displayAnalysis.sentimentScore}
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
                    {(showAllVersions ? versions : versions.slice(0, 3)).map((v) => (
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
                          {getSentimentIcon(v.sentimentScore, v.sentimentChange)}
                        </div>
                      </button>
                    ))}
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
                  <span>BlueAI Provider</span>
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
