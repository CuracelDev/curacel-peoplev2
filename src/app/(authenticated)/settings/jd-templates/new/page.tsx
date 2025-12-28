'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const FLOW_TYPES = [
  { value: 'STANDARD', label: 'Standard', description: 'Interest → HR Screen → Panel → Trial → Offer' },
  { value: 'ENGINEERING', label: 'Engineering', description: 'Interest → HR Screen → Technical → Panel → Trial' },
  { value: 'SALES', label: 'Sales', description: 'Interest → HR Screen → Panel → Trial with POC → Offer' },
  { value: 'EXECUTIVE', label: 'Executive', description: 'Interest → HR Screen → Multiple Panels → Case Study → CEO' },
]

export default function NewJDPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from') // If creating new version from existing JD
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState('manual')
  const [isSaving, setIsSaving] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [existingJD, setExistingJD] = useState<{ id: string; name: string; version: number } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    flowType: '',
    requirements: '',
    responsibilities: '',
    isActive: true,
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
          description: 'Loaded from previous version...',
          flowType: 'ENGINEERING',
          requirements: '- Loaded requirements...',
          responsibilities: '- Loaded responsibilities...',
          isActive: false,
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
    if (!formData.name.trim() || !formData.department) return

    // Check for duplicates
    if (checkDuplicate()) return

    setIsSaving(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSaving(false)
    router.push('/settings/jd-templates')
  }

  const handleCreateAsNewVersion = async () => {
    if (!existingJD) return

    setDuplicateDialogOpen(false)
    setIsSaving(true)

    // Simulate creating new version
    await new Promise(resolve => setTimeout(resolve, 1000))

    setIsSaving(false)
    router.push('/settings/jd-templates')
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
      router.push('/settings/jd-templates')
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

    setFormData({
      ...formData,
      name: mockParsedData.name,
      department: mockParsedData.department,
      description: mockParsedData.description,
      flowType: mockParsedData.flowType,
      requirements: mockParsedData.requirements,
      responsibilities: mockParsedData.responsibilities,
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
          <Link href="/settings/jd-templates">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {fromId ? 'Create New Version' : 'Create Job Description'}
          </h1>
          <p className="text-sm text-gray-500">
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
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hiring flow type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FLOW_TYPES.map((flow) => (
                        <SelectItem key={flow.value} value={flow.value}>
                          <div>
                            <div className="font-medium">{flow.label}</div>
                            <div className="text-xs text-gray-500">{flow.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center justify-between rounded-md border border-input px-3 py-2 h-10">
                    <span className="text-sm">
                      {formData.isActive ? (
                        <span className="flex items-center gap-2 text-green-600">
                          <Eye className="h-4 w-4" />
                          Publish immediately
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-amber-600">
                          <EyeOff className="h-4 w-4" />
                          Save as draft
                        </span>
                      )}
                    </span>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Summary</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of the role and its impact..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsibilities">Key Responsibilities</Label>
                <Textarea
                  id="responsibilities"
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  placeholder="List the main responsibilities (one per line)..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="List required qualifications and skills (one per line)..."
                  rows={6}
                />
              </div>

              {/* Actions */}
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
                  ) : fromId ? (
                    'Create New Version'
                  ) : (
                    formData.isActive ? 'Publish JD' : 'Save as Draft'
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
                  uploadedFiles.length > 0 ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
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
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500 mt-2">PDF, DOC, DOCX, TXT up to 10MB each</p>
              </div>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <Label>Files to upload ({uploadedFiles.length})</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium truncate block">{file.name}</span>
                            <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
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
                  <Link href="/settings/jd-templates">Cancel</Link>
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
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3">Supported sources:</p>
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
                  <Link href="/settings/jd-templates">Cancel</Link>
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
                  <div className="text-sm text-gray-500">
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
                <Pencil className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="text-left">
                  <div className="font-medium">Use a different name</div>
                  <div className="text-sm text-gray-500">
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
