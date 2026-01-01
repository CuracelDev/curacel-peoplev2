'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ArrowLeft,
  Upload,
  Briefcase,
  Pencil,
  FileText,
  Code,
  Palette,
  Users,
  TrendingUp,
  Megaphone,
  Settings,
  CheckCircle,
  AlertCircle,
  X,
  Link as LinkIcon,
  Loader2,
  Globe,
  Eye,
  EyeOff,
  GitBranch,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

// Mock existing JDs for duplicate detection
const existingJDs = [
  { id: '1', name: 'Senior Backend Engineer', version: 3 },
  { id: '2', name: 'Product Designer', version: 1 },
  { id: '3', name: 'Growth Lead', version: 1 },
  { id: '4', name: 'Executive Operations Manager', version: 2 },
  { id: '5', name: 'Frontend Developer', version: 1 },
]

const DEPARTMENTS = [
  { value: 'Engineering', icon: Code, color: 'text-blue-500 bg-blue-50' },
  { value: 'Design', icon: Palette, color: 'text-purple-500 bg-purple-50' },
  { value: 'Marketing', icon: Megaphone, color: 'text-pink-500 bg-pink-50' },
  { value: 'Sales', icon: TrendingUp, color: 'text-green-500 bg-green-50' },
  { value: 'Operations', icon: Settings, color: 'text-amber-500 bg-amber-50' },
  { value: 'People', icon: Users, color: 'text-indigo-500 bg-indigo-50' },
  { value: 'Finance', icon: Briefcase, color: 'text-emerald-500 bg-emerald-50' },
]

