'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  { id: '1', name: 'James Okafor', email: 'james.okafor@email.com', score: 87, stage: 'Panel Interview', stageType: 'panel', appliedDate: 'Dec 16, 2025', lastUpdated: '2 hours ago', color: 'bg-green-500' },
  { id: '2', name: 'Sarah Chen', email: 'sarah.chen@email.com', score: 82, stage: 'HR Screen', stageType: 'hr-screen', appliedDate: 'Dec 27, 2025', lastUpdated: 'Just now', color: 'bg-sky-500' },
  { id: '3', name: 'Adaeze Nwosu', email: 'adaeze.nwosu@email.com', score: 80, stage: 'Technical', stageType: 'technical', appliedDate: 'Dec 18, 2025', lastUpdated: '1 day ago', color: 'bg-indigo-500' },
  { id: '4', name: 'Amaka Abubakar', email: 'amaka.abubakar@email.com', score: 76, stage: 'Panel Interview', stageType: 'panel', appliedDate: 'Dec 17, 2025', lastUpdated: '3 hours ago', color: 'bg-pink-500' },
  { id: '5', name: 'Kelechi Okonkwo', email: 'kelechi.o@email.com', score: 74, stage: 'Technical', stageType: 'technical', appliedDate: 'Dec 19, 2025', lastUpdated: 'Yesterday', color: 'bg-amber-500' },
  { id: '6', name: 'Tunde Olawale', email: 'tunde.o@email.com', score: 71, stage: 'HR Screen', stageType: 'hr-screen', appliedDate: 'Dec 20, 2025', lastUpdated: '2 days ago', color: 'bg-violet-500' },
  { id: '7', name: 'Blessing Musa', email: 'blessing.m@email.com', score: 68, stage: 'Applied', stageType: 'applied', appliedDate: 'Dec 25, 2025', lastUpdated: '3 days ago', color: 'bg-teal-500' },
  { id: '8', name: 'David Peters', email: 'david.p@email.com', score: 55, stage: 'Applied', stageType: 'applied', appliedDate: 'Dec 26, 2025', lastUpdated: '2 days ago', color: 'bg-red-500' },
  { id: '9', name: 'John Adams', email: 'john.adams@email.com', score: 48, stage: 'Applied', stageType: 'applied', appliedDate: 'Dec 27, 2025', lastUpdated: '1 day ago', color: 'bg-gray-500' },
]

const stageCounts = {
  all: 24,
  applied: 10,
  hrScreen: 6,
  technical: 5,
  panel: 3,
}

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

  const filteredCandidates = mockCandidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeFilter === 'all') return matchesSearch
    if (activeFilter === 'applied') return matchesSearch && candidate.stageType === 'applied'
    if (activeFilter === 'hrScreen') return matchesSearch && candidate.stageType === 'hr-screen'
    if (activeFilter === 'technical') return matchesSearch && candidate.stageType === 'technical'
    if (activeFilter === 'panel') return matchesSearch && candidate.stageType === 'panel'
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">All Candidates</h1>
            <Badge variant="secondary" className="bg-green-100 text-green-700">Active Pipeline</Badge>
          </div>
          <p className="text-gray-500">Manage and review all candidates across positions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-4 border-l border-gray-200">
            <div className="text-2xl font-bold text-gray-900">74</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'all' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('all')}>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-gray-500">All Candidates</div>
            <div className="text-2xl font-bold">{stageCounts.all}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'applied' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('applied')}>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-gray-500">Applied</div>
            <div className="text-2xl font-bold">{stageCounts.applied}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'hrScreen' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('hrScreen')}>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-gray-500">HR Screen</div>
            <div className="text-2xl font-bold">{stageCounts.hrScreen}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'technical' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('technical')}>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-gray-500">Technical</div>
            <div className="text-2xl font-bold">{stageCounts.technical}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-sm cursor-pointer transition-all", activeFilter === 'panel' && 'ring-2 ring-primary')} onClick={() => setActiveFilter('panel')}>
          <CardContent className="pt-4 pb-4">
            <div className="text-sm text-gray-500">Panel</div>
            <div className="text-2xl font-bold">{stageCounts.panel}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
            onClick={() => setActiveFilter('all')}
          >
            All ({stageCounts.all})
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeFilter === 'applied' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
            onClick={() => setActiveFilter('applied')}
          >
            Applied ({stageCounts.applied})
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeFilter === 'hrScreen' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
            onClick={() => setActiveFilter('hrScreen')}
          >
            HR Screen ({stageCounts.hrScreen})
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeFilter === 'technical' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
            onClick={() => setActiveFilter('technical')}
          >
            Technical ({stageCounts.technical})
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeFilter === 'panel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
            onClick={() => setActiveFilter('panel')}
          >
            Panel ({stageCounts.panel})
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search candidates..."
              className="pl-9 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="text-sm border rounded-lg px-3 py-2 bg-white">
            <option>Sort by: Score (High to Low)</option>
            <option>Sort by: Score (Low to High)</option>
            <option>Sort by: Applied Date</option>
            <option>Sort by: Name</option>
          </select>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Candidate
          </Button>
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
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing 1-{filteredCandidates.length} of {stageCounts.all} candidates
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedCandidates.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-lg z-50">
          <span className="font-medium">{selectedCandidates.length} selected</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            Advance to Next Stage
          </Button>
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={() => setSelectedCandidates([])}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
