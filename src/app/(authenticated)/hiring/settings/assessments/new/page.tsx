'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Code,
  Brain,
  Briefcase,
  Loader2,
  Link as LinkIcon,
  Mail,
  Webhook,
  Clock,
  Target,
  FileText,
  Upload,
  Type,
  Link2,
  User,
  UserCog,
  Check,
  Copy,
  ExternalLink,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'

type AssessmentType = 'COMPETENCY_TEST' | 'CODING_TEST' | 'PERSONALITY_TEST' | 'WORK_TRIAL' | 'CUSTOM'
type InputMethod = 'CANDIDATE' | 'ADMIN' | 'WEBHOOK'
type SubmissionType = 'FILE' | 'TEXT' | 'URL'

const inputMethodConfig: Record<InputMethod, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  CANDIDATE: { label: 'From Candidate', icon: User, description: 'Candidate submits their work directly' },
  ADMIN: { label: 'From Admin', icon: UserCog, description: 'Admin manually enters the result' },
  WEBHOOK: { label: 'Via Webhook/API', icon: Webhook, description: 'External platform sends results automatically' },
}

const submissionTypeConfig: Record<SubmissionType, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  FILE: { label: 'File Upload', icon: Upload, description: 'PDF, image, or document' },
  TEXT: { label: 'Text Response', icon: Type, description: 'Written answer or essay' },
  URL: { label: 'URL Link', icon: Link2, description: 'Link to their work' },
}

const typeConfig: Record<AssessmentType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  COMPETENCY_TEST: { label: 'Competency Test', icon: Target, color: 'bg-purple-100 text-purple-800', description: 'Skills and competency-based assessments' },
  CODING_TEST: { label: 'Coding Test', icon: Code, color: 'bg-blue-100 text-blue-800', description: 'Technical coding challenges and assessments' },
  PERSONALITY_TEST: { label: 'Personality Test', icon: Brain, color: 'bg-pink-100 text-pink-800', description: 'Personality and behavioral assessments' },
  WORK_TRIAL: { label: 'Work Trial', icon: Briefcase, color: 'bg-green-100 text-green-800', description: 'Paid or unpaid work trial period' },
  CUSTOM: { label: 'Custom', icon: FileText, color: 'bg-gray-100 text-gray-800', description: 'Custom assessment or evaluation' },
}

