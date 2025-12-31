'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Save,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  FileText,
  Upload,
  Search,
  Star,
  HelpCircle,
  Check,
  Pause,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Mock data
const stageInfo = {
  name: 'Panel Interview',
  stageNumber: 5,
  totalStages: 6,
  candidateName: 'James Okafor',
  date: 'December 28, 2025 at 2:00 PM',
  duration: '45 minutes',
  interviewers: ['Henry Mascot', 'Fola Adeleke', 'Chidi Kalu'],
  score: 90,
  scoreChange: '+2 from Technical Interview',
}

const transcriptEntries = [
  {
    speaker: 'Henry Mascot',
    role: 'Interviewer',
    text: "Thanks for joining us today, James. We've reviewed your background and are excited to learn more about your experience. Let's start with your time at Paystack. Can you tell us about a particularly challenging technical problem you solved there?",
    timestamp: '0:00',
  },
  {
    speaker: 'James Okafor',
    role: 'Candidate',
    text: 'Thank you for having me. At Paystack, one of the most challenging problems I tackled was redesigning our payment reconciliation system. We were processing millions of transactions daily, and the existing batch processing approach was causing delays of up to 6 hours in some cases. I led a team of 4 engineers to build a real-time event-driven architecture using Kafka. We reduced reconciliation time to under 5 minutes and improved accuracy from 99.2% to 99.98%.',
    timestamp: '0:45',
  },
  {
    speaker: 'Fola Adeleke',
    role: 'Interviewer',
    text: "That's impressive. Can you walk us through the technical decisions you made? Why Kafka over other message queuing systems?",
    timestamp: '2:15',
  },
  {
    speaker: 'James Okafor',
    role: 'Candidate',
    text: "We evaluated RabbitMQ and AWS SQS as alternatives. Kafka was chosen for three main reasons: First, we needed the ability to replay events for debugging and recovery - Kafka's log-based architecture was perfect for this. Second, the throughput requirements were significant - we needed to handle 50,000+ events per second during peak times. Third, we wanted to build a platform that other teams could consume events from, and Kafka's topic-based pub/sub model made this easy.",
    timestamp: '2:30',
  },
  {
    speaker: 'Chidi Kalu',
    role: 'Interviewer',
    text: 'How did you handle failures and ensure data consistency across the distributed system?',
    timestamp: '4:00',
  },
  {
    speaker: 'James Okafor',
    role: 'Candidate',
    text: 'Great question. We implemented a saga pattern with compensating transactions. Each step in the reconciliation process writes to both the event log and a state store. If any step fails, we can either retry with exponential backoff or trigger compensating actions. We also built a dead letter queue for events that fail repeatedly, with alerting and manual intervention workflows. For data consistency, we used idempotency keys and implemented exactly-once semantics using Kafka transactions.',
    timestamp: '4:15',
  },
]

const rubricItems = [
  { name: 'Technical Depth', score: 5 },
  { name: 'System Design', score: 5 },
  { name: 'Communication', score: 4 },
  { name: 'Leadership', score: 4 },
  { name: 'Culture Fit', score: 5 },
]

const suggestedQuestions = [
  'How did you approach testing the Kafka-based reconciliation system? What testing strategies ensured reliability?',
  'Tell me about a time you had to make a technical decision with incomplete information. How did you handle the ambiguity?',
  'How do you approach mentoring junior engineers? Can you share a specific example?',
]

type Recommendation = 'advance' | 'hold' | 'reject' | null

