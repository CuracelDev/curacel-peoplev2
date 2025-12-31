'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Code,
  Sparkles,
  Brain,
  Briefcase,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Link as LinkIcon,
  Mail,
  Webhook,
  Clock,
  Target,
  Wand2,
  Settings2,
  Copy,
  Check,
  GripVertical,
  ChevronDown,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AssessmentType = 'CODING_TEST' | 'KANDI_IO' | 'PERSONALITY_MBTI' | 'PERSONALITY_BIG5' | 'WORK_TRIAL' | 'CUSTOM'

const typeConfig: Record<AssessmentType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  CODING_TEST: { label: 'Coding Tests', icon: Code },
  KANDI_IO: { label: 'Kandi.io', icon: Sparkles },
  PERSONALITY_MBTI: { label: 'Personality (MBTI)', icon: Brain },
  PERSONALITY_BIG5: { label: 'Personality (Big 5)', icon: Brain },
  WORK_TRIAL: { label: 'Work Trial', icon: Briefcase },
  CUSTOM: { label: 'Custom', icon: Briefcase },
}

export default function AssessmentSettingsPage() {
  const [activeTab, setActiveTab] = useState<AssessmentType>('CODING_TEST')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [selectedTemplateForAI, setSelectedTemplateForAI] = useState<string | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  // AI Generation settings
  const [aiSettings, setAISettings] = useState({
    type: 'technical' as 'technical' | 'behavioral' | 'cognitive' | 'role_specific',
    count: 10,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
  })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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

  // Fetch templates
  const { data: templates, isLoading, refetch } = trpc.assessment.listTemplates.useQuery({
    type: activeTab,
  })

  // Fetch teams for dropdown
  const { data: teams } = trpc.team.listForSelect.useQuery()

  // Mutations
  const createTemplate = trpc.assessment.createTemplate.useMutation({
    onSuccess: () => {
      setIsCreateDialogOpen(false)
      resetForm()
      refetch()
    },
  })

  const updateTemplate = trpc.assessment.updateTemplate.useMutation({
    onSuccess: () => {
      setEditingTemplate(null)
      resetForm()
      refetch()
    },
  })

  const deleteTemplate = trpc.assessment.deleteTemplate.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const generateQuestions = trpc.assessment.generateQuestions.useMutation({
    onSuccess: (data) => {
      setGeneratedQuestions(data.questions || [])
      toast.success(`Generated ${data.questions?.length || 0} questions`)
    },
    onError: (error) => {
      toast.error('Failed to generate questions: ' + error.message)
    },
  })

  const saveQuestions = trpc.assessment.saveGeneratedQuestions.useMutation({
    onSuccess: () => {
      setShowAIDialog(false)
      setGeneratedQuestions([])
      setSelectedTemplateForAI(null)
      refetch()
      toast.success('Questions saved to template')
    },
    onError: (error) => {
      toast.error('Failed to save questions: ' + error.message)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
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
  }

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      type: activeTab,
      externalUrl: formData.externalUrl || undefined,
      externalPlatform: formData.externalPlatform || undefined,
      durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
      passingScore: formData.passingScore ? parseInt(formData.passingScore) : undefined,
      instructions: formData.instructions || undefined,
      emailSubject: formData.emailSubject || undefined,
      emailBody: formData.emailBody || undefined,
      webhookUrl: formData.webhookUrl || undefined,
      teamId: formData.teamId || undefined,
    }

    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate, ...data })
    } else {
      createTemplate.mutate(data)
    }
  }

  const startEdit = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description || '',
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
    setEditingTemplate(template.id)
    setIsCreateDialogOpen(true)
  }

  const handleGenerateQuestions = () => {
    if (!selectedTemplateForAI) return
    generateQuestions.mutate({
      templateId: selectedTemplateForAI,
      type: aiSettings.type,
      count: aiSettings.count,
      difficulty: aiSettings.difficulty,
    })
  }

  const handleSaveQuestions = () => {
    if (!selectedTemplateForAI || generatedQuestions.length === 0) return
    saveQuestions.mutate({
      templateId: selectedTemplateForAI,
      questions: generatedQuestions,
    })
  }

  const openAIDialog = (templateId: string) => {
    setSelectedTemplateForAI(templateId)
    setGeneratedQuestions([])
    setShowAIDialog(true)
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhooks/assessments/webhook`
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    toast.success('Webhook URL copied to clipboard')
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  const tabs: { key: AssessmentType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'CODING_TEST', label: 'Coding Tests', icon: Code },
    { key: 'KANDI_IO', label: 'Kandi.io', icon: Sparkles },
    { key: 'PERSONALITY_MBTI', label: 'MBTI', icon: Brain },
    { key: 'PERSONALITY_BIG5', label: 'Big 5', icon: Brain },
    { key: 'WORK_TRIAL', label: 'Work Trial', icon: Briefcase },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assessment Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure assessment templates for different evaluation types
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssessmentType)}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const Icon = typeConfig[tab.key].icon
                      return <Icon className="h-5 w-5" />
                    })()}
                    {typeConfig[tab.key].label} Templates
                  </CardTitle>
                  <CardDescription>
                    Manage {tab.label.toLowerCase()} assessment templates
                  </CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen && activeTab === tab.key} onOpenChange={(open) => {
                  setIsCreateDialogOpen(open)
                  if (!open) {
                    setEditingTemplate(null)
                    resetForm()
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? 'Edit' : 'Create'} {typeConfig[tab.key].label} Template
                      </DialogTitle>
                      <DialogDescription>
                        Configure the assessment template settings
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {/* Basic Info */}
                      <div className="grid gap-2">
                        <Label htmlFor="name">Template Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Backend Coding Challenge"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Brief description of this assessment"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      {/* Team Assignment */}
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

                      {/* External URL */}
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
                      </div>

                      {/* Duration & Passing Score */}
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

                      {/* Instructions */}
                      <div className="grid gap-2">
                        <Label htmlFor="instructions">Instructions</Label>
                        <Textarea
                          id="instructions"
                          placeholder="Instructions for candidates..."
                          rows={3}
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                        />
                      </div>

                      {/* Email Template */}
                      <div className="border-t pt-4 mt-2">
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <Mail className="h-4 w-4" />
                          Email Template
                        </h4>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="emailSubject">Subject</Label>
                            <Input
                              id="emailSubject"
                              placeholder="You're invited to complete an assessment"
                              value={formData.emailSubject}
                              onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="emailBody">Body</Label>
                            <Textarea
                              id="emailBody"
                              placeholder="Email body template..."
                              rows={4}
                              value={formData.emailBody}
                              onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Webhook (for Coding Tests) */}
                      {tab.key === 'CODING_TEST' && (
                        <div className="border-t pt-4 mt-2">
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Webhook className="h-4 w-4" />
                            Webhook Configuration
                          </h4>
                          <div className="grid gap-2">
                            <Label htmlFor="webhookUrl">Webhook URL (for receiving results)</Label>
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
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setIsCreateDialogOpen(false)
                        setEditingTemplate(null)
                        resetForm()
                      }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!formData.name || createTemplate.isPending || updateTemplate.isPending}
                      >
                        {(createTemplate.isPending || updateTemplate.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {editingTemplate ? 'Update' : 'Create'} Template
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !templates?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No templates configured yet</p>
                    <p className="text-sm">Create your first template to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Passing Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              {template.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {template.teamId ? 'Team Specific' : 'Global'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {template.durationMinutes ? `${template.durationMinutes} min` : '-'}
                          </TableCell>
                          <TableCell>
                            {template.passingScore ? `${template.passingScore}%` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={template.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground/80'}>
                              {template.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(template)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAIDialog(template.id)}>
                                  <Wand2 className="h-4 w-4 mr-2" />
                                  Generate Questions with AI
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteTemplate.mutate({ id: template.id })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* AI Question Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-500" />
              AI Question Generator
            </DialogTitle>
            <DialogDescription>
              Use AI to generate assessment questions based on your requirements
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={aiSettings.type}
                onValueChange={(v) => setAISettings({ ...aiSettings, type: v as typeof aiSettings.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="cognitive">Cognitive</SelectItem>
                  <SelectItem value="role_specific">Role Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Questions</Label>
              <Select
                value={aiSettings.count.toString()}
                onValueChange={(v) => setAISettings({ ...aiSettings, count: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                  <SelectItem value="15">15 questions</SelectItem>
                  <SelectItem value="20">20 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={aiSettings.difficulty}
                onValueChange={(v) => setAISettings({ ...aiSettings, difficulty: v as typeof aiSettings.difficulty })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerateQuestions}
            disabled={generateQuestions.isPending}
            className="w-full"
          >
            {generateQuestions.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Questions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Questions
              </>
            )}
          </Button>

          {generatedQuestions.length > 0 && (
            <ScrollArea className="flex-1 mt-4 border rounded-lg p-4">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Generated {generatedQuestions.length} questions
                </h4>
                {generatedQuestions.map((q, index) => (
                  <div key={q.id || index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="font-medium">Q{index + 1}.</span>
                      <Badge variant="outline" className="text-xs">
                        {q.type || 'text'}
                      </Badge>
                    </div>
                    <p className="text-sm">{q.text}</p>
                    {q.options && q.options.length > 0 && (
                      <div className="pl-4 space-y-1">
                        {q.options.map((opt: any, optIndex: number) => (
                          <p key={optIndex} className="text-sm text-muted-foreground">
                            {String.fromCharCode(65 + optIndex)}. {opt.text}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {q.difficulty && (
                        <Badge variant="secondary" className="text-xs">
                          {q.difficulty}
                        </Badge>
                      )}
                      {q.maxScore && (
                        <span>{q.maxScore} points</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAIDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestions}
              disabled={generatedQuestions.length === 0 || saveQuestions.isPending}
            >
              {saveQuestions.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Questions to Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook URL Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure webhooks to receive assessment results from external platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/assessments/webhook` : '/api/webhooks/assessments/webhook'}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                {copiedWebhook ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL to receive webhook events from external assessment platforms.
              Replace <code className="bg-muted px-1 rounded">webhook</code> with the platform name (e.g., <code className="bg-muted px-1 rounded">kandi</code>).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
