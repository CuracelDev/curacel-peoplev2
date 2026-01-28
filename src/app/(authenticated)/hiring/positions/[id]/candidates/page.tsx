'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import {
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Globe,
  Lock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Paperclip,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CandidatesTable } from '@/components/hiring/candidates-table'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { useUploadThing } from '@/lib/uploadthing'
import { toast } from 'sonner'

function getRelativeTime(date: Date | string) {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 5) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getScoreClass(score: number) {
  if (score >= 80) return 'bg-success/10 text-success'
  if (score >= 60) return 'bg-warning/10 text-warning'
  return 'bg-destructive/10 text-destructive'
}

function getStageBadge(stage: string) {
  switch (stage) {
    case 'APPLIED':
      return <Badge variant="secondary" className="bg-muted text-foreground/80">Applied</Badge>
    case 'SHORTLISTED':
      return <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Short Listed</Badge>
    case 'HR_SCREEN':
      return <Badge className="bg-indigo-100 text-indigo-600 hover:bg-indigo-100">HR Screen</Badge>
    case 'TECHNICAL':
      return <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100">Technical</Badge>
    case 'PANEL':
      return <Badge className="bg-success/10 text-success hover:bg-success/10">Panel Interview</Badge>
    case 'OFFER':
      return <Badge className="bg-pink-100 text-pink-600 hover:bg-pink-100">Offer</Badge>
    case 'HIRED':
      return <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100">Hired</Badge>
    case 'REJECTED':
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">Rejected</Badge>
    case 'WITHDRAWN':
      return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Withdrawn</Badge>
    default:
      return <Badge variant="secondary">{stage}</Badge>
  }
}

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-muted text-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  CLOSED: 'Closed',
}

type CandidateStage =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'HR_SCREEN'
  | 'TECHNICAL'
  | 'TEAM_CHAT'
  | 'ADVISOR_CHAT'
  | 'PANEL'
  | 'TRIAL'
  | 'CEO_CHAT'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ARCHIVED'

type CandidateDocument = {
  id: string
  name: string
  type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'other'
  url: string
  uploadedAt: string
}

const stageOrder: CandidateStage[] = [
  'APPLIED',
  'SHORTLISTED',
  'HR_SCREEN',
  'TECHNICAL',
  'TEAM_CHAT',
  'ADVISOR_CHAT',
  'PANEL',
  'TRIAL',
  'CEO_CHAT',
  'OFFER',
  'HIRED',
]

const terminalStages = new Set<CandidateStage>(['HIRED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED'])

const getNextStage = (stage?: CandidateStage | null) => {
  if (!stage || terminalStages.has(stage)) return null
  const index = stageOrder.indexOf(stage)
  if (index < 0 || index >= stageOrder.length - 1) return null
  return stageOrder[index + 1]
}

