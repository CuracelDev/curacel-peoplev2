'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  Timer,
  Building2,
} from 'lucide-react'

interface Question {
  id: string
  text: string
  type: 'text' | 'multiple_choice' | 'code' | 'essay'
  options?: { id: string; text: string }[]
  maxScore?: number
  required?: boolean
}

interface Assessment {
  id: string
  status: string
  template: {
    id: string
    name: string
    description: string | null
    instructions: string | null
    durationMinutes: number | null
    questions: Question[] | null
  }
  candidate: {
    name: string
    job: {
      title: string
      company: string
    } | null
  }
  startedAt: string | null
  expiresAt: string | null
}

interface Response {
  questionId: string
  response: string
  submittedAt: string
}

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [started, setStarted] = useState(false)

  // Fetch assessment data
  useEffect(() => {
    async function fetchAssessment() {
      try {
        const res = await fetch(`/api/assessment/${token}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to load assessment')
        }
        const data = await res.json()
        setAssessment(data.assessment)

        // Load saved responses from localStorage
        const savedResponses = localStorage.getItem(`assessment_${token}`)
        if (savedResponses) {
          setResponses(JSON.parse(savedResponses))
        }

        // Check if already started
        if (data.assessment.status === 'IN_PROGRESS') {
          setStarted(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAssessment()
  }, [token])

  // Timer countdown
  useEffect(() => {
    if (!started || !assessment?.template.durationMinutes || !assessment.startedAt) {
      return
    }

    const startTime = new Date(assessment.startedAt).getTime()
    const endTime = startTime + assessment.template.durationMinutes * 60 * 1000

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now())
      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleSubmit()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [started, assessment])

  // Auto-save responses
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem(`assessment_${token}`, JSON.stringify(responses))
    }
  }, [responses, token])

  const handleStartAssessment = async () => {
    try {
      const res = await fetch(`/api/assessment/${token}/start`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start assessment')
      }

      const data = await res.json()
      setAssessment(data.assessment)
      setStarted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment')
    }
  }

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return

    setSubmitting(true)

    try {
      // Format responses for submission
      const formattedResponses: Response[] = Object.entries(responses).map(
        ([questionId, response]) => ({
          questionId,
          response,
          submittedAt: new Date().toISOString(),
        })
      )

      const res = await fetch(`/api/assessment/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: formattedResponses }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit assessment')
      }

      // Clear saved responses
      localStorage.removeItem(`assessment_${token}`)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment')
    } finally {
      setSubmitting(false)
    }
  }, [submitting, submitted, responses, token])

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Assessment Not Found</AlertTitle>
              <AlertDescription>
                This assessment link is invalid or has expired.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (assessment.status === 'COMPLETED' || submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Assessment Completed</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for completing the assessment. We will review your responses and get back to you soon.
            </p>
            {assessment.candidate.job && (
              <p className="text-sm text-muted-foreground">
                Position: {assessment.candidate.job.title}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (assessment.expiresAt && new Date(assessment.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertTitle>Assessment Expired</AlertTitle>
              <AlertDescription>
                This assessment has expired. Please contact the recruiter for assistance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show start screen before assessment begins
  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">{assessment.template.name}</CardTitle>
              {assessment.candidate.job && (
                <CardDescription className="flex items-center justify-center gap-2 mt-2">
                  <Building2 className="h-4 w-4" />
                  {assessment.candidate.job.title} at {assessment.candidate.job.company}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground">Welcome, {assessment.candidate.name}</p>
              </div>

              {assessment.template.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p>{assessment.template.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-center">
                {assessment.template.durationMinutes && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <Timer className="h-5 w-5 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Time Limit</p>
                    <p className="font-semibold">{assessment.template.durationMinutes} minutes</p>
                  </div>
                )}
                {assessment.template.questions && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <FileText className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-semibold">{assessment.template.questions.length}</p>
                  </div>
                )}
              </div>

              {assessment.template.instructions && (
                <div>
                  <h3 className="font-medium mb-2">Instructions</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {assessment.template.instructions}
                  </div>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Once you start the assessment, the timer will begin and you must complete it in one session.
                  Your progress is saved automatically.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                size="lg"
                onClick={handleStartAssessment}
              >
                Start Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const questions = assessment.template.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(responses).filter(k => responses[k]).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with timer */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold truncate">{assessment.template.name}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            {timeRemaining !== null && (
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  timeRemaining < 300000 ? 'bg-red-100 text-red-700' : 'bg-gray-100'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          <Progress value={progress} className="mt-2 h-1" />
        </div>
      </div>

      {/* Question content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Question {currentQuestionIndex + 1}</CardTitle>
                {currentQuestion?.required && (
                  <span className="text-xs text-red-500 mt-1">* Required</span>
                )}
              </div>
              {currentQuestion?.maxScore && (
                <span className="text-sm text-muted-foreground">
                  {currentQuestion.maxScore} points
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base whitespace-pre-wrap">{currentQuestion?.text}</p>

            {currentQuestion?.type === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={responses[currentQuestion.id] || ''}
                onValueChange={value => handleResponseChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map(option => (
                  <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {(currentQuestion?.type === 'text' || currentQuestion?.type === 'essay') && (
              <Textarea
                placeholder="Type your answer here..."
                value={responses[currentQuestion.id] || ''}
                onChange={e => handleResponseChange(currentQuestion.id, e.target.value)}
                rows={currentQuestion.type === 'essay' ? 10 : 4}
                className="resize-y"
              />
            )}

            {currentQuestion?.type === 'code' && (
              <Textarea
                placeholder="// Write your code here..."
                value={responses[currentQuestion.id] || ''}
                onChange={e => handleResponseChange(currentQuestion.id, e.target.value)}
                rows={15}
                className="font-mono text-sm resize-y"
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex(i => i + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Assessment
                </>
              )}
            </Button>
          )}
        </div>

        {/* Question navigator */}
        <div className="mt-8">
          <p className="text-sm font-medium mb-3">Question Navigator</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : responses[q.id]
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
