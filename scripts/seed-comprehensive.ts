import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// INTERVIEW STAGE TEMPLATES
// ============================================

const interviewStageTemplates = [
  {
    name: 'People Chat',
    stage: 'HR_SCREEN',
    description: 'Initial conversation to assess culture fit and communication skills',
    criteria: [
      { name: 'Communication Skills', description: 'Clear, articulate, and engaging communication', weight: 5 },
      { name: 'Culture Fit', description: 'Alignment with PRESS values and company culture', weight: 5 },
      { name: 'Motivation', description: 'Genuine interest in the role and company mission', weight: 4 },
      { name: 'Career Goals', description: 'Clear career trajectory and alignment with role', weight: 3 },
    ],
  },
  {
    name: 'Coding Test',
    stage: 'TECHNICAL',
    description: 'Technical assessment of coding skills and problem-solving ability',
    criteria: [
      { name: 'Problem Solving', description: 'Ability to break down and solve complex problems', weight: 5 },
      { name: 'Code Quality', description: 'Clean, readable, and maintainable code', weight: 5 },
      { name: 'Technical Knowledge', description: 'Understanding of core concepts and best practices', weight: 4 },
      { name: 'System Design', description: 'Ability to design scalable systems', weight: 4 },
    ],
  },
  {
    name: 'Team Chat',
    stage: 'TEAM_CHAT',
    description: 'Panel interview with potential team members',
    criteria: [
      { name: 'Collaboration', description: 'Ability to work effectively with team members', weight: 5 },
      { name: 'Technical Depth', description: 'Deep understanding of technical domain', weight: 4 },
      { name: 'Leadership Potential', description: 'Shows initiative and leadership qualities', weight: 3 },
      { name: 'Problem Solving Approach', description: 'Structured approach to solving problems', weight: 4 },
    ],
  },
  {
    name: 'CEO Chat',
    stage: 'CEO_CHAT',
    description: 'Final interview with CEO',
    criteria: [
      { name: 'Vision Alignment', description: 'Understanding and alignment with company vision', weight: 5 },
      { name: 'Leadership', description: 'Demonstrates leadership potential', weight: 4 },
      { name: 'Growth Mindset', description: 'Commitment to learning and growth', weight: 4 },
      { name: 'Impact Potential', description: 'Potential to make significant contributions', weight: 5 },
    ],
  },
]

// ============================================
// SAMPLE INTERVIEWS FOR JAMES OKAFOR
// ============================================

interface InterviewerData {
  name: string
  email: string
  role: string
  status: string
  overallRating?: number
  recommendation?: string
  notes?: string
  scores?: Array<{ criteriaName: string; score: number; notes: string }>
  customQuestions?: Array<{ question: string; answer: string; score: number }>
}

interface InterviewData {
  stage: string
  stageName: string
  status: string
  scheduledAt: Date
  completedAt?: Date
  duration: number
  score?: number
  feedback?: string
  firefliesMeetingId?: string
  firefliesTranscript?: string
  firefliesSummary?: string
  firefliesActionItems?: string[]
  firefliesHighlights?: Array<{ timestamp: string; text: string }>
  interviewers: InterviewerData[]
}

