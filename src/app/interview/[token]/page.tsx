'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Headphones,
  Linkedin,
  Loader2,
  Mail,
  MessageSquare,
  Mic,
  Plus,
  Save,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  FileText,
  Building2,
  Briefcase,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn, getInitials } from '@/lib/utils'

// Mock interview data that would come from the token
const interviewData = {
  id: 'int-panel',
  type: 'PANEL',
  name: 'Panel Interview',
  company: 'Curacel',
  position: 'Senior Backend Engineer',

  candidate: {
    id: '1',
    name: 'James Okafor',
    email: 'james.okafor@email.com',
    phone: '+234 802 345 6789',
    linkedinUrl: 'linkedin.com/in/jamesokafor',
    currentRole: 'Senior Backend Engineer (Tech Lead)',
    currentCompany: 'Paystack',
    yearsOfExperience: 6,
    location: 'Lagos, Nigeria',
    avatar: 'bg-green-500',
    resumeUrl: '/resume/james-okafor.pdf',
  },

  scheduledAt: '2025-12-27T14:00:00Z',
  duration: 60,

  interviewer: {
    id: 'interviewer-alice',
    name: 'Alice Katheu',
    email: 'alice@curacel.co',
    role: 'VP of Engineering',
  },

  // Other interviewers in panel
  panelMembers: [
    { id: 'int-kabiru', name: 'Kabiru Awulu', role: 'CTO', status: 'PENDING' },
    { id: 'int-tunde', name: 'Tunde Ogunleye', role: 'Product Lead', status: 'SUBMITTED' },
  ],

  // Rubric questions for Panel Interview
  rubricQuestions: [
    {
      id: 'pq1',
      category: 'Leadership & Management',
      question: 'How does the candidate approach team leadership and management?',
      guideNotes: 'Ask about their experience leading teams, handling conflicts, and making decisions.',
      suggestedQuestions: [
        'Tell me about a time you had to lead a team through a difficult project.',
        'How do you handle disagreements within your team?',
        'Describe your approach to delegating tasks.',
      ],
    },
    {
      id: 'pq2',
      category: 'Strategic Thinking',
      question: 'Can the candidate think strategically about technical decisions?',
      guideNotes: 'Evaluate their ability to balance short-term needs with long-term goals.',
      suggestedQuestions: [
        'How do you decide between building vs. buying a solution?',
        'Describe a technical decision that had significant business impact.',
        'How do you prioritize technical debt?',
      ],
    },
    {
      id: 'pq3',
      category: 'Cultural Alignment',
      question: 'How well does the candidate align with our PRESS values?',
      guideNotes: 'Passionate, Relentless, Empowered, Sense of Urgency, Seeing Possibilities',
      suggestedQuestions: [
        'What drives you in your work?',
        'Tell me about a time you went above and beyond.',
        'How do you handle setbacks?',
      ],
    },
    {
      id: 'pq4',
      category: 'Growth Mindset',
      question: 'Does the candidate demonstrate continuous learning and growth?',
      guideNotes: 'Look for examples of self-improvement, learning from failures, seeking feedback.',
      suggestedQuestions: [
        'What have you learned recently that excited you?',
        'Tell me about a failure and what you learned from it.',
        'How do you stay current with technology trends?',
      ],
    },
    {
      id: 'pq5',
      category: 'Collaboration',
      question: 'How effectively can the candidate collaborate across teams?',
      guideNotes: 'Assess experience working with product, design, and other engineering teams.',
      suggestedQuestions: [
        'Describe your experience working with non-technical stakeholders.',
        'How do you handle conflicting priorities from different teams?',
        'Give an example of a successful cross-functional project.',
      ],
    },
  ],

  // Fireflies
  fireflies: {
    hasRecording: false,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
  },

  // Previous interview notes (for context)
  previousInterviews: [
    {
      stage: 'HR Screen',
      score: 78,
      summary: 'Strong communication skills and genuine interest. Salary expectations slightly above budget.',
    },
    {
      stage: 'Technical Interview',
      score: 88,
      summary: 'Excellent system design skills. Deep understanding of distributed systems.',
    },
  ],
}

