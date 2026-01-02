'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Pencil, ClipboardCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'

const scoreScaleLabels = [
  { score: 1, label: 'Poor', description: 'No evidence', color: 'text-red-600' },
  { score: 2, label: 'Below Average', description: 'Limited evidence', color: 'text-orange-600' },
  { score: 3, label: 'Average', description: 'Meets expectations', color: 'text-amber-600' },
  { score: 4, label: 'Above Average', description: 'Exceeds expectations', color: 'text-emerald-600' },
  { score: 5, label: 'Excellent', description: 'Strong evidence', color: 'text-success' },
]

export default function ViewRubricPage() {
  const params = useParams()
  const id = params.id as string

  const rubricQuery = trpc.interviewStage.getTemplate.useQuery({ id }, { enabled: !!id })
  const interviewTypesQuery = trpc.interviewType.list.useQuery()
  const rubric = rubricQuery.data
  const interviewTypes = interviewTypesQuery.data || []

  // Find the interview type that matches the rubric's stage slug
  const interviewType = interviewTypes.find(t => t.slug === rubric?.stage)

  if (rubricQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rubricQuery.error || !rubric) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Failed to load rubric</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/hiring/settings/rubrics">Back to Rubrics</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hiring/settings/rubrics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{rubric.name}</h1>
            <Badge className="bg-indigo-100 text-indigo-800">
              {interviewType?.name || rubric.stage.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          </div>
          {rubric.description && (
            <p className="text-muted-foreground mt-1">{rubric.description}</p>
          )}
        </div>
        <Button asChild>
          <Link href={`/hiring/settings/rubrics/${id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Rubric
          </Link>
        </Button>
      </div>

      {/* Scoring Criteria */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Criteria</CardTitle>
          <CardDescription>
            {rubric.criteria.length} criteria defined for evaluators to score
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rubric.criteria.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No criteria defined</p>
              <p className="text-sm mt-1">Edit this rubric to add scoring criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rubric.criteria.map((criteria, index) => (
                <div
                  key={criteria.id}
                  className="p-4 border border-border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}.
                        </span>
                        <h4 className="font-semibold">{criteria.name}</h4>
                        <Badge variant="outline">Weight: {criteria.weight}</Badge>
                      </div>
                      {criteria.description && (
                        <p className="text-sm text-muted-foreground mt-2 ml-5">
                          {criteria.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Guide */}
      {rubric.criteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scoring Guide</CardTitle>
            <CardDescription>How evaluators rate each criteria during interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {scoreScaleLabels.map((item) => (
                <div key={item.score} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className={cn('text-2xl font-bold mb-1', item.color)}>{item.score}</div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
