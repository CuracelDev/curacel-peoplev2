'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Download,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Mock data
const candidates = [
  { id: '1', name: 'James Okafor', email: 'james.okafor@email.com', initials: 'JO', color: 'bg-green-500', score: 87, stage: 'panel', applied: 'Dec 16, 2025', updated: '2 hours ago' },
  { id: '2', name: 'Sarah Chen', email: 'sarah.chen@email.com', initials: 'SC', color: 'bg-sky-500', score: 82, stage: 'hr-screen', applied: 'Dec 27, 2025', updated: 'Just now' },
  { id: '3', name: 'Adaeze Nwosu', email: 'adaeze.nwosu@email.com', initials: 'AN', color: 'bg-indigo-500', score: 80, stage: 'technical', applied: 'Dec 18, 2025', updated: '1 day ago' },
  { id: '4', name: 'Amaka Abubakar', email: 'amaka.abubakar@email.com', initials: 'AA', color: 'bg-pink-500', score: 76, stage: 'panel', applied: 'Dec 17, 2025', updated: '3 hours ago' },
  { id: '5', name: 'Kelechi Okonkwo', email: 'kelechi.o@email.com', initials: 'KO', color: 'bg-amber-500', score: 74, stage: 'technical', applied: 'Dec 19, 2025', updated: 'Yesterday' },
  { id: '6', name: 'Tunde Olawale', email: 'tunde.o@email.com', initials: 'TO', color: 'bg-purple-500', score: 71, stage: 'hr-screen', applied: 'Dec 20, 2025', updated: '2 days ago' },
  { id: '7', name: 'Blessing Musa', email: 'blessing.m@email.com', initials: 'BM', color: 'bg-teal-500', score: 68, stage: 'applied', applied: 'Dec 25, 2025', updated: '3 days ago' },
  { id: '8', name: 'David Peters', email: 'david.p@email.com', initials: 'DP', color: 'bg-red-500', score: 55, stage: 'applied', applied: 'Dec 26, 2025', updated: '2 days ago' },
  { id: '9', name: 'John Adams', email: 'john.adams@email.com', initials: 'JA', color: 'bg-gray-500', score: 48, stage: 'applied', applied: 'Dec 27, 2025', updated: '1 day ago' },
]

const stages = [
  { id: 'all', label: 'All', count: 24 },
  { id: 'applied', label: 'Applied', count: 10 },
  { id: 'hr-screen', label: 'HR Screen', count: 6 },
  { id: 'technical', label: 'Technical', count: 5 },
  { id: 'panel', label: 'Panel', count: 3 },
]

function getScoreClass(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-600'
  if (score >= 60) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}

function getStageBadge(stage: string) {
  switch (stage) {
    case 'applied':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Applied</Badge>
    case 'hr-screen':
      return <Badge className="bg-indigo-100 text-indigo-600 hover:bg-indigo-100">HR Screen</Badge>
    case 'technical':
      return <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100">Technical</Badge>
    case 'panel':
      return <Badge className="bg-green-100 text-green-600 hover:bg-green-100">Panel Interview</Badge>
    case 'offer':
      return <Badge className="bg-pink-100 text-pink-600 hover:bg-pink-100">Offer</Badge>
    default:
      return <Badge variant="secondary">{stage}</Badge>
  }
}

export default function CandidatesListPage() {
  const params = useParams()
  const jobId = params.id as string
  const [selectedStage, setSelectedStage] = useState('all')
  const [sortBy, setSortBy] = useState('score-desc')
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  const filteredCandidates = candidates.filter((c) => {
    if (selectedStage === 'all') return true
    return c.stage === selectedStage
  })

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(filteredCandidates.map((c) => c.id))
    }
  }

  return (
    <div className="p-6">
      {/* Job Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">Senior Backend Engineer</h1>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
          </div>
          <p className="text-sm text-gray-500">Engineering &middot; Remote &middot; Posted Dec 15, 2025</p>
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
            <div className="text-[11px] text-gray-500 mt-1">Score Distribution</div>
          </div>
          <div className="text-center pl-4 border-l border-gray-200">
            <div className="text-3xl font-bold text-gray-900">74</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {stages.map((stage) => (
          <Card
            key={stage.id}
            className={cn(
              'p-5 cursor-pointer transition-all',
              selectedStage === stage.id && 'ring-2 ring-indigo-500'
            )}
            onClick={() => setSelectedStage(stage.id)}
          >
            <div className="text-sm text-gray-500 mb-1">{stage.label}</div>
            <div className="text-2xl font-semibold text-gray-900">{stage.count}</div>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={cn(
                'px-4 py-2 rounded text-sm font-medium transition-all',
                selectedStage === stage.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {stage.label} ({stage.count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
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
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Candidates Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Score
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="py-3 px-4 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                    selectedCandidates.includes(candidate.id) && 'bg-indigo-50/50'
                  )}
                >
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleCandidate(candidate.id)
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className={cn('py-4 px-4 text-center font-bold text-base', getScoreClass(candidate.score))}>
                    {candidate.score}
                  </td>
                  <td className="py-4 px-4">
                    <Link href={`/recruiting/candidates/${candidate.id}`} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={cn(candidate.color, 'text-white text-xs')}>
                          {candidate.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{candidate.name}</div>
                        <div className="text-xs text-gray-500">{candidate.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-4 px-4">{getStageBadge(candidate.stage)}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{candidate.applied}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{candidate.updated}</td>
                  <td className="py-4 px-4">
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">Showing 1-9 of 24 candidates</div>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-4">
          <span className="font-medium">{selectedCandidates.length} selected</span>
          <Button size="sm" className="bg-green-500 hover:bg-green-600">
            Advance to Next Stage
          </Button>
          <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-gray-800">
            Reject
          </Button>
          <Button
            variant="ghost"
            size="sm"
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
