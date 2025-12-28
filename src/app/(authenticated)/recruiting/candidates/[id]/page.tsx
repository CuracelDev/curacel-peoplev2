'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Download,
  CheckCircle,
  Mail,
  Linkedin,
  Calendar,
  Star,
  BarChart3,
  Heart,
  Check,
  AlertCircle,
  FileText,
  Info,
  Activity,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// Mock candidate data
const candidate = {
  id: '1',
  name: 'James Okafor',
  email: 'james.okafor@email.com',
  initials: 'JO',
  color: 'bg-green-500',
  score: 87,
  scoreChange: '+9 from HR Screen',
  position: 'Senior Backend Engineer',
  stage: 'Panel Interview',
  mbti: 'INTJ',
  appliedDate: 'Dec 16, 2025',
  linkedIn: 'linkedin.com/in/jamesokafor',
  currentRole: 'Senior Engineer',
  currentCompany: 'Paystack',
  experience: '7 years',
  noticePeriod: '4 weeks',
  salaryExpectation: '$120k - $140k',
}

const aiSummary = {
  description: `James is a highly experienced backend engineer with 7+ years at top-tier companies including Paystack and Andela. He demonstrates strong technical depth in distributed systems and has led teams of 5-8 engineers. His communication style is clear and structured, and he shows genuine alignment with Curacel's mission in insurtech.`,
  strengths: [
    'Deep expertise in microservices architecture and event-driven systems',
    'Proven track record leading engineering teams at scale',
    'Excellent communicator with structured problem-solving approach',
    'Strong alignment with company values and mission',
  ],
  areasToExplore: [
    'Limited experience with insurance domain specifically',
    'May prefer larger team environments based on background',
    'Salary expectations at top of range',
  ],
}

const scoreBreakdown = [
  { label: 'Application', score: 85 },
  { label: 'HR Screen', score: 78 },
  { label: 'Technical Test', score: 92 },
  { label: 'Technical Interview', score: 88 },
  { label: 'Panel Interview', score: 90 },
]

const pressValues = [
  { letter: 'P', name: 'Passionate', score: 'Strong' },
  { letter: 'R', name: 'Relentless', score: 'Strong' },
  { letter: 'E', name: 'Empowered', score: 'Strong' },
  { letter: 'S', name: 'Sense of Urgency', score: 'Moderate' },
  { letter: 'S', name: 'Seeing Possibilities', score: 'Strong' },
]

const stageTimeline = [
  { name: 'Applied', score: 85, date: 'Dec 16, 2025', status: 'completed' },
  { name: 'HR Screen', score: 78, date: 'Dec 18, 2025', status: 'completed' },
  { name: 'Kand.io Test', score: 92, date: 'Dec 20, 2025', status: 'completed' },
  { name: 'Technical', score: 88, date: 'Dec 22, 2025', status: 'completed' },
  { name: 'Panel', score: 90, date: 'Today', status: 'current' },
  { name: 'Offer', score: null, date: 'Pending', status: 'upcoming' },
]

const mustValidate = [
  'Experience working in smaller, fast-paced teams',
  'Long-term career goals and startup commitment',
  'Salary expectations alignment',
]

const documents = [
  { name: 'Resume.pdf', type: 'pdf' },
  { name: 'Kand.io Results.pdf', type: 'pdf' },
]

export default function CandidateProfilePage() {
  const params = useParams()
  const candidateId = params.id as string

  return (
    <div className="p-6">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-6">
            <Avatar className="h-20 w-20 rounded-xl">
              <AvatarFallback className={cn(candidate.color, 'text-white text-2xl font-semibold rounded-xl')}>
                {candidate.initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-1">{candidate.name}</h1>
              <div className="flex gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  {candidate.email}
                </span>
                <a href="#" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700">
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn Profile
                </a>
                <span className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Applied {candidate.appliedDate}
                </span>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{candidate.position}</Badge>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{candidate.stage}</Badge>
                <Badge variant="secondary">{candidate.mbti}</Badge>
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="text-4xl font-bold text-green-600">{candidate.score}</div>
              <div className="text-xs text-gray-500">Overall Score</div>
              <div className="text-xs text-green-600 mt-1">{candidate.scoreChange}</div>
            </div>

            <div className="flex flex-col gap-2">
              <Link href={`/recruiting/candidates/${candidateId}/stages/panel`}>
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Stages
                </Button>
              </Link>
              <Link href="/recruiting/questions">
                <Button variant="outline" size="sm" className="w-full">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Generate Questions
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="stages">Interview Stages</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="values">Values & Fit</TabsTrigger>
          <TabsTrigger value="decision">Decision</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Layout */}
      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Main Column */}
        <div className="space-y-4">
          {/* AI Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" />
                AI Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{aiSummary.description}</p>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="font-semibold text-green-600 mb-3">Strengths</div>
                  {aiSummary.strengths.map((strength, i) => (
                    <div key={i} className="flex items-start gap-2 py-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-semibold text-amber-600 mb-3">Areas to Explore</div>
                  {aiSummary.areasToExplore.map((area, i) => (
                    <div key={i} className="flex items-start gap-2 py-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scoreBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-600">{item.label}</span>
                  <div className="flex-1">
                    <Progress value={item.score} className="h-2" />
                  </div>
                  <span className="w-10 text-right font-semibold text-sm">{item.score}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* PRESS Values Alignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4" />
                PRESS Values Alignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {pressValues.map((value, i) => (
                  <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-2xl font-bold text-indigo-600 mb-1">{value.letter}</div>
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">{value.name}</div>
                    <div className={cn(
                      'text-sm font-semibold mt-2',
                      value.score === 'Strong' ? 'text-green-600' : 'text-amber-600'
                    )}>
                      {value.score}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                AI Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-5 bg-green-50 border border-green-200 rounded-xl text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-semibold text-sm mb-3">
                  <Check className="h-4 w-4" />
                  ADVANCE TO OFFER
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Confidence: 92%</strong> - Strong candidate with excellent technical skills and cultural fit
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stage Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Stage Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {stageTimeline.map((stage, i) => (
                  <div key={i} className="flex gap-4 pb-5 last:pb-0 relative">
                    {i < stageTimeline.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                      stage.status === 'completed' && 'bg-green-500 text-white',
                      stage.status === 'current' && 'bg-indigo-600 text-white shadow-[0_0_0_4px_rgba(99,102,241,0.2)]',
                      stage.status === 'upcoming' && 'bg-gray-200 text-gray-400'
                    )}>
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{stage.name}</span>
                        {stage.score && (
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-semibold',
                            stage.score >= 80 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                          )}>
                            {stage.score}
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        'text-xs',
                        stage.status === 'upcoming' ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        {stage.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Must Validate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Must Validate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mustValidate.map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Current Role', value: candidate.currentRole },
                  { label: 'Current Company', value: candidate.currentCompany },
                  { label: 'Experience', value: candidate.experience },
                  { label: 'Notice Period', value: candidate.noticePeriod },
                  { label: 'Salary Expectation', value: candidate.salaryExpectation },
                  { label: 'MBTI', value: candidate.mbti },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-500" />
                  <span className="flex-1 text-sm">{doc.name}</span>
                  <Download className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-6 right-6 flex gap-3">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Profile
        </Button>
        <Button className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-4 w-4 mr-2" />
          Advance to Offer
        </Button>
      </div>
    </div>
  )
}
