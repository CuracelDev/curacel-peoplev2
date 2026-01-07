import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FLOW_NAME = 'Product Designer Flow'
const FLOW_STAGES = ['Apply', 'People Chat', 'Assessment', 'Panel', 'Offer']
const JOB_TITLE = 'Product Designer'
const CANDIDATE_EMAIL = 'peter.okoro@email.com'

async function getOrCreateOrganization() {
  const existing = await prisma.organization.findFirst()
  if (existing) return existing

  return prisma.organization.create({
    data: {
      name: 'Curacel',
    },
  })
}

async function getOrCreateFlowSnapshot() {
  const flow = await prisma.hiringFlow.findUnique({
    where: { name: FLOW_NAME },
    include: {
      snapshots: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  if (!flow) {
    const created = await prisma.hiringFlow.create({
      data: {
        name: FLOW_NAME,
        description: 'Hiring flow for product design roles.',
        stages: FLOW_STAGES,
        isDefault: false,
        isActive: true,
        snapshots: {
          create: {
            version: 1,
            stages: FLOW_STAGES,
          },
        },
      },
      include: { snapshots: true },
    })

    return created.snapshots[0].id
  }

  const latestSnapshot = flow.snapshots[0]
  const latestStages = latestSnapshot?.stages ?? []
  const stagesMatch = JSON.stringify(latestStages) === JSON.stringify(FLOW_STAGES)

  if (!latestSnapshot || !stagesMatch) {
    const nextVersion = latestSnapshot ? latestSnapshot.version + 1 : 1
    const snapshot = await prisma.hiringFlowSnapshot.create({
      data: {
        flowId: flow.id,
        version: nextVersion,
        stages: FLOW_STAGES,
      },
    })

    return snapshot.id
  }

  return latestSnapshot.id
}

async function getOrCreateJob(snapshotId: string) {
  const existing = await prisma.job.findFirst({
    where: { title: JOB_TITLE },
  })

  if (existing) {
    return prisma.job.update({
      where: { id: existing.id },
      data: {
        department: 'Design',
        employmentType: 'full-time',
        status: 'ACTIVE',
        priority: 3,
        deadline: new Date('2026-02-15T00:00:00Z'),
        hiresCount: 1,
        salaryMin: 90000,
        salaryMax: 140000,
        salaryCurrency: 'USD',
        salaryFrequency: 'annually',
        locations: ['Remote', 'Lagos, NG'],
        hiringFlowSnapshotId: snapshotId,
      },
    })
  }

  return prisma.job.create({
    data: {
      title: JOB_TITLE,
      department: 'Design',
      employmentType: 'full-time',
      status: 'ACTIVE',
      priority: 3,
      deadline: new Date('2026-02-15T00:00:00Z'),
      hiresCount: 1,
      salaryMin: 90000,
      salaryMax: 140000,
      salaryCurrency: 'USD',
      salaryFrequency: 'annually',
      locations: ['Remote', 'Lagos, NG'],
      hiringFlowSnapshotId: snapshotId,
    },
  })
}

async function main() {
  console.log('Seeding a single mock candidate...')

  const organization = await getOrCreateOrganization()
  const snapshotId = await getOrCreateFlowSnapshot()
  const job = await getOrCreateJob(snapshotId)

  const candidateData = {
    name: 'Peter Okoro',
    email: CANDIDATE_EMAIL,
    phone: '+234 801 555 0142',
    linkedinUrl: 'linkedin.com/in/peterokoro',
    currentRole: 'Product Designer',
    currentCompany: 'Kredi',
    yearsOfExperience: 6,
    location: 'Lagos, Nigeria',
    stage: 'PANEL' as const,
    score: 85,
    experienceMatchScore: 84,
    skillsMatchScore: 92,
    domainFitScore: 76,
    educationScore: 88,
    scoreExplanation: 'Strong product portfolio with cross-functional experience and proven UX delivery.',
    resumeSummary: 'Product designer with 6 years of experience shipping B2B and consumer finance products. Led design for onboarding flows and lending journeys with measurable conversion impact.',
    workExperience: [
      {
        title: 'Senior Product Designer',
        company: 'Kredi',
        startDate: '2022-03',
        endDate: null,
        isCurrent: true,
        description: 'Led design for lending and onboarding products.',
        highlights: [
          'Improved onboarding conversion by 18% through flow redesign',
          'Partnered with engineering to launch a new credit decisioning UI',
          'Built and scaled the design system used across 4 squads',
        ],
        skills: ['Figma', 'Design Systems', 'User Research', 'Product Strategy'],
      },
      {
        title: 'Product Designer',
        company: 'Paystack',
        startDate: '2019-01',
        endDate: '2022-02',
        isCurrent: false,
        description: 'Designed merchant dashboard features and analytics.',
        highlights: [
          'Shipped payments dashboard improvements with 35% higher task completion',
          'Conducted usability tests across 6 customer segments',
        ],
        skills: ['UX Research', 'Interaction Design', 'Prototyping'],
      },
    ],
    education: [
      {
        degree: 'B.Sc.',
        field: 'Computer Science',
        institution: 'University of Lagos',
        startYear: 2014,
        endYear: 2018,
        honors: 'Second Class Upper',
      },
    ],
    skills: {
      languages: ['Product Strategy', 'UX Design', 'Interaction Design'],
      databases: [],
      infrastructure: [],
      frameworks: ['Figma', 'Maze', 'Notion', 'Zeroheight'],
    },
    whyCuracel: 'Curacel is solving meaningful problems in insurance access, and I want to build products that simplify critical workflows for customers.',
    salaryExpMin: 90000,
    salaryExpMax: 110000,
    salaryExpCurrency: 'USD',
    noticePeriod: '4 weeks',
    mbtiType: 'INTJ',
    pressValuesScores: {
      passionate: 82,
      relentless: 84,
      empowered: 80,
      senseOfUrgency: 78,
      seeingPossibilities: 86,
    },
    pressValuesAvg: 82,
    legacyCompetencyScores: {
      userResearch: 88,
      visualDesign: 90,
      productThinking: 86,
      collaboration: 84,
      communication: 83,
    },
    personalityProfile: {
      openness: 84,
      conscientiousness: 88,
      extraversion: 52,
      agreeableness: 76,
      neuroticism: 28,
    },
    teamFitAnalysis: {
      strengths: [
        'Balances UX rigor with product delivery speed',
        'Strong collaboration with engineering and research',
        'Clear communication style during critiques',
      ],
      considerations: [
        'Prefers structured feedback cycles and clear ownership',
      ],
    },
    mustValidate: [
      'Leadership scope across squads and IC versus lead responsibilities',
      'Experience shipping in regulated or compliance-heavy environments',
      'Interest in insurance workflows and claims automation',
    ],
    suggestedQuestions: [
      'Walk us through a product you shipped end-to-end and the impact it had.',
      'How do you balance speed with quality in design reviews?',
      'What interests you most about the insurance domain?',
    ],
    recommendation: 'HOLD',
    recommendationConfidence: 78,
    recommendationSummary: 'Strong product design fundamentals and delivery track record. Validate domain interest and leadership scope at the panel stage.',
    recommendationStrengths: [
      'End-to-end product thinking with measurable impact',
      'Strong design systems experience',
      'Clear communication across teams',
    ],
    recommendationRisks: [
      { risk: 'Limited insurance domain exposure', mitigation: 'Test domain learning ability during panel' },
    ],
    decisionStatus: 'PENDING',
    source: 'OUTBOUND' as const,
    processingStatus: 'completed',
    appliedAt: new Date('2025-12-16T09:30:00Z'),
    processedAt: new Date('2025-12-16T10:00:00Z'),
    documents: [
      {
        id: 'doc-portfolio',
        name: 'Peter_Okoro_Portfolio.pdf',
        type: 'portfolio',
        url: '/documents/peter-okoro/portfolio.pdf',
        uploadedAt: '2025-12-16T09:35:00Z',
      },
      {
        id: 'doc-resume',
        name: 'Peter_Okoro_Resume.pdf',
        type: 'resume',
        url: '/documents/peter-okoro/resume.pdf',
        uploadedAt: '2025-12-16T09:34:00Z',
      },
    ],
  }

  const candidate = await prisma.jobCandidate.upsert({
    where: {
      jobId_email: {
        jobId: job.id,
        email: candidateData.email,
      },
    },
    update: {
      ...candidateData,
    },
    create: {
      jobId: job.id,
      ...candidateData,
    },
  })

  const assessmentTemplate = await prisma.assessmentTemplate.findFirst({
    where: {
      name: 'Design Case Study',
      organizationId: organization.id,
    },
  })

  const template = assessmentTemplate ?? await prisma.assessmentTemplate.create({
    data: {
      organizationId: organization.id,
      name: 'Design Case Study',
      description: 'Case study to evaluate UX thinking and execution.',
      type: 'CUSTOM',
      durationMinutes: 180,
      instructions: 'Complete the case study and submit your final deck.',
    },
  })

  await prisma.candidateAssessment.upsert({
    where: {
      candidateId_templateId: {
        candidateId: candidate.id,
        templateId: template.id,
      },
    },
    update: {
      status: 'COMPLETED',
      overallScore: 90,
      summary: 'Clear problem framing with strong UX rationale and polished execution.',
      strengths: ['Structured problem analysis', 'Clear user flows', 'Visual polish'],
      risks: ['Limited experimentation on edge cases'],
      startedAt: new Date('2025-12-20T10:00:00Z'),
      completedAt: new Date('2025-12-20T15:00:00Z'),
    },
    create: {
      candidateId: candidate.id,
      templateId: template.id,
      status: 'COMPLETED',
      overallScore: 90,
      summary: 'Clear problem framing with strong UX rationale and polished execution.',
      strengths: ['Structured problem analysis', 'Clear user flows', 'Visual polish'],
      risks: ['Limited experimentation on edge cases'],
      startedAt: new Date('2025-12-20T10:00:00Z'),
      completedAt: new Date('2025-12-20T15:00:00Z'),
    },
  })

  await prisma.candidateInterview.deleteMany({
    where: {
      candidateId: candidate.id,
      stage: {
        in: ['HR_SCREEN', 'PANEL'],
      },
    },
  })

  await prisma.candidateInterview.create({
    data: {
      candidateId: candidate.id,
      stage: 'HR_SCREEN',
      stageName: 'People Chat',
      status: 'COMPLETED',
      scheduledAt: new Date('2025-12-17T10:00:00Z'),
      completedAt: new Date('2025-12-17T10:45:00Z'),
      duration: 45,
      score: 82,
      overallScore: 82,
      feedback: 'Strong communication and product thinking. Good culture alignment.',
      interviewers: [
        { name: 'Sarah Chen', email: 'sarah.chen@curacel.co', role: 'People Lead' },
      ],
    },
  })

  await prisma.candidateInterview.create({
    data: {
      candidateId: candidate.id,
      stage: 'PANEL',
      stageName: 'Panel',
      status: 'IN_PROGRESS',
      scheduledAt: new Date('2025-12-22T14:00:00Z'),
      duration: 60,
      interviewers: [
        { name: 'Chris Ade', email: 'chris.ade@curacel.co', role: 'Design Lead' },
        { name: 'Mariam Musa', email: 'mariam.musa@curacel.co', role: 'PM' },
        { name: 'Tosin Adebayo', email: 'tosin.adebayo@curacel.co', role: 'Engineer' },
      ],
    },
  })

  await prisma.candidateAIAnalysis.updateMany({
    where: { candidateId: candidate.id },
    data: { isLatest: false },
  })

  const latestAnalysis = await prisma.candidateAIAnalysis.findFirst({
    where: { candidateId: candidate.id },
    orderBy: { version: 'desc' },
  })

  const nextVersion = latestAnalysis ? latestAnalysis.version + 1 : 1

  await prisma.candidateAIAnalysis.create({
    data: {
      candidateId: candidate.id,
      version: nextVersion,
      analysisType: 'COMPREHENSIVE',
      triggerStage: 'PANEL',
      triggerEvent: 'manual',
      summary: 'Peter is a solid product designer with strong UX fundamentals, clear product thinking, and consistent delivery experience in fintech.',
      strengths: [
        'Demonstrates clear problem framing and structured UX rationale',
        'Comfortable collaborating across product and engineering',
        'Portfolio shows strong visual and interaction design skills',
      ],
      concerns: [
        { title: 'Domain familiarity', description: 'Limited insurance-specific experience', severity: 'medium' },
      ],
      recommendations: [
        'Validate domain learning speed during panel discussion',
        'Probe leadership scope across squads and decision ownership',
      ],
      overallScore: 85,
      scoreBreakdown: {
        experienceMatchScore: 84,
        skillsMatchScore: 92,
        domainFitScore: 76,
        educationScore: 88,
        pressValuesAvg: 82,
        interviewAverage: 82,
        assessmentAverage: 90,
      },
      recommendation: 'HOLD',
      confidence: 78,
      mustValidatePoints: candidateData.mustValidate,
      nextStageQuestions: candidateData.suggestedQuestions,
      aiProvider: 'OPENAI',
      aiModel: 'gpt-4',
      isLatest: true,
      tabSummaries: {
        overview: 'Strong product design candidate awaiting panel feedback.',
        application: 'Resume and portfolio demonstrate breadth in fintech UX.',
        interviews: 'People chat completed; panel in progress.',
        values: 'PRESS alignment appears solid based on assessed scores.',
      },
      pressValues: {
        passionate: 4.1,
        relentless: 4.2,
        empowered: 4.0,
        senseOfUrgency: 3.9,
        seeingPossibilities: 4.3,
      },
    },
  })

  console.log(`Seeded candidate ${candidate.name} for ${job.title}.`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