const jamesOkaforInterviews: InterviewData[] = [
  {
    stage: 'HR_SCREEN',
    stageName: 'People Chat',
    status: 'COMPLETED',
    scheduledAt: new Date('2025-12-17T10:00:00Z'),
    completedAt: new Date('2025-12-17T10:45:00Z'),
    duration: 45,
    score: 85,
    feedback: 'Strong candidate with excellent communication skills and genuine passion for the mission.',
    firefliesMeetingId: 'ff-meeting-001',
    firefliesTranscript: 'Full transcript available in Fireflies',
    firefliesSummary: 'James demonstrated excellent communication skills and clear career goals. He showed genuine interest in Curacel\'s mission of democratizing insurance access in Africa. His experience at Paystack is highly relevant.',
    firefliesActionItems: [
      'Schedule Coding Test',
      'Send technical assessment link',
      'Verify references from Paystack',
    ],
    firefliesHighlights: [
      { timestamp: '05:12', text: 'Discussed experience leading team of 5 engineers at Paystack' },
      { timestamp: '18:45', text: 'Explained interest in insurance technology space' },
      { timestamp: '32:10', text: 'Shared approach to mentoring junior developers' },
    ],
    interviewers: [
      {
        name: 'Sarah Chen',
        email: 'sarah.chen@curacel.co',
        role: 'People Team Lead',
        status: 'SUBMITTED',
        overallRating: 4,
        recommendation: 'YES',
        notes: 'Excellent communication, clear career goals, strong culture fit. Recommend advancing.',
        scores: [
          { criteriaName: 'Communication Skills', score: 5, notes: 'Very articulate and engaging' },
          { criteriaName: 'Culture Fit', score: 4, notes: 'Strong alignment with PRESS values' },
          { criteriaName: 'Motivation', score: 4, notes: 'Genuine interest in our mission' },
          { criteriaName: 'Career Goals', score: 4, notes: 'Clear trajectory, good fit for role' },
        ],
      },
    ],
  },
  {
    stage: 'TECHNICAL',
    stageName: 'Coding Test',
    status: 'COMPLETED',
    scheduledAt: new Date('2025-12-19T14:00:00Z'),
    completedAt: new Date('2025-12-19T15:30:00Z'),
    duration: 90,
    score: 92,
    feedback: 'Exceptional problem-solving skills. Clean, well-tested code. Strong system design thinking.',
    interviewers: [
      {
        name: 'David Kim',
        email: 'david.kim@curacel.co',
        role: 'Engineering Manager',
        status: 'SUBMITTED',
        overallRating: 5,
        recommendation: 'STRONG_YES',
        notes: 'Exceptional problem-solving, clean code, great system design thinking. One of the best technical interviews I\'ve conducted.',
        scores: [
          { criteriaName: 'Problem Solving', score: 5, notes: 'Optimal solutions with clear reasoning' },
          { criteriaName: 'Code Quality', score: 5, notes: 'Clean, readable, well-tested' },
          { criteriaName: 'Technical Knowledge', score: 5, notes: 'Deep understanding of backend systems' },
          { criteriaName: 'System Design', score: 4, notes: 'Good scalability considerations' },
        ],
        customQuestions: [
          { question: 'Describe a time you debugged a production issue', answer: 'At Paystack, we had a payment processing outage. I led the investigation, identified a race condition in our queue processing, and implemented a fix with proper locking mechanisms. We reduced similar incidents by 90%.', score: 5 },
        ],
      },
    ],
  },
  {
    stage: 'TEAM_CHAT',
    stageName: 'Team Chat',
    status: 'SCHEDULED',
    scheduledAt: new Date('2025-12-23T11:00:00Z'),
    duration: 60,
    interviewers: [
      { name: 'Alice Wong', email: 'alice.wong@curacel.co', role: 'Product Manager', status: 'PENDING' },
      { name: 'Bob Smith', email: 'bob.smith@curacel.co', role: 'Tech Lead', status: 'PENDING' },
      { name: 'Carol Davis', email: 'carol.davis@curacel.co', role: 'Senior Engineer', status: 'PENDING' },
    ],
  },
]

// ============================================
// DOCUMENTS FOR JAMES OKAFOR
// ============================================

