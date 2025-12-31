'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Headphones,
  Mail,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Plus,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Users,
  Video,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getInitials } from '@/lib/utils'

// Stage name mapping
const stageNames: Record<string, string> = {
  HR_SCREEN: 'People Chat',
  TEAM_CHAT: 'Team Chat',
  ADVISOR_CHAT: 'Advisor Chat',
  CEO_CHAT: 'CEO Chat',
}

// Mock interview data lookup - matches the interviews list page
const mockInterviewsData: Record<string, {
  id: string
  type: string
  name: string
  candidate: {
    id: string
    name: string
    email: string
    position: string
    avatar: string
  }
  scheduledAt: string
  duration: number
  status: string
  overallScore: number | null
  fireflies: {
    hasRecording: boolean
    meetingId?: string
    duration?: string
    transcriptUrl?: string
    summary?: string
    actionItems?: string[]
    highlights?: { timestamp: string; text: string }[]
  }
  rubricQuestions: {
    id: string
    category: string
    question: string
    weight: number
    guideNotes: string
  }[]
  interviewers: {
    id: string
    name: string
    email: string
    role: string
    avatar: string
    status: string
    submittedAt?: string
    overallRating: number
    recommendation: string
    notes: string
    scores: { questionId: string; score: number; notes: string }[]
    customQuestions: { id: string; question: string; answer: string; score: number }[]
  }[]
  publicLink: string
  publicLinkExpiry: string
}> = {
  'mock-1': {
    id: 'mock-1',
    type: 'HR_SCREEN',
    name: 'People Chat',
    candidate: {
      id: 'cand-1',
      name: 'Oluwaseun Adeyemi',
      email: 'seun.adeyemi@gmail.com',
      position: 'Senior Backend Engineer',
      avatar: 'bg-green-500',
    },
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 45,
    status: 'SCHEDULED',
    overallScore: null,
    fireflies: { hasRecording: false },
    rubricQuestions: [
      { id: 'q1', category: 'Communication', question: 'How well does the candidate communicate their thoughts and experiences?', weight: 1, guideNotes: 'Look for clarity, structure, and ability to articulate complex ideas simply.' },
      { id: 'q2', category: 'Cultural Fit', question: 'Does the candidate align with our company values (PRESS)?', weight: 1, guideNotes: 'Assess passion, relentlessness, empowerment, sense of urgency, and seeing possibilities.' },
      { id: 'q3', category: 'Interest & Motivation', question: 'Why is the candidate interested in this role and Curacel?', weight: 1, guideNotes: 'Look for genuine interest, research done about the company, and career alignment.' },
      { id: 'q4', category: 'Experience Relevance', question: 'How relevant is the candidate\'s past experience to this role?', weight: 2, guideNotes: 'Consider industry, technologies, scale of systems worked on.' },
    ],
    interviewers: [
      { id: 'int-1', name: 'Sarah Chen', email: 'sarah@curacel.co', role: 'People Operations', avatar: 'bg-purple-500', status: 'PENDING', overallRating: 0, recommendation: '', notes: '', scores: [], customQuestions: [] },
    ],
    publicLink: 'https://people.curacel.co/interview/mock-1-token',
    publicLinkExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'mock-2': {
    id: 'mock-2',
    type: 'TEAM_CHAT',
    name: 'Team Chat',
    candidate: {
      id: 'cand-2',
      name: 'Chidinma Okafor',
      email: 'chidinma.okafor@outlook.com',
      position: 'Product Manager',
      avatar: 'bg-blue-500',
    },
    scheduledAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    status: 'SCHEDULED',
    overallScore: null,
    fireflies: { hasRecording: false },
    rubricQuestions: [
      { id: 'q1', category: 'Product Thinking', question: 'How does the candidate approach product problems?', weight: 2, guideNotes: 'Look for structured thinking and user-centric approach.' },
      { id: 'q2', category: 'Technical Understanding', question: 'Does the candidate have sufficient technical knowledge?', weight: 1, guideNotes: 'Assess ability to work with engineering teams.' },
      { id: 'q3', category: 'Communication', question: 'How well does the candidate present their ideas?', weight: 1, guideNotes: 'Look for clarity and persuasiveness.' },
    ],
    interviewers: [
      { id: 'int-2', name: 'David Okonkwo', email: 'david@curacel.co', role: 'Engineering Lead', avatar: 'bg-indigo-500', status: 'PENDING', overallRating: 0, recommendation: '', notes: '', scores: [], customQuestions: [] },
      { id: 'int-3', name: 'Amara Nwosu', email: 'amara@curacel.co', role: 'Product Lead', avatar: 'bg-pink-500', status: 'PENDING', overallRating: 0, recommendation: '', notes: '', scores: [], customQuestions: [] },
    ],
    publicLink: 'https://people.curacel.co/interview/mock-2-token',
    publicLinkExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'mock-3': {
    id: 'mock-3',
    type: 'CEO_CHAT',
    name: 'CEO Chat',
    candidate: {
      id: 'cand-3',
      name: 'Ngozi Uchenna',
      email: 'ngozi.uchenna@yahoo.com',
      position: 'Head of Sales',
      avatar: 'bg-amber-500',
    },
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 30,
    status: 'SCHEDULED',
    overallScore: null,
    fireflies: { hasRecording: false },
    rubricQuestions: [
      { id: 'q1', category: 'Leadership', question: 'How does the candidate approach leadership?', weight: 2, guideNotes: 'Look for vision and ability to inspire.' },
      { id: 'q2', category: 'Strategic Thinking', question: 'Does the candidate think strategically?', weight: 2, guideNotes: 'Assess long-term planning abilities.' },
      { id: 'q3', category: 'Culture Add', question: 'Will this candidate add to our culture?', weight: 1, guideNotes: 'Consider diversity of thought and values alignment.' },
    ],
    interviewers: [
      { id: 'int-4', name: 'Henry Mascot', email: 'henry@curacel.co', role: 'CEO', avatar: 'bg-gray-700', status: 'PENDING', overallRating: 0, recommendation: '', notes: '', scores: [], customQuestions: [] },
    ],
    publicLink: 'https://people.curacel.co/interview/mock-3-token',
    publicLinkExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'mock-4': {
    id: 'mock-4',
    type: 'HR_SCREEN',
    name: 'People Chat',
    candidate: {
      id: 'cand-4',
      name: 'Adaeze Igwe',
      email: 'adaeze.igwe@gmail.com',
      position: 'Product Manager',
      avatar: 'bg-teal-500',
    },
    scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 45,
    status: 'COMPLETED',
    overallScore: 82,
    fireflies: {
      hasRecording: true,
      meetingId: 'fireflies-mock4',
      duration: '42:15',
      transcriptUrl: 'https://app.fireflies.ai/view/mock4',
      summary: 'Adaeze demonstrated excellent communication skills and deep product management experience. She showed strong alignment with Curacel\'s mission to transform insurance in Africa.',
      actionItems: [
        'Schedule Team Chat with Product team',
        'Send product case study assignment',
        'Share company culture deck',
      ],
      highlights: [
        { timestamp: '05:12', text: 'Discussed experience leading product at a fintech startup' },
        { timestamp: '15:30', text: 'Explained approach to user research and data-driven decisions' },
        { timestamp: '28:45', text: 'Talked about cross-functional collaboration' },
        { timestamp: '38:00', text: 'Asked insightful questions about Curacel\'s product roadmap' },
      ],
    },
    rubricQuestions: [
      { id: 'q1', category: 'Communication', question: 'How well does the candidate communicate their thoughts and experiences?', weight: 1, guideNotes: 'Look for clarity, structure, and ability to articulate complex ideas simply.' },
      { id: 'q2', category: 'Cultural Fit', question: 'Does the candidate align with our company values (PRESS)?', weight: 1, guideNotes: 'Assess passion, relentlessness, empowerment, sense of urgency, and seeing possibilities.' },
      { id: 'q3', category: 'Interest & Motivation', question: 'Why is the candidate interested in this role and Curacel?', weight: 1, guideNotes: 'Look for genuine interest, research done about the company, and career alignment.' },
      { id: 'q4', category: 'Experience Relevance', question: 'How relevant is the candidate\'s past experience to this role?', weight: 2, guideNotes: 'Consider industry, technologies, scale of systems worked on.' },
    ],
    interviewers: [
      {
        id: 'int-1',
        name: 'Sarah Chen',
        email: 'sarah@curacel.co',
        role: 'People Operations',
        avatar: 'bg-purple-500',
        status: 'SUBMITTED',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        overallRating: 4,
        recommendation: 'ADVANCE',
        notes: 'Strong candidate with excellent communication skills. Genuine interest in our mission. Great cultural fit.',
        scores: [
          { questionId: 'q1', score: 5, notes: 'Exceptionally clear and articulate. Very structured responses.' },
          { questionId: 'q2', score: 4, notes: 'Strong alignment with PRESS values, especially Passionate and Relentless.' },
          { questionId: 'q3', score: 4, notes: 'Well researched. Specific about why insurance tech excites her.' },
          { questionId: 'q4', score: 4, notes: 'Excellent product management background at fintech companies.' },
        ],
        customQuestions: [
          { id: 'cq1', question: 'What do you know about the insurance industry in Africa?', answer: 'Mentioned the low penetration rates (3%) and opportunity for digital-first solutions to reach underserved populations.', score: 4 },
        ],
      },
    ],
    publicLink: 'https://people.curacel.co/interview/mock-4-token',
    publicLinkExpiry: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
}

// Alias mock-5 to mock-4 for backward compatibility
mockInterviewsData['mock-5'] = mockInterviewsData['mock-4']

// Get interview data by ID, with fallback
const getInterviewData = (interviewId: string) => {
  return mockInterviewsData[interviewId] || mockInterviewsData['mock-4']
}

// Rating scale component
function RatingScale({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null
  onChange?: (value: number) => void
  disabled?: boolean
}) {
  const ratings = [
    { value: 1, label: 'Poor', color: 'bg-red-500' },
    { value: 2, label: 'Below Avg', color: 'bg-orange-500' },
    { value: 3, label: 'Meets', color: 'bg-yellow-500' },
    { value: 4, label: 'Good', color: 'bg-green-400' },
    { value: 5, label: 'Excellent', color: 'bg-green-600' },
  ]

  return (
    <div className="flex gap-2">
      {ratings.map((rating) => (
        <button
          key={rating.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(rating.value)}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all',
            value === rating.value
              ? `${rating.color} text-white shadow-md`
              : 'bg-muted text-muted-foreground hover:bg-muted',
            disabled && 'cursor-default'
          )}
          title={rating.label}
        >
          {rating.value}
        </button>
      ))}
    </div>
  )
}

export default function InterviewDetailPage() {
  const params = useParams()
  const candidateId = params.id as string
  const interviewId = params.interviewId as string

  // Get interview data based on the URL parameter
  const interviewData = getInterviewData(interviewId)

  const [activeTab, setActiveTab] = useState('overview')
  const [expandedInterviewer, setExpandedInterviewer] = useState<string | null>(
    interviewData.interviewers[0]?.id || null
  )
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(interviewData.publicLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSendEmail = async (email: string) => {
    setEmailSending(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setEmailSending(false)
    alert(`Interview link sent to ${email}`)
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/recruiting/candidates/${candidateId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Candidate
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
              <AvatarFallback className={cn(interviewData.candidate.avatar, 'text-white text-base sm:text-lg font-semibold')}>
                {getInitials(interviewData.candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold flex flex-wrap items-center gap-2 sm:gap-3">
                {interviewData.name}
                <Badge
                  className={cn(
                    'text-xs',
                    interviewData.status === 'COMPLETED' && 'bg-green-100 text-green-700',
                    interviewData.status === 'SCHEDULED' && 'bg-blue-100 text-blue-700',
                    interviewData.status === 'IN_PROGRESS' && 'bg-amber-100 text-amber-700'
                  )}
                >
                  {interviewData.status}
                </Badge>
              </h1>
              <div className="text-sm text-muted-foreground mt-1 truncate">
                {interviewData.candidate.name} &bull; {interviewData.candidate.position}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {new Date(interviewData.scheduledAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {interviewData.duration}min
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {interviewData.overallScore && (
              <div className="text-center px-3 sm:px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{interviewData.overallScore}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Score</div>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Summary
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Interviewer Link Card */}
      <Card className="mb-6 bg-indigo-50 border-indigo-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              </div>
              <div>
                <div className="font-semibold text-indigo-900 text-sm sm:text-base">Interviewer Link</div>
                <div className="text-xs sm:text-sm text-indigo-700 hidden sm:block">
                  Share this link with interviewers
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="px-2 sm:px-3 py-1.5 bg-card rounded-lg text-xs sm:text-sm font-mono text-foreground/80 border flex-1 sm:flex-none sm:max-w-xs truncate">
                {interviewData.publicLink}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className={cn('flex-shrink-0', copiedLink && 'bg-green-50 border-green-300 text-green-600')}
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0">
                    <Send className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="p-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Send to interviewers:</div>
                    {interviewData.interviewers.map((interviewer) => (
                      <DropdownMenuItem
                        key={interviewer.id}
                        onClick={() => handleSendEmail(interviewer.email)}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {interviewer.email}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem>
                      <Plus className="h-4 w-4 mr-2" />
                      Add new email...
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="min-w-max">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="questions" className="text-xs sm:text-sm">Questions</TabsTrigger>
            <TabsTrigger value="fireflies" className="text-xs sm:text-sm">
              <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Fireflies</span>
            </TabsTrigger>
            <TabsTrigger value="interviewers" className="text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Interviewers</span> ({interviewData.interviewers.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Score Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Score Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interviewData.rubricQuestions.map((q) => {
                    const avgScore =
                      interviewData.interviewers.reduce((sum, int) => {
                        const score = int.scores.find((s) => s.questionId === q.id)?.score || 0
                        return sum + score
                      }, 0) / interviewData.interviewers.length

                    return (
                      <div key={q.id} className="flex items-center gap-4">
                        <div className="w-40 text-sm font-medium">{q.category}</div>
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                avgScore >= 4 ? 'bg-green-500' : avgScore >= 3 ? 'bg-amber-500' : 'bg-red-500'
                              )}
                              style={{ width: `${(avgScore / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right font-semibold">{avgScore.toFixed(1)}</div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recommendation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {interviewData.interviewers.map((interviewer) => (
                  <div key={interviewer.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn(interviewer.avatar, 'text-white text-xs')}>
                          {getInitials(interviewer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{interviewer.name}</div>
                        <div className="text-xs text-muted-foreground">{interviewer.role}</div>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        interviewer.recommendation === 'STRONG_ADVANCE' && 'bg-green-600',
                        interviewer.recommendation === 'ADVANCE' && 'bg-green-500',
                        interviewer.recommendation === 'HOLD' && 'bg-amber-500',
                        interviewer.recommendation === 'REJECT' && 'bg-red-500'
                      )}
                    >
                      {interviewer.recommendation}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Fireflies Summary */}
            {interviewData.fireflies.hasRecording && (
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mic className="h-4 w-4 text-indigo-600" />
                    Fireflies AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 mb-4">{interviewData.fireflies.summary}</p>
                  <div className="flex gap-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href={interviewData.fireflies.transcriptUrl} target="_blank">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Transcript
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('fireflies')}>
                      <Headphones className="h-4 w-4 mr-2" />
                      Listen to Recording
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Questions & Scores Tab */}
        <TabsContent value="questions" className="mt-6">
          <div className="space-y-4">
            {interviewData.rubricQuestions.map((question, qIdx) => (
              <Card key={question.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">
                        {question.category}
                      </Badge>
                      <h3 className="font-semibold text-lg">{question.question}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{question.guideNotes}</p>
                    </div>
                    {question.weight > 1 && (
                      <Badge className="bg-indigo-100 text-indigo-700">
                        Weight: {question.weight}x
                      </Badge>
                    )}
                  </div>

                  {/* Interviewer scores */}
                  <div className="space-y-3 mt-4 pt-4 border-t">
                    {interviewData.interviewers.map((interviewer) => {
                      const score = interviewer.scores.find((s) => s.questionId === question.id)
                      return (
                        <div key={interviewer.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={cn(interviewer.avatar, 'text-white text-xs')}>
                              {getInitials(interviewer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{interviewer.name}</span>
                              <RatingScale value={score?.score || null} disabled />
                            </div>
                            {score?.notes && (
                              <p className="text-sm text-foreground/80">{score.notes}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Custom Questions */}
            {interviewData.interviewers.some((i) => i.customQuestions.length > 0) && (
              <>
                <div className="flex items-center gap-2 mt-8 mb-4">
                  <div className="h-px flex-1 bg-muted" />
                  <span className="text-sm font-medium text-muted-foreground">Custom Questions</span>
                  <div className="h-px flex-1 bg-muted" />
                </div>

                {interviewData.interviewers.map((interviewer) =>
                  interviewer.customQuestions.map((cq) => (
                    <Card key={cq.id} className="border-dashed">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={cn(interviewer.avatar, 'text-white text-xs')}>
                              {getInitials(interviewer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Added by {interviewer.name}</span>
                              <RatingScale value={cq.score} disabled />
                            </div>
                            <h3 className="font-semibold">{cq.question}</h3>
                            <p className="text-sm text-foreground/80 mt-2">{cq.answer}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Fireflies Tab */}
        <TabsContent value="fireflies" className="mt-6">
          {interviewData.fireflies.hasRecording ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Recording Player */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Headphones className="h-4 w-4" />
                    Recording
                  </CardTitle>
                  <CardDescription>
                    Duration: {interviewData.fireflies.duration}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <Button variant="ghost" size="icon" className="text-white hover:bg-card/10">
                        <Play className="h-8 w-8" />
                      </Button>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-indigo-500 rounded-full" />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>14:05</span>
                      <span>{interviewData.fireflies.duration}</span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Key Moments</h4>
                    <div className="space-y-2">
                      {interviewData.fireflies.highlights.map((highlight, idx) => (
                        <button
                          key={idx}
                          className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted text-left transition-colors"
                        >
                          <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {highlight.timestamp}
                          </Badge>
                          <span className="text-sm">{highlight.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Summary */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/80">{interviewData.fireflies.summary}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {interviewData.fireflies.actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Button variant="outline" className="w-full" asChild>
                  <a href={interviewData.fireflies.transcriptUrl} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Fireflies
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Mic className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recording Available</h3>
                <p className="text-muted-foreground mb-4">
                  Connect Fireflies to automatically record and transcribe interviews.
                </p>
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Fireflies
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Interviewers Tab */}
        <TabsContent value="interviewers" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">
              {interviewData.interviewers.length} Interviewer{interviewData.interviewers.length !== 1 ? 's' : ''}
            </h3>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Interviewer
            </Button>
          </div>

          <div className="space-y-4">
            {interviewData.interviewers.map((interviewer) => (
              <Card key={interviewer.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedInterviewer(
                      expandedInterviewer === interviewer.id ? null : interviewer.id
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={cn(interviewer.avatar, 'text-white')}>
                          {getInitials(interviewer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {interviewer.name}
                          {interviewer.status === 'SUBMITTED' && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              <Check className="h-3 w-3 mr-1" />
                              Submitted
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{interviewer.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-4 w-4',
                                star <= interviewer.overallRating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/40'
                              )}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">Overall Rating</div>
                      </div>
                      <Badge
                        className={cn(
                          interviewer.recommendation === 'STRONG_ADVANCE' && 'bg-green-600',
                          interviewer.recommendation === 'ADVANCE' && 'bg-green-500',
                          interviewer.recommendation === 'HOLD' && 'bg-amber-500',
                          interviewer.recommendation === 'REJECT' && 'bg-red-500'
                        )}
                      >
                        {interviewer.recommendation}
                      </Badge>
                      {expandedInterviewer === interviewer.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {expandedInterviewer === interviewer.id && (
                  <CardContent className="border-t pt-4">
                    {/* Notes */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                      <p className="text-sm">{interviewer.notes}</p>
                    </div>

                    {/* Scores */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Question Scores</h4>
                      <div className="space-y-3">
                        {interviewer.scores.map((score) => {
                          const question = interviewData.rubricQuestions.find(
                            (q) => q.id === score.questionId
                          )
                          return (
                            <div key={score.questionId} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{question?.category}</span>
                                  <RatingScale value={score.score} disabled />
                                </div>
                                <p className="text-sm text-muted-foreground">{question?.question}</p>
                                {score.notes && (
                                  <p className="text-sm text-foreground/80 mt-2 italic">"{score.notes}"</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Custom Questions */}
                    {interviewer.customQuestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Custom Questions Added</h4>
                        <div className="space-y-3">
                          {interviewer.customQuestions.map((cq) => (
                            <div key={cq.id} className="p-3 bg-indigo-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{cq.question}</span>
                                <RatingScale value={cq.score} disabled />
                              </div>
                              <p className="text-sm text-foreground/80">{cq.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Reminder
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
