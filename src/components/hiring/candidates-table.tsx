'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, MoreVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getInitials } from '@/lib/utils'

type ColumnKey = 'location' | 'source' | 'salary' | 'mbti'

type CandidateRow = {
  id: string
  name: string
  score?: number | null
  linkedinUrl?: string | null
  appliedAt: Date | string
  updatedAt: Date | string
  location?: string | null
  source?: string | null
  inboundChannel?: string | null
  outboundChannel?: string | null
  salaryExpMin?: number | null
  salaryExpMax?: number | null
  salaryExpCurrency?: string | null
  mbtiType?: string | null
  stage?: string
  stageDisplayName?: string | null
}

type CandidatesTableProps = {
  candidates: CandidateRow[]
  total: number
  selectedCandidates: string[]
  onSelectedCandidatesChange: (ids: string[]) => void
  storageKey: string
  candidateHref?: (candidate: CandidateRow) => string
  renderStage?: (candidate: CandidateRow) => React.ReactNode
  scoreClassName?: (score: number | null | undefined) => string
  formatApplied?: (candidate: CandidateRow) => string
  formatUpdated?: (candidate: CandidateRow) => string
  onArchiveCandidate?: (id: string) => void
  onRejectCandidate?: (id: string) => void
  onBulkArchive?: (ids: string[]) => void
  onBulkReject?: (ids: string[]) => void
  footer?: React.ReactNode
  bulkActions?: React.ReactNode
}

const sourceLabels: Record<string, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
  RECRUITER: 'Recruiter',
  EXCELLER: 'Exceller',
}

const inboundLabels: Record<string, string> = {
  YC: 'YC',
  PEOPLEOS: 'PeopleOS',
  COMPANY_SITE: 'Company Site',
  OTHER: 'Other',
}

const outboundLabels: Record<string, string> = {
  LINKEDIN: 'LinkedIn',
  JOB_BOARDS: 'Job Boards',
  GITHUB: 'GitHub',
  TWITTER: 'Twitter',
  OTHER: 'Other',
}

const defaultVisibleColumns: Record<ColumnKey, boolean> = {
  location: false,
  source: false,
  salary: false,
  mbti: false,
}

const getAvatarColor = (name: string) => {
  const colors = ['bg-green-500', 'bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500', 'bg-teal-500']
  const index = name.length % colors.length
  return colors[index]
}

const formatSource = (candidate: CandidateRow) => {
  if (!candidate.source) return '—'
  const base = sourceLabels[candidate.source] || candidate.source
  if (candidate.source === 'INBOUND' && candidate.inboundChannel) {
    return `${base} • ${inboundLabels[candidate.inboundChannel] || candidate.inboundChannel}`
  }
  if (candidate.source === 'OUTBOUND' && candidate.outboundChannel) {
    return `${base} • ${outboundLabels[candidate.outboundChannel] || candidate.outboundChannel}`
  }
  return base
}

const formatSalary = (candidate: CandidateRow) => {
  const min = candidate.salaryExpMin ?? null
  const max = candidate.salaryExpMax ?? null
  if (!min && !max) return '—'
  const currency = candidate.salaryExpCurrency || 'USD'
  const formatValue = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
    } catch (error) {
      return `${currency} ${value}`
    }
  }
  if (min && max) return `${formatValue(min)}–${formatValue(max)}`
  if (min) return `From ${formatValue(min)}`
  return `Up to ${formatValue(max as number)}`
}

