'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { PageActions } from '@/components/layout/page-actions'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Search,
  Download,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Users,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { format, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns'

type SortOption = 'score-desc' | 'score-asc' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'quarter'

const stageStyles: Record<string, string> = {
  'APPLIED': 'bg-muted text-foreground/80',
  'HR_SCREEN': 'bg-indigo-100 text-indigo-700',
  'TECHNICAL': 'bg-amber-100 text-amber-700',
  'TEAM_CHAT': 'bg-success/10 text-success',
  'PANEL': 'bg-success/10 text-success',
  'TRIAL': 'bg-blue-100 text-blue-700',
  'CEO_CHAT': 'bg-purple-100 text-purple-700',
  'OFFER': 'bg-pink-100 text-pink-700',
  'HIRED': 'bg-emerald-100 text-emerald-700',
  'ARCHIVED': 'bg-slate-100 text-slate-700',
}

const defaultStageCards = [
  { key: 'all', label: 'All', stageKeys: [] as string[] },
  { key: 'applied', label: 'Applied', stageKeys: ['APPLIED'] },
  { key: 'hrScreen', label: 'People Chat', stageKeys: ['HR_SCREEN'] },
  { key: 'technical', label: 'Coding Test', stageKeys: ['TECHNICAL'] },
  { key: 'panel', label: 'Team Chat', stageKeys: ['TEAM_CHAT', 'PANEL'] },
  { key: 'offer', label: 'Offer', stageKeys: ['OFFER'] },
]

function getScoreColor(score: number | null) {
  if (!score) return 'text-muted-foreground bg-muted/50'
  if (score >= 80) return 'text-success bg-success/10'
  if (score >= 65) return 'text-warning bg-warning/10'
  return 'text-destructive bg-destructive/10'
}

export default function CandidatesPage() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('score-desc')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    source: '',
    notes: '',
  })

  // Bulk upload state
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
  const searchParams = useSearchParams()
  const addParam = searchParams.get('add')

  const { data: teams } = trpc.team.listForSelect.useQuery()
  const parseUpload = trpc.job.parseUploadForBulkImport.useMutation()
  const bulkImport = trpc.job.bulkImportCandidates.useMutation()
  const utils = trpc.useUtils()
  const updateCandidateStage = trpc.job.updateCandidate.useMutation({
    onSuccess: () => {
      utils.job.getAllCandidates.invalidate()
    },
  })
  const bulkUpdateStage = trpc.job.bulkUpdateCandidateStage.useMutation({
    onSuccess: () => {
      utils.job.getAllCandidates.invalidate()
      setSelectedCandidates([])
    },
  })

  // Build query params based on filters
  const sortBy = sortOption.startsWith('score') ? 'score' as const :
                 sortOption.startsWith('date') ? 'appliedAt' as const :
                 'name' as const
  const sortOrder = sortOption.endsWith('desc') ? 'desc' as const : 'asc' as const

  // Map filter to stage
  const stageFilter = activeFilter === 'all' ? undefined :
                      activeFilter === 'applied' ? 'APPLIED' as const :
                      activeFilter === 'hrScreen' ? 'HR_SCREEN' as const :
                      activeFilter === 'technical' ? 'TECHNICAL' as const :
                      activeFilter === 'panel' ? 'TEAM_CHAT' as const :
                      activeFilter === 'offer' ? 'OFFER' as const : undefined

  const dateRange = useMemo(() => {
    if (dateFilter === 'all') return null
    const now = new Date()

    switch (dateFilter) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) }
      case 'week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) }
      case 'month':
        return { from: startOfMonth(now), to: endOfDay(now) }
      case 'quarter':
        return { from: startOfQuarter(now), to: endOfDay(now) }
      default:
        return null
    }
  }, [dateFilter])

  // Fetch candidates from database
  const { data: candidatesData, isLoading } = trpc.job.getAllCandidates.useQuery({
    stage: stageFilter,
    search: searchQuery || undefined,
    department: teamFilter === 'all' ? undefined : teamFilter,
    appliedFrom: dateRange?.from,
    appliedTo: dateRange?.to,
    includeArchived: searchQuery ? true : undefined, // Include archived when searching
    sortBy,
    sortOrder,
    limit: 50,
    offset: 0,
  })

  const candidates = candidatesData?.candidates || []
  const total = candidatesData?.total || 0
  const byStageCounts = candidatesData?.byStageCounts || {}

  const stageCards = useMemo(() => defaultStageCards, [])

  // Calculate stage counts dynamically
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: Object.values(byStageCounts).reduce((sum, s) => sum + s.count, 0),
    }

    for (const card of stageCards) {
      if (card.key !== 'all') {
        counts[card.key] = card.stageKeys.reduce(
          (sum, key) => sum + (byStageCounts[key]?.count || 0),
          0
        )
      }
    }

    return counts
  }, [byStageCounts, stageCards])

  const handleExport = () => {
    const candidatesToExport = selectedCandidates.length > 0
      ? candidates.filter(c => selectedCandidates.includes(c.id))
      : candidates

    const csvContent = [
      ['Name', 'Email', 'Score', 'Stage', 'Applied Date'].join(','),
      ...candidatesToExport.map(c => {
        const appliedDate = c.appliedAt instanceof Date ? c.appliedAt : new Date(c.appliedAt)
        return [c.name, c.email, c.score || '-', c.stageDisplayName, format(appliedDate, 'MMM d, yyyy')].join(',')
      }),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `candidates-export-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleAddCandidate = () => {
    // For now, just log and close - will integrate with backend later
    console.log('Adding candidate:', newCandidate)
    setNewCandidate({ name: '', email: '', phone: '', linkedinUrl: '', source: '', notes: '' })
    setIsAddDialogOpen(false)
  }

  const resetBulkUpload = () => {
    setBulkUploadStep('upload')
    setUploadedFile(null)
    setParsedData(null)
    setFieldMapping({})
    setImportResult(null)
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
      alert('Please upload a CSV or Excel file')
      return
    }

    // Read file content
    const content = await file.text()

    try {
      const result = await parseUpload.mutateAsync({
        fileContent: content,
        fileName: file.name,
        fileType: fileType as 'csv' | 'xlsx' | 'xls',
      })

      setParsedData(result)
      setFieldMapping(result.aiMapping)

      if (result.needsManualMapping) {
        setBulkUploadStep('mapping')
      } else {
        // Auto-proceed to import if AI matched everything
        setBulkUploadStep('mapping')
      }
    } catch (error) {
      console.error('Failed to parse file:', error)
      alert(error instanceof Error ? error.message : 'Failed to parse file')
    }
  }

  const handleBulkImport = async () => {
    if (!parsedData) return

    setBulkUploadStep('importing')

    try {
      const result = await bulkImport.mutateAsync({
        fieldMapping,
        data: parsedData.parsedData,
        headers: parsedData.headers,
      })

      setImportResult(result)
      setBulkUploadStep('complete')
    } catch (error) {
      console.error('Failed to import:', error)
      alert(error instanceof Error ? error.message : 'Failed to import candidates')
      setBulkUploadStep('mapping')
    }
  }

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      setAddMode('single')
      resetBulkUpload()
    }
  }

  useEffect(() => {
    if (addParam === '1' || addParam === 'true') {
      setIsAddDialogOpen(true)
      setAddMode('single')
    }
  }, [addParam])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageActions>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[160px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {(teams || []).map((team) => (
                <SelectItem key={team.id} value={team.name}>
                  {team.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/hiring/candidates/archived" className="flex items-center">
                  <Archive className="mr-2 h-4 w-4" />
                  Archived (Talent Pool)
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageActions>

      {/* Stats Row - Dynamic based on selected team */}
      <div className="flex gap-3 min-w-0">
        {stageCards.map((card) => (
          <Card
            key={card.key}
            className={cn(
              "flex-1 min-w-0 border-0 shadow-sm cursor-pointer transition-all",
              activeFilter === card.key && 'ring-2 ring-primary'
            )}
            onClick={() => setActiveFilter(card.key)}
          >
            <CardContent className="py-4 px-3 flex flex-col items-center justify-center text-center">
                        <div className="text-xs text-muted-foreground truncate">{card.label}</div>
                        <div className="mt-2 text-xl font-bold">{stageCounts[card.key] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            className="pl-9 w-full sm:w-72 lg:w-96"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-[160px] lg:w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score-desc">Score (High to Low)</SelectItem>
              <SelectItem value="score-asc">Score (Low to High)</SelectItem>
              <SelectItem value="date-desc">Date (Newest First)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap" onClick={handleExport}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export{selectedCandidates.length > 0 && ` (${selectedCandidates.length})`}</span>
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 whitespace-nowrap">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Candidate</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Candidates</DialogTitle>
                <DialogDescription>
                  Add a single candidate or bulk upload from a file.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'single' | 'bulk')} className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="single" className="flex-1">Single Candidate</TabsTrigger>
                  <TabsTrigger value="bulk" className="flex-1">Bulk Upload</TabsTrigger>
                </TabsList>

                {/* Single Candidate Tab */}
                <TabsContent value="single" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g. James Okafor"
                        value={newCandidate.name}
                        onChange={(e) => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="e.g. james@example.com"
                        value={newCandidate.email}
                        onChange={(e) => setNewCandidate(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          placeholder="e.g. +234 800 123 4567"
                          value={newCandidate.phone}
                          onChange={(e) => setNewCandidate(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="source">Source</Label>
                        <Select
                          value={newCandidate.source}
                          onValueChange={(value) => setNewCandidate(prev => ({ ...prev, source: value }))}
                        >
                          <SelectTrigger id="source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="careers-page">Careers Page</SelectItem>
                            <SelectItem value="job-board">Job Board</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="linkedin">LinkedIn URL</Label>
                      <Input
                        id="linkedin"
                        placeholder="https://linkedin.com/in/..."
                        value={newCandidate.linkedinUrl}
                        onChange={(e) => setNewCandidate(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        placeholder="Any additional notes..."
                        value={newCandidate.notes}
                        onChange={(e) => setNewCandidate(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleDialogClose(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddCandidate}
                      disabled={!newCandidate.name || !newCandidate.email}
                    >
                      Add Candidate
                    </Button>
                  </DialogFooter>
                </TabsContent>

                {/* Bulk Upload Tab */}
                <TabsContent value="bulk" className="space-y-4">
                  {bulkUploadStep === 'upload' && (
                    <div className="space-y-4">
                      {/* File Upload Area */}
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                          "hover:border-primary hover:bg-muted/50",
                          parseUpload.isPending && "pointer-events-none opacity-50"
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

                      {/* File Info */}
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
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Expected columns:</p>
                        <p>Name*, Email*, Phone, LinkedIn URL, Current Role, Current Company, Location, Notes</p>
                        <p className="mt-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AuntyPelz will automatically match your columns to the expected fields
                        </p>
                      </div>
                    </div>
                  )}

                  {bulkUploadStep === 'mapping' && parsedData && (
                    <div className="space-y-4">
                      {/* Summary */}
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

                      {/* Field Mapping */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Field Mapping</Label>
                        <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                          {parsedData.headers.map((header) => {
                            const confidence = parsedData.confidenceScores[header] || 0
                            const isLowConfidence = confidence > 0 && confidence < 70
                            const isMapped = Boolean(fieldMapping[header])

                            return (
                              <div key={header} className="flex items-center gap-3 p-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{header}</span>
                                    {confidence > 0 && (
                                      <span
                                        className={cn(
                                          "text-xs px-1.5 py-0.5 rounded",
                                          confidence >= 80
                                            ? "bg-success/10 text-success"
                                            : confidence >= 50
                                              ? "bg-warning/10 text-warning"
                                              : "bg-destructive/10 text-destructive"
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
                                    setFieldMapping(prev => ({
                                      ...prev,
                                      [header]: value === '_skip' ? '' : value
                                    }))
                                  }}
                                >
                                  <SelectTrigger className={cn("w-[180px]", isLowConfidence && "border-warning")}>
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

                      {/* Preview */}
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
                            !fieldMapping[Object.keys(fieldMapping).find(k => fieldMapping[k] === 'name') || ''] ||
                            !fieldMapping[Object.keys(fieldMapping).find(k => fieldMapping[k] === 'email') || ''] ||
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
                      {/* Result Summary */}
                      <div className={cn(
                        "flex items-center gap-3 p-4 rounded-lg",
                        importResult.importedCount > 0 ? "bg-success/10" : "bg-warning/10"
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

                      {/* Error Details */}
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
      </div>

      <CandidatesTable
        candidates={candidates}
        total={total}
        selectedCandidates={selectedCandidates}
        onSelectedCandidatesChange={setSelectedCandidates}
        storageKey="hiring.candidates.visibleColumns"
        candidateHref={(candidate) => `/recruiting/candidates/${candidate.id}`}
        renderStage={(candidate) => (
          <Badge variant="secondary" className={stageStyles[candidate.stage || ''] || 'bg-muted text-foreground/80'}>
            {candidate.stageDisplayName || candidate.stage || '—'}
          </Badge>
        )}
        formatApplied={(candidate) => {
          const appliedDate = candidate.appliedAt instanceof Date
            ? candidate.appliedAt
            : new Date(candidate.appliedAt)
          return format(appliedDate, 'MMM d, yyyy')
        }}
        formatUpdated={(candidate) => {
          const updatedDate = candidate.updatedAt instanceof Date
            ? candidate.updatedAt
            : new Date(candidate.updatedAt)
          return formatDistanceToNow(updatedDate, { addSuffix: true })
        }}
        onArchiveCandidate={(id) => updateCandidateStage.mutate({ id, stage: 'ARCHIVED' })}
        onRejectCandidate={(id) => updateCandidateStage.mutate({ id, stage: 'REJECTED' })}
        onBulkArchive={(ids) => bulkUpdateStage.mutate({ candidateIds: ids, stage: 'ARCHIVED' })}
        onBulkReject={(ids) => bulkUpdateStage.mutate({ candidateIds: ids, stage: 'REJECTED' })}
        footer={(
          <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
              Showing 1-{candidates.length} of {total} candidates
            </div>
            <div className="flex gap-2 order-1 sm:order-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button variant="outline" size="sm">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  )
}