export default function InterviewStagePage() {
  const params = useParams()
  const candidateId = params.id as string
  const stageId = params.stageId as string

  const [rubricScores, setRubricScores] = useState<Record<string, number>>(
    Object.fromEntries(rubricItems.map((item) => [item.name, item.score]))
  )
  const [recommendation, setRecommendation] = useState<Recommendation>('advance')
  const [notes, setNotes] = useState(`Very strong technical candidate. Demonstrated deep understanding of distributed systems and made excellent architectural decisions at Paystack.

Key observations:
- Articulate and structured in responses
- Shows genuine passion for solving complex problems
- Good at explaining technical concepts clearly
- Mentioned interest in insurtech due to family experience with claim disputes

Areas to probe in next stage:
- How he handles ambiguity in early-stage environments
- Salary expectations (mentioned $130k target)`)
  const [recommendationNotes, setRecommendationNotes] = useState(
    'Strong hire recommendation. Technical skills are excellent, and he shows genuine interest in our mission. Proceed to offer discussion.'
  )

  const updateRubricScore = (name: string, score: number) => {
    setRubricScores((prev) => ({ ...prev, [name]: score }))
  }

  return (
    <div className="p-6">
      {/* Stage Header */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold">{stageInfo.name}</h1>
                <Badge className="bg-indigo-600">
                  Stage {stageInfo.stageNumber} of {stageInfo.totalStages}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Candidate:{' '}
                <Link href={`/recruiting/candidates/${candidateId}`} className="text-indigo-600 font-medium hover:underline">
                  {stageInfo.candidateName}
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">Previous / Next Stage</span>
              <Button variant="outline" size="icon" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Calendar className="h-4 w-4" />
              {stageInfo.date}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Clock className="h-4 w-4" />
              {stageInfo.duration}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Users className="h-4 w-4" />
              Interviewers: {stageInfo.interviewers.join(', ')}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[1fr_380px] gap-6">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Transcript */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Interview Transcript
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Fireflies Search
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 max-h-96 overflow-y-auto">
              {transcriptEntries.map((entry, i) => (
                <div key={i} className="mb-4">
                  <div className={cn(
                    'font-semibold text-sm mb-1',
                    entry.role === 'Candidate' ? 'text-green-600' : 'text-indigo-600'
                  )}>
                    {entry.speaker} ({entry.role})
                  </div>
                  <div className="text-sm text-foreground leading-relaxed">{entry.text}</div>
                  <div className="text-xs text-muted-foreground mt-1">{entry.timestamp}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rubric Scoring */}
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Interview Rubric
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {rubricItems.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="font-semibold text-sm">{rubricScores[item.name]}/5</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => updateRubricScore(item.name, score)}
                        className={cn(
                          'w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-medium transition-all',
                          rubricScores[item.name] === score
                            ? score >= 4
                              ? 'bg-green-500 border-green-500 text-white'
                              : score === 3
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-red-500 border-red-500 text-white'
                            : 'border-border hover:border-indigo-500'
                        )}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Interviewer Notes */}
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Interviewer Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Textarea
                rows={6}
                placeholder="Add your notes from the interview..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Score Summary */}
          <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="text-4xl font-bold text-green-600">{stageInfo.score}</div>
            <div>
              <div className="font-semibold">Stage Score</div>
              <div className="text-sm text-green-600">{stageInfo.scoreChange}</div>
            </div>
          </div>

          {/* AI Analysis */}
          <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-200">
            <CardContent className="p-5">
              <Badge className="bg-indigo-600 mb-3">
                <Star className="h-3 w-3 mr-1" />
                AI Analysis
              </Badge>
              <h4 className="font-semibold mb-3">Key Insights</h4>
              <p className="text-sm text-foreground/80 mb-4">
                James demonstrated exceptional technical depth in discussing distributed systems architecture. His experience leading the payment reconciliation redesign at Paystack directly translates to our infrastructure needs.
              </p>

              <h4 className="font-semibold mb-2 text-green-600">Strengths Observed</h4>
              <ul className="text-sm text-foreground/80 mb-4 list-disc pl-4 space-y-1">
                <li>Deep expertise in event-driven architecture and Kafka</li>
                <li>Strong decision-making framework for technology choices</li>
                <li>Experience with exactly-once semantics and data consistency</li>
                <li>Clear communication of complex technical concepts</li>
              </ul>

              <h4 className="font-semibold mb-2 text-amber-600">Areas to Note</h4>
              <ul className="text-sm text-foreground/80 list-disc pl-4 space-y-1">
                <li>Limited discussion of testing strategies</li>
                <li>Could explore more about people management style</li>
              </ul>
            </CardContent>
          </Card>

          {/* Suggested Follow-up Questions */}
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Suggested Follow-up Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {suggestedQuestions.map((question, i) => (
                <div key={i} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="text-sm text-foreground">{question}</div>
                </div>
              ))}
              <Link href="/recruiting/questions" className="block text-center text-indigo-600 text-sm mt-3 hover:underline">
                Generate more questions &rarr;
              </Link>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base">Your Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setRecommendation('advance')}
                  className={cn(
                    'flex-1 p-3 rounded-lg border-2 text-center font-medium transition-all',
                    recommendation === 'advance'
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                  )}
                >
                  <Check className="h-4 w-4 mx-auto mb-1" />
                  Advance
                </button>
                <button
                  onClick={() => setRecommendation('hold')}
                  className={cn(
                    'flex-1 p-3 rounded-lg border-2 text-center font-medium transition-all',
                    recommendation === 'hold'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                  )}
                >
                  <Pause className="h-4 w-4 mx-auto mb-1" />
                  Hold
                </button>
                <button
                  onClick={() => setRecommendation('reject')}
                  className={cn(
                    'flex-1 p-3 rounded-lg border-2 text-center font-medium transition-all',
                    recommendation === 'reject'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                  )}
                >
                  <X className="h-4 w-4 mx-auto mb-1" />
                  Reject
                </button>
              </div>
              <div>
                <Label className="mb-2 block">Recommendation notes</Label>
                <Textarea
                  rows={3}
                  placeholder="Add notes to support your recommendation..."
                  value={recommendationNotes}
                  onChange={(e) => setRecommendationNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-6 right-6 flex gap-3">
        <Button variant="outline">
          <Save className="h-4 w-4 mr-2" />
          Save Progress
        </Button>
        <Button>
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete Stage
        </Button>
      </div>
    </div>
  )
}