const defaultScoreClassName = (score: number | null | undefined) => {
  if (!score) return 'text-muted-foreground bg-muted/50'
  if (score >= 80) return 'text-green-600 bg-green-50'
  if (score >= 65) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

const defaultFormatApplied = (candidate: CandidateRow) => {
  const appliedDate = candidate.appliedAt instanceof Date
    ? candidate.appliedAt
    : new Date(candidate.appliedAt)
  return format(appliedDate, 'MMM d, yyyy')
}

const defaultFormatUpdated = (candidate: CandidateRow) => {
  const updatedDate = candidate.updatedAt instanceof Date
    ? candidate.updatedAt
    : new Date(candidate.updatedAt)
  return formatDistanceToNow(updatedDate, { addSuffix: true })
}

export function CandidatesTable({
  candidates,
  total,
  selectedCandidates,
  onSelectedCandidatesChange,
  storageKey,
  candidateHref,
  renderStage,
  scoreClassName = defaultScoreClassName,
  formatApplied = defaultFormatApplied,
  formatUpdated = defaultFormatUpdated,
  onArchiveCandidate,
  onRejectCandidate,
  onBulkArchive,
  onBulkReject,
  footer,
  bulkActions,
}: CandidatesTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(defaultVisibleColumns)
  const [isColumnsLoaded, setIsColumnsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) {
      setIsColumnsLoaded(true)
      return
    }
    try {
      const parsed = JSON.parse(stored) as Partial<Record<ColumnKey, boolean>>
      setVisibleColumns((prev) => ({ ...prev, ...parsed }))
    } catch (error) {
      console.error('Failed to parse column preferences', error)
    } finally {
      setIsColumnsLoaded(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isColumnsLoaded) return
    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns))
  }, [storageKey, visibleColumns, isColumnsLoaded])

  const optionalColumns = useMemo<Array<{ key: ColumnKey; label: string; render: (candidate: CandidateRow) => string }>>(() => ([
    { key: 'location', label: 'Country', render: (candidate: CandidateRow) => candidate.location || '—' },
    { key: 'source', label: 'Source', render: (candidate: CandidateRow) => formatSource(candidate) },
    { key: 'salary', label: 'Salary', render: (candidate: CandidateRow) => formatSalary(candidate) },
    { key: 'mbti', label: 'MBTI', render: (candidate: CandidateRow) => candidate.mbtiType || '—' },
  ]), [])

  const visibleOptionalColumns = optionalColumns.filter((column) => visibleColumns[column.key])
  const hasRowActions = Boolean(onArchiveCandidate || onRejectCandidate)

  const toggleCandidate = (id: string) => {
    if (selectedCandidates.includes(id)) {
      onSelectedCandidatesChange(selectedCandidates.filter((c) => c !== id))
    } else {
      onSelectedCandidatesChange([...selectedCandidates, id])
    }
  }

  const toggleAll = () => {
    if (selectedCandidates.length === candidates.length) {
      onSelectedCandidatesChange([])
    } else {
      onSelectedCandidatesChange(candidates.map((c) => c.id))
    }
  }

  const renderLink = (candidate: CandidateRow, node: React.ReactNode) => {
    if (!candidateHref) return node
    return <Link href={candidateHref(candidate)}>{node}</Link>
  }

  return (
    <div className="space-y-4">
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
                {visibleOptionalColumns.map((column) => (
                  <th
                    key={column.key}
                    className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center justify-between gap-2">
                    <span>Last Updated</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {optionalColumns.map((column) => (
                          <DropdownMenuCheckboxItem
                            key={column.key}
                            checked={visibleColumns[column.key]}
                            onCheckedChange={(checked) => {
                              setVisibleColumns((prev) => ({
                                ...prev,
                                [column.key]: Boolean(checked),
                              }))
                            }}
                          >
                            {column.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.length > 0 ? candidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className={cn(
                    'hover:bg-muted cursor-pointer transition-colors',
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
                    {renderLink(candidate, (
                      <div className={cn(
                        'w-12 h-10 flex items-center justify-center rounded font-bold text-base',
                        scoreClassName(candidate.score)
                      )}>
                        {candidate.score ?? '-'}
                      </div>
                    ))}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {renderLink(candidate, (
                        <Avatar className={cn('h-7 w-7', getAvatarColor(candidate.name))}>
                          <AvatarFallback className={cn('text-white text-[10px] font-medium', getAvatarColor(candidate.name))}>
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      <div className="flex flex-col">
                        {renderLink(candidate, (
                          <span className="font-medium text-foreground">{candidate.name}</span>
                        ))}
                        {candidate.linkedinUrl && (
                          <a
                            href={candidate.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-[#0A66C2] hover:text-[#004182]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="inline-flex h-3 w-3" aria-hidden="true">
                              <svg viewBox="0 0 24 24" role="img" aria-label="" fill="currentColor">
                                <path d="M4.98 3.5C4.98 4.88 3.88 6 2.49 6 1.12 6 0 4.88 0 3.5 0 2.12 1.12 1 2.49 1c1.39 0 2.49 1.12 2.49 2.5zM.5 24h3.99V7.98H.5V24zM8.98 7.98h3.83v2.16h.05c.53-1 1.83-2.16 3.77-2.16 4.03 0 4.77 2.65 4.77 6.1V24h-3.99v-8.62c0-2.06-.03-4.71-2.87-4.71-2.87 0-3.31 2.24-3.31 4.56V24H8.98V7.98z" />
                              </svg>
                            </span>
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {renderStage ? renderStage(candidate) : (
                      <span className="text-sm text-foreground/80">
                        {candidate.stageDisplayName || candidate.stage || '—'}
                      </span>
                    )}
                  </td>
                  {visibleOptionalColumns.map((column) => (
                    <td key={column.key} className="py-3 px-4">
                      <span className="text-sm text-foreground/80">
                        {column.render(candidate)}
                      </span>
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    {renderLink(candidate, (
                      <span className="text-sm text-foreground/80">
                        {formatApplied(candidate)}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      {renderLink(candidate, (
                        <span className="text-sm text-muted-foreground">
                          {formatUpdated(candidate)}
                        </span>
                      ))}
                      {hasRowActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onArchiveCandidate && (
                              <DropdownMenuItem onClick={() => onArchiveCandidate(candidate.id)}>
                                Archive
                              </DropdownMenuItem>
                            )}
                            {onRejectCandidate && (
                              <DropdownMenuItem onClick={() => onRejectCandidate(candidate.id)}>
                                Reject
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6 + visibleOptionalColumns.length} className="py-8 text-center text-muted-foreground">
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {footer ? (
          <div className="border-t border-border">
            {footer}
          </div>
        ) : null}
      </Card>

      {selectedCandidates.length > 0 && (onBulkArchive || onBulkReject) && (
        <div className="fixed bottom-4 sm:bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gray-900 text-white rounded-lg shadow-lg z-50">
          <span className="font-medium text-sm sm:text-base">{selectedCandidates.length} selected</span>
          {bulkActions}
          {onBulkReject && (
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-muted-foreground/60 hover:bg-gray-800 text-xs sm:text-sm"
              onClick={() => onBulkReject(selectedCandidates)}
            >
              Reject
            </Button>
          )}
          {onBulkArchive && (
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-muted-foreground/60 hover:bg-gray-800 text-xs sm:text-sm"
              onClick={() => onBulkArchive(selectedCandidates)}
            >
              Archive
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-white text-xs sm:text-sm"
            onClick={() => onSelectedCandidatesChange([])}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