export default function CandidatesListPage() {
  const params = useParams()
  const jobId = params.id as string
  const utils = trpc.useUtils()
  const searchParams = useSearchParams()
  const { data: job, isLoading: jobLoading } = trpc.job.get.useQuery({ id: jobId })
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.job.listCandidates.useQuery({ jobId })
  const addCandidateMutation = trpc.job.addCandidate.useMutation({
    onSuccess: () => {
      utils.job.listCandidates.invalidate({ jobId })
    },
  })
  const parseUpload = trpc.job.parseUploadForBulkImport.useMutation()
  const bulkImport = trpc.job.bulkImportCandidates.useMutation({
    onSuccess: () => {
      utils.job.listCandidates.invalidate({ jobId })
    },
  })
  const updateCandidateStage = trpc.job.updateCandidate.useMutation({
    onSuccess: () => {
      utils.job.listCandidates.invalidate({ jobId })
    },
  })
  const bulkUpdateStage = trpc.job.bulkUpdateCandidateStage.useMutation({
    onSuccess: () => {
      utils.job.listCandidates.invalidate({ jobId })
      setSelectedCandidates([])
    },
  })
  const upgradeFlowMutation = trpc.hiringFlow.upgradeJobFlow.useMutation({
    onSuccess: () => {
      utils.job.get.invalidate({ id: jobId })
    },
  })
  const toggleJobPublicMutation = trpc.hiringSettings.toggleJobPublic.useMutation({
    onSuccess: () => {
      utils.job.get.invalidate({ id: jobId })
    },
  })
  const autoAssignFlowsMutation = trpc.job.autoAssignHiringFlows.useMutation({
    onSuccess: () => {
      utils.job.get.invalidate({ id: jobId })
      utils.job.listCandidates.invalidate({ jobId })
    },
  })

  const [selectedStage, setSelectedStage] = useState('all')
  const [sortBy, setSortBy] = useState('score-desc')
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    resumeUrl: '',
    source: 'EXCELLER',
    notes: '',
  })
  const [candidateDocuments, setCandidateDocuments] = useState<CandidateDocument[]>([])
  const [docType, setDocType] = useState<CandidateDocument['type']>('other')
  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docUploading, setDocUploading] = useState(false)

  const [bulkUploadStep, setBulkUploadStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<{
    headers: string[]
    sampleRows: string[][]
    totalRows: number
    expectedFields: { key: string; label: string; required: boolean }[]
    aiMapping: Record<string, string>
    confidenceScores: Record<string, number>
    needsManualMapping: boolean
    parsedData: string[][]
  } | null>(null)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [importResult, setImportResult] = useState<{
    success: boolean
    totalRows: number
    importedCount: number
    skippedCount: number
    errorCount: number
    errors: { row: number; error: string }[]
  } | null>(null)

  const { startUpload } = useUploadThing('employeeDocuments', {
    onClientUploadComplete: (files) => {
      const file = files?.[0]
      if (!file) return
      const document: CandidateDocument = {
        id: `doc_${Date.now()}`,
        name: docName || file.name,
        type: docType,
        url: file.url,
        uploadedAt: new Date().toISOString(),
      }
      setCandidateDocuments((prev) => [...prev, document])
      setDocName('')
      setDocUploading(false)
      toast.success('Document uploaded')
    },
    onUploadError: (error) => {
      console.error('Upload error:', error)
      setDocUploading(false)
      toast.error(error.message || 'Document upload failed')
    },
  })

  const isLoading = jobLoading || candidatesLoading

  // Auto-assign hiring flows if job doesn't have one
  useEffect(() => {
    if (job && !job.hiringFlowSnapshotId && !autoAssignFlowsMutation.isPending) {
      autoAssignFlowsMutation.mutate()
    }
  }, [job?.hiringFlowSnapshotId])

  // Use real candidates from API
  const allCandidates = candidatesData?.candidates || []
  const counts = candidatesData?.counts || {
    all: 0,
    applied: 0,
    hrScreen: 0,
    technical: 0,
    panel: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  }
  const hiringFlowStages = candidatesData?.hiringFlowStages || []

  // Use actual stages from backend with real counts
  const stages = useMemo(() => {
    const stageInfo = candidatesData?.stageInfo || []

    // Always include "All" stage
    const allStages = [
      { id: 'all', label: 'All Candidates', count: counts.all }
    ]

    // Add actual stages with candidates
    stageInfo.forEach((s) => {
      if (s.count > 0) {
        allStages.push({
          id: s.stage,
          label: s.displayName,
          count: s.count,
        })
      }
    })

    return allStages
  }, [candidatesData?.stageInfo, counts.all])

  // Filter candidates by stage
  const stageFilteredCandidates = useMemo(() => {
    let filtered = allCandidates.filter((c) => {
      if (selectedStage === 'all') return true
      // Match by actual database stage
      return c.stage === selectedStage
    })

    // Sort candidates
    switch (sortBy) {
      case 'score-desc':
        filtered = [...filtered].sort((a, b) => (b.score || 0) - (a.score || 0))
        break
      case 'score-asc':
        filtered = [...filtered].sort((a, b) => (a.score || 0) - (b.score || 0))
        break
      case 'date':
        filtered = [...filtered].sort((a, b) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        )
        break
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return filtered
  }, [allCandidates, selectedStage, sortBy])

  // Calculate pagination
  const totalCandidates = stageFilteredCandidates.length
  const totalPages = Math.ceil(totalCandidates / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCandidates)
  const filteredCandidates = stageFilteredCandidates.slice(startIndex, endIndex)

  const selectedStageForAdvance = useMemo(() => {
    const stages = selectedCandidates
      .map((id) => filteredCandidates.find((candidate) => candidate.id === id)?.stage)
      .filter((stage): stage is CandidateStage => Boolean(stage))
    const uniqueStages = new Set(stages)
    if (uniqueStages.size !== 1) return null
    return stages[0] ?? null
  }, [selectedCandidates, filteredCandidates])

  const nextStage = useMemo(() => getNextStage(selectedStageForAdvance), [selectedStageForAdvance])
  const canAdvanceSelected = selectedCandidates.length > 0 && Boolean(nextStage)

  const handleAdvanceSelected = () => {
    if (selectedCandidates.length === 0) {
      toast.error('Select at least one candidate to advance.')
      return
    }
    if (!selectedStageForAdvance) {
      toast.error('Select candidates in the same stage to advance.')
      return
    }
    const next = getNextStage(selectedStageForAdvance)
    if (!next) {
      toast.error('No next stage available for the selected candidates.')
      return
    }
    bulkUpdateStage.mutate({ candidateIds: selectedCandidates, stage: next })
  }

  // Reset to page 1 when stage or page size changes
  const handleStageChange = (stage: string) => {
    setSelectedStage(stage)
    setCurrentPage(1)
  }

  const stageParam = searchParams.get('stage')

  useEffect(() => {
    if (!stageParam) return
    const normalized = stageParam.toLowerCase()
    const stageMap: Record<string, string> = {
      all: 'all',
      applicants: 'APPLIED',
      applied: 'APPLIED',
      'in-review': 'HR_SCREEN',
      interviewing: 'TEAM_CHAT',
      offer: 'OFFER',
      'offer-stage': 'OFFER',
      rejected: 'REJECTED',
      archived: 'ARCHIVED',
    }
    const fallbackStage = normalized.replace(/-/g, '_').toUpperCase()
    const nextStage = stageMap[normalized] ?? fallbackStage
    if (!nextStage) return
    setSelectedStage(nextStage)
    setCurrentPage(1)
  }, [stageParam])

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number(size))
    setCurrentPage(1)
  }

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (open) return
    setAddMode('single')
    setNewCandidate({
      name: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      resumeUrl: '',
      source: 'EXCELLER',
      notes: '',
    })
    setCandidateDocuments([])
    setDocType('other')
    setDocName('')
    setDocUrl('')
    setBulkUploadStep('upload')
    setUploadedFile(null)
    setParsedData(null)
    setFieldMapping({})
    setImportResult(null)
  }

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.email) {
      toast.error('Name and email are required.')
      return
    }

    const resumeFromDocs = candidateDocuments.find((doc) => doc.type === 'resume')?.url

    try {
      await addCandidateMutation.mutateAsync({
        jobId,
        name: newCandidate.name,
        email: newCandidate.email,
        phone: newCandidate.phone || undefined,
        linkedinUrl: newCandidate.linkedinUrl || undefined,
        resumeUrl: newCandidate.resumeUrl || resumeFromDocs || undefined,
        notes: newCandidate.notes || undefined,
        source: (newCandidate.source || 'EXCELLER') as 'EXCELLER' | 'INBOUND' | 'OUTBOUND' | 'RECRUITER',
        documents: candidateDocuments.length > 0 ? candidateDocuments : undefined,
      })
      toast.success('Candidate added')
      handleDialogClose(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add candidate'
      toast.error(message)
    }
  }

  const handleDocFileChange = async (file: File | null) => {
    if (!file) return
    setDocUploading(true)
    try {
      await startUpload([file])
    } catch (error) {
      console.error('Upload error:', error)
      setDocUploading(false)
      toast.error('Document upload failed')
    }
  }

  const handleAddDocUrl = () => {
    if (!docUrl) return
    const document: CandidateDocument = {
      id: `doc_${Date.now()}`,
      name: docName || docUrl,
      type: docType,
      url: docUrl,
      uploadedAt: new Date().toISOString(),
    }
    setCandidateDocuments((prev) => [...prev, document])
    setDocUrl('')
    setDocName('')
  }

  const handleRemoveDocument = (id: string) => {
    setCandidateDocuments((prev) => prev.filter((doc) => doc.id !== id))
  }

  const resetBulkUpload = () => {
    setBulkUploadStep('upload')
    setUploadedFile(null)
    setParsedData(null)
    setFieldMapping({})
    setImportResult(null)
  }

  const fileToBase64 = async (file: File) => {
    const buffer = await file.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file)

    const fileType = file.name.endsWith('.csv')
      ? 'csv'
      : file.name.endsWith('.xlsx')
        ? 'xlsx'
        : file.name.endsWith('.xls')
          ? 'xls'
          : null

    if (!fileType) {
      toast.error('Please upload a CSV or Excel file')
      return
    }

    const content = fileType === 'csv'
      ? await file.text()
      : await fileToBase64(file)

    try {
      const result = await parseUpload.mutateAsync({
        fileContent: content,
        fileName: file.name,
        fileType: fileType as 'csv' | 'xlsx' | 'xls',
      })

      setParsedData(result)
      setFieldMapping(result.aiMapping)
      setBulkUploadStep('mapping')
    } catch (error) {
      console.error('Failed to parse file:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to parse file')
    }
  }

  const handleBulkImport = async () => {
    if (!parsedData) return

    setBulkUploadStep('importing')

    try {
      const result = await bulkImport.mutateAsync({
        jobId,
        fieldMapping,
        data: parsedData.parsedData,
        headers: parsedData.headers,
        source: 'EXCELLER',
      })

      setImportResult(result)
      setBulkUploadStep('complete')
    } catch (error) {
      console.error('Failed to import candidates:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import candidates')
      setBulkUploadStep('mapping')
    }
  }

  const handlePublicToggle = (value: boolean) => {
    toggleJobPublicMutation.mutate({ jobId, isPublic: value })
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return null
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getLocationSummary = (locations: unknown) => {
    const locs = Array.isArray(locations) ? locations : []
    if (locs.length === 0) return 'Location TBD'
    if (locs.length === 1) return locs[0]
    return `${locs.length} locations`
  }

  // Calculate avg score from candidates
  const avgScore = useMemo(() => {
    const candidatesWithScores = allCandidates.filter((c) => c.score != null)
    if (candidatesWithScores.length === 0) return 0
    return Math.round(
      candidatesWithScores.reduce((sum, c) => sum + (c.score || 0), 0) / candidatesWithScores.length
    )
  }, [allCandidates])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4 text-center">
        <h2 className="text-xl font-semibold text-foreground">Job not found</h2>
        <p className="text-muted-foreground mt-2">The job you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/hiring/positions">
          <Button className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="py-3 sm:py-6 -mx-3 sm:-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
      {/* Job Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-foreground">
              <Link
                href={`/hiring/positions/${jobId}/details`}
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                {job.title}
              </Link>
              {job.hiresCount > 1 ? ` (${job.hiresCount})` : ''}
            </h1>
            <Badge className={cn(STATUS_BADGES[job.status], 'hover:bg-opacity-100')}>
              {STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.department || 'No Department'} &middot; {getLocationSummary(job.locations)}
            {job.createdAt && <> &middot; Posted {formatDate(job.createdAt)}</>}
            {job.deadline && <> &middot; Deadline {formatDate(job.deadline)}</>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Score Distribution */}
          <div className="text-center">
            <div className="flex items-end gap-0.5 h-10">
              {[15, 25, 45, 80, 100, 70, 40, 20].map((height, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 rounded-t bg-indigo-500',
                    height >= 70 ? 'opacity-100' : 'opacity-30'
                  )}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Score Distribution</div>
          </div>
          <div className="text-center pl-4 border-l border-border">
            <div className="text-3xl font-bold text-foreground">{avgScore}</div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Flow Outdated Banner */}
      {job.flowOutdated && job.hiringFlowSnapshot?.flow && (
        <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-warning/5 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning-foreground">
                Hiring flow has been updated
              </p>
              <p className="text-xs text-warning-foreground/80">
                This job is using version {job.currentVersion} of the &quot;{job.hiringFlowSnapshot.flow.name}&quot; flow.
                Version {job.latestVersion} is now available.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-warning/30 text-warning hover:bg-warning/10"
            onClick={() => upgradeFlowMutation.mutate({ jobId })}
            disabled={upgradeFlowMutation.isPending}
          >
            {upgradeFlowMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Update to v{job.latestVersion}
          </Button>
        </div>
      )}

      {/* Hiring Flow Info */}
      {job.hiringFlowSnapshot?.flow && (
        <div className="mb-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{job.hiringFlowSnapshot.flow.name}</span>
          {' '}flow • {hiringFlowStages.length} stages
          {!job.flowOutdated && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success dark:text-success">
              Up to date
            </span>
          )}
        </div>
      )}

      {/* Stats Row - Always fits in 1 row */}
      <div className="flex gap-3 min-w-0 mb-6">
        {stages.map((stage) => (
          <Card
            key={stage.id}
            className={cn(
              'flex-1 min-w-0 p-4 cursor-pointer transition-all border-0 shadow-sm',
              selectedStage === stage.id && 'ring-2 ring-indigo-500'
            )}
            onClick={() => handleStageChange(stage.id)}
          >
            <div className="text-xs text-muted-foreground mb-1 truncate">{stage.label}</div>
            <div className="mt-2 text-xl font-bold text-foreground">{stage.count}</div>
          </Card>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <div className="mr-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            {job.isPublic ? (
              <Globe className="h-4 w-4 text-indigo-600" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">{job.isPublic ? 'Public' : 'Private'}</span>
          </div>
          <Switch
            checked={Boolean(job.isPublic)}
            onCheckedChange={handlePublicToggle}
            disabled={toggleJobPublicMutation.isPending}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score-desc">Score (High to Low)</SelectItem>
            <SelectItem value="score-asc">Score (Low to High)</SelectItem>
            <SelectItem value="date">Applied Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Link href={`/recruiting/positions/${jobId}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Job
          </Button>
        </Link>
        <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Candidates</DialogTitle>
              <DialogDescription>
                Add a single candidate with documents or bulk upload via spreadsheet.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'single' | 'bulk')} className="w-full">
              <TabsList className="flex w-full justify-start gap-6 border-b bg-transparent p-0 mb-4">
                <TabsTrigger value="single" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary">
                  Single Candidate
                </TabsTrigger>
                <TabsTrigger value="bulk" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:text-primary">
                  Bulk Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="candidate-name">Full Name *</Label>
                    <Input
                      id="candidate-name"
                      placeholder="e.g. James Okafor"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="candidate-email">Email Address *</Label>
                    <Input
                      id="candidate-email"
                      type="email"
                      placeholder="e.g. james@example.com"
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="candidate-phone">Phone</Label>
                      <Input
                        id="candidate-phone"
                        placeholder="e.g. +234 800 123 4567"
                        value={newCandidate.phone}
                        onChange={(e) => setNewCandidate((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="candidate-source">Source</Label>
                      <Select
                        value={newCandidate.source}
                        onValueChange={(value) => setNewCandidate((prev) => ({ ...prev, source: value }))}
                      >
                        <SelectTrigger id="candidate-source">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXCELLER">Internal</SelectItem>
                          <SelectItem value="INBOUND">Inbound</SelectItem>
                          <SelectItem value="OUTBOUND">Outbound</SelectItem>
                          <SelectItem value="RECRUITER">Recruiter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="candidate-linkedin">LinkedIn URL</Label>
                    <Input
                      id="candidate-linkedin"
                      placeholder="https://linkedin.com/in/..."
                      value={newCandidate.linkedinUrl}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="candidate-resume">Resume URL (optional)</Label>
                    <Input
                      id="candidate-resume"
                      placeholder="https://drive.google.com/..."
                      value={newCandidate.resumeUrl}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, resumeUrl: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="candidate-notes">Notes</Label>
                    <Textarea
                      id="candidate-notes"
                      placeholder="Any additional notes..."
                      value={newCandidate.notes}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Paperclip className="h-4 w-4" />
                    Documents
                  </div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                      <Select value={docType} onValueChange={(value) => setDocType(value as CandidateDocument['type'])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resume">Resume</SelectItem>
                          <SelectItem value="cover_letter">Cover Letter</SelectItem>
                          <SelectItem value="portfolio">Portfolio</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Document name (optional)"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        onChange={(e) => handleDocFileChange(e.target.files?.[0] ?? null)}
                        disabled={docUploading}
                      />
                      <div className="flex gap-2 flex-1">
                        <Input
                          placeholder="Paste document URL"
                          value={docUrl}
                          onChange={(e) => setDocUrl(e.target.value)}
                        />
                        <Button type="button" variant="outline" onClick={handleAddDocUrl} disabled={!docUrl}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {candidateDocuments.length > 0 && (
                    <div className="space-y-2">
                      {candidateDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                          <span className="text-muted-foreground">{doc.type.replace('_', ' ')}</span>
                          <span className="flex-1 truncate">{doc.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRemoveDocument(doc.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCandidate}
                    disabled={!newCandidate.name || !newCandidate.email || addCandidateMutation.isPending}
                  >
                    {addCandidateMutation.isPending ? 'Adding...' : 'Add Candidate'}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-4">
                {bulkUploadStep === 'upload' && (
                  <div className="space-y-4">
                    <div
                      className={cn(
                        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                        'hover:border-primary hover:bg-muted/50',
                        parseUpload.isPending && 'pointer-events-none opacity-50'
                      )}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const file = e.dataTransfer.files[0]
                        if (file) handleFileUpload(file)
                      }}
                      onClick={() => document.getElementById('bulk-file-input')?.click()}
                    >
                      <input
                        id="bulk-file-input"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                      />
                      {parseUpload.isPending ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-10 w-10 text-primary animate-spin" />
                          <div>
                            <p className="font-medium">Processing file...</p>
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                              <Sparkles className="h-4 w-4" />
                              AuntyPelz is matching fields automatically
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                          <p className="font-medium">Drop your file here or click to browse</p>
                          <p className="text-sm text-muted-foreground">
                            Supports CSV and Excel files (.csv, .xlsx, .xls)
                          </p>
                        </>
                      )}
                    </div>

                    {uploadedFile && !parseUpload.isPending && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <FileSpreadsheet className="h-5 w-5 text-success" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadedFile(null)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Expected columns:</p>
                      <p>Name*, Email*, Phone, LinkedIn URL, Current Role, Current Company, Location, Notes, Resume URL</p>
                      <p className="mt-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        AuntyPelz will automatically match your columns to the expected fields
                      </p>
                    </div>
                  </div>
                )}

                {bulkUploadStep === 'mapping' && parsedData && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Found {parsedData.totalRows} candidates</p>
                        <p className="text-sm text-muted-foreground">
                          {parsedData.needsManualMapping
                            ? 'Some fields need manual mapping'
                            : 'All fields matched automatically'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Field Mapping</Label>
                      <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                        {parsedData.headers.map((header) => {
                          const confidence = parsedData.confidenceScores[header] || 0
                          const isLowConfidence = confidence > 0 && confidence < 70

                          return (
                            <div key={header} className="flex items-center gap-3 p-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{header}</span>
                                  {confidence > 0 && (
                                    <span
                                      className={cn(
                                        'text-xs px-1.5 py-0.5 rounded',
                                        confidence >= 80
                                          ? 'bg-success/10 text-success'
                                          : confidence >= 50
                                            ? 'bg-warning/10 text-warning'
                                            : 'bg-destructive/10 text-destructive'
                                      )}
                                    >
                                      {confidence}%
                                    </span>
                                  )}
                                </div>
                                {parsedData.sampleRows[0] && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    e.g. {parsedData.sampleRows[0][parsedData.headers.indexOf(header)] || '-'}
                                  </p>
                                )}
                              </div>
                              <Select
                                value={fieldMapping[header] || '_skip'}
                                onValueChange={(value) => {
                                  setFieldMapping((prev) => ({
                                    ...prev,
                                    [header]: value === '_skip' ? '' : value,
                                  }))
                                }}
                              >
                                <SelectTrigger className={cn('w-[180px]', isLowConfidence && 'border-warning')}>
                                  <SelectValue placeholder="Map to field..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_skip">
                                    <span className="text-muted-foreground">Skip this column</span>
                                  </SelectItem>
                                  {parsedData.expectedFields.map((field) => (
                                    <SelectItem key={field.key} value={field.key}>
                                      {field.label} {field.required && '*'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {parsedData.sampleRows.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Preview (first 3 rows)</Label>
                        <div className="border rounded-lg overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted">
                                {parsedData.headers.map((h) => (
                                  <th key={h} className="px-2 py-1.5 text-left font-medium truncate max-w-[120px]">
                                    {fieldMapping[h] || <span className="text-muted-foreground">skipped</span>}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {parsedData.sampleRows.slice(0, 3).map((row, i) => (
                                <tr key={i} className="border-t">
                                  {row.map((cell, j) => (
                                    <td key={j} className="px-2 py-1.5 truncate max-w-[120px]">
                                      {cell || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button variant="outline" onClick={resetBulkUpload}>
                        Back
                      </Button>
                      <Button
                        onClick={handleBulkImport}
                        disabled={
                          !Object.values(fieldMapping).includes('name') ||
                          !Object.values(fieldMapping).includes('email')
                        }
                      >
                        Import {parsedData.totalRows} Candidates
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {bulkUploadStep === 'importing' && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <div className="text-center">
                      <p className="font-medium">Importing candidates...</p>
                      <p className="text-sm text-muted-foreground">This may take a moment</p>
                    </div>
                    <Progress value={50} className="w-full max-w-xs" />
                  </div>
                )}

                {bulkUploadStep === 'complete' && importResult && (
                  <div className="space-y-4">
                    <div className={cn(
                      'flex items-center gap-3 p-4 rounded-lg',
                      importResult.importedCount > 0 ? 'bg-success/10' : 'bg-warning/10'
                    )}>
                      {importResult.importedCount > 0 ? (
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-warning" />
                      )}
                      <div>
                        <p className="font-medium">
                          {importResult.importedCount > 0
                            ? `Successfully imported ${importResult.importedCount} candidates`
                            : 'No new candidates imported'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {importResult.skippedCount > 0 && `${importResult.skippedCount} duplicates skipped. `}
                          {importResult.errorCount > 0 && `${importResult.errorCount} errors.`}
                        </p>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-destructive">Errors</Label>
                        <div className="border border-destructive/20 rounded-lg divide-y max-h-[150px] overflow-y-auto">
                          {importResult.errors.map((err, i) => (
                            <div key={i} className="px-3 py-2 text-sm">
                              <span className="text-muted-foreground">Row {err.row}:</span> {err.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button variant="outline" onClick={() => handleDialogClose(false)}>
                        Close
                      </Button>
                      <Button onClick={resetBulkUpload}>
                        Upload Another File
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <CandidatesTable
        candidates={filteredCandidates}
        total={totalCandidates}
        selectedCandidates={selectedCandidates}
        onSelectedCandidatesChange={setSelectedCandidates}
        storageKey="hiring.jobCandidates.visibleColumns"
        candidateHref={(candidate) => `/recruiting/candidates/${candidate.id}`}
        scoreClassName={(score) => getScoreClass(score || 0)}
        renderStage={(candidate) => getStageBadge(candidate.stage || '')}
        formatApplied={(candidate) => formatDate(candidate.appliedAt) || '-'}
        formatUpdated={(candidate) => getRelativeTime(candidate.updatedAt)}
        onArchiveCandidate={(id) => updateCandidateStage.mutate({ id, stage: 'ARCHIVED' })}
        onRejectCandidate={(id) => updateCandidateStage.mutate({ id, stage: 'REJECTED' })}
        onBulkArchive={(ids) => bulkUpdateStage.mutate({ candidateIds: ids, stage: 'ARCHIVED' })}
        onBulkReject={(ids) => bulkUpdateStage.mutate({ candidateIds: ids, stage: 'REJECTED' })}
        bulkActions={(
          <Button
            size="sm"
            className="bg-success hover:bg-success"
            disabled={!canAdvanceSelected || bulkUpdateStage.isPending}
            onClick={handleAdvanceSelected}
          >
            Advance to Next Stage
          </Button>
        )}
        footer={(
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {totalCandidates === 0 ? 0 : startIndex + 1}-{endIndex} of {totalCandidates} candidates
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  )
}
