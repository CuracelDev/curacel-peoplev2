'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2, Plus, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'

interface Outcome {
  name: string
  description: string
  successCriteria: string[]
}

export default function ScorecardPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const { data: job, isLoading: jobLoading } = trpc.job.get.useQuery({ id: jobId })
  const { data: scorecard, isLoading: scorecardLoading, refetch } = trpc.scorecard.get.useQuery({ jobId })

  const createScorecard = trpc.scorecard.create.useMutation({
    onSuccess: () => {
      toast.success('Scorecard created successfully')
      refetch()
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateScorecard = trpc.scorecard.update.useMutation({
    onSuccess: () => {
      toast.success('Scorecard updated successfully')
      refetch()
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const generateScorecard = trpc.scorecard.generateFromJobDescription.useMutation({
    onSuccess: (data) => {
      setMission(data.mission)
      setOutcomes(data.outcomes)
      toast.success('Scorecard generated successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const [isEditing, setIsEditing] = useState(false)
  const [mission, setMission] = useState('')
  const [outcomes, setOutcomes] = useState<Outcome[]>([
    { name: '', description: '', successCriteria: [''] },
  ])

  // Initialize form when scorecard loads
  useState(() => {
    if (scorecard) {
      setMission(scorecard.mission)
      setOutcomes(scorecard.outcomes as unknown as Outcome[])
    }
  })

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, { name: '', description: '', successCriteria: [''] }])
  }

  const handleRemoveOutcome = (index: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== index))
  }

  const handleOutcomeChange = (index: number, field: keyof Outcome, value: string) => {
    const newOutcomes = [...outcomes]
    if (field === 'successCriteria') {
      // This shouldn't happen via this handler
      return
    }
    newOutcomes[index] = { ...newOutcomes[index], [field]: value }
    setOutcomes(newOutcomes)
  }

  const handleAddSuccessCriteria = (outcomeIndex: number) => {
    const newOutcomes = [...outcomes]
    newOutcomes[outcomeIndex].successCriteria.push('')
    setOutcomes(newOutcomes)
  }

  const handleRemoveSuccessCriteria = (outcomeIndex: number, criteriaIndex: number) => {
    const newOutcomes = [...outcomes]
    newOutcomes[outcomeIndex].successCriteria = newOutcomes[outcomeIndex].successCriteria.filter(
      (_, i) => i !== criteriaIndex
    )
    setOutcomes(newOutcomes)
  }

  const handleSuccessCriteriaChange = (outcomeIndex: number, criteriaIndex: number, value: string) => {
    const newOutcomes = [...outcomes]
    newOutcomes[outcomeIndex].successCriteria[criteriaIndex] = value
    setOutcomes(newOutcomes)
  }

  const handleSave = () => {
    if (!mission.trim()) {
      toast.error('Mission statement is required')
      return
    }

    const validOutcomes = outcomes.filter(o => o.name.trim() && o.description.trim())
    if (validOutcomes.length === 0) {
      toast.error('At least one outcome is required')
      return
    }

    if (scorecard) {
      updateScorecard.mutate({
        id: scorecard.id,
        mission,
        outcomes: validOutcomes,
      })
    } else {
      createScorecard.mutate({
        jobId,
        mission,
        outcomes: validOutcomes,
      })
    }
  }

  const handleGenerate = () => {
    generateScorecard.mutate({ jobId })
  }

  const handleEdit = () => {
    if (scorecard) {
      setMission(scorecard.mission)
      setOutcomes(scorecard.outcomes as unknown as Outcome[])
    }
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (scorecard) {
      setMission(scorecard.mission)
      setOutcomes(scorecard.outcomes as unknown as Outcome[])
    }
    setIsEditing(false)
  }

  if (jobLoading || scorecardLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6">
        <p>Job not found</p>
      </div>
    )
  }

  const showForm = isEditing || !scorecard

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/hiring/positions/${jobId}/edit`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{job.title} - Scorecard</h1>
            <p className="text-sm text-muted-foreground">
              Define the mission and key outcomes for this role
            </p>
          </div>
        </div>

        {!showForm && (
          <Button onClick={handleEdit}>Edit Scorecard</Button>
        )}
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 py-4">
          <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Reference: A-Player Hiring Scorecard
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Learn more about creating effective scorecards with mission statements and outcomes
            </p>
            <a
              href="https://coda.io/@hlamex/copy-of-victors-a-player-hiring-guide/1-scorecard-9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
            >
              View Full Guide →
            </a>
          </div>
        </CardContent>
      </Card>

      {showForm ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mission Statement</CardTitle>
                  <CardDescription>
                    A clear, concise statement describing what this role needs to accomplish
                  </CardDescription>
                </div>
                {!scorecard && (
                  <Button
                    onClick={handleGenerate}
                    disabled={generateScorecard.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {generateScorecard.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                rows={3}
                placeholder="e.g., Build and lead a high-performing sales team that consistently exceeds revenue targets while developing scalable processes and fostering a culture of excellence."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Outcomes</CardTitle>
                  <CardDescription>
                    3-5 measurable objectives with specific success criteria
                  </CardDescription>
                </div>
                <Button onClick={handleAddOutcome} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Outcome
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {outcomes.map((outcome, outcomeIndex) => (
                <div key={outcomeIndex} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">Outcome {outcomeIndex + 1}</h4>
                    {outcomes.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOutcome(outcomeIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`outcome-name-${outcomeIndex}`}>Name</Label>
                    <Input
                      id={`outcome-name-${outcomeIndex}`}
                      value={outcome.name}
                      onChange={(e) => handleOutcomeChange(outcomeIndex, 'name', e.target.value)}
                      placeholder="e.g., Revenue Growth"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`outcome-description-${outcomeIndex}`}>Description</Label>
                    <Textarea
                      id={`outcome-description-${outcomeIndex}`}
                      value={outcome.description}
                      onChange={(e) => handleOutcomeChange(outcomeIndex, 'description', e.target.value)}
                      rows={2}
                      placeholder="e.g., Drive consistent revenue growth through strategic sales initiatives"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Success Criteria</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddSuccessCriteria(outcomeIndex)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {outcome.successCriteria.map((criteria, criteriaIndex) => (
                        <div key={criteriaIndex} className="flex gap-2">
                          <Input
                            value={criteria}
                            onChange={(e) =>
                              handleSuccessCriteriaChange(outcomeIndex, criteriaIndex, e.target.value)
                            }
                            placeholder="e.g., Achieve 120% of quarterly revenue target"
                          />
                          {outcome.successCriteria.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSuccessCriteria(outcomeIndex, criteriaIndex)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {scorecard && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={createScorecard.isPending || updateScorecard.isPending}
            >
              {createScorecard.isPending || updateScorecard.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Scorecard'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mission Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80">{scorecard.mission}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(scorecard.outcomes as unknown as Outcome[]).map((outcome, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 space-y-2">
                  <h4 className="font-medium">{outcome.name}</h4>
                  <p className="text-sm text-foreground/70">{outcome.description}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Success Criteria:</p>
                    <ul className="list-disc list-inside text-sm text-foreground/70 space-y-1">
                      {outcome.successCriteria.map((criteria, criteriaIndex) => (
                        <li key={criteriaIndex}>{criteria}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
