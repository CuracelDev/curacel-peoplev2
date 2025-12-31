'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AssessmentType = 'COMPETENCY_TEST' | 'CODING_TEST' | 'PERSONALITY_TEST' | 'WORK_TRIAL' | 'CUSTOM'

const typeConfig: Record<AssessmentType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  COMPETENCY_TEST: { label: 'Competency Test', icon: Target, color: 'bg-purple-100 text-purple-800', description: 'Skills and competency-based assessments' },
  CODING_TEST: { label: 'Coding Test', icon: Code, color: 'bg-blue-100 text-blue-800', description: 'Technical coding challenges and assessments' },
  PERSONALITY_TEST: { label: 'Personality Test', icon: Brain, color: 'bg-pink-100 text-pink-800', description: 'Personality and behavioral assessments' },
  WORK_TRIAL: { label: 'Work Trial', icon: Briefcase, color: 'bg-green-100 text-green-800', description: 'Paid or unpaid work trial period' },
  CUSTOM: { label: 'Custom', icon: FileText, color: 'bg-gray-100 text-gray-800', description: 'Custom assessment or evaluation' },
}

export default function EditAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'COMPETENCY_TEST' as AssessmentType,
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

  // Fetch assessment template
  const { data: template, isLoading } = trpc.assessment.getTemplate.useQuery({ id })

  // Fetch teams for dropdown
  const { data: teams } = trpc.team.listForSelect.useQuery()

  // Populate form when template loads
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        type: template.type as AssessmentType,
        externalUrl: template.externalUrl || '',
        externalPlatform: template.externalPlatform || '',
        durationMinutes: template.durationMinutes?.toString() || '',
        passingScore: template.passingScore?.toString() || '',
        instructions: template.instructions || '',
        emailSubject: template.emailSubject || '',
        emailBody: template.emailBody || '',
        webhookUrl: template.webhookUrl || '',
        teamId: template.teamId || '',
      })
    }
  }, [template])

  const updateTemplate = trpc.assessment.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success('Assessment updated')
      router.push('/recruiting/settings/assessments')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update assessment')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateTemplate.mutate({
      id,
      name: formData.name,
      description: formData.description || undefined,
      type: formData.type,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Assessment not found</p>
        <Link href="/recruiting/settings/assessments">
          <Button variant="link">Back to Assessments</Button>
        </Link>
      </div>
    )
  }

  const selectedTypeConfig = typeConfig[formData.type]
  const TypeIcon = selectedTypeConfig.icon

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/recruiting/settings/assessments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Edit Assessment</h1>
          <p className="text-sm text-muted-foreground">
            Update the assessment configuration
          </p>
        </div>
        <Badge className={cn('flex items-center gap-1', selectedTypeConfig.color)}>
          <TypeIcon className="h-3 w-3" />
          {selectedTypeConfig.label}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update the assessment details</CardDescription>
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
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="60"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passingScore" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Passing Score (%)
                </Label>
                <Input
                  id="passingScore"
                  type="number"
                  placeholder="70"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: e.target.value })}
                />
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
            </CardTitle>
            <CardDescription>Customize the invitation email sent to candidates</CardDescription>
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

        {/* Webhook (for Coding Tests) */}
        {formData.type === 'CODING_TEST' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>Receive results from external assessment platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://your-app.com/api/webhooks/assessment"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Results from external assessment tools will be sent to this URL
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/recruiting/settings/assessments">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={!formData.name || updateTemplate.isPending}>
            {updateTemplate.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
