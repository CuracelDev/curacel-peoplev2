'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ClipboardCheck, Trash2, ChevronDown, ChevronUp, Pencil, Search, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'

const stageConfig: Record<string, { label: string; color: string }> = {
  HR_SCREEN: { label: 'HR Screen', color: 'bg-blue-100 text-blue-800' },
  TECHNICAL: { label: 'Technical', color: 'bg-purple-100 text-purple-800' },
  PANEL: { label: 'Panel', color: 'bg-amber-100 text-amber-800' },
  CASE_STUDY: { label: 'Case Study', color: 'bg-green-100 text-green-800' },
  CULTURE_FIT: { label: 'Culture Fit', color: 'bg-pink-100 text-pink-800' },
  FINAL: { label: 'Final', color: 'bg-indigo-100 text-indigo-800' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
}

const scoreScaleLabels: Record<number, string> = {
  1: 'Poor - No evidence',
  2: 'Below Average - Limited evidence',
  3: 'Average - Meets expectations',
  4: 'Above Average - Exceeds expectations',
  5: 'Excellent - Strong evidence',
}

export default function RubricsPage() {
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null)
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')

  const rubricTemplatesQuery = trpc.interviewStage.listTemplates.useQuery()
  const deleteRubricMutation = trpc.interviewStage.deleteTemplate.useMutation({
    onSuccess: () => {
      rubricTemplatesQuery.refetch()
      setSelectedRubricId(null)
    },
  })

  const rubrics = rubricTemplatesQuery.data || []

  // Filter rubrics
  const filteredRubrics = rubrics.filter((rubric) => {
    const matchesSearch = !searchQuery ||
      rubric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rubric.description && rubric.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStage = stageFilter === 'all' || rubric.stage === stageFilter
    return matchesSearch && matchesStage
  })

  const selectedRubric = rubrics.find((r) => r.id === selectedRubricId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-5 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Interview Rubrics</h2>
              <p className="text-sm text-muted-foreground">
                Define scoring criteria for each interview stage. Evaluators use these to consistently score candidates.
              </p>
            </div>
            <Link href="/recruiting/settings/rubrics/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Rubric
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rubrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {stageFilter === 'all' ? 'All Stages' : stageConfig[stageFilter]?.label || stageFilter}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStageFilter('all')}>
                  All Stages
                </DropdownMenuItem>
                {Object.entries(stageConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => setStageFilter(key)}>
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {rubricTemplatesQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredRubrics.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              <p>No interview rubrics yet. Create your first rubric to standardize candidate evaluation.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filteredRubrics.map((rubric) => (
                  <div
                    key={rubric.id}
                    className={cn(
                      'flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all',
                      selectedRubricId === rubric.id
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-border hover:border-border'
                    )}
                    onClick={() => setSelectedRubricId(selectedRubricId === rubric.id ? null : rubric.id)}
                  >
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{rubric.name}</span>
                        <Badge className={stageConfig[rubric.stage]?.color || 'bg-gray-100 text-gray-800'}>
                          {stageConfig[rubric.stage]?.label || rubric.stage.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rubric.criteria.length} criteria
                        {rubric.description && ` • ${rubric.description}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/recruiting/settings/rubrics/${rubric.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Delete this rubric?')) {
                                deleteRubricMutation.mutate({ id: rubric.id })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {selectedRubricId === rubric.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rubric Criteria Preview */}
              {selectedRubric && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="font-semibold mb-4">Scoring Criteria: {selectedRubric.name}</h3>
                  <div className="space-y-3">
                    {selectedRubric.criteria.map((criteria) => (
                      <div
                        key={criteria.id}
                        className="border border-border rounded-lg overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted"
                          onClick={() => setExpandedCriteria(expandedCriteria === criteria.id ? null : criteria.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{criteria.name}</span>
                              <Badge variant="outline">Weight: {criteria.weight}</Badge>
                            </div>
                            {criteria.description && (
                              <p className="text-sm text-muted-foreground mt-1">{criteria.description}</p>
                            )}
                          </div>
                          {expandedCriteria === criteria.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        {expandedCriteria === criteria.id && (
                          <div className="bg-muted/50 p-4 border-t">
                            <div className="text-sm font-medium mb-3">Scoring Scale</div>
                            <div className="grid grid-cols-5 gap-2">
                              {Object.entries(scoreScaleLabels).map(([score, label]) => (
                                <div key={score} className="text-center p-2 bg-card rounded-lg border border-border">
                                  <div className={cn(
                                    'text-lg font-bold mb-1',
                                    parseInt(score) >= 4 ? 'text-green-600' :
                                    parseInt(score) >= 3 ? 'text-amber-600' : 'text-red-600'
                                  )}>
                                    {score}
                                  </div>
                                  <div className="text-xs text-muted-foreground leading-tight">{label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedRubric.criteria.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        No criteria yet. Edit the rubric to add scoring criteria.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
