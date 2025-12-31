'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Download,
  CheckCircle,
  Mail,
  Linkedin,
  Calendar,
  MapPin,
  Briefcase,
  Building2,
  Phone,
  FileText,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertTriangle,
  Shield,
  Users,
  Target,
  Brain,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Star,
  BarChart3,
  Heart,
  Activity,
  Info,
  Check,
  AlertCircle,
  HelpCircle,
  Mic,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { cn, getInitials } from '@/lib/utils'
import { trpc } from '@/lib/trpc-client'
import { format } from 'date-fns'
import { EmailTab } from '@/components/recruiting/email-tab'
import { BlueAIAnalysisTab } from '@/components/recruiting/blueai-analysis-tab'

// Fallback mock candidate data - James Okafor full profile
const mockCandidate = {
  id: '1',
  name: 'James Okafor',
  email: 'james.okafor@email.com',
  phone: '+234 802 345 6789',
  linkedinUrl: 'linkedin.com/in/jamesokafor',
  currentRole: 'Senior Backend Engineer (Tech Lead)',
  currentCompany: 'Paystack',
  yearsOfExperience: 6,
  location: 'Lagos, Nigeria',
  position: 'Senior Backend Engineer',
  stage: 'Panel Interview',
  score: 87,
  scoreChange: '+9 from HR Screen',
  appliedDate: 'Dec 16, 2025',
  color: 'bg-green-500',
  mbtiType: 'INTJ',

  // Score breakdown
  experienceMatchScore: 85,
  skillsMatchScore: 82,
  domainFitScore: 68,
  educationScore: 90,
  scoreExplanation: 'Strong technical background with relevant fintech experience at top companies (Paystack, Andela, Flutterwave). Skills align well with role requirements. Gap: No direct insurance industry experience, though regulatory compliance work at Paystack is transferable.',

  // Resume summary
  resumeSummary: 'Experienced backend engineer with 6 years building scalable distributed systems. Currently leading a team of 5 engineers at Paystack. Strong expertise in Node.js, Python, and cloud infrastructure. Track record of delivering high-impact projects including a payments processing system handling $50M+ monthly transactions.',

  // Work experience
  workExperience: [
    {
      title: 'Senior Backend Engineer (Tech Lead)',
      company: 'Paystack',
      startDate: 'Mar 2022',
      endDate: 'Present',
      isCurrent: true,
      highlights: [
        'Led team of 5 engineers in building a new payment processing microservice handling $50M+ monthly',
        'Architected event-driven system that reduced transaction failures by 40%',
        'Implemented CI/CD pipelines cutting deployment time from 2 hours to 15 minutes',
        'Mentored 3 junior developers who have since been promoted',
      ],
      skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'Kubernetes'],
    },
    {
      title: 'Backend Engineer',
      company: 'Andela',
      startDate: 'Jun 2019',
      endDate: 'Feb 2022',
      isCurrent: false,
      highlights: [
        'Built RESTful APIs serving 100K+ daily active users',
        'Designed and implemented authentication system using OAuth 2.0',
        'Reduced API response times by 60% through query optimization',
      ],
      skills: ['Python', 'Django', 'AWS', 'Docker'],
    },
    {
      title: 'Junior Software Developer',
      company: 'Flutterwave',
      startDate: 'Jan 2018',
      endDate: 'May 2019',
      isCurrent: false,
      highlights: [
        'Contributed to merchant dashboard serving 5,000+ businesses',
        'Wrote unit tests increasing code coverage from 45% to 78%',
      ],
      skills: ['JavaScript', 'React', 'Node.js'],
    },
  ],

  // Education
  education: [
    {
      degree: 'B.Sc.',
      field: 'Computer Science',
      institution: 'University of Lagos',
      years: '2014 - 2018',
      honors: 'First Class Honours',
    },
  ],

  // Skills
  skills: {
    languages: ['Node.js', 'TypeScript', 'Python', 'Django', 'Express.js', 'NestJS'],
    databases: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'],
    infrastructure: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
  },

  // Interest form
  whyCuracel: "I'm excited about democratizing insurance access in Africa. The technical challenges of building reliable claims processing at scale align perfectly with my experience building payment systems. I want to apply my skills to solve problems that have real social impact.",
  salaryExpMin: 90000,
  salaryExpMax: 100000,
  noticePeriod: '4 weeks',

  // BlueAI Summary
  aiSummary: {
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
  },

  // Stage score breakdown
  scoreBreakdown: [
    { label: 'Application', score: 85 },
    { label: 'HR Screen', score: 78 },
    { label: 'Technical Test', score: 92 },
    { label: 'Technical Interview', score: 88 },
    { label: 'Panel Interview', score: 90 },
  ],

  // PRESS Values scores
  pressValues: [
    { letter: 'P', name: 'Passionate', score: 88, rating: 'Strong' },
    { letter: 'R', name: 'Relentless', score: 85, rating: 'Strong' },
    { letter: 'E', name: 'Empowered', score: 82, rating: 'Strong' },
    { letter: 'S', name: 'Sense of Urgency', score: 76, rating: 'Moderate' },
    { letter: 'S', name: 'Seeing Possibilities', score: 80, rating: 'Strong' },
  ],
  pressValuesAvg: 82,

  // Competency scores
  competencyScores: {
    systemDesign: 90,
    technicalLeadership: 85,
    problemSolving: 88,
    communication: 82,
    domainKnowledge: 65,
  },

  // Personality profile (OCEAN)
  personalityProfile: {
    openness: 85,
    conscientiousness: 90,
    extraversion: 45,
    agreeableness: 70,
    neuroticism: 25,
  },

  // Team fit
  teamFitStrengths: [
    "Strategic thinking complements team's execution focus",
    "High conscientiousness matches team's quality standards",
    'Calm under pressure (low neuroticism) good for incident response',
  ],
  teamFitConsiderations: [
    'Lower extraversion - may need encouragement to share ideas in groups',
  ],

  // Stage timeline
  stageTimeline: [
    { name: 'Applied', score: 85, date: 'Dec 16, 2025', status: 'completed' },
    { name: 'HR Screen', score: 78, date: 'Dec 18, 2025', status: 'completed' },
    { name: 'Kand.io Test', score: 92, date: 'Dec 20, 2025', status: 'completed' },
    { name: 'Technical', score: 88, date: 'Dec 22, 2025', status: 'completed' },
    { name: 'Panel', score: 90, date: 'Today', status: 'current' },
    { name: 'Offer', score: null, date: 'Pending', status: 'upcoming' },
  ],

  // Must validate
  mustValidate: [
    'Experience working in smaller, fast-paced teams',
    'Long-term career goals and startup commitment',
    'Salary expectations alignment',
  ],

  // Documents
  documents: [
    { name: 'Resume.pdf', type: 'pdf' },
    { name: 'Kand.io Results.pdf', type: 'pdf' },
  ],

  // BlueAI Recommendation
  recommendation: 'HIRE',
  recommendationConfidence: 92,
  recommendationSummary: "James demonstrates exceptional technical depth with a strong track record at high-growth fintech companies. His experience leading teams and building payment systems at Paystack directly translates to Curacel's needs. While he lacks insurance domain experience, his demonstrated ability to quickly master complex regulatory environments (evidenced by his compliance work at Paystack) and strong PRESS values alignment make him an excellent fit for the Senior Backend Engineer role.",
  recommendationStrengths: [
    '6 years of relevant backend experience at top companies',
    'Proven leadership - led team of 5, mentored 3 promotions',
    'Strong system design skills (event-driven, microservices)',
    'High PRESS alignment especially Passionate Work (88%)',
  ],
  recommendationRisks: [
    { risk: 'No insurance experience', mitigation: 'Pair with domain expert for first 90 days' },
    { risk: 'Salary at top of range ($95k)', mitigation: 'Consider equity comp or performance bonus' },
    { risk: 'Lower extraversion', mitigation: 'Ensure comfortable channels for cross-team comms' },
  ],

  // Decision
  decisionStatus: 'PENDING',

  // Interview Evaluations (Scorecards)
  interviewEvaluations: [
    {
      stage: 'HR Screen',
      stageType: 'HR_SCREEN',
      date: 'Dec 18, 2025',
      overallScore: 78,
      evaluators: [
        {
          name: 'Sarah Johnson',
          role: 'HR Manager',
          overallRating: 4,
          recommendation: 'ADVANCE',
          notes: 'Strong communication skills and genuine interest in the role. Good cultural fit.',
          criteria: [
            { name: 'Communication Skills', score: 4, maxScore: 5, notes: 'Clear and articulate' },
            { name: 'Cultural Fit', score: 4, maxScore: 5, notes: 'Aligns well with company values' },
            { name: 'Interest in Role', score: 5, maxScore: 5, notes: 'Highly motivated' },
            { name: 'Professional Presence', score: 4, maxScore: 5, notes: 'Well prepared' },
            { name: 'Salary Expectations', score: 3, maxScore: 5, notes: 'Slightly above budget' },
          ],
        },
      ],
    },
    {
      stage: 'Technical Interview',
      stageType: 'TECHNICAL',
      date: 'Dec 22, 2025',
      overallScore: 88,
      evaluators: [
        {
          name: 'Michael Chen',
          role: 'Engineering Lead',
          overallRating: 4,
          recommendation: 'STRONG_ADVANCE',
          notes: 'Excellent system design skills. Deep understanding of distributed systems.',
          criteria: [
            { name: 'Technical Knowledge', score: 5, maxScore: 5, notes: 'Expert level understanding' },
            { name: 'Problem Solving', score: 4, maxScore: 5, notes: 'Methodical approach' },
            { name: 'System Design', score: 5, maxScore: 5, notes: 'Excellent architecture skills' },
            { name: 'Code Quality', score: 4, maxScore: 5, notes: 'Clean, maintainable code' },
            { name: 'Technical Communication', score: 4, maxScore: 5, notes: 'Explains concepts well' },
          ],
        },
        {
          name: 'Emily Davis',
          role: 'Senior Engineer',
          overallRating: 4,
          recommendation: 'ADVANCE',
          notes: 'Solid fundamentals. Would benefit from more insurance domain exposure.',
          criteria: [
            { name: 'Technical Knowledge', score: 4, maxScore: 5, notes: 'Strong backend skills' },
            { name: 'Problem Solving', score: 5, maxScore: 5, notes: 'Creative solutions' },
            { name: 'System Design', score: 4, maxScore: 5, notes: 'Good scalability thinking' },
            { name: 'Code Quality', score: 4, maxScore: 5, notes: 'Follows best practices' },
            { name: 'Technical Communication', score: 4, maxScore: 5, notes: 'Clear explanations' },
          ],
        },
      ],
    },
    {
      stage: 'Panel Interview',
      stageType: 'PANEL',
      date: 'Dec 27, 2025',
      overallScore: 90,
      evaluators: [
        {
          name: 'Alice Katheu',
          role: 'VP of Engineering',
          overallRating: 5,
          recommendation: 'STRONG_HIRE',
          notes: 'Exceptional leadership potential. Strong strategic thinking.',
          criteria: [
            { name: 'Leadership Potential', score: 5, maxScore: 5, notes: 'Proven team lead experience' },
            { name: 'Strategic Thinking', score: 4, maxScore: 5, notes: 'Good long-term vision' },
            { name: 'Cultural Alignment', score: 5, maxScore: 5, notes: 'Excellent PRESS alignment' },
            { name: 'Growth Mindset', score: 5, maxScore: 5, notes: 'Eager to learn' },
            { name: 'Collaboration', score: 4, maxScore: 5, notes: 'Works well with others' },
          ],
        },
        {
          name: 'Kabiru Awulu',
          role: 'CTO',
          overallRating: 4,
          recommendation: 'HIRE',
          notes: 'Strong technical foundation. Would be a great addition to the team.',
          criteria: [
            { name: 'Leadership Potential', score: 4, maxScore: 5, notes: 'Good management skills' },
            { name: 'Strategic Thinking', score: 5, maxScore: 5, notes: 'Excellent vision' },
            { name: 'Cultural Alignment', score: 4, maxScore: 5, notes: 'Good fit' },
            { name: 'Growth Mindset', score: 4, maxScore: 5, notes: 'Open to feedback' },
            { name: 'Collaboration', score: 5, maxScore: 5, notes: 'Team player' },
          ],
        },
        {
          name: 'Tunde Ogunleye',
          role: 'Product Lead',
          overallRating: 4,
          recommendation: 'HIRE',
          notes: 'Good product sense. Understands user needs well.',
          criteria: [
            { name: 'Leadership Potential', score: 4, maxScore: 5, notes: 'Mentorship experience' },
            { name: 'Strategic Thinking', score: 4, maxScore: 5, notes: 'Business aware' },
            { name: 'Cultural Alignment', score: 5, maxScore: 5, notes: 'Strong values fit' },
            { name: 'Growth Mindset', score: 4, maxScore: 5, notes: 'Continuous learner' },
            { name: 'Collaboration', score: 4, maxScore: 5, notes: 'Cross-functional experience' },
          ],
        },
      ],
    },
  ],
}