export default function NewJDPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from') // If creating new version from existing JD
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch teams from database
  const { data: teams, isLoading: teamsLoading} = trpc.team.listForSelect.useQuery()

  // Create mutation
  const createMutation = trpc.jobDescription.create.useMutation({
    onSuccess: () => {
      router.push('/hiring/settings/jd-templates')
    },
    onError: (error) => {
      alert(`Failed to create JD: ${error.message}`)
    },
  })

  const [activeTab, setActiveTab] = useState('manual')
  const [isSaving, setIsSaving] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [existingJD, setExistingJD] = useState<{ id: string; name: string; version: number } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    content: '',
  })

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')

  // Import from URL state
  const [importUrl, setImportUrl] = useState('')
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle')
  const [importError, setImportError] = useState('')

  // Load data if creating from existing JD
  useEffect(() => {
    if (fromId) {
      // Mock: load existing JD data
      const existing = existingJDs.find(jd => jd.id === fromId)
      if (existing) {
        // Simulate loading full JD data
        setFormData({
          name: existing.name,
          department: 'Engineering',
          content: 'Loaded from previous version...',
        })
      }
    }
  }, [fromId])

  // Check for duplicate names
  const checkDuplicate = () => {
    const existing = existingJDs.find(
      jd => jd.name.toLowerCase() === formData.name.toLowerCase()
    )
    if (existing && (!fromId || fromId !== existing.id)) {
      setExistingJD(existing)
      setDuplicateDialogOpen(true)
      return true
    }
    return false
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.department || !formData.content.trim()) return

    // Check for duplicates
    if (checkDuplicate()) return

    setIsSaving(true)

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        department: formData.department,
        content: formData.content,
      })
    } catch (error) {
      setIsSaving(false)
    }
  }

  const handleCreateAsNewVersion = async () => {
    if (!existingJD) return

    setDuplicateDialogOpen(false)
    setIsSaving(true)

    // Simulate creating new version
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSaving(false)
    router.push('/hiring/settings/jd-templates')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file =>
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'text/plain'
    )
    setUploadedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleBulkUpload = async () => {
    if (uploadedFiles.length === 0) return

    setUploadStatus('uploading')

    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000))

    setUploadStatus('success')

    // Redirect after success
    setTimeout(() => {
      router.push('/hiring/settings/jd-templates')
    }, 1500)
  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return

    try {
      new URL(importUrl)
    } catch {
      setImportError('Please enter a valid URL')
      return
    }

    setImportStatus('importing')
    setImportError('')

    // Simulate import
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock parsed data
    const mockParsedData = {
      name: 'Senior Executive Operations (AI-Pilled)',
      department: 'Operations',
      description: 'We are looking for a Senior Executive Operations professional to partner directly with the CEO. This role is for someone who is deeply curious about AI and wants to help build the future of insurance infrastructure in Africa.',
      flowType: 'EXECUTIVE',
      requirements: `- 5+ years of experience in operations, strategy, or chief of staff roles
- Strong analytical and problem-solving skills
- Experience working directly with C-level executives
- Familiarity with AI tools and willingness to leverage them daily
- Excellent written and verbal communication
- Based in Lagos or willing to relocate`,
      responsibilities: `- Partner with the CEO on strategic initiatives and day-to-day operations
- Manage cross-functional projects and ensure timely execution
- Prepare board materials, investor updates, and strategic documents
- Identify operational inefficiencies and implement improvements
- Build and maintain relationships with key stakeholders
- Use AI tools to enhance productivity and decision-making`,
    }

    const content = `${mockParsedData.description}\n\n<h2>Key Responsibilities</h2>\n${mockParsedData.responsibilities}\n\n<h2>Requirements</h2>\n${mockParsedData.requirements}`

    setFormData({
      ...formData,
      name: mockParsedData.name,
      department: mockParsedData.department,
      content: content,
    })

    setImportStatus('success')

    // Switch to manual tab to review
    setTimeout(() => {
      setActiveTab('manual')
      setImportStatus('idle')
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hiring/settings/jd-templates">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {fromId ? 'Create New Version' : 'Create Job Description'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {fromId
              ? 'Create a new version based on an existing JD'
              : 'Add a new job description to your hiring pipeline'}
          </p>
        </div>
      </div>

      {/* Version indicator */}
      {fromId && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg">
          <GitBranch className="h-5 w-5" />
          <span className="text-sm">
            Creating new version from existing JD. The previous version will be archived.
          </span>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="manual" className="gap-2">
            <Pencil className="h-4 w-4" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Globe className="h-4 w-4" />
            Import URL
          </TabsTrigger>
        </TabsList>

        {/* Manual Creation Tab */}
        <TabsContent value="manual" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>JD Details</CardTitle>
              <CardDescription>
                Fill in the job description details. You can save as draft or publish immediately.
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
                  ) : fromId ? (
                    'Create New Version'
                  ) : (
                    'Save JD Template'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload</CardTitle>
              <CardDescription>
                Upload one or more JD files. Supported formats: PDF, DOC, DOCX, TXT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                  uploadedFiles.length > 0 ? "border-primary bg-primary/5" : "border-border hover:border-gray-400"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-2">PDF, DOC, DOCX, TXT up to 10MB each</p>
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <Label>Files to upload ({uploadedFiles.length})</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium truncate block">{file.name}</span>
                            <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload status */}
              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Successfully uploaded {uploadedFiles.length} JD(s)!</span>
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Upload failed. Please try again.</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Button variant="outline" asChild>
                  <Link href="/hiring/settings/jd-templates">Cancel</Link>
                </Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={uploadedFiles.length === 0 || uploadStatus === 'uploading'}
                >
                  {uploadStatus === 'uploading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>Upload {uploadedFiles.length || ''} File{uploadedFiles.length !== 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import from URL Tab */}
        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import from URL</CardTitle>
              <CardDescription>
                Paste a link to a job posting and we&apos;ll extract the details automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="importUrl">Job Posting URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="importUrl"
                    value={importUrl}
                    onChange={(e) => {
                      setImportUrl(e.target.value)
                      setImportError('')
                    }}
                    placeholder="https://www.ycombinator.com/companies/..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Supported sources */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-3">Supported sources:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">YC Work at a Startup</Badge>
                  <Badge variant="outline">LinkedIn Jobs</Badge>
                  <Badge variant="outline">Greenhouse</Badge>
                  <Badge variant="outline">Lever</Badge>
                  <Badge variant="outline">Workable</Badge>
                  <Badge variant="outline">Any public URL</Badge>
                </div>
              </div>

              {/* Import status */}
              {importStatus === 'success' && (
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Successfully imported! Switching to edit view...</span>
                </div>
              )}
              {importError && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{importError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Button variant="outline" asChild>
                  <Link href="/hiring/settings/jd-templates">Cancel</Link>
                </Button>
                <Button
                  onClick={handleImportFromUrl}
                  disabled={!importUrl.trim() || importStatus === 'importing'}
                >
                  {importStatus === 'importing' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Import JD
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Duplicate Name Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              JD Already Exists
            </DialogTitle>
            <DialogDescription>
              A job description named &quot;{formData.name}&quot; already exists (v{existingJD?.version}).
              Would you like to create a new version or use a different name?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={handleCreateAsNewVersion}
            >
              <div className="flex items-start gap-3">
                <GitBranch className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="text-left">
                  <div className="font-medium">Create as new version (v{(existingJD?.version || 0) + 1})</div>
                  <div className="text-sm text-muted-foreground">
                    The current version will be archived and this will become the active version.
                  </div>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              <div className="flex items-start gap-3">
                <Pencil className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-left">
                  <div className="font-medium">Use a different name</div>
                  <div className="text-sm text-muted-foreground">
                    Go back and change the job title to something unique.
                  </div>
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDuplicateDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
