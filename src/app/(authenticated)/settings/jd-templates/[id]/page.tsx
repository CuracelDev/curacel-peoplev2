'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Briefcase,
  Code,
  Palette,
  Users,
  TrendingUp,
  Megaphone,
  Settings,
  Loader2,
  Eye,
  EyeOff,
  GitBranch,
  Trash2,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock JD data
const mockJDs: Record<string, {
  id: string
  name: string
  department: string
  description: string
  flowType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  version: number
  parentId?: string
  requirements: string
  responsibilities: string
}> = {
  '1': {
    id: '1',
    name: 'Senior Backend Engineer',
    department: 'Engineering',
    description: 'Design, build, and maintain efficient, reusable, and reliable backend services.',
    flowType: 'ENGINEERING',
    isActive: true,
    createdAt: '2025-01-15',
    updatedAt: '2025-01-20',
    version: 3,
    requirements: '- 5+ years backend experience\n- Proficient in Node.js or Python\n- Experience with databases\n- Strong system design skills',
    responsibilities: '- Design and implement APIs\n- Optimize application performance\n- Collaborate with frontend team\n- Mentor junior engineers',
  },
  '1-v2': {
    id: '1-v2',
    name: 'Senior Backend Engineer',
    department: 'Engineering',
    description: 'Design and maintain backend services with focus on scalability.',
    flowType: 'ENGINEERING',
    isActive: false,
    createdAt: '2025-01-10',
    updatedAt: '2025-01-10',
    version: 2,
    parentId: '1',
    requirements: '- 4+ years backend experience\n- Proficient in Node.js',
    responsibilities: '- Design APIs\n- Optimize performance',
  },
  '2': {
    id: '2',
    name: 'Product Designer',
    department: 'Design',
    description: 'Create user-centered designs by understanding business requirements and user feedback.',
    flowType: 'STANDARD',
    isActive: true,
    createdAt: '2025-01-10',
    updatedAt: '2025-01-10',
    version: 1,
    requirements: '- 3+ years product design experience\n- Figma proficiency\n- Strong portfolio',
    responsibilities: '- Design user interfaces\n- Conduct user research\n- Create prototypes',
  },
}

const DEPARTMENTS = [
  { value: 'Engineering', icon: Code, color: 'text-blue-500 bg-blue-50' },
  { value: 'Design', icon: Palette, color: 'text-purple-500 bg-purple-50' },
  { value: 'Marketing', icon: Megaphone, color: 'text-pink-500 bg-pink-50' },
  { value: 'Sales', icon: TrendingUp, color: 'text-green-500 bg-green-50' },
  { value: 'Operations', icon: Settings, color: 'text-amber-500 bg-amber-50' },
  { value: 'People', icon: Users, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'Finance', icon: Briefcase, color: 'text-emerald-500 bg-emerald-50' },
]

const FLOW_TYPES = [
  { value: 'STANDARD', label: 'Standard', description: 'Interest → HR Screen → Panel → Trial → Offer' },
  { value: 'ENGINEERING', label: 'Engineering', description: 'Interest → HR Screen → Technical → Panel → Trial' },
  { value: 'SALES', label: 'Sales', description: 'Interest → HR Screen → Panel → Trial with POC → Offer' },
  { value: 'EXECUTIVE', label: 'Executive', description: 'Interest → HR Screen → Multiple Panels → Case Study → CEO' },
]

function getDepartmentInfo(department: string) {
  return DEPARTMENTS.find(d => d.value === department) || { icon: Briefcase, color: 'text-muted-foreground bg-muted/50' }
}

