'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Code,
  Brain,
  Briefcase,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Webhook,
  Target,
  Wand2,
  Sparkles,
  Copy,
  Check,
  Search,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type AssessmentType = 'COMPETENCY_TEST' | 'CODING_TEST' | 'PERSONALITY_TEST' | 'WORK_TRIAL' | 'CUSTOM'

const typeConfig: Record<AssessmentType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  COMPETENCY_TEST: { label: 'Competency Test', icon: Target, color: 'bg-purple-100 text-purple-800' },
  CODING_TEST: { label: 'Coding Test', icon: Code, color: 'bg-blue-100 text-blue-800' },
  PERSONALITY_TEST: { label: 'Personality Test', icon: Brain, color: 'bg-pink-100 text-pink-800' },
  WORK_TRIAL: { label: 'Work Trial', icon: Briefcase, color: 'bg-green-100 text-green-800' },
  CUSTOM: { label: 'Custom', icon: FileText, color: 'bg-gray-100 text-gray-800' },
}

const assessmentTypes: { key: AssessmentType; label: string }[] = [
  { key: 'COMPETENCY_TEST', label: 'Competency Test' },
  { key: 'CODING_TEST', label: 'Coding Test' },
  { key: 'PERSONALITY_TEST', label: 'Personality Test' },
  { key: 'WORK_TRIAL', label: 'Work Trial' },
  { key: 'CUSTOM', label: 'Custom' },
]

export default function AssessmentSettingsPage() {
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [selectedTemplateForAI, setSelectedTemplateForAI] = useState<string | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // AI Generation settings
  const [aiSettings, setAISettings] = useState({
    type: 'technical' as 'technical' | 'behavioral' | 'cognitive' | 'role_specific',
    count: 10,
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
  })

  // Fetch ALL templates
  const { data: templates, isLoading, refetch } = trpc.assessment.listTemplates.useQuery({})

  // Filter templates locally
  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || template.type === typeFilter
    return matchesSearch && matchesType
  })

  // Mutations
  const deleteTemplate = trpc.assessment.deleteTemplate.useMutation({
    onSuccess: () => {
      refetch()
      toast.success('Assessment deleted')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete assessment')
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
      toast.success('Questions saved to assessment')
    },
    onError: (error) => {
      toast.error('Failed to save questions: ' + error.message)
    },
  })

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

  return (
    <div className="space-y-6">
      {/* Assessments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Assessments</CardTitle>
            <CardDescription>
              Configure assessments for candidate evaluations
            </CardDescription>
          </div>
          <Link href="/recruiting/settings/assessments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Assessment
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assessmentTypes.map((type) => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredTemplates?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No assessments found</p>
              <p className="text-sm">
                {searchQuery || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first assessment to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Passing Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => {
                  const config = typeConfig[template.type as AssessmentType] || typeConfig.CUSTOM
                  const TypeIcon = config.icon
                  return (
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
                        <Badge className={cn('flex items-center gap-1 w-fit', config.color)}>
                          <TypeIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
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
                            <DropdownMenuItem asChild>
                              <Link href={`/recruiting/settings/assessments/${template.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
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
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                  Save Questions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Webhook URL Card */}
      <Card>
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
