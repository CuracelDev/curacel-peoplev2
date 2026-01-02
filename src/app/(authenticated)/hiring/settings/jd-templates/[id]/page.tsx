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
import { trpc } from '@/lib/trpc-client'

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
  { value: 'Sales', icon: TrendingUp, color: 'text-success bg-success/10' },
  { value: 'Operations', icon: Settings, color: 'text-amber-500 bg-amber-50' },
  { value: 'People', icon: Users, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'Finance', icon: Briefcase, color: 'text-emerald-500 bg-emerald-50' },
]

function getDepartmentInfo(department: string) {
  return DEPARTMENTS.find(d => d.value === department) || { icon: Briefcase, color: 'text-muted-foreground bg-muted/50' }
}

export default function EditJDPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Fetch teams from database
  const { data: teams, isLoading: teamsLoading } = trpc.team.listForSelect.useQuery()

  // Fetch JD data
  const { data: jdData, isLoading: jdLoading } = trpc.jobDescription.get.useQuery(
    { id },
    { enabled: !!id }
  )

  // Update mutation
  const updateMutation = trpc.jobDescription.update.useMutation({
    onSuccess: () => {
      router.push('/hiring/settings/jd-templates')
    },
    onError: (error) => {
      alert(`Failed to update JD: ${error.message}`)
    },
  })

  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    content: '',
  })

  // Load JD data from database
  useEffect(() => {
    if (jdData) {
      setFormData({
        name: jdData.name,
        department: jdData.department || '',
        content: jdData.content,
      })
    }
  }, [jdData])

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.department || !formData.content.trim()) return

    setIsSaving(true)

    try {
      await updateMutation.mutateAsync({
        id,
        name: formData.name,
        department: formData.department,
        content: formData.content,
      })
    } catch (error) {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleteDialogOpen(false)
    // Simulate delete
    await new Promise(resolve => setTimeout(resolve, 500))
    router.push('/hiring/settings/jd-templates')
  }

  const deptInfo = getDepartmentInfo(formData.department)
  const DeptIcon = deptInfo.icon

  if (jdLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!jdData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold">JD not found</h2>
          <p className="text-muted-foreground mt-2">The job description you're looking for doesn't exist.</p>
          <Button asChild className="mt-4">
            <Link href="/hiring/settings/jd-templates">Back to JD Templates</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hiring/settings/jd-templates">
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
                  v{jdData.version}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Last updated {new Date(jdData.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>JD Details</CardTitle>
          <CardDescription>
            Edit the job description details
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Team *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                disabled={teamsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Select team"} />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.name}>
                      {team.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Job Description</Label>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Enter the full job description including overview, responsibilities, requirements, etc..."
              className="min-h-[400px]"
            />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
            <span>Created: {new Date(jdData.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(jdData.updatedAt).toLocaleDateString()}</span>
            <span>Version: {jdData.version}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button variant="outline" asChild>
              <Link href="/hiring/settings/jd-templates">Cancel</Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.department || !formData.content.trim() || isSaving}
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
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Description</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{formData.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
