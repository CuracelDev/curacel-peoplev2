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
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

// Mock data for candidates
const mockCandidates = [
  { id: '1', name: 'James Okafor', email: 'james.okafor@email.com', score: 87, stage: 'Panel Interview', stageType: 'panel', appliedDate: 'Dec 16, 2025', appliedTimestamp: new Date('2025-12-16'), lastUpdated: '2 hours ago', color: 'bg-green-500' },
  { id: '2', name: 'Sarah Chen', email: 'sarah.chen@email.com', score: 82, stage: 'HR Screen', stageType: 'hr-screen', appliedDate: 'Dec 27, 2025', appliedTimestamp: new Date('2025-12-27'), lastUpdated: 'Just now', color: 'bg-sky-500' },
  { id: '3', name: 'Adaeze Nwosu', email: 'adaeze.nwosu@email.com', score: 80, stage: 'Technical', stageType: 'technical', appliedDate: 'Dec 18, 2025', appliedTimestamp: new Date('2025-12-18'), lastUpdated: '1 day ago', color: 'bg-indigo-500' },
  { id: '4', name: 'Amaka Abubakar', email: 'amaka.abubakar@email.com', score: 76, stage: 'Panel Interview', stageType: 'panel', appliedDate: 'Dec 17, 2025', appliedTimestamp: new Date('2025-12-17'), lastUpdated: '3 hours ago', color: 'bg-pink-500' },
  { id: '5', name: 'Kelechi Okonkwo', email: 'kelechi.o@email.com', score: 74, stage: 'Technical', stageType: 'technical', appliedDate: 'Dec 19, 2025', appliedTimestamp: new Date('2025-12-19'), lastUpdated: 'Yesterday', color: 'bg-amber-500' },
  { id: '6', name: 'Tunde Olawale', email: 'tunde.o@email.com', score: 71, stage: 'HR Screen', stageType: 'hr-screen', appliedDate: 'Dec 20, 2025', appliedTimestamp: new Date('2025-12-20'), lastUpdated: '2 days ago', color: 'bg-violet-500' },
  { id: '7', name: 'Blessing Musa', email: 'blessing.m@email.com', score: 68, stage: 'Applied', stageType: 'applied', appliedDate: 'Dec 25, 2025', appliedTimestamp: new Date('2025-12-25'), lastUpdated: '3 days ago', color: 'bg-teal-500' },
  { id: '8', name: 'David Peters', email: 'david.p@email.com', score: 55, stage: 'Applied', stageType: 'applied', appliedDate: 'Dec 26, 2025', appliedTimestamp: new Date('2025-12-26'), lastUpdated: '2 days ago', color: 'bg-red-500' },
  { id: '9', name: 'John Adams', email: 'john.adams@email.com', score: 48, stage: 'Applied', stageType: 'applied', appliedDate: 'Dec 27, 2025', appliedTimestamp: new Date('2025-12-27'), lastUpdated: '1 day ago', color: 'bg-gray-500' },
]

const stageCounts = {
  all: 24,
  applied: 10,
  hrScreen: 6,
  technical: 5,
  panel: 3,
}

type SortOption = 'score-desc' | 'score-asc' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'