export default function CandidateProfilePage() {
  const params = useParams()
  const candidateId = params.id as string
  const [activeTab, setActiveTab] = useState('overview')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null)

  // Fetch candidate profile from database
  const { data: profileData, isLoading } = trpc.job.getCandidateProfile.useQuery(
    { candidateId },
    { enabled: !!candidateId }
  )

  // Map database data to UI format, falling back to mock data
  const candidate = useMemo(() => {
    if (!profileData?.candidate) return mockCandidate

    const c = profileData.candidate
    const evalSummary = profileData.evaluationSummary

    // Parse JSON fields with type safety
    const workExperience = (c.workExperience as typeof mockCandidate.workExperience) || mockCandidate.workExperience
    const education = (c.education as typeof mockCandidate.education) || mockCandidate.education
    const skills = (c.skills as typeof mockCandidate.skills) || mockCandidate.skills
    const pressValuesScores = c.pressValuesScores as Record<string, number> | null
    const competencyScores = (c.competencyScores as typeof mockCandidate.competencyScores) || mockCandidate.competencyScores
    const personalityProfile = (c.personalityProfile as typeof mockCandidate.personalityProfile) || mockCandidate.personalityProfile
    const teamFitAnalysis = c.teamFitAnalysis as { strengths?: string[]; considerations?: string[] } | null
    const aiSummary = (c.aiSummary as typeof mockCandidate.aiSummary) || mockCandidate.aiSummary

    // Map PRESS values from scores object to array format
    const pressValues = pressValuesScores ? [
      { letter: 'P', name: 'Passionate', score: Math.round((pressValuesScores.passionate || 0) * 20), rating: pressValuesScores.passionate >= 4 ? 'Strong' : 'Moderate' },
      { letter: 'R', name: 'Relentless', score: Math.round((pressValuesScores.relentless || 0) * 20), rating: pressValuesScores.relentless >= 4 ? 'Strong' : 'Moderate' },
      { letter: 'E', name: 'Empowered', score: Math.round((pressValuesScores.empowered || 0) * 20), rating: pressValuesScores.empowered >= 4 ? 'Strong' : 'Moderate' },
      { letter: 'S', name: 'Sense of Urgency', score: Math.round((pressValuesScores.senseOfUrgency || 0) * 20), rating: pressValuesScores.senseOfUrgency >= 4 ? 'Strong' : 'Moderate' },
      { letter: 'S', name: 'Seeing Possibilities', score: Math.round((pressValuesScores.seeingPossibilities || 0) * 20), rating: pressValuesScores.seeingPossibilities >= 4 ? 'Strong' : 'Moderate' },
    ] : mockCandidate.pressValues

    const pressValuesAvg = pressValues.reduce((sum, v) => sum + v.score, 0) / pressValues.length

    // Build interview evaluations from database
    const interviewEvaluations = (evalSummary?.byStage || []).map(stage => ({
      stage: stage.stageName,
      stageType: stage.stage,
      date: 'Recent',
      overallScore: stage.averageScore || 0,
      evaluators: stage.evaluators.map(e => ({
        name: e.name,
        role: e.role || 'Interviewer',
        overallRating: e.overallRating || 0,
        recommendation: e.recommendation || 'PENDING',
        notes: e.notes || '',
        criteria: e.criteriaScores.map(cs => ({
          name: cs.name,
          score: cs.score,
          maxScore: 5,
          notes: cs.notes || '',
        })),
      })),
    }))

    // Build score breakdown from interview scores
    const scoreBreakdown = [
      { label: 'Application', score: c.score || 0 },
      ...interviewEvaluations.map(ie => ({
        label: ie.stage,
        score: ie.overallScore,
      })),
    ]

    // Build stage timeline from interviews
    const stageTimeline = [
      {
        name: 'Applied',
        score: c.score || 0,
        date: c.appliedAt ? format(new Date(c.appliedAt), 'MMM d, yyyy') : 'Unknown',
        status: 'completed' as const,
      },
      ...profileData.interviews.map((interview, idx) => ({
        name: interview.stageName || interview.stage,
        score: interview.score || null,
        date: interview.scheduledAt ? format(new Date(interview.scheduledAt), 'MMM d, yyyy') : 'Pending',
        status: interview.status === 'COMPLETED' ? 'completed' as const :
                interview.status === 'SCHEDULED' ? 'current' as const : 'upcoming' as const,
      })),
    ]

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || mockCandidate.phone,
      linkedinUrl: c.linkedinUrl || mockCandidate.linkedinUrl,
      currentRole: workExperience[0]?.title || mockCandidate.currentRole,
      currentCompany: workExperience[0]?.company || mockCandidate.currentCompany,
      yearsOfExperience: workExperience.length > 0 ? workExperience.length + 3 : mockCandidate.yearsOfExperience,
      location: c.location || mockCandidate.location,
      position: profileData.candidate.job?.title || mockCandidate.position,
      stage: c.stageDisplayName || c.stage,
      score: c.score || mockCandidate.score,
      scoreChange: mockCandidate.scoreChange,
      appliedDate: c.appliedAt ? format(new Date(c.appliedAt), 'MMM d, yyyy') : mockCandidate.appliedDate,
      color: 'bg-green-500',
      mbtiType: mockCandidate.mbtiType,
      experienceMatchScore: c.experienceMatchScore || mockCandidate.experienceMatchScore,
      skillsMatchScore: c.skillsMatchScore || mockCandidate.skillsMatchScore,
      domainFitScore: c.domainFitScore || mockCandidate.domainFitScore,
      educationScore: c.educationScore || mockCandidate.educationScore,
      scoreExplanation: c.scoreExplanation || mockCandidate.scoreExplanation,
      resumeSummary: c.resumeSummary || c.bio || mockCandidate.resumeSummary,
      workExperience,
      education,
      skills,
      whyCuracel: c.coverLetter || mockCandidate.whyCuracel,
      salaryExpMin: c.salaryExpectationMin || mockCandidate.salaryExpMin,
      salaryExpMax: c.salaryExpectationMax || mockCandidate.salaryExpMax,
      noticePeriod: c.noticePeriod || mockCandidate.noticePeriod,
      aiSummary,
      scoreBreakdown: scoreBreakdown.length > 1 ? scoreBreakdown : mockCandidate.scoreBreakdown,
      pressValues,
      pressValuesAvg: Math.round(pressValuesAvg),
      competencyScores,
      personalityProfile,
      teamFitStrengths: teamFitAnalysis?.strengths || mockCandidate.teamFitStrengths,
      teamFitConsiderations: teamFitAnalysis?.considerations || mockCandidate.teamFitConsiderations,
      stageTimeline: stageTimeline.length > 1 ? stageTimeline : mockCandidate.stageTimeline,
      mustValidate: c.mustValidate || mockCandidate.mustValidate,
      documents: profileData.documents || mockCandidate.documents,
      recommendation: evalSummary?.recommendation || mockCandidate.recommendation,
      recommendationConfidence: evalSummary?.aiRecommendation?.confidence || mockCandidate.recommendationConfidence,
      recommendationSummary: evalSummary?.aiRecommendation?.summary || mockCandidate.recommendationSummary,
      recommendationStrengths: evalSummary?.aiRecommendation?.strengths || mockCandidate.recommendationStrengths,
      recommendationRisks: evalSummary?.aiRecommendation?.risks || mockCandidate.recommendationRisks,
      decisionStatus: c.decisionStatus || mockCandidate.decisionStatus,
      interviewEvaluations: interviewEvaluations.length > 0 ? interviewEvaluations : mockCandidate.interviewEvaluations,
    }
  }, [profileData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl flex-shrink-0">
                <AvatarFallback className={cn(candidate.color, 'text-white text-xl sm:text-2xl font-semibold rounded-xl')}>
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>

              {/* Score - visible on mobile next to avatar */}
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200 sm:hidden">
                <div className="text-3xl font-bold text-green-600">{candidate.score}</div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold mb-1">{candidate.name}</h1>
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </span>
                <a href={`https://${candidate.linkedinUrl}`} target="_blank" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700">
                  <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                  LinkedIn
                </a>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  {candidate.appliedDate}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">{candidate.position}</Badge>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">{candidate.stage}</Badge>
                <Badge variant="secondary" className="text-xs">{candidate.mbtiType}</Badge>
              </div>
            </div>

            {/* Score - hidden on mobile, shown on desktop */}
            <div className="hidden sm:block text-center p-4 bg-green-50 rounded-xl border border-green-200 flex-shrink-0">
              <div className="text-4xl font-bold text-green-600">{candidate.score}</div>
              <div className="text-xs text-muted-foreground">Overall Score</div>
              <div className="text-xs text-green-600 mt-1">{candidate.scoreChange}</div>
            </div>

            <div className="flex sm:flex-col gap-2">
              <Link href={`/recruiting/candidates/${candidateId}/stages/panel`} className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                  <FileText className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">View Stages</span>
                </Button>
              </Link>
              <Link href="/recruiting/questions" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                  <HelpCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Generate Questions</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export Profile</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-full">
            <TabsTrigger value="overview" className="flex-1 justify-center text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="application" className="flex-1 justify-center text-xs sm:text-sm">Application</TabsTrigger>
            <TabsTrigger value="stages" className="flex-1 justify-center text-xs sm:text-sm">Interviews</TabsTrigger>
            <TabsTrigger value="assessments" className="flex-1 justify-center text-xs sm:text-sm">Assessments</TabsTrigger>
            <TabsTrigger value="values" className="flex-1 justify-center text-xs sm:text-sm">Values</TabsTrigger>
            <TabsTrigger value="email" className="flex-1 justify-center text-xs sm:text-sm">Email</TabsTrigger>
            <TabsTrigger value="blueai" className="flex-1 justify-center text-xs sm:text-sm">BlueAI</TabsTrigger>
            <TabsTrigger value="decision" className="flex-1 justify-center text-xs sm:text-sm">Decision</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Main Column */}
            <div className="space-y-4">
              {/* BlueAI Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-indigo-600" />
                    BlueAI's Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 mb-4">{candidate.aiSummary.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <div className="font-semibold text-green-600 mb-3">Strengths</div>
                      {candidate.aiSummary.strengths.map((strength, i) => (
                        <div key={i} className="flex items-start gap-2 py-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{strength}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="font-semibold text-amber-600 mb-3">Areas to Explore</div>
                      {candidate.aiSummary.areasToExplore.map((area, i) => (
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
                  {candidate.scoreBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-32 text-sm text-foreground/80">{item.label}</span>
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
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                    {candidate.pressValues.map((value, i) => (
                      <div key={i} className="text-center p-3 sm:p-4 bg-muted/50 rounded-xl">
                        <div className="text-xl sm:text-2xl font-bold text-indigo-600 mb-1">{value.letter}</div>
                        <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground">{value.name}</div>
                        <div className={cn(
                          'text-xs sm:text-sm font-semibold mt-2',
                          value.rating === 'Strong' ? 'text-green-600' : 'text-amber-600'
                        )}>
                          {value.rating}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* BlueAI Recommendation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    BlueAI Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-5 bg-green-50 border border-green-200 rounded-xl text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-semibold text-sm mb-3">
                      <Check className="h-4 w-4" />
                      ADVANCE TO OFFER
                    </div>
                    <div className="text-sm text-foreground/80">
                      <strong>Confidence: {candidate.recommendationConfidence}%</strong> - Strong candidate with excellent technical skills and cultural fit
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
                    {candidate.stageTimeline.map((stage, i) => (
                      <div key={i} className="flex gap-4 pb-5 last:pb-0 relative">
                        {i < candidate.stageTimeline.length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />
                        )}
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                          stage.status === 'completed' && 'bg-green-500 text-white',
                          stage.status === 'current' && 'bg-indigo-600 text-white shadow-[0_0_0_4px_rgba(99,102,241,0.2)]',
                          stage.status === 'upcoming' && 'bg-muted text-muted-foreground'
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
                            stage.status === 'upcoming' ? 'text-muted-foreground' : 'text-muted-foreground'
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
                  {candidate.mustValidate.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 py-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                  <div className="mt-4 flex flex-col gap-2">
                    <Button className="w-full justify-start">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Advance to Offer
                    </Button>
                  </div>
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
                      { label: 'Current Role', value: 'Senior Engineer' },
                      { label: 'Current Company', value: candidate.currentCompany },
                      { label: 'Experience', value: `${candidate.yearsOfExperience} years` },
                      { label: 'Notice Period', value: candidate.noticePeriod },
                      { label: 'Salary Expectation', value: `$${candidate.salaryExpMin.toLocaleString()} - $${candidate.salaryExpMax.toLocaleString()}` },
                      { label: 'MBTI', value: candidate.mbtiType },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
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
                  {candidate.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer">
                      <FileText className="h-4 w-4 text-red-500" />
                      <span className="flex-1 text-sm">{doc.name}</span>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Application Tab */}
        <TabsContent value="application" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              {/* Application Score Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Application Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    {[
                      { label: 'Experience Match', score: candidate.experienceMatchScore },
                      { label: 'Skills Match', score: candidate.skillsMatchScore },
                      { label: 'Domain Fit', score: candidate.domainFitScore },
                      { label: 'Education', score: candidate.educationScore },
                    ].map((item, i) => (
                      <div key={i} className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className={cn(
                          'text-2xl font-bold',
                          item.score >= 80 ? 'text-green-600' : item.score >= 65 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {item.score}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg">
                    {candidate.scoreExplanation}
                  </p>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {candidate.resumeSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Work Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {candidate.workExperience.map((exp, i) => (
                    <div key={i} className={cn(i > 0 && 'pt-6 border-t')}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{exp.title}</h4>
                          <div className="text-sm text-muted-foreground">{exp.company}</div>
                        </div>
                        <Badge variant={exp.isCurrent ? 'default' : 'secondary'}>
                          {exp.startDate} - {exp.endDate}
                        </Badge>
                      </div>
                      <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1 mb-3">
                        {exp.highlights.map((h, j) => (
                          <li key={j}>{h}</li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-1.5">
                        {exp.skills.map((skill, j) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Education</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.education.map((edu, i) => (
                    <div key={i} className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{edu.degree} {edu.field}</h4>
                        <div className="text-sm text-muted-foreground">{edu.institution}</div>
                        {edu.honors && (
                          <Badge variant="outline" className="mt-1 text-xs text-green-600 border-green-300">
                            {edu.honors}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">{edu.years}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Why Curacel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why Curacel?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {candidate.whyCuracel}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Languages & Frameworks</div>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.languages.map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Databases</div>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.databases.map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Infrastructure</div>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.infrastructure.map((skill, i) => (
                        <Badge key={i} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Application Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Salary Expectation</span>
                    <span className="text-sm font-medium">${candidate.salaryExpMin.toLocaleString()} - ${candidate.salaryExpMax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Notice Period</span>
                    <span className="text-sm font-medium">{candidate.noticePeriod}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">MBTI Type</span>
                    <Badge variant="secondary">{candidate.mbtiType}</Badge>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">Years of Experience</span>
                    <span className="text-sm font-medium">{candidate.yearsOfExperience} years</span>
                  </div>
                </CardContent>
              </Card>

              {/* Must Validate */}
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Must Validate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {candidate.mustValidate.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Interview Stages Tab */}
        <TabsContent value="stages" className="mt-6">
          <div className="space-y-6">
            {candidate.interviewEvaluations.map((evaluation, evalIdx) => (
              <Card key={evalIdx} className="hover:border-indigo-300 transition-colors">
                <Link href={`/recruiting/candidates/${candidateId}/interviews/${evaluation.stageType.toLowerCase()}`}>
                  <CardHeader className="pb-4 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {evaluation.stage}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                        <Badge variant="outline">{evaluation.date}</Badge>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">
                          <Mic className="h-3 w-3 mr-1" />
                          Fireflies
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Overall Score:</span>
                        <Badge className={cn(
                          'text-lg px-3 py-1',
                          evaluation.overallScore >= 85 ? 'bg-green-500' :
                          evaluation.overallScore >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        )}>
                          {evaluation.overallScore}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Link>
                <CardContent>
                  <div className="space-y-6">
                    {evaluation.evaluators.map((evaluator, evIdx) => (
                      <div key={evIdx} className={cn(evIdx > 0 && 'pt-6 border-t')}>
                        {/* Evaluator Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-medium">
                                {getInitials(evaluator.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">{evaluator.name}</div>
                              <div className="text-sm text-muted-foreground">{evaluator.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Rating</div>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={cn(
                                      'h-4 w-4',
                                      star <= evaluator.overallRating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-muted-foreground/40'
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                            <Badge className={cn(
                              evaluator.recommendation === 'STRONG_HIRE' || evaluator.recommendation === 'STRONG_ADVANCE'
                                ? 'bg-green-600'
                                : evaluator.recommendation === 'HIRE' || evaluator.recommendation === 'ADVANCE'
                                ? 'bg-green-500'
                                : evaluator.recommendation === 'HOLD'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            )}>
                              {evaluator.recommendation.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        {/* Criteria Scores */}
                        <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                            {evaluator.criteria.map((criterion, cIdx) => (
                              <div key={cIdx} className="text-center">
                                <div className="text-[10px] sm:text-xs text-muted-foreground mb-2">{criterion.name}</div>
                                <div className="flex justify-center gap-0.5 mb-1">
                                  {[1, 2, 3, 4, 5].map((dot) => (
                                    <div
                                      key={dot}
                                      className={cn(
                                        'w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full',
                                        dot <= criterion.score
                                          ? criterion.score >= 4
                                            ? 'bg-green-500'
                                            : criterion.score >= 3
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                          : 'bg-muted'
                                      )}
                                    />
                                  ))}
                                </div>
                                <div className="text-xs font-semibold">
                                  {criterion.score}/{criterion.maxScore}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        {evaluator.notes && (
                          <div className="flex items-start gap-2 text-sm text-foreground/80">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span>{evaluator.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Summary Card */}
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm text-indigo-600 font-medium">Interview Summary</div>
                      <div className="text-lg font-semibold">
                        {candidate.interviewEvaluations.length} stages completed with {
                          candidate.interviewEvaluations.reduce((acc, e) => acc + e.evaluators.length, 0)
                        } evaluator assessments
                      </div>
                    </div>
                  </div>
                  <Link href={`/recruiting/candidates/${candidateId}/stages/panel`}>
                    <Button variant="outline">
                      View Full Details
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
            <p>Assessment results will appear here.</p>
          </div>
        </TabsContent>

        {/* Values & Fit Tab */}
        <TabsContent value="values" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PRESS Values */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  PRESS Values Alignment
                </CardTitle>
                <p className="text-sm text-muted-foreground">Average: {candidate.pressValuesAvg}%</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.pressValues.map((value, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {value.letter}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{value.name}</span>
                        <span className="font-semibold">{value.score}%</span>
                      </div>
                      <Progress value={value.score} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Competency Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  Competency Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'systemDesign', label: 'System Design' },
                  { key: 'technicalLeadership', label: 'Technical Leadership' },
                  { key: 'problemSolving', label: 'Problem Solving' },
                  { key: 'communication', label: 'Communication' },
                  { key: 'domainKnowledge', label: 'Domain Knowledge' },
                ].map((comp, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{comp.label}</span>
                      <span className={cn(
                        'font-semibold',
                        candidate.competencyScores[comp.key as keyof typeof candidate.competencyScores] >= 80 ? 'text-green-600' :
                        candidate.competencyScores[comp.key as keyof typeof candidate.competencyScores] >= 65 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {candidate.competencyScores[comp.key as keyof typeof candidate.competencyScores]}%
                      </span>
                    </div>
                    <Progress
                      value={candidate.competencyScores[comp.key as keyof typeof candidate.competencyScores]}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Personality Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-indigo-600" />
                  Personality Profile (OCEAN)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'openness', label: 'Openness', description: 'Creative, curious' },
                  { key: 'conscientiousness', label: 'Conscientiousness', description: 'Organized, reliable' },
                  { key: 'extraversion', label: 'Extraversion', description: 'Outgoing, energetic' },
                  { key: 'agreeableness', label: 'Agreeableness', description: 'Cooperative, trusting' },
                  { key: 'neuroticism', label: 'Neuroticism', description: 'Emotional stability (inverted)' },
                ].map((trait, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <div>
                        <span className="font-medium">{trait.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{trait.description}</span>
                      </div>
                      <span className="font-semibold">
                        {candidate.personalityProfile[trait.key as keyof typeof candidate.personalityProfile]}%
                      </span>
                    </div>
                    <Progress
                      value={candidate.personalityProfile[trait.key as keyof typeof candidate.personalityProfile]}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Team Fit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Team Fit Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">Strengths</h4>
                  <ul className="space-y-2">
                    {candidate.teamFitStrengths.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-amber-600 mb-2">Considerations</h4>
                  <ul className="space-y-2">
                    {candidate.teamFitConsiderations.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="mt-6">
          <EmailTab
            candidateId={candidate.id}
            candidateName={candidate.name}
            candidateEmail={candidate.email}
            jobId={candidate.job?.id}
            jobTitle={candidate.job?.title}
          />
        </TabsContent>

        {/* BlueAI Analysis Tab */}
        <TabsContent value="blueai" className="mt-6">
          <BlueAIAnalysisTab
            candidateId={candidate.id}
            candidateName={candidate.name}
          />
        </TabsContent>

        {/* Decision Tab */}
        <TabsContent value="decision" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              {/* BlueAI Recommendation */}
              <Card className="border-2 border-green-300 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    BlueAI Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Badge className="text-lg px-4 py-2 bg-green-500">
                      <ThumbsUp className="h-5 w-5 mr-2" />
                      {candidate.recommendation}
                    </Badge>
                    <div>
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="text-xl font-bold">{candidate.recommendationConfidence}%</div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {candidate.recommendationSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Strengths & Risks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-green-600">Key Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {candidate.recommendationStrengths.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-amber-600">Risks & Mitigations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {candidate.recommendationRisks.map((item, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-start gap-2 text-amber-700">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {item.risk}
                          </div>
                          <div className="ml-6 text-muted-foreground text-xs mt-1">
                            Mitigation: {item.mitigation}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Human Decision */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Decision</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mb-4">
                    <Button
                      variant={selectedDecision === 'HIRE' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        selectedDecision === 'HIRE' && 'bg-green-500 hover:bg-green-600'
                      )}
                      onClick={() => setSelectedDecision('HIRE')}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Hire
                    </Button>
                    <Button
                      variant={selectedDecision === 'HOLD' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        selectedDecision === 'HOLD' && 'bg-amber-500 hover:bg-amber-600'
                      )}
                      onClick={() => setSelectedDecision('HOLD')}
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Hold
                    </Button>
                    <Button
                      variant={selectedDecision === 'NO_HIRE' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        selectedDecision === 'NO_HIRE' && 'bg-red-500 hover:bg-red-600'
                      )}
                      onClick={() => setSelectedDecision('NO_HIRE')}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      No Hire
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Add notes about your decision..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button className="mt-4 w-full" disabled={!selectedDecision}>
                    Submit Decision
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Score Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Application Score</span>
                    <span className="font-semibold text-green-600">{candidate.score}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">PRESS Values Avg</span>
                    <span className="font-semibold">{candidate.pressValuesAvg}%</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">BlueAI Confidence</span>
                    <span className="font-semibold">{candidate.recommendationConfidence}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Advance to Offer
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Final Interview
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Send Rejection
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}
