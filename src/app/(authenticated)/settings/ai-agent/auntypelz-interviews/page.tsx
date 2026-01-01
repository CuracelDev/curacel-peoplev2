'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  FileText,
  MessageSquare,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Brain,
  RefreshCw,
  Loader2,
} from 'lucide-react'

const ANALYSIS_DEPTH_OPTIONS = [
  { value: 'basic', label: 'Basic', description: 'Summary only' },
  { value: 'standard', label: 'Standard', description: 'Summary + strengths/concerns' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'All fields + sentiment tracking' },
]

const REFRESH_OPTIONS = [
  { value: 'manual', label: 'Manual', description: 'Only when requested' },
  { value: 'on_view', label: 'On View', description: 'When tab is viewed' },
  { value: 'daily', label: 'Daily', description: 'Once per day' },
]

export default function AuntyPelzInterviewsPage() {
  // Auto-analysis triggers
  const [analyzeOnApplication, setAnalyzeOnApplication] = useState(true)
  const [analyzeOnStageComplete, setAnalyzeOnStageComplete] = useState(true)
  const [analyzeOnInterview, setAnalyzeOnInterview] = useState(true)
  const [analyzeOnAssessment, setAnalyzeOnAssessment] = useState(true)

  // Analysis settings
  const [analysisDepth, setAnalysisDepth] = useState('standard')

  // Sentiment tracking
  const [trackSentiment, setTrackSentiment] = useState(true)
  const [sentimentAlertThreshold, setSentimentAlertThreshold] = useState(20)

  // Custom prompts
  const [customAnalysisPrompt, setCustomAnalysisPrompt] = useState('')

  // Tab summaries
  const [enableTabSummaries, setEnableTabSummaries] = useState(true)
  const [tabSummaryRefresh, setTabSummaryRefresh] = useState('on_view')

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Save to database
    await new Promise(r => setTimeout(r, 500))
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="AuntyPelz Interviews"
        description="Configure AuntyPelz analysis for recruiting interviews and candidate assessments"
      />

      {/* Auto-Analysis Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Auto-Analysis Triggers
          </CardTitle>
          <CardDescription>
            Choose when AuntyPelz should automatically generate candidate analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <Label>On Application Submission</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate initial analysis when a candidate applies
                </p>
              </div>
            </div>
            <Switch checked={analyzeOnApplication} onCheckedChange={setAnalyzeOnApplication} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <Label>On Stage Completion</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update analysis when candidate advances to a new stage
                </p>
              </div>
            </div>
            <Switch checked={analyzeOnStageComplete} onCheckedChange={setAnalyzeOnStageComplete} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <Label>After Interview Completion</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Analyze interview performance when an interview is marked complete
                </p>
              </div>
            </div>
            <Switch checked={analyzeOnInterview} onCheckedChange={setAnalyzeOnInterview} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <Label>After Assessment Completion</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Analyze assessment results when scores are received
                </p>
              </div>
            </div>
            <Switch checked={analyzeOnAssessment} onCheckedChange={setAnalyzeOnAssessment} />
          </div>
        </CardContent>
      </Card>

      {/* Analysis Depth */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Analysis Depth
          </CardTitle>
          <CardDescription>
            Choose how comprehensive each analysis should be
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ANALYSIS_DEPTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setAnalysisDepth(option.value)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  analysisDepth === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {analysisDepth === option.value && (
                    <Badge variant="default" className="text-xs">Selected</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sentiment Tracking
          </CardTitle>
          <CardDescription>
            Track how candidate assessments change over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Sentiment Tracking</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Monitor sentiment changes across analysis versions
              </p>
            </div>
            <Switch checked={trackSentiment} onCheckedChange={setTrackSentiment} />
          </div>

          {trackSentiment && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Alert Threshold</Label>
                  <span className="text-sm font-medium">{sentimentAlertThreshold} points</span>
                </div>
                <Slider
                  value={[sentimentAlertThreshold]}
                  onValueChange={([val]) => setSentimentAlertThreshold(val)}
                  min={5}
                  max={50}
                  step={5}
                />
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    You'll be notified when a candidate's sentiment score drops by {sentimentAlertThreshold} or more points between analyses.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tab Summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Tab Summaries
          </CardTitle>
          <CardDescription>
            AuntyPelz-generated summaries shown at the bottom of candidate profile tabs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Tab Summaries</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Show AuntyPelz insights on each candidate profile tab
              </p>
            </div>
            <Switch checked={enableTabSummaries} onCheckedChange={setEnableTabSummaries} />
          </div>

          {enableTabSummaries && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Refresh Frequency</Label>
                <Select value={tabSummaryRefresh} onValueChange={setTabSummaryRefresh}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <span className="text-muted-foreground ml-2">- {option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Custom Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Custom Analysis Prompt
          </CardTitle>
          <CardDescription>
            Add custom instructions for AuntyPelz when generating candidate analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={customAnalysisPrompt}
            onChange={(e) => setCustomAnalysisPrompt(e.target.value)}
            placeholder="e.g., Pay special attention to candidates' experience with fintech and insurance domains. Weight heavily their ability to work in fast-paced startup environments..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Leave blank to use the default analysis prompt. Your custom instructions will be appended to the standard analysis criteria.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
