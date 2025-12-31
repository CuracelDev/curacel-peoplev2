'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  Menu,
  Square,
  CheckCircle2,
  Minus,
  Share2,
  ArrowUpRight,
  Plus,
  FileText,
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

// System template IDs that are seeded by default
const SYSTEM_TEMPLATE_IDS = [
  'full-time-template',
  'part-time-template',
  'contractor-template',
  'intern-template',
  'confirmation-template',
  'termination-template',
  'nda-template',
]

// Map template IDs to their display info
const TEMPLATE_DISPLAY_INFO: Record<string, { icon: typeof BookOpen; iconColor: string; href: string }> = {
  'full-time-template': { icon: BookOpen, iconColor: 'text-blue-500', href: '/settings/contract-templates/full-time' },
  'part-time-template': { icon: Menu, iconColor: 'text-amber-600', href: '/settings/contract-templates/contractor' },
  'contractor-template': { icon: Menu, iconColor: 'text-amber-600', href: '/settings/contract-templates/contractor' },
  'intern-template': { icon: Square, iconColor: 'text-purple-500', href: '/settings/contract-templates/internship' },
  'confirmation-template': { icon: CheckCircle2, iconColor: 'text-green-500', href: '/settings/contract-templates/confirmation' },
  'termination-template': { icon: Minus, iconColor: 'text-red-500', href: '/settings/contract-templates/termination' },
  'nda-template': { icon: Share2, iconColor: 'text-green-600', href: '/settings/contract-templates/nda' },
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  CONTRACTOR: 'Contractor',
  INTERN: 'Intern',
}

export default function ContractTemplatesPage() {
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [newTemplateEmploymentType, setNewTemplateEmploymentType] = useState<string>('')

  const { data: templates, isLoading, refetch } = trpc.offerTemplate.list.useQuery({
    includeInactive: false,
  })

  const createTemplate = trpc.offerTemplate.create.useMutation({
    onSuccess: (template) => {
      setIsCreateDialogOpen(false)
      setNewTemplateName('')
      setNewTemplateDescription('')
      setNewTemplateEmploymentType('')
      refetch()
      // Navigate to the new template's edit page
      router.push(`/settings/contract-templates/custom/${template.id}`)
    },
  })

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) return

    createTemplate.mutate({
      name: newTemplateName,
      description: newTemplateDescription,
      bodyHtml: '<p>Enter your contract template content here...</p>',
      bodyMarkdown: 'Enter your contract template content here...',
      employmentType: newTemplateEmploymentType && newTemplateEmploymentType !== 'none'
        ? newTemplateEmploymentType as 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN'
        : undefined,
    })
  }

  // Separate system templates from custom templates
  const systemTemplates = templates?.filter(t => SYSTEM_TEMPLATE_IDS.includes(t.id)) || []
  const customTemplates = templates?.filter(t => !SYSTEM_TEMPLATE_IDS.includes(t.id)) || []

  const getTemplateIcon = (template: { id: string }) => {
    const info = TEMPLATE_DISPLAY_INFO[template.id]
    return info?.icon || FileText
  }

  const getTemplateIconColor = (template: { id: string }) => {
    const info = TEMPLATE_DISPLAY_INFO[template.id]
    return info?.iconColor || 'text-muted-foreground'
  }

  const getTemplateHref = (template: { id: string }) => {
    const info = TEMPLATE_DISPLAY_INFO[template.id]
    return info?.href || `/settings/contract-templates/custom/${template.id}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SettingsPageHeader title="Explore contract template library" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Explore contract template library"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a new contract template for your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Consultant Agreement"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Describe when this template should be used..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type (Optional)</Label>
                  <Select value={newTemplateEmploymentType} onValueChange={setNewTemplateEmploymentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (General)</SelectItem>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={!newTemplateName.trim() || createTemplate.isPending}
                >
                  {createTemplate.isPending ? 'Creating...' : 'Create Template'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((template) => {
              const Icon = getTemplateIcon(template)
              const iconColor = getTemplateIconColor(template)
              const href = getTemplateHref(template)

              return (
                <Link key={template.id} href={href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer relative">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`${iconColor} p-2 rounded-lg bg-muted/50`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {template.description || 'No description provided'}
                      </CardDescription>
                      {template.employmentType && (
                        <Badge variant="secondary" className="mt-2">
                          {EMPLOYMENT_TYPE_LABELS[template.employmentType] || template.employmentType}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <>
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Custom Templates</h2>
            <p className="text-sm text-muted-foreground mb-4">Templates created by your organization</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {customTemplates.map((template) => (
              <Link key={template.id} href={`/settings/contract-templates/custom/${template.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer relative">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-blue-500 p-2 rounded-lg bg-muted/50">
                        <FileText className="h-6 w-6" />
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {template.description || 'No description provided'}
                    </CardDescription>
                    {template.employmentType && (
                      <Badge variant="secondary" className="mt-2">
                        {EMPLOYMENT_TYPE_LABELS[template.employmentType] || template.employmentType}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {(!templates || templates.length === 0) && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">Get started by creating your first contract template.</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Template
          </Button>
        </div>
      )}
    </div>
  )
}
