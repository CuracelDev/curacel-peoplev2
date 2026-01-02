'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ClipboardCheck, Trash2, ChevronDown, ChevronRight, Pencil, Search, MoreHorizontal, ArrowLeft } from 'lucide-react'
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
import { trpc } from '@/lib/trpc-client'

const stageConfig: Record<string, { label: string; color: string }> = {
  HR_SCREEN: { label: 'HR Screen', color: 'bg-blue-100 text-blue-800' },
  TECHNICAL: { label: 'Technical', color: 'bg-purple-100 text-purple-800' },
  PANEL: { label: 'Panel', color: 'bg-amber-100 text-amber-800' },
  CASE_STUDY: { label: 'Case Study', color: 'bg-success/10 text-success-foreground' },
  CULTURE_FIT: { label: 'Culture Fit', color: 'bg-pink-100 text-pink-800' },
  FINAL: { label: 'Final', color: 'bg-indigo-100 text-indigo-800' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
}

export default function RubricsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')

  const rubricTemplatesQuery = trpc.interviewStage.listTemplates.useQuery()
  const deleteRubricMutation = trpc.interviewStage.deleteTemplate.useMutation({
    onSuccess: () => {
      rubricTemplatesQuery.refetch()
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hiring/settings/interview">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Interview Rubrics</h1>
          <p className="text-sm text-foreground/80">
            Define scoring criteria for each interview stage. Evaluators use these to consistently score candidates.
          </p>
        </div>
        <Link href="/hiring/settings/rubrics/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Rubric
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader className="p-5 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">All Rubrics</h3>
            </div>
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
            <div className="space-y-3">
              {filteredRubrics.map((rubric) => (
                <div
                  key={rubric.id}
                  className="flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all border-border hover:border-indigo-300 hover:bg-indigo-50/50"
                  onClick={() => router.push(`/hiring/settings/rubrics/${rubric.id}`)}
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
                          <Link href={`/hiring/settings/rubrics/${rubric.id}`}>
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
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