// Rating descriptions
const ratingDescriptions = [
  { value: 1, label: 'Poor', description: 'Does not meet requirements', color: 'bg-red-500' },
  { value: 2, label: 'Below Average', description: 'Partially meets requirements', color: 'bg-orange-500' },
  { value: 3, label: 'Satisfactory', description: 'Meets requirements', color: 'bg-yellow-500' },
  { value: 4, label: 'Good', description: 'Exceeds some requirements', color: 'bg-green-400' },
  { value: 5, label: 'Excellent', description: 'Exceeds requirements', color: 'bg-green-600' },
]

export default function PublicInterviewPage() {
  const params = useParams()
  const token = params.token as string

  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [overallRating, setOverallRating] = useState<number | null>(null)
  const [recommendation, setRecommendation] = useState<string>('')
  const [overallNotes, setOverallNotes] = useState('')
  const [customQuestions, setCustomQuestions] = useState<
    Array<{ id: string; question: string; answer: string; score: number | null }>
  >([])
  const [newQuestion, setNewQuestion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(interviewData.rubricQuestions[0]?.id)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const handleScoreChange = (questionId: string, score: number) => {
    setScores((prev) => ({ ...prev, [questionId]: score }))
  }

  const handleNotesChange = (questionId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleAddCustomQuestion = () => {
    if (!newQuestion.trim()) return
    setCustomQuestions((prev) => [
      ...prev,
      { id: `cq-${Date.now()}`, question: newQuestion, answer: '', score: null },
    ])
    setNewQuestion('')
  }

  const handleCustomQuestionChange = (id: string, field: 'answer' | 'score', value: string | number | null) => {
    setCustomQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    )
  }

  const handleRemoveCustomQuestion = (id: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setLastSaved(new Date())
  }

  const handleSubmit = async () => {
    // Validate
    const missingScores = interviewData.rubricQuestions.filter((q) => !scores[q.id])
    if (missingScores.length > 0) {
      alert('Please score all questions before submitting.')
      return
    }
    if (!overallRating) {
      alert('Please provide an overall rating.')
      return
    }
    if (!recommendation) {
      alert('Please select a recommendation.')
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Evaluation Submitted!</h1>
            <p className="text-foreground/80 mb-6">
              Thank you for completing your interview evaluation for {interviewData.candidate.name}.
              Your feedback has been recorded.
            </p>
            <p className="text-sm text-muted-foreground">
              You can close this window now.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {interviewData.company}
              </div>
              <h1 className="text-lg sm:text-xl font-bold">{interviewData.name}</h1>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Interviewer: {interviewData.interviewer.name}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {lastSaved && (
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                  Saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving} className="text-xs sm:text-sm">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Save Draft</span>
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="text-xs sm:text-sm">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Submit</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Candidate Card */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className={cn(interviewData.candidate.avatar, 'text-white text-xl font-semibold')}>
                      {getInitials(interviewData.candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{interviewData.candidate.name}</h2>
                    <div className="text-foreground/80">
                      {interviewData.candidate.currentRole} at {interviewData.candidate.currentCompany}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {interviewData.candidate.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {interviewData.candidate.yearsOfExperience} years experience
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://${interviewData.candidate.linkedinUrl}`} target="_blank">
                          <Linkedin className="h-4 w-4 mr-1" />
                          LinkedIn
                        </a>
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        View Resume
                      </Button>
                    </div>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700">
                    {interviewData.position}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Previous Interviews Summary */}
            {interviewData.previousInterviews.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Previous Interview Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {interviewData.previousInterviews.map((interview, idx) => (
                      <div key={idx} className="flex-1 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{interview.stage}</span>
                          <Badge
                            className={cn(
                              interview.score >= 80 ? 'bg-green-500' : 'bg-amber-500'
                            )}
                          >
                            {interview.score}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{interview.summary}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rating Scale Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rating Scale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                  {ratingDescriptions.map((rating) => (
                    <div key={rating.value} className="text-center">
                      <div
                        className={cn(
                          'w-full h-8 sm:h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base mb-1',
                          rating.color
                        )}
                      >
                        {rating.value}
                      </div>
                      <div className="text-[10px] sm:text-xs font-medium">{rating.label}</div>
                      <div className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">{rating.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Interview Questions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Interview Questions</h3>

              {interviewData.rubricQuestions.map((question, qIdx) => (
                <Card key={question.id} className={cn(scores[question.id] && 'border-green-200 bg-green-50/30')}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedQuestion(expandedQuestion === question.id ? null : question.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                            scores[question.id]
                              ? 'bg-green-500 text-white'
                              : 'bg-muted text-foreground/80'
                          )}
                        >
                          {scores[question.id] ? <Check className="h-4 w-4" /> : qIdx + 1}
                        </div>
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {question.category}
                          </Badge>
                          <h4 className="font-semibold">{question.question}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scores[question.id] && (
                          <Badge
                            className={cn(
                              scores[question.id] >= 4
                                ? 'bg-green-500'
                                : scores[question.id] >= 3
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            )}
                          >
                            Score: {scores[question.id]}/5
                          </Badge>
                        )}
                        {expandedQuestion === question.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedQuestion === question.id && (
                    <CardContent className="border-t pt-4">
                      {/* Guide Notes */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-blue-900">Guide Notes</div>
                            <p className="text-sm text-blue-700">{question.guideNotes}</p>
                          </div>
                        </div>
                      </div>

                      {/* Suggested Questions */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Suggested Questions to Ask:</div>
                        <ul className="space-y-1">
                          {question.suggestedQuestions.map((sq, sqIdx) => (
                            <li key={sqIdx} className="flex items-start gap-2 text-sm">
                              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                              {sq}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Score Input */}
                      <div className="mb-4">
                        <Label className="text-sm font-medium mb-2 block">Your Score *</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleScoreChange(question.id, score)}
                              className={cn(
                                'flex-1 h-12 rounded-lg font-bold text-lg transition-all',
                                scores[question.id] === score
                                  ? ratingDescriptions[score - 1].color + ' text-white shadow-md'
                                  : 'bg-muted text-muted-foreground hover:bg-muted'
                              )}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Notes (Candidate's response and your observations)
                        </Label>
                        <Textarea
                          placeholder="Document the candidate's response and your observations..."
                          value={notes[question.id] || ''}
                          onChange={(e) => handleNotesChange(question.id, e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}

              {/* Custom Questions */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Custom Questions (Optional)</h3>
                </div>

                {customQuestions.map((cq) => (
                  <Card key={cq.id} className="mb-4 border-dashed">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <Input
                          value={cq.question}
                          onChange={(e) =>
                            setCustomQuestions((prev) =>
                              prev.map((q) =>
                                q.id === cq.id ? { ...q, question: e.target.value } : q
                              )
                            )
                          }
                          placeholder="Your custom question"
                          className="font-medium border-0 p-0 focus-visible:ring-0 text-base"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveCustomQuestion(cq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mb-3">
                        <Label className="text-sm font-medium mb-2 block">Score</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleCustomQuestionChange(cq.id, 'score', score)}
                              className={cn(
                                'w-10 h-10 rounded-lg font-bold transition-all',
                                cq.score === score
                                  ? ratingDescriptions[score - 1].color + ' text-white shadow-md'
                                  : 'bg-muted text-muted-foreground hover:bg-muted'
                              )}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Textarea
                        placeholder="Candidate's response..."
                        value={cq.answer}
                        onChange={(e) => handleCustomQuestionChange(cq.id, 'answer', e.target.value)}
                        className="min-h-[80px]"
                      />
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a custom question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomQuestion()}
                  />
                  <Button variant="outline" onClick={handleAddCustomQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Overall Evaluation */}
              <Card className="mt-8 border-2 border-indigo-200">
                <CardHeader>
                  <CardTitle>Overall Evaluation</CardTitle>
                  <CardDescription>
                    Provide your final assessment and recommendation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Rating */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Overall Rating *</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setOverallRating(rating)}
                          className={cn(
                            'p-2 sm:p-4 rounded-lg border-2 transition-all text-center',
                            overallRating === rating
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-border hover:border-border'
                          )}
                        >
                          <div className="flex justify-center mb-1 sm:mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  'h-3 w-3 sm:h-5 sm:w-5',
                                  star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
                                )}
                              />
                            ))}
                          </div>
                          <div className="text-xs sm:text-sm font-medium">
                            {ratingDescriptions[rating - 1].label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Recommendation *</Label>
                    <RadioGroup
                      value={recommendation}
                      onValueChange={setRecommendation}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
                    >
                      <Label
                        htmlFor="strong-hire"
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                          recommendation === 'STRONG_HIRE'
                            ? 'border-green-500 bg-green-50'
                            : 'border-border hover:border-border'
                        )}
                      >
                        <RadioGroupItem value="STRONG_HIRE" id="strong-hire" />
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Strong Hire</span>
                        </div>
                      </Label>
                      <Label
                        htmlFor="hire"
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                          recommendation === 'HIRE'
                            ? 'border-green-400 bg-green-50'
                            : 'border-border hover:border-border'
                        )}
                      >
                        <RadioGroupItem value="HIRE" id="hire" />
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Hire</span>
                        </div>
                      </Label>
                      <Label
                        htmlFor="hold"
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                          recommendation === 'HOLD'
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-border hover:border-border'
                        )}
                      >
                        <RadioGroupItem value="HOLD" id="hold" />
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                          <span className="font-medium">Hold / Need More Info</span>
                        </div>
                      </Label>
                      <Label
                        htmlFor="no-hire"
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                          recommendation === 'NO_HIRE'
                            ? 'border-red-500 bg-red-50'
                            : 'border-border hover:border-border'
                        )}
                      >
                        <RadioGroupItem value="NO_HIRE" id="no-hire" />
                        <div className="flex items-center gap-2">
                          <ThumbsDown className="h-5 w-5 text-red-500" />
                          <span className="font-medium">No Hire</span>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  {/* Overall Notes */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Summary Notes
                    </Label>
                    <Textarea
                      placeholder="Provide your overall assessment, key strengths, concerns, and reasoning for your recommendation..."
                      value={overallNotes}
                      onChange={(e) => setOverallNotes(e.target.value)}
                      className="min-h-[120px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Interview Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Interview Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="font-medium">
                    {new Date(interviewData.scheduledAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{interviewData.duration} minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{interviewData.type.replace('_', ' ')}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Panel Members */}
            {interviewData.panelMembers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Panel Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {interviewData.panelMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-foreground/80 text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          member.status === 'SUBMITTED' && 'text-green-600 border-green-300',
                          member.status === 'PENDING' && 'text-muted-foreground'
                        )}
                      >
                        {member.status === 'SUBMITTED' ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : null}
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Fireflies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Fireflies Recording
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interviewData.fireflies.hasRecording ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={interviewData.fireflies.meetingLink} target="_blank">
                      <Headphones className="h-4 w-4 mr-2" />
                      Listen to Recording
                    </a>
                  </Button>
                ) : (
                  <div className="text-center py-4">
                    <Mic className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Recording will be available after the interview
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={interviewData.fireflies.meetingLink} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Join Meeting
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Questions Scored</span>
                    <span className="font-medium">
                      {Object.keys(scores).length} / {interviewData.rubricQuestions.length}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${(Object.keys(scores).length / interviewData.rubricQuestions.length) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {Object.keys(scores).length === interviewData.rubricQuestions.length ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">All questions scored</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-600">
                          {interviewData.rubricQuestions.length - Object.keys(scores).length} remaining
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
