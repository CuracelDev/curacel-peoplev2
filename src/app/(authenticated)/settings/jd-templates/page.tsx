'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Upload,
  Briefcase,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
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
} from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { cn } from '@/lib/utils'

// Mock JD templates data
const mockTemplates = [
  {
    id: '1',
    name: 'Senior Backend Engineer',
    department: 'Engineering',
    description: 'Design, build, and maintain efficient, reusable, and reliable backend services.',
    flowType: 'ENGINEERING',
    isActive: true,
    createdAt: '2025-01-15',
  },
  {
    id: '2',
    name: 'Product Designer',
    department: 'Design',
    description: 'Create user-centered designs by understanding business requirements and user feedback.',
    flowType: 'STANDARD',
    isActive: true,
    createdAt: '2025-01-10',
  },
  {
    id: '3',
    name: 'Growth Lead',
    department: 'Marketing',
    description: 'Drive user acquisition and retention through data-driven growth strategies.',
    flowType: 'SALES',
    isActive: true,
    createdAt: '2025-01-08',
  },
  {
    id: '4',
    name: 'Executive Operations Manager',
    department: 'Operations',
    description: 'Partner with the CEO to manage strategic initiatives and operational excellence.',
    flowType: 'EXECUTIVE',
    isActive: true,
    createdAt: '2025-01-05',
  },
  {
    id: '5',
    name: 'Frontend Developer',
    department: 'Engineering',
    description: 'Build responsive and performant web applications using modern frameworks.',
    flowType: 'ENGINEERING',
    isActive: false,
    createdAt: '2024-12-20',
  },
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

function getDepartmentInfo(department: string) {
  return DEPARTMENTS.find(d => d.value === department) || { icon: Briefcase, color: 'text-gray-500 bg-gray-50' }
}

export default function JDTemplatesPage() {
  const [templates, setTemplates] = useState(mockTemplates)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    department: '',
    description: '',
    flowType: '',
    requirements: '',
    responsibilities: '',
  })

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.department) return

    const template = {
      id: Date.now().toString(),
      name: newTemplate.name,
      department: newTemplate.department,
      description: newTemplate.description,
      flowType: newTemplate.flowType || 'STANDARD',
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    }

    setTemplates([template, ...templates])
    setIsCreateDialogOpen(false)
    setNewTemplate({
      name: '',
      department: '',
      description: '',
      flowType: '',
      requirements: '',
      responsibilities: '',
    })
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

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock: Add uploaded files as templates
    const newTemplates = uploadedFiles.map((file, index) => ({
      id: `uploaded-${Date.now()}-${index}`,
      name: file.name.replace(/\.(pdf|doc|docx|txt)$/i, ''),
      department: 'Engineering', // Default department
      description: 'Uploaded JD template - review and customize',
      flowType: 'STANDARD',
      isActive: false, // Start as draft
      createdAt: new Date().toISOString().split('T')[0],
    }))

    setTemplates([...newTemplates, ...templates])
    setUploadStatus('success')

    // Reset after success
    setTimeout(() => {
      setIsBulkUploadDialogOpen(false)
      setUploadedFiles([])
      setUploadStatus('idle')
    }, 1500)
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id))
  }

  const handleDuplicateTemplate = (template: typeof mockTemplates[0]) => {
    const duplicate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setTemplates([duplicate, ...templates])
  }

  const activeTemplates = templates.filter(t => t.isActive)
  const draftTemplates = templates.filter(t => !t.isActive)

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Job Description Templates"
        actions={
          <div className="flex items-center gap-3">
            {/* Bulk Upload Button */}
            <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk Upload JD Templates</DialogTitle>
                  <DialogDescription>
                    Upload multiple job description files to create templates. Supported formats: PDF, DOC, DOCX, TXT
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Drop zone */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
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
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, TXT up to 10MB each</p>
                  </div>

                  {/* Uploaded files list */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Files to upload ({uploadedFiles.length})</Label>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
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
                    <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Successfully uploaded {uploadedFiles.length} templates!</span>
                    </div>
                  )}
                  {uploadStatus === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Upload failed. Please try again.</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsBulkUploadDialogOpen(false)
                    setUploadedFiles([])
                    setUploadStatus('idle')
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkUpload}
                    disabled={uploadedFiles.length === 0 || uploadStatus === 'uploading'}
                  >
                    {uploadStatus === 'uploading' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>Upload {uploadedFiles.length} File{uploadedFiles.length !== 1 ? 's' : ''}</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create Template Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create JD Template</DialogTitle>
                  <DialogDescription>
                    Create a new job description template for your hiring pipeline.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="templateName">Job Title *</Label>
                      <Input
                        id="templateName"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., Senior Backend Engineer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
                      <Select
                        value={newTemplate.department}
                        onValueChange={(value) => setNewTemplate({ ...newTemplate, department: value })}
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

                  <div className="space-y-2">
                    <Label htmlFor="flowType">Hiring Flow</Label>
                    <Select
                      value={newTemplate.flowType}
                      onValueChange={(value) => setNewTemplate({ ...newTemplate, flowType: value })}
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
                    <Label htmlFor="description">Job Summary</Label>
                    <Textarea
                      id="description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                      placeholder="Brief overview of the role and its impact..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsibilities">Key Responsibilities</Label>
                    <Textarea
                      id="responsibilities"
                      value={newTemplate.responsibilities}
                      onChange={(e) => setNewTemplate({ ...newTemplate, responsibilities: e.target.value })}
                      placeholder="List the main responsibilities (one per line)..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={newTemplate.requirements}
                      onChange={(e) => setNewTemplate({ ...newTemplate, requirements: e.target.value })}
                      placeholder="List required qualifications and skills (one per line)..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={!newTemplate.name.trim() || !newTemplate.department}
                  >
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Active Templates */}
      {activeTemplates.length > 0 && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Active Templates</h2>
            <p className="text-sm text-gray-500">Templates available for creating new job positions</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeTemplates.map((template) => {
              const deptInfo = getDepartmentInfo(template.department)
              const DeptIcon = deptInfo.icon

              return (
                <Card key={template.id} className="group hover:shadow-lg transition-shadow cursor-pointer relative">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn("p-2 rounded-lg", deptInfo.color)}>
                        <DeptIcon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {template.flowType}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="w-fit text-xs">
                      {template.department}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm line-clamp-2">
                      {template.description}
                    </CardDescription>
                    <p className="text-xs text-gray-400 mt-3">Created {template.createdAt}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Draft Templates */}
      {draftTemplates.length > 0 && (
        <>
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Drafts</h2>
            <p className="text-sm text-gray-500">Templates that need review before activation</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {draftTemplates.map((template) => {
              const deptInfo = getDepartmentInfo(template.department)
              const DeptIcon = deptInfo.icon

              return (
                <Card key={template.id} className="group hover:shadow-lg transition-shadow cursor-pointer relative opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn("p-2 rounded-lg", deptInfo.color)}>
                        <DeptIcon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                          Draft
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit & Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="w-fit text-xs">
                      {template.department}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm line-clamp-2">
                      {template.description}
                    </CardDescription>
                    <p className="text-xs text-gray-400 mt-3">Uploaded {template.createdAt}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No JD templates yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first job description template.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