export default function EditJDPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isArchived, setIsArchived] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    flowType: '',
    requirements: '',
    responsibilities: '',
    isActive: true,
    version: 1,
    createdAt: '',
    updatedAt: '',
  })

  // Load JD data
  useEffect(() => {
    const loadJD = async () => {
      setIsLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      const jd = mockJDs[id]
      if (jd) {
        setFormData({
          name: jd.name,
          department: jd.department,
          description: jd.description,
          flowType: jd.flowType,
          requirements: jd.requirements,
          responsibilities: jd.responsibilities,
          isActive: jd.isActive,
          version: jd.version,
          createdAt: jd.createdAt,
          updatedAt: jd.updatedAt,
        })
        setIsArchived(!!jd.parentId)
      }
      setIsLoading(false)
    }

    loadJD()
  }, [id])

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.department) return

    setIsSaving(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSaving(false)
    router.push('/settings/jd-templates')
  }

  const handleDelete = async () => {
    setDeleteDialogOpen(false)
    // Simulate delete
    await new Promise(resolve => setTimeout(resolve, 500))
    router.push('/settings/jd-templates')
  }

  const deptInfo = getDepartmentInfo(formData.department)
  const DeptIcon = deptInfo.icon

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings/jd-templates">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", deptInfo.color)}>
              <DeptIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{formData.name}</h1>
                <Badge variant="outline" className="gap-1">
                  <GitBranch className="h-3 w-3" />
                  v{formData.version}
                </Badge>
                {isArchived && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <History className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Last updated {formData.updatedAt}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isArchived && (
            <Button variant="outline" asChild>
              <Link href={`/settings/jd-templates/new?from=${id}`}>
                <GitBranch className="h-4 w-4 mr-2" />
                New Version
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Archived notice */}
      {isArchived && (
        <div className="flex items-center gap-2 p-3 bg-muted text-foreground rounded-lg">
          <History className="h-5 w-5" />
          <span className="text-sm">
            This is an archived version. You can view the details but cannot edit.
            <Link href={`/settings/jd-templates/new?from=${id}`} className="ml-1 text-primary underline">
              Create a new version from this
            </Link>
          </span>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>JD Details</CardTitle>
          <CardDescription>
            {isArchived
              ? 'Viewing archived version details'
              : 'Edit the job description details'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Job Title *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Senior Backend Engineer"
                disabled={isArchived}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                disabled={isArchived}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="flowType">Hiring Flow</Label>
              <Select
                value={formData.flowType}
                onValueChange={(value) => setFormData({ ...formData, flowType: value })}
                disabled={isArchived}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hiring flow type" />
                </SelectTrigger>
                <SelectContent>
                  {FLOW_TYPES.map((flow) => (
                    <SelectItem key={flow.value} value={flow.value}>
                      <div>
                        <div className="font-medium">{flow.label}</div>
                        <div className="text-xs text-muted-foreground">{flow.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {isArchived ? (
                <div className="flex items-center rounded-md border border-input px-3 py-2 h-10 bg-muted/50">
                  <span className="text-sm text-muted-foreground">Archived</span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-input px-3 py-2 h-10">
                  <span className="text-sm">
                    {formData.isActive ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <Eye className="h-4 w-4" />
                        Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-amber-600">
                        <EyeOff className="h-4 w-4" />
                        Draft
                      </span>
                    )}
                  </span>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Summary</Label>
            <RichTextEditor
              content={formData.description}
              onChange={(content) => setFormData({ ...formData, description: content })}
              placeholder="Brief overview of the role and its impact..."
              disabled={isArchived}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsibilities">Key Responsibilities</Label>
            <RichTextEditor
              content={formData.responsibilities}
              onChange={(content) => setFormData({ ...formData, responsibilities: content })}
              placeholder="List the main responsibilities..."
              disabled={isArchived}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <RichTextEditor
              content={formData.requirements}
              onChange={(content) => setFormData({ ...formData, requirements: content })}
              placeholder="List required qualifications and skills..."
              disabled={isArchived}
            />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
            <span>Created: {formData.createdAt}</span>
            <span>Updated: {formData.updatedAt}</span>
            <span>Version: {formData.version}</span>
          </div>

          {/* Actions */}
          {!isArchived && (
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/settings/jd-templates">Cancel</Link>
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.department || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Description</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{formData.name}&quot;?
              {formData.version > 1 && (
                <span className="block mt-2 text-amber-600">
                  This will also delete all {formData.version - 1} older version(s).
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
