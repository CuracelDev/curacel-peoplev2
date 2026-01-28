'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Loader2, RotateCcw, ExternalLink } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { format, formatDistanceToNow } from 'date-fns'

function getScoreColor(score: number | null) {
  if (!score) return 'text-muted-foreground bg-muted/50'
  if (score >= 80) return 'text-success bg-success/10'
  if (score >= 65) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function getAvatarColor(name: string) {
  const colors = ['bg-green-500', 'bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500', 'bg-teal-500']
  const index = name.length % colors.length
  return colors[index]
}

export default function ArchivedCandidatesPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: candidatesData, isLoading } = trpc.job.getAllCandidates.useQuery({
    stage: 'ARCHIVED',
    search: searchQuery || undefined,
    sortBy: 'appliedAt',
    sortOrder: 'desc',
    limit: 100,
    offset: 0,
  })

  const updateStage = trpc.job.updateCandidate.useMutation({
    onSuccess: () => {
      // Refetch candidates after update
      window.location.reload()
    },
  })

  const candidates = candidatesData?.candidates || []
  const total = candidatesData?.total || 0

  const handleRestore = async (candidateId: string) => {
    if (confirm('Restore this candidate to the active pipeline?')) {
      await updateStage.mutateAsync({
        id: candidateId,
        stage: 'APPLIED',
      })
    }
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hiring/candidates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Candidates
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search archived candidates..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {total} archived candidate{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Candidates List */}
      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-16 py-3 px-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Candidate</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Job</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Archived</th>
                <th className="w-32 py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
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
                    className="hover:bg-muted transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className={cn(
                        "w-12 h-10 flex items-center justify-center rounded font-bold text-base",
                        getScoreColor(candidate.score)
                      )}>
                        {candidate.score || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/recruiting/candidates/${candidate.id}`} className="flex items-center gap-2">
                        <Avatar className={cn("h-7 w-7", getAvatarColor(candidate.name))}>
                          <AvatarFallback className={cn("text-white text-[10px] font-medium", getAvatarColor(candidate.name))}>
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{candidate.name}</span>
                          {candidate.email && (
                            candidate.linkedinUrl ? (
                              <a
                                href={candidate.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {candidate.email}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">{candidate.email}</span>
                            )
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-foreground/80">{candidate.job?.title || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-foreground/80">
                        {format(appliedDate, 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(updatedDate, { addSuffix: true })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(candidate.id)}
                        disabled={updateStage.isPending}
                        className="gap-2"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No archived candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
