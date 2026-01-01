'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
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
  FileText,
  Plus,
  Pencil,
  Copy,
  Trash2,
  Mail,
  Loader2,
  Search,
  Wand2,
  Eye,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TEMPLATE_CATEGORIES = [
  { value: 'stage_notification', label: 'Stage Notifications' },
  { value: 'rejection', label: 'Rejection' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'offer', label: 'Offer' },
  { value: 'custom', label: 'Custom' },
]

const STAGES = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'HR_SCREEN', label: 'HR Screen' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'TEAM_CHAT', label: 'Team Chat' },
  { value: 'ADVISOR_CHAT', label: 'Advisor Chat' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'CEO_CHAT', label: 'CEO Chat' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'REJECTED', label: 'Rejected' },
]

const TEMPLATE_VARIABLES = [
  { var: '{{candidate.name}}', desc: 'Full name' },
  { var: '{{candidate.email}}', desc: 'Email address' },
  { var: '{{job.title}}', desc: 'Job title' },
  { var: '{{job.department}}', desc: 'Department' },
  { var: '{{recruiter.name}}', desc: 'Recruiter name' },
  { var: '{{links.calendar}}', desc: 'Scheduling link' },
  { var: '{{links.assessment}}', desc: 'Assessment link' },
  { var: '{{links.interestForm}}', desc: 'Interest form link' },
]

interface TemplateEditorProps {
  template?: {
    id: string
    name: string
    slug: string
    description: string | null
    category: string
    stage: string | null
    subject: string
    htmlBody: string
    textBody: string | null
    aiEnhancementEnabled: boolean
    aiEnhancementPrompt: string | null
    isActive: boolean
    isDefault: boolean
  } | null
  onClose: () => void
  onSave: () => void
}

function TemplateEditor({ template, onClose, onSave }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '')
  const [slug, setSlug] = useState(template?.slug || '')
  const [description, setDescription] = useState(template?.description || '')
  const [category, setCategory] = useState(template?.category || 'stage_notification')
  const [stage, setStage] = useState(template?.stage || '')
  const [subject, setSubject] = useState(template?.subject || '')
  const [htmlBody, setHtmlBody] = useState(template?.htmlBody || '')
  const [aiEnhancementEnabled, setAiEnhancementEnabled] = useState(template?.aiEnhancementEnabled || false)
  const [aiEnhancementPrompt, setAiEnhancementPrompt] = useState(template?.aiEnhancementPrompt || '')
  const [isActive, setIsActive] = useState(template?.isActive ?? true)
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false)

  const createTemplate = trpc.candidateEmail.createTemplate.useMutation({
    onSuccess: () => {
      onSave()
      onClose()
    },
  })

  const updateTemplate = trpc.candidateEmail.updateTemplate.useMutation({
    onSuccess: () => {
      onSave()
      onClose()
    },
  })

  const handleSave = () => {
    const data = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: description || undefined,
      category,
      stage: stage || undefined,
      subject,
      htmlBody,
      aiEnhancementEnabled,
      aiEnhancementPrompt: aiEnhancementPrompt || undefined,
      isActive,
      isDefault,
    }

    if (template) {
      updateTemplate.mutate({ id: template.id, ...data })
    } else {
      createTemplate.mutate(data)
    }
  }

  const insertVariable = (variable: string) => {
    setHtmlBody((prev) => prev + variable)
  }

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        <DialogDescription>
          {template ? 'Update the email template settings' : 'Create a new email template for candidate communications'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., HR Screen Invite"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of when this template is used"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stage (optional)</Label>
            <Select value={stage || '__none__'} onValueChange={(v) => setStage(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No specific stage</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Next Step - {{job.title}} at Curacel"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">Email Body</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Variables:</span>
              {TEMPLATE_VARIABLES.slice(0, 4).map((v) => (
                <button
                  key={v.var}
                  onClick={() => insertVariable(v.var)}
                  className="text-xs px-1.5 py-0.5 bg-muted rounded hover:bg-muted/80"
                >
                  {v.var.replace('{{', '').replace('}}', '')}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            id="body"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            placeholder="Write your email template here. Use {{variables}} for dynamic content."
            rows={12}
            className="font-mono text-sm"
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>AuntyPelz Enhancement</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Use AuntyPelz to personalize this template for each candidate
              </p>
            </div>
            <Switch
              checked={aiEnhancementEnabled}
              onCheckedChange={setAiEnhancementEnabled}
            />
          </div>

          {aiEnhancementEnabled && (
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">AuntyPelz Enhancement Prompt</Label>
              <Textarea
                id="ai-prompt"
                value={aiEnhancementPrompt}
                onChange={(e) => setAiEnhancementPrompt(e.target.value)}
                placeholder="Customize based on candidate's experience and the job requirements..."
                rows={2}
              />
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
            <Label htmlFor="active">Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} id="default" />
            <Label htmlFor="default">Default for this stage</Label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={!name || !subject || !htmlBody || createTemplate.isPending || updateTemplate.isPending}
        >
          {(createTemplate.isPending || updateTemplate.isPending) && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {template ? 'Update' : 'Create'} Template
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export default function EmailTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data: templates, isLoading, refetch } = trpc.candidateEmail.listTemplates.useQuery({})

  const deleteTemplate = trpc.candidateEmail.deleteTemplate.useMutation({
    onSuccess: () => refetch(),
  })

  const duplicateTemplate = trpc.candidateEmail.duplicateTemplate.useMutation({
    onSuccess: () => refetch(),
  })

  const filteredTemplates = templates?.filter((t) => {
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedTemplates = filteredTemplates?.reduce((acc, template) => {
    const category = template.category || 'custom'
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<string, typeof templates>)

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Email Templates"
        description="Manage email templates for candidate communications at different stages"
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory || '__all__'} onValueChange={(v) => setSelectedCategory(v === '__all__' ? null : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <TemplateEditor
            template={null}
            onClose={() => setIsCreateOpen(false)}
            onSave={() => refetch()}
          />
        </Dialog>
      </div>

      {/* Variable Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Template Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <Badge key={v.var} variant="outline" className="font-mono text-xs">
                {v.var}
                <span className="ml-1 text-muted-foreground font-normal">- {v.desc}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groupedTemplates && Object.keys(groupedTemplates).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h3 className="text-sm font-medium mb-3 capitalize">
                {TEMPLATE_CATEGORIES.find(c => c.value === category)?.label || category}
              </h3>
              <div className="grid gap-3">
                {categoryTemplates?.map((template) => (
                  <Card key={template.id} className={cn(!template.isActive && 'opacity-60')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{template.name}</span>
                            {template.isDefault && (
                              <Badge variant="default" className="text-[10px]">Default</Badge>
                            )}
                            {!template.isActive && (
                              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                            )}
                            {template.stage && (
                              <Badge variant="outline" className="text-[10px]">
                                {STAGES.find(s => s.value === template.stage)?.label || template.stage}
                              </Badge>
                            )}
                            {template.aiEnhancementEnabled && (
                              <Wand2 className="h-3.5 w-3.5 text-purple-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Subject: {template.subject}
                          </p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingTemplate(template)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => duplicateTemplate.mutate({ id: template.id })}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Delete this template?')) {
                                deleteTemplate.mutate({ id: template.id })
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium mb-1">No templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create email templates for your hiring workflow
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        {editingTemplate && (
          <TemplateEditor
            template={editingTemplate}
            onClose={() => setEditingTemplate(null)}
            onSave={() => refetch()}
          />
        )}
      </Dialog>
    </div>
  )
}