export default function NewAssessmentPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'COMPETENCY_TEST' as AssessmentType,
    inputMethod: 'CANDIDATE' as InputMethod,
    candidateSubmissionTypes: ['FILE'] as SubmissionType[],
    externalUrl: '',
    externalPlatform: '',
    durationMinutes: '',
    passingScore: '',
    instructions: '',
    emailSubject: '',
    emailBody: '',
    webhookUrl: '',
    teamId: '',
  })

  const toggleSubmissionType = (type: SubmissionType) => {
    const current = formData.candidateSubmissionTypes
    if (current.includes(type)) {
      if (current.length > 1) {
        setFormData({ ...formData, candidateSubmissionTypes: current.filter(t => t !== type) })
      }
    } else {
      setFormData({ ...formData, candidateSubmissionTypes: [...current, type] })
    }
  }

  // Fetch teams for dropdown
  const { data: teams } = trpc.team.listForSelect.useQuery()

  const createTemplate = trpc.assessment.createTemplate.useMutation({
    onSuccess: () => {
      toast.success('Assessment created')
      router.push('/hiring/settings/assessments')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create assessment')
    },
  })

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!formData.name || formData.name.length < 2) {
      toast.error('Please enter an assessment name (at least 2 characters)')
      return
    }

    createTemplate.mutate({
      name: formData.name,
      description: formData.description || undefined,
      type: formData.type,
      inputMethod: formData.inputMethod,
      candidateSubmissionTypes: formData.inputMethod === 'CANDIDATE' ? formData.candidateSubmissionTypes : undefined,
      externalUrl: formData.externalUrl || undefined,
      externalPlatform: formData.externalPlatform || undefined,
      durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
      passingScore: formData.passingScore ? parseInt(formData.passingScore) : undefined,
      instructions: formData.instructions || undefined,
      emailSubject: formData.emailSubject || undefined,
      emailBody: formData.emailBody || undefined,
      webhookUrl: formData.webhookUrl || undefined,
      teamId: formData.teamId || undefined,
    })
  }

  const selectedTypeConfig = typeConfig[formData.type]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hiring/settings/assessments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create Assessment</h1>
          <p className="text-sm text-muted-foreground">
            Configure a new assessment for candidate evaluations
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assessment Type */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Type</CardTitle>
            <CardDescription>Select the type of assessment you want to create</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(typeConfig).map(([key, config]) => {
                const Icon = config.icon
                const isSelected = formData.type === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: key as AssessmentType })}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-foreground dark:border-indigo-400 dark:bg-indigo-500/20'
                        : 'border-border hover:border-indigo-300 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center mx-auto mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">{config.label}</p>
                  </button>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {selectedTypeConfig.description}
            </p>
          </CardContent>
        </Card>

        {/* Result Input Method */}
        <Card>
          <CardHeader>
            <CardTitle>Result Input Method</CardTitle>
            <CardDescription>How will the assessment results be submitted?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(inputMethodConfig).map(([key, config]) => {
                const Icon = config.icon
                const isSelected = formData.inputMethod === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, inputMethod: key as InputMethod })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-foreground dark:border-indigo-400 dark:bg-indigo-500/20'
                        : 'border-border hover:border-indigo-300 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'} flex items-center justify-center mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                  </button>
                )
              })}
            </div>

            {/* Candidate Submission Types - only show when CANDIDATE is selected */}
            {formData.inputMethod === 'CANDIDATE' && (
              <div className="pt-4 border-t">
                <Label className="mb-3 block">What can candidates submit?</Label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(submissionTypeConfig).map(([key, config]) => {
                    const Icon = config.icon
                    const isSelected = formData.candidateSubmissionTypes.includes(key as SubmissionType)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleSubmissionType(key as SubmissionType)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-foreground dark:border-indigo-400 dark:bg-indigo-500/20'
                            : 'border-border hover:border-indigo-300 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'} flex items-center justify-center flex-shrink-0`}>
                            {isSelected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Select all submission types you want to accept</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the assessment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Assessment Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Backend Coding Challenge"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this assessment"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team">Team Assignment</Label>
              <Select
                value={formData.teamId || 'global'}
                onValueChange={(v) => setFormData({ ...formData, teamId: v === 'global' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team (or leave global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Teams)</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Settings</CardTitle>
            <CardDescription>Configure duration, passing criteria, and instructions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="externalUrl" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Assessment URL
              </Label>
              <Input
                id="externalUrl"
                placeholder="https://..."
                value={formData.externalUrl}
                onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Link to external assessment platform (e.g., HackerRank, Codility)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (minutes)
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 60"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Leave empty if no time limit</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passingScore" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Passing Score (%)
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </Label>
                <Input
                  id="passingScore"
                  type="number"
                  placeholder="e.g., 70"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Leave empty if no pass/fail threshold</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instructions">Instructions for Candidates</Label>
              <Textarea
                id="instructions"
                placeholder="Instructions that will be shown to candidates..."
                rows={4}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Template
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </CardTitle>
            <CardDescription>
              Customize the invitation email sent to candidates. Leave empty if you prefer to contact candidates via call or other means.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="emailSubject">Subject Line</Label>
              <Input
                id="emailSubject"
                placeholder="You're invited to complete an assessment"
                value={formData.emailSubject}
                onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emailBody">Email Body</Label>
              <Textarea
                id="emailBody"
                placeholder="Email body template..."
                rows={6}
                value={formData.emailBody}
                onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{candidateName}}"}, {"{{assessmentName}}"}, {"{{assessmentLink}}"} as placeholders
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration (for Webhook/API input method) */}
        {formData.inputMethod === 'WEBHOOK' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure which external platform will provide assessment results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="externalPlatform">External Platform *</Label>
                  <Select
                    value={formData.externalPlatform || ''}
                    onValueChange={(v) => setFormData({ ...formData, externalPlatform: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kandi">Kandi.io</SelectItem>
                      <SelectItem value="webhook">Generic Webhook</SelectItem>
                      <SelectItem value="testgorilla">TestGorilla</SelectItem>
                      <SelectItem value="codility">Codility</SelectItem>
                      <SelectItem value="hackerrank">HackerRank</SelectItem>
                      <SelectItem value="custom">Custom Integration</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The platform that will send results via webhook
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalUrl">External Assessment URL</Label>
                  <Input
                    id="externalUrl"
                    placeholder="https://platform.com/assessment/..."
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL where candidates take this assessment (optional)
                  </p>
                </div>
              </div>

              {/* Webhook Endpoint - shows after platform is selected */}
              {formData.externalPlatform && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                  <Label className="text-sm font-medium">Your Webhook Endpoint</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/assessments/${formData.externalPlatform}` : `/api/webhooks/assessments/${formData.externalPlatform}`}
                      className="font-mono text-sm bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = `${window.location.origin}/api/webhooks/assessments/${formData.externalPlatform}`
                        navigator.clipboard.writeText(url)
                        toast.success('Webhook URL copied to clipboard')
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure this URL in your <strong>{formData.externalPlatform}</strong> platform settings to send results here
                  </p>
                </div>
              )}

              {/* How it works */}
              <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Info className="h-4 w-4 text-primary" />
                  How Webhook Integration Works
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>First, set up your platform credentials in <Link href="/settings" className="text-primary hover:underline inline-flex items-center gap-1">Settings &gt; Integrations <ExternalLink className="h-3 w-3" /></Link></li>
                  <li>Configure the webhook URL above in your external platform</li>
                  <li>When assigning this assessment to a candidate, the external ID will link results</li>
                  <li>Results are automatically received and matched to the candidate</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/hiring/settings/assessments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            disabled={!formData.name || formData.name.length < 2 || createTemplate.isPending}
            onClick={() => handleSubmit()}
          >
            {createTemplate.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Assessment
          </Button>
        </div>
      </form>
    </div>
  )
}
