'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  User,
  Loader2,
  Send,
  Copy,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle,
  Upload,
  Type,
  Link2,
  FileText,
  Code,
  Brain,
  Briefcase,
  ClipboardCheck,
  Target,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Webhook,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

// Type configurations
const typeConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  COMPETENCY_TEST: { label: 'Competency Test', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: ClipboardCheck },
  CODING_TEST: { label: 'Coding Test', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Code },
  PERSONALITY_TEST: { label: 'Personality Test', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', icon: Brain },
  WORK_TRIAL: { label: 'Work Trial', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: Briefcase },
  CUSTOM: { label: 'Custom', color: 'bg-muted text-foreground', icon: FileText },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-muted text-foreground/80' },
  INVITED: { label: 'Invited', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
}

const inputMethodConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  CANDIDATE: { label: 'From Candidate', icon: User },
  ADMIN: { label: 'From Admin', icon: Target },
  WEBHOOK: { label: 'Via Webhook', icon: Webhook },
}

type SubmissionType = 'FILE' | 'TEXT' | 'URL'

export default function AssessmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [activeTab, setActiveTab] = useState<SubmissionType>('TEXT')
  const [submissionText, setSubmissionText] = useState('')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')
  const [recommendation, setRecommendation] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Fetch assessment
  const { data: assessment, isLoading } = trpc.assessment.get.useQuery({ id })

  // Get link
  const copyLink = trpc.assessment.copyLink.useMutation({
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.url)
      toast.success('Assessment link copied to clipboard')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to copy link')
    },
  })

  // Send invite
  const sendInvite = trpc.assessment.sendInvite.useMutation({
    onSuccess: () => {
      toast.success('Invite sent successfully')
      utils.assessment.get.invalidate({ id })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send invite')
    },
  })

  // Record result
  const recordResult = trpc.assessment.recordResult.useMutation({
    onSuccess: () => {
      toast.success('Result saved successfully')
      utils.assessment.get.invalidate({ id })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save result')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Assessment not found</p>
        <Link href="/recruiting/assessments">
          <Button variant="link">Back to Assessments</Button>
        </Link>
      </div>
    )
  }

  const type = typeConfig[assessment.template.type] || typeConfig.CUSTOM
  const status = statusConfig[assessment.status] || statusConfig.NOT_STARTED
  const inputMethod = inputMethodConfig[assessment.template.inputMethod || 'CANDIDATE']
  const TypeIcon = type.icon
  const InputMethodIcon = inputMethod.icon

  const hasEmailTemplate = assessment.template.emailSubject && assessment.template.emailBody
  const hasPassingScore = assessment.template.passingScore !== null
  const candidateSubmissionTypes = (assessment.template.candidateSubmissionTypes as SubmissionType[]) || ['FILE', 'TEXT', 'URL']

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground'
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const handleSaveResult = () => {
    const data: Record<string, unknown> = {
      id,
      status: 'COMPLETED' as const,
    }

    if (submissionText) data.notes = submissionText
    if (notes) data.notes = notes
    if (score) data.overallScore = parseInt(score)
    if (recommendation) data.recommendation = recommendation

    recordResult.mutate(data as any)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/recruiting/assessments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{assessment.candidate?.name || 'Unknown'}</h1>
              <p className="text-sm text-muted-foreground">
                {assessment.candidate?.job?.title || 'No position'}
              </p>
            </div>
          </div>
        </div>
        <Badge className={cn('font-normal', status.color)}>
          {status.label}
        </Badge>
      </div>

      {/* Assessment Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TypeIcon className="h-5 w-5" />
                {assessment.template.name}
              </CardTitle>
              <CardDescription>{assessment.template.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('font-normal', type.color)}>
                {type.label}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <InputMethodIcon className="h-3 w-3" />
                {inputMethod.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Invite Sent</div>
                  <div className="font-medium">
                    {assessment.inviteSentAt
                      ? format(new Date(assessment.inviteSentAt), "MMM d, yyyy 'at' h:mm a")
                      : 'Not sent yet'}
                  </div>
                </div>
              </div>
              {assessment.startedAt && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Started</div>
                    <div className="font-medium">
                      {format(new Date(assessment.startedAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </div>
              )}
              {assessment.completedAt && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <div className="text-sm text-green-700 dark:text-green-300">Completed</div>
                    <div className="font-medium text-green-800 dark:text-green-200">
                      {format(new Date(assessment.completedAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </div>
              )}
              {assessment.expiresAt && !assessment.completedAt && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <div className="text-sm text-amber-700 dark:text-amber-300">Expires</div>
                    <div className="font-medium text-amber-800 dark:text-amber-200">
                      {format(new Date(assessment.expiresAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section - varies by input method */}
      {assessment.template.inputMethod === 'ADMIN' && assessment.status !== 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Assessment Result</CardTitle>
            <CardDescription>
              Record the assessment results for this candidate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Submission Type Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SubmissionType)}>
              <TabsList className="grid w-full grid-cols-3">
                {candidateSubmissionTypes.includes('TEXT') && (
                  <TabsTrigger value="TEXT" className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                )}
                {candidateSubmissionTypes.includes('FILE') && (
                  <TabsTrigger value="FILE" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    File
                  </TabsTrigger>
                )}
                {candidateSubmissionTypes.includes('URL') && (
                  <TabsTrigger value="URL" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    URL
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="TEXT" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="submissionText">Response Text</Label>
                  <Textarea
                    id="submissionText"
                    placeholder="Enter the candidate's response or your assessment notes..."
                    rows={6}
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="FILE" className="mt-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop a file here, or click to browse
                  </p>
                  <Input type="file" className="max-w-xs mx-auto" />
                </div>
              </TabsContent>

              <TabsContent value="URL" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="submissionUrl">URL Link</Label>
                  <Input
                    id="submissionUrl"
                    placeholder="https://..."
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to the candidate's work (e.g., GitHub repo, portfolio, etc.)
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Scoring (only if passingScore is configured) */}
            {hasPassingScore && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="score">Score (0-100)</Label>
                    <Input
                      id="score"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Enter score"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Passing score: {assessment.template.passingScore}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Recommendation</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={recommendation === 'HIRE' ? 'default' : 'outline'}
                        className={cn('flex-1', recommendation === 'HIRE' && 'bg-green-600 hover:bg-green-700')}
                        onClick={() => setRecommendation('HIRE')}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Hire
                      </Button>
                      <Button
                        type="button"
                        variant={recommendation === 'HOLD' ? 'default' : 'outline'}
                        className={cn('flex-1', recommendation === 'HOLD' && 'bg-amber-600 hover:bg-amber-700')}
                        onClick={() => setRecommendation('HOLD')}
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Hold
                      </Button>
                      <Button
                        type="button"
                        variant={recommendation === 'NO_HIRE' ? 'default' : 'outline'}
                        className={cn('flex-1', recommendation === 'NO_HIRE' && 'bg-red-600 hover:bg-red-700')}
                        onClick={() => setRecommendation('NO_HIRE')}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        No Hire
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional observations or comments..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveResult} disabled={recordResult.isPending}>
                {recordResult.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Result
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidate Input Method - Show submission status */}
      {assessment.template.inputMethod === 'CANDIDATE' && (
        <Card>
          <CardHeader>
            <CardTitle>Candidate Submission</CardTitle>
            <CardDescription>
              {assessment.status === 'COMPLETED'
                ? 'The candidate has submitted their assessment'
                : 'Waiting for the candidate to submit their assessment'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessment.status === 'COMPLETED' ? (
              <div className="space-y-4">
                {assessment.submissionText && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Text Response</Label>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="whitespace-pre-wrap">{assessment.submissionText}</p>
                    </div>
                  </div>
                )}
                {assessment.submissionUrl && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">URL Link</Label>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <a
                        href={assessment.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        {assessment.submissionUrl}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
                {assessment.submissionFiles && Array.isArray(assessment.submissionFiles) && assessment.submissionFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Files</Label>
                    <div className="space-y-2">
                      {(assessment.submissionFiles as Array<{ name: string; url: string }>).map((file, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-primary hover:underline"
                          >
                            {file.name}
                          </a>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scoring section for admin to grade */}
                {hasPassingScore && !assessment.overallScore && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Grade Submission</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="score">Score (0-100)</Label>
                        <Input
                          id="score"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Enter score"
                          value={score}
                          onChange={(e) => setScore(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Recommendation</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={recommendation === 'HIRE' ? 'default' : 'outline'}
                            className={cn(recommendation === 'HIRE' && 'bg-green-600')}
                            onClick={() => setRecommendation('HIRE')}
                          >
                            Hire
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={recommendation === 'HOLD' ? 'default' : 'outline'}
                            className={cn(recommendation === 'HOLD' && 'bg-amber-600')}
                            onClick={() => setRecommendation('HOLD')}
                          >
                            Hold
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={recommendation === 'NO_HIRE' ? 'default' : 'outline'}
                            className={cn(recommendation === 'NO_HIRE' && 'bg-red-600')}
                            onClick={() => setRecommendation('NO_HIRE')}
                          >
                            No Hire
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleSaveResult} disabled={recordResult.isPending}>
                        {recordResult.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Grade
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  The candidate has not submitted their assessment yet.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You can resend the invite or copy the assessment link below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Webhook Input Method - Show external platform info */}
      {assessment.template.inputMethod === 'WEBHOOK' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              External Platform Results
            </CardTitle>
            <CardDescription>
              Results are received automatically from the external platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessment.status === 'COMPLETED' && assessment.resultData ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(assessment.resultData, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Waiting for results from external platform
                </p>
                {assessment.template.externalPlatform && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Platform: <strong>{assessment.template.externalPlatform}</strong>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Score Display (if completed and has score) */}
      {assessment.status === 'COMPLETED' && assessment.overallScore !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-muted/50 rounded-lg text-center">
                <div className="text-sm text-muted-foreground mb-2">Score</div>
                <div className={cn('text-4xl font-bold', getScoreColor(assessment.overallScore))}>
                  {assessment.overallScore}%
                </div>
                {hasPassingScore && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Passing: {assessment.template.passingScore}%
                  </div>
                )}
              </div>
              <div className="p-6 bg-muted/50 rounded-lg text-center">
                <div className="text-sm text-muted-foreground mb-2">Recommendation</div>
                {assessment.recommendation ? (
                  <Badge
                    className={cn(
                      'text-lg px-4 py-2',
                      assessment.recommendation === 'HIRE' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                      assessment.recommendation === 'HOLD' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                      assessment.recommendation === 'NO_HIRE' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    )}
                  >
                    {assessment.recommendation === 'HIRE' && 'Hire'}
                    {assessment.recommendation === 'HOLD' && 'Hold'}
                    {assessment.recommendation === 'NO_HIRE' && 'No Hire'}
                  </Badge>
                ) : (
                  <span className="text-2xl text-muted-foreground">-</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/recruiting/candidates/${assessment.candidateId}`}>
                <User className="h-4 w-4 mr-2" />
                View Candidate Profile
              </Link>
            </Button>

            {assessment.template.externalUrl && (
              <Button variant="outline" asChild>
                <a href={assessment.template.externalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open External Platform
                </a>
              </Button>
            )}

            {assessment.status !== 'COMPLETED' && (
              <>
                {hasEmailTemplate ? (
                  <Button
                    variant="outline"
                    onClick={() => sendInvite.mutate({ id })}
                    disabled={sendInvite.isPending}
                  >
                    {sendInvite.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Resend Invite
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => copyLink.mutate({ id })}
                    disabled={copyLink.isPending}
                  >
                    {copyLink.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy Assessment Link
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