const jamesOkaforDocuments = [
  {
    id: 'doc-001',
    name: 'Resume_JamesOkafor.pdf',
    type: 'resume',
    url: '/documents/james-okafor/resume.pdf',
    uploadedAt: '2025-12-16T09:30:00Z',
  },
  {
    id: 'doc-002',
    name: 'Portfolio_JamesOkafor.pdf',
    type: 'portfolio',
    url: '/documents/james-okafor/portfolio.pdf',
    uploadedAt: '2025-12-16T09:31:00Z',
  },
  {
    id: 'doc-003',
    name: 'CoverLetter_JamesOkafor.pdf',
    type: 'cover_letter',
    url: '/documents/james-okafor/cover-letter.pdf',
    uploadedAt: '2025-12-16T09:32:00Z',
  },
]

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting comprehensive seed...\n')

  // 1. Create interview stage templates
  console.log('📋 Creating interview stage templates...')
  for (const template of interviewStageTemplates) {
    const { criteria, ...templateData } = template

    // Check if template already exists
    const existing = await prisma.interviewStageTemplate.findFirst({
      where: { name: template.name, jobId: null },
    })

    if (existing) {
      console.log(`  - Skipped ${template.name} (already exists)`)
      continue
    }

    const created = await prisma.interviewStageTemplate.create({
      data: {
        ...templateData,
        isActive: true,
        criteria: {
          create: criteria.map((c, idx) => ({
            ...c,
            sortOrder: idx,
          })),
        },
      },
      include: { criteria: true },
    })
    console.log(`  + ${created.name} with ${created.criteria.length} criteria`)
  }

  // 2. Find James Okafor candidate
  console.log('\n👤 Finding James Okafor candidate...')
  const jamesOkafor = await prisma.jobCandidate.findFirst({
    where: { email: 'james.okafor@email.com' },
  })

  if (!jamesOkafor) {
    console.log('  - James Okafor not found. Run seed-mock-candidates.ts first.')
    return
  }

  console.log(`  + Found James Okafor (ID: ${jamesOkafor.id})`)

  // 3. Update James with documents
  console.log('\n📄 Adding documents to James Okafor...')
  await prisma.jobCandidate.update({
    where: { id: jamesOkafor.id },
    data: { documents: jamesOkaforDocuments },
  })
  console.log(`  + Added ${jamesOkaforDocuments.length} documents`)

  // 4. Create interviews for James Okafor
  console.log('\n🎤 Creating interviews for James Okafor...')

  // First, delete existing interviews for this candidate
  await prisma.candidateInterview.deleteMany({
    where: { candidateId: jamesOkafor.id },
  })

  for (const interview of jamesOkaforInterviews) {
    const { interviewers, ...interviewData } = interview

    // Find the stage template
    const stageTemplate = await prisma.interviewStageTemplate.findFirst({
      where: { stage: interview.stage, jobId: null },
      include: { criteria: true },
    })

    // Create the interview
    const createdInterview = await prisma.candidateInterview.create({
      data: {
        candidateId: jamesOkafor.id,
        stage: interviewData.stage,
        stageName: interviewData.stageName,
        status: interviewData.status,
        scheduledAt: interviewData.scheduledAt,
        completedAt: interviewData.completedAt,
        duration: interviewData.duration,
        score: interviewData.score,
        feedback: interviewData.feedback,
        stageTemplateId: stageTemplate?.id,
        firefliesMeetingId: interviewData.firefliesMeetingId,
        firefliesTranscript: interviewData.firefliesTranscript,
        firefliesSummary: interviewData.firefliesSummary,
        firefliesActionItems: interviewData.firefliesActionItems,
        firefliesHighlights: interviewData.firefliesHighlights,
      },
    })

    console.log(`  + ${interview.stageName} (${interview.status})`)

    // Create interviewer tokens and evaluations
    for (const interviewer of interviewers) {
      // Create interviewer token
      const token = await prisma.interviewerToken.create({
        data: {
          interviewId: createdInterview.id,
          interviewerName: interviewer.name,
          interviewerEmail: interviewer.email,
          interviewerRole: interviewer.role,
          evaluationStatus: interviewer.status,
          overallRating: interviewer.overallRating,
          recommendation: interviewer.recommendation,
          evaluationNotes: interviewer.notes,
          customQuestions: interviewer.customQuestions,
          submittedAt: interviewer.status === 'SUBMITTED' ? new Date() : null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      // If submitted and has scores, create evaluation
      if (interviewer.status === 'SUBMITTED' && interviewer.scores && stageTemplate) {
        const evaluation = await prisma.interviewEvaluation.create({
          data: {
            interviewId: createdInterview.id,
            stageTemplateId: stageTemplate.id,
            evaluatorId: token.id, // Use token ID as evaluator ID for now
            evaluatorName: interviewer.name,
            evaluatorEmail: interviewer.email,
            overallScore: interviewer.overallRating,
            overallNotes: interviewer.notes,
            recommendation: interviewer.recommendation,
            submittedAt: new Date(),
          },
        })

        // Create criteria scores
        for (const score of interviewer.scores) {
          const criteria = stageTemplate.criteria.find(c => c.name === score.criteriaName)
          if (criteria) {
            await prisma.interviewCriteriaScore.create({
              data: {
                evaluationId: evaluation.id,
                criteriaId: criteria.id,
                score: score.score,
                notes: score.notes,
              },
            })
          }
        }
      }

      console.log(`    → ${interviewer.name} (${interviewer.status})`)
    }
  }

  // 5. Print summary
  console.log('\n=== Summary ===')

  const templateCount = await prisma.interviewStageTemplate.count({ where: { jobId: null } })
  console.log(`Interview Stage Templates: ${templateCount}`)

  const interviewCount = await prisma.candidateInterview.count({
    where: { candidateId: jamesOkafor.id },
  })
  console.log(`Interviews for James Okafor: ${interviewCount}`)

  const tokenCount = await prisma.interviewerToken.count()
  console.log(`Interviewer Tokens: ${tokenCount}`)

  const evaluationCount = await prisma.interviewEvaluation.count()
  console.log(`Interview Evaluations: ${evaluationCount}`)

  console.log('\n✅ Comprehensive seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
