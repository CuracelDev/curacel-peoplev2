'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, GripVertical, X, ClipboardCheck, Users, Briefcase, UserCheck, Building2, Target, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'

type Criteria = {
  id?: string
  name: string
  description: string
  weight: number
}

const stageOptions = [
  { value: 'HR_SCREEN', label: 'HR Screen', icon: Users, description: 'Initial screening with HR team' },
  { value: 'TECHNICAL', label: 'Technical', icon: Target, description: 'Technical skills assessment' },
  { value: 'PANEL', label: 'Panel', icon: Building2, description: 'Interview with multiple stakeholders' },
  { value: 'CASE_STUDY', label: 'Case Study', icon: FileText, description: 'Problem-solving and presentation' },
  { value: 'CULTURE_FIT', label: 'Culture Fit', icon: UserCheck, description: 'Team and culture alignment' },
  { value: 'FINAL', label: 'Final', icon: Briefcase, description: 'Final decision-making round' },
  { value: 'OTHER', label: 'Other', icon: ClipboardCheck, description: 'Custom interview stage' },
]

export default function EditRubricPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [rubricName, setRubricName] = useState('')
  const [rubricDescription, setRubricDescription] = useState('')
  const [rubricStage, setRubricStage] = useState<string>('')
  const [rubricCriteria, setRubricCriteria] = useState<Criteria[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const rubricQuery = trpc.interviewStage.getTemplate.useQuery({ id }, { enabled: !!id })

  const updateRubricMutation = trpc.interviewStage.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success('Rubric updated successfully')
      router.push('/recruiting/settings/rubrics')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update rubric')
    },
  })

  // Load rubric data
  useEffect(() => {
    if (rubricQuery.data && !isLoaded) {
      const rubric = rubricQuery.data
      setRubricName(rubric.name)
      setRubricDescription(rubric.description || '')
      setRubricStage(rubric.stage)
      setRubricCriteria(
        rubric.criteria.map((c: { id: string; name: string; description?: string | null; weight: number }) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          weight: c.weight,
        }))
      )
      setIsLoaded(true)
    }
  }, [rubricQuery.data, isLoaded])

  const addCriteria = () => {
    setRubricCriteria([
      ...rubricCriteria,
      { name: '', description: '', weight: 3 },
    ])
  }

  const updateCriteria = (index: number, updates: Partial<Criteria>) => {
    setRubricCriteria(
      rubricCriteria.map((c, i) => (i === index ? { ...c, ...updates } : c))
    )
  }

  const removeCriteria = (index: number) => {
    setRubricCriteria(rubricCriteria.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!rubricName || !rubricStage) {
      toast.error('Please fill in all required fields')
      return
    }

    updateRubricMutation.mutate({
      id,
      name: rubricName,
      description: rubricDescription || undefined,
      stage: rubricStage as 'HR_SCREEN' | 'TECHNICAL' | 'PANEL' | 'CASE_STUDY' | 'CULTURE_FIT' | 'FINAL' | 'OTHER',
      criteria: rubricCriteria.filter(c => c.name).map((c) => ({
        name: c.name,
        description: c.description || undefined,
        weight: c.weight,
      })),
    })
  }

  if (rubricQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rubricQuery.error) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Failed to load rubric</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/recruiting/settings/rubrics">Back to Rubrics</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/recruiting/settings/rubrics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Edit Interview Rubric</h1>
          <p className="text-muted-foreground">Update scoring criteria for consistent candidate evaluation</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/recruiting/settings/rubrics">Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={!rubricName || !rubricStage || updateRubricMutation.isPending}
        >
          {updateRubricMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Interview Stage Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Stage</CardTitle>
          <CardDescription>Select which interview stage this rubric is for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stageOptions.map((stage) => (
              <button
                key={stage.value}
                type="button"
                onClick={() => setRubricStage(stage.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  rubricStage === stage.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-border hover:border-indigo-300 hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  rubricStage === stage.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-muted text-muted-foreground'
                )}>
                  <stage.icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  'font-medium text-sm',
                  rubricStage === stage.value ? 'text-indigo-600' : 'text-foreground'
                )}>
                  {stage.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Provide details about this rubric</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rubric Name *</Label>
            <Input
              value={rubricName}
              onChange={(e) => setRubricName(e.target.value)}
              placeholder="e.g., Technical Assessment Rubric"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={rubricDescription}
              onChange={(e) => setRubricDescription(e.target.value)}
              placeholder="Optional description of what this rubric evaluates"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scoring Criteria */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scoring Criteria</CardTitle>
              <CardDescription>Define what evaluators should score during the interview</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addCriteria}>
              <Plus className="h-4 w-4 mr-2" />
              Add Criteria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rubricCriteria.map((c, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/30">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0 cursor-grab" />
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-[1fr_120px] gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Criteria Name *</Label>
                      <Input
                        value={c.name}
                        onChange={(e) => updateCriteria(index, { name: e.target.value })}
                        placeholder="e.g., Problem Solving"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Weight (1-5)</Label>
                      <Select
                        value={c.weight.toString()}
                        onValueChange={(v) => updateCriteria(index, { weight: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((w) => (
                            <SelectItem key={w} value={w.toString()}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={c.description}
                      onChange={(e) => updateCriteria(index, { description: e.target.value })}
                      placeholder="Describe what to look for when evaluating this criteria"
                      rows={2}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCriteria(index)}
                  className="text-muted-foreground hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {rubricCriteria.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">No criteria yet</p>
                <p className="text-sm mt-1">Click &quot;Add Criteria&quot; to define what evaluators should score.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scoring Guide Preview */}
      {rubricCriteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scoring Guide</CardTitle>
            <CardDescription>How evaluators will rate each criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {[
                { score: 1, label: 'Poor', description: 'No evidence', color: 'text-red-600' },
                { score: 2, label: 'Below Average', description: 'Limited evidence', color: 'text-orange-600' },
                { score: 3, label: 'Average', description: 'Meets expectations', color: 'text-amber-600' },
                { score: 4, label: 'Above Average', description: 'Exceeds expectations', color: 'text-emerald-600' },
                { score: 5, label: 'Excellent', description: 'Strong evidence', color: 'text-green-600' },
              ].map((item) => (
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