const stageStyles: Record<string, string> = {
  'applied': 'bg-gray-100 text-gray-600',
  'hr-screen': 'bg-indigo-100 text-indigo-700',
  'technical': 'bg-amber-100 text-amber-700',
  'panel': 'bg-green-100 text-green-700',
  'offer': 'bg-pink-100 text-pink-700',
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600 bg-green-50'
  if (score >= 65) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
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

  const toggleCandidate = (id: string) => {
    setSelectedCandidates(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedCandidates.length === mockCandidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(mockCandidates.map(c => c.id))
    }
  }

  const filteredCandidates = useMemo(() => {
    let candidates = mockCandidates.filter(candidate => {
      const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchQuery.toLowerCase())

      if (activeFilter === 'all') return matchesSearch
      if (activeFilter === 'applied') return matchesSearch && candidate.stageType === 'applied'
      if (activeFilter === 'hrScreen') return matchesSearch && candidate.stageType === 'hr-screen'
      if (activeFilter === 'technical') return matchesSearch && candidate.stageType === 'technical'
      if (activeFilter === 'panel') return matchesSearch && candidate.stageType === 'panel'
      return matchesSearch
    })

    // Apply sorting
    switch (sortOption) {
      case 'score-desc':
        candidates.sort((a, b) => b.score - a.score)
        break
      case 'score-asc':
        candidates.sort((a, b) => a.score - b.score)
        break
      case 'date-desc':
        candidates.sort((a, b) => b.appliedTimestamp.getTime() - a.appliedTimestamp.getTime())
        break
      case 'date-asc':
        candidates.sort((a, b) => a.appliedTimestamp.getTime() - b.appliedTimestamp.getTime())
        break
      case 'name-asc':
        candidates.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        candidates.sort((a, b) => b.name.localeCompare(a.name))
        break
    }

    return candidates
  }, [searchQuery, activeFilter, sortOption])

  const handleExport = () => {
    const candidatesToExport = selectedCandidates.length > 0
      ? filteredCandidates.filter(c => selectedCandidates.includes(c.id))
      : filteredCandidates

    const csvContent = [
      ['Name', 'Email', 'Score', 'Stage', 'Applied Date'].join(','),
      ...candidatesToExport.map(c =>
        [c.name, c.email, c.score, c.stage, c.appliedDate].join(',')
      ),
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

  return (
    <div className="space-y-6">
      {/* Stats Row - Grid on mobile, flex on larger screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'all' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('all')}>
          <CardContent className="pt-3 pb-3 px-3 lg:pt-4 lg:pb-4 lg:px-4">
            <div className="text-xs sm:text-sm text-gray-500 truncate">All Candidates</div>
            <div className="text-xl sm:text-2xl font-bold">{stageCounts.all}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'applied' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('applied')}>
          <CardContent className="pt-3 pb-3 px-3 lg:pt-4 lg:pb-4 lg:px-4">
            <div className="text-xs sm:text-sm text-gray-500 truncate">Applied</div>
            <div className="text-xl sm:text-2xl font-bold">{stageCounts.applied}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'hrScreen' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('hrScreen')}>
          <CardContent className="pt-3 pb-3 px-3 lg:pt-4 lg:pb-4 lg:px-4">
            <div className="text-xs sm:text-sm text-gray-500 truncate">HR Screen</div>
            <div className="text-xl sm:text-2xl font-bold">{stageCounts.hrScreen}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'technical' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('technical')}>
          <CardContent className="pt-3 pb-3 px-3 lg:pt-4 lg:pb-4 lg:px-4">
            <div className="text-xs sm:text-sm text-gray-500 truncate">Technical</div>
            <div className="text-xl sm:text-2xl font-bold">{stageCounts.technical}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all col-span-2 sm:col-span-1", activeFilter === 'panel' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('panel')}>
          <CardContent className="pt-3 pb-3 px-3 lg:pt-4 lg:pb-4 lg:px-4">
            <div className="text-xs sm:text-sm text-gray-500 truncate">Panel</div>
            <div className="text-xl sm:text-2xl font-bold">{stageCounts.panel}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Filter tabs - horizontally scrollable on mobile */}
        <div className="overflow-x-auto -mx-3 px-3 lg:mx-0 lg:px-0">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg min-w-max">
            <button
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                activeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setActiveFilter('all')}
            >
              All ({stageCounts.all})
            </button>
            <button
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                activeFilter === 'applied' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setActiveFilter('applied')}
            >
              Applied ({stageCounts.applied})
            </button>
            <button
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                activeFilter === 'hrScreen' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setActiveFilter('hrScreen')}
            >
              HR Screen ({stageCounts.hrScreen})
            </button>
            <button
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                activeFilter === 'technical' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setActiveFilter('technical')}
            >
              Technical ({stageCounts.technical})
            </button>
            <button
              className={cn(
                "px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                activeFilter === 'panel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setActiveFilter('panel')}
            >
              Panel ({stageCounts.panel})
            </button>
          </div>
        </div>
        {/* Search and Actions - stack on mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:ml-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
      </div>

      {/* Candidates Table */}
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-12 py-3 px-4 text-left">
                  <Checkbox
                    checked={selectedCandidates.length === mockCandidates.length && mockCandidates.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="w-16 py-3 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="w-16 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className={cn(
                    "hover:bg-gray-50 cursor-pointer transition-colors",
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
                        {candidate.score}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/recruiting/candidates/${candidate.id}`} className="flex items-center gap-3">
                      <Avatar className={cn("h-9 w-9", candidate.color)}>
                        <AvatarFallback className={cn("text-white text-xs font-medium", candidate.color)}>
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{candidate.name}</div>
                        <div className="text-xs text-gray-500">{candidate.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/recruiting/candidates/${candidate.id}`}>
                      <Badge variant="secondary" className={stageStyles[candidate.stageType]}>
                        {candidate.stage}
                      </Badge>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/recruiting/candidates/${candidate.id}`} className="text-sm text-gray-600">
                      {candidate.appliedDate}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/recruiting/candidates/${candidate.id}`} className="text-sm text-gray-500">
                      {candidate.lastUpdated}
                    </Link>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
            Showing 1-{filteredCandidates.length} of {stageCounts.all} candidates
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
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs sm:text-sm">
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white text-xs sm:text-sm"
            onClick={() => setSelectedCandidates([])}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
