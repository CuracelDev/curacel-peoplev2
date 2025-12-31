'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  Search,
  Download,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { format, formatDistanceToNow } from 'date-fns'

type SortOption = 'score-desc' | 'score-asc' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'

const stageStyles: Record<string, string> = {
  'APPLIED': 'bg-muted text-foreground/80',
  'HR_SCREEN': 'bg-indigo-100 text-indigo-700',
  'TECHNICAL': 'bg-amber-100 text-amber-700',
  'TEAM_CHAT': 'bg-green-100 text-green-700',
  'PANEL': 'bg-green-100 text-green-700',
  'TRIAL': 'bg-blue-100 text-blue-700',
  'CEO_CHAT': 'bg-purple-100 text-purple-700',
  'OFFER': 'bg-pink-100 text-pink-700',
  'HIRED': 'bg-emerald-100 text-emerald-700',
}

function getScoreColor(score: number | null) {
  if (!score) return 'text-muted-foreground bg-muted/50'
  if (score >= 80) return 'text-green-600 bg-green-50'
  if (score >= 65) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function getAvatarColor(name: string) {
  const colors = ['bg-green-500', 'bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500', 'bg-teal-500']
  const index = name.length % colors.length
  return colors[index]
}

export default function CandidatesPage() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('score-desc')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    source: '',
    notes: '',
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

  // Fetch candidates from database
  const { data: candidatesData, isLoading } = trpc.job.getAllCandidates.useQuery({
    stage: stageFilter,
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
    limit: 50,
    offset: 0,
  })

  const candidates = candidatesData?.candidates || []
  const total = candidatesData?.total || 0
  const byStageCounts = candidatesData?.byStageCounts || {}

  // Calculate stage counts
  const stageCounts = {
    all: Object.values(byStageCounts).reduce((sum, s) => sum + s.count, 0),
    applied: byStageCounts['APPLIED']?.count || 0,
    hrScreen: byStageCounts['HR_SCREEN']?.count || 0,
    technical: byStageCounts['TECHNICAL']?.count || 0,
    panel: (byStageCounts['TEAM_CHAT']?.count || 0) + (byStageCounts['PANEL']?.count || 0),
    offer: byStageCounts['OFFER']?.count || 0,
  }

  const toggleCandidate = (id: string) => {
    setSelectedCandidates(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(candidates.map(c => c.id))
    }
  }

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Row - Always fits in 1 row */}
      <div className="flex gap-3 min-w-0">
        <Card className={cn("flex-1 min-w-0 border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'all' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('all')}>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="text-xs text-muted-foreground truncate">All</div>
            <div className="text-xl font-bold">{stageCounts.all}</div>
          </CardContent>
        </Card>
        <Card className={cn("flex-1 min-w-0 border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'applied' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('applied')}>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="text-xs text-muted-foreground truncate">Applied</div>
            <div className="text-xl font-bold">{stageCounts.applied}</div>
          </CardContent>
        </Card>
        <Card className={cn("flex-1 min-w-0 border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'hrScreen' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('hrScreen')}>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="text-xs text-muted-foreground truncate">People Chat</div>
            <div className="text-xl font-bold">{stageCounts.hrScreen}</div>
          </CardContent>
        </Card>
        <Card className={cn("flex-1 min-w-0 border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'technical' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('technical')}>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="text-xs text-muted-foreground truncate">Coding Test</div>
            <div className="text-xl font-bold">{stageCounts.technical}</div>
          </CardContent>
        </Card>
        <Card className={cn("flex-1 min-w-0 border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'panel' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('panel')}>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="text-xs text-muted-foreground truncate">Team Chat</div>
            <div className="text-xl font-bold">{stageCounts.panel}</div>
          </CardContent>
        </Card>
        <Card className={cn("flex-1 min-w-0 border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'offer' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('offer')}>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="text-xs text-muted-foreground truncate">Offer</div>
            <div className="text-xl font-bold">{stageCounts.offer || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              className="pl-9 w-full sm:w-48 lg:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Candidate</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Candidate</DialogTitle>
                <DialogDescription>
                  Add a candidate manually. Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCandidate}
                  disabled={!newCandidate.name || !newCandidate.email}
                >
                  Add Candidate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Candidates Table */}
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-12 py-3 px-4 text-left">
                  <Checkbox
                    checked={selectedCandidates.length === candidates.length && candidates.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="w-16 py-3 px-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Candidate</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Updated</th>
                <th className="w-16 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.length > 0 ? candidates.map((candidate) => {
                const appliedDate = candidate.appliedAt instanceof Date
                  ? candidate.appliedAt
                  : new Date(candidate.appliedAt)
                const updatedDate = candidate.updatedAt instanceof Date
                  ? candidate.updatedAt
                  : new Date(candidate.updatedAt)

                return (
                  <tr
                    key={candidate.id}
                    className={cn(
                      "hover:bg-muted cursor-pointer transition-colors",
                      selectedCandidates.includes(candidate.id) && 'bg-indigo-50/50'
                    )}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedCandidates.includes(candidate.id)}
                        onCheckedChange={() => toggleCandidate(candidate.id)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Link href={`/recruiting/candidates/${candidate.id}`}>
                        <div className={cn(
                          "w-12 h-10 flex items-center justify-center rounded font-bold text-base",
                          getScoreColor(candidate.score)
                        )}>
                          {candidate.score || '-'}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/recruiting/candidates/${candidate.id}`} className="flex items-center gap-3">
                        <Avatar className={cn("h-9 w-9", getAvatarColor(candidate.name))}>
                          <AvatarFallback className={cn("text-white text-xs font-medium", getAvatarColor(candidate.name))}>
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-foreground">{candidate.name}</div>
                          <div className="text-xs text-muted-foreground">{candidate.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/recruiting/candidates/${candidate.id}`}>
                        <Badge variant="secondary" className={stageStyles[candidate.stage] || 'bg-muted text-foreground/80'}>
                          {candidate.stageDisplayName}
                        </Badge>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/recruiting/candidates/${candidate.id}`} className="text-sm text-foreground/80">
                        {format(appliedDate, 'MMM d, yyyy')}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/recruiting/candidates/${candidate.id}`} className="text-sm text-muted-foreground">
                        {formatDistanceToNow(updatedDate, { addSuffix: true })}
                      </Link>
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
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
      </Card>

      {/* Bulk Actions Bar */}
      {selectedCandidates.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gray-900 text-white rounded-lg shadow-lg z-50">
          <span className="font-medium text-sm sm:text-base">{selectedCandidates.length} selected</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
            <span className="hidden sm:inline">Advance to Next Stage</span>
            <span className="sm:hidden">Advance</span>
          </Button>
          <Button size="sm" variant="outline" className="border-gray-600 text-muted-foreground/60 hover:bg-gray-800 text-xs sm:text-sm">
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-white text-xs sm:text-sm"
            onClick={() => setSelectedCandidates([])}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
