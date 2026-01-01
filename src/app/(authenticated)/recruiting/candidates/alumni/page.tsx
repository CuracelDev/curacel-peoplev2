'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Search, GraduationCap, RotateCcw, Loader2 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { cn, getInitials } from '@/lib/utils'
import { toast } from 'sonner'

function getAvatarColor(name: string) {
  const colors = ['bg-green-500', 'bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500', 'bg-teal-500']
  const index = name.length % colors.length
  return colors[index]
}

function getScoreColor(score: number | null) {
  if (!score) return 'text-muted-foreground bg-muted/50'
  if (score >= 80) return 'text-green-600 bg-green-50'
  if (score >= 65) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export default function AlumniCandidatesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = trpc.job.getAllCandidates.useQuery({
    stage: 'ALUMNI',
    search: search || undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 50,
    offset: 0,
  })

  const utils = trpc.useUtils()
  const updateStageMutation = trpc.job.updateCandidateStage.useMutation({
    onSuccess: () => {
      toast.success('Candidate restored to Applied stage')
      utils.job.getAllCandidates.invalidate()
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to restore candidate')
    },
  })

  const handleRestore = (candidateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    updateStageMutation.mutate({
      candidateId,
      stage: 'APPLIED',
    })
  }

  const candidates = data?.candidates || []
  const total = data?.total || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/recruiting/candidates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Alumni (Talent Pool)</h1>
          <p className="text-sm text-muted-foreground">
            Past candidates who may be a good fit for future roles
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alumni candidates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alumni List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {total} Alumni Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No alumni candidates found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="w-16 py-3 px-2 text-center text-xs font-medium text-muted-foreground">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Candidate</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Job Applied</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Added to Alumni</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => {
                    const updatedDate = candidate.updatedAt instanceof Date
                      ? candidate.updatedAt
                      : new Date(candidate.updatedAt)

                    return (
                      <tr
                        key={candidate.id}
                        className="border-b hover:bg-muted cursor-pointer"
                        onClick={() => router.push(`/recruiting/candidates/${candidate.id}`)}
                      >
                        <td className="py-3 px-2">
                          <div className={cn(
                            "w-12 h-10 flex items-center justify-center rounded font-bold text-base mx-auto",
                            getScoreColor(candidate.score)
                          )}>
                            {candidate.score || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className={cn("h-9 w-9", getAvatarColor(candidate.name))}>
                              <AvatarFallback className={cn("text-white text-xs font-medium", getAvatarColor(candidate.name))}>
                                {getInitials(candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{candidate.name}</p>
                              <p className="text-sm text-muted-foreground">{candidate.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{candidate.job?.title || '-'}</p>
                            <p className="text-sm text-muted-foreground">{candidate.job?.department || ''}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatDistanceToNow(updatedDate, { addSuffix: true })}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleRestore(candidate.id, e)}
                            disabled={updateStageMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
