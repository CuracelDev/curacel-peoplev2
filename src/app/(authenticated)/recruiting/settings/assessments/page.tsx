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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
          <p className="text-sm text-gray-500">
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
                            <p className="text-xs text-gray-500">
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
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : !templates?.length ? (
                  <div className="text-center py-8 text-gray-500">
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
                                <div className="text-sm text-gray-500 truncate max-w-xs">
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
                            <Badge className={template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
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
    </div>
  )
}
