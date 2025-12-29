import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// James Okafor - Full profile data from mockup
const jamesOkaforFullProfile = {
  name: 'James Okafor',
  email: 'james.okafor@email.com',
  phone: '+234 802 345 6789',
  linkedinUrl: 'https://linkedin.com/in/jamesokafor',
  currentRole: 'Senior Backend Engineer (Tech Lead)',
  currentCompany: 'Paystack',
  yearsOfExperience: 6,
  location: 'Lagos, Nigeria',
  stage: 'PANEL' as const,
  score: 87,
  experienceMatchScore: 85,
  skillsMatchScore: 82,
  domainFitScore: 68,
  educationScore: 90,
  scoreExplanation: 'Strong technical background with relevant fintech experience at top companies (Paystack, Andela, Flutterwave). Skills align well with role requirements. Gap: No direct insurance industry experience, though regulatory compliance work at Paystack is transferable.',
  resumeSummary: 'Experienced backend engineer with 6 years building scalable distributed systems. Currently leading a team of 5 engineers at Paystack. Strong expertise in Node.js, Python, and cloud infrastructure. Track record of delivering high-impact projects including a payments processing system handling $50M+ monthly transactions.',
  workExperience: [
    {
      title: 'Senior Backend Engineer (Tech Lead)',
      company: 'Paystack',
      startDate: '2022-03',
      endDate: null,
      isCurrent: true,
      description: 'Led team of 5 engineers in building a new payment processing microservice',
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
      startDate: '2019-06',
      endDate: '2022-02',
      isCurrent: false,
      description: 'Built and maintained RESTful APIs for enterprise clients',
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
      startDate: '2018-01',
      endDate: '2019-05',
      isCurrent: false,
      description: 'Contributed to merchant dashboard development',
      highlights: [
        'Contributed to merchant dashboard serving 5,000+ businesses',
        'Wrote unit tests increasing code coverage from 45% to 78%',
      ],
      skills: ['JavaScript', 'React', 'Node.js'],
    },
  ],
  education: [
    {
      degree: 'B.Sc.',
      field: 'Computer Science',
      institution: 'University of Lagos',
      startYear: 2014,
      endYear: 2018,
      honors: 'First Class Honours',
    },
  ],
  skills: {
    languages: ['Node.js', 'TypeScript', 'Python', 'Django', 'Express.js', 'NestJS'],
    databases: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'],
    infrastructure: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
  },
  whyCuracel: "I'm excited about democratizing insurance access in Africa. The technical challenges of building reliable claims processing at scale align perfectly with my experience building payment systems. I want to apply my skills to solve problems that have real social impact.",
  salaryExpMin: 90000,
  salaryExpMax: 100000,
  salaryExpCurrency: 'USD',
  noticePeriod: '4 weeks',
  mbtiType: 'INTJ',
  pressValuesScores: {
    passionate: 88,
    relentless: 85,
    empowered: 82,
    senseOfUrgency: 76,
    seeingPossibilities: 80,
  },
  pressValuesAvg: 82,
  competencyScores: {
    systemDesign: 90,
    technicalLeadership: 85,
    problemSolving: 88,
    communication: 82,
    domainKnowledge: 65,
  },
  personalityProfile: {
    openness: 85,
    conscientiousness: 90,
    extraversion: 45,
    agreeableness: 70,
    neuroticism: 25,
  },
  teamFitAnalysis: {
    strengths: [
      "Strategic thinking complements team's execution focus",
      "High conscientiousness matches team's quality standards",
      'Calm under pressure (low neuroticism) good for incident response',
    ],
    considerations: [
      'Lower extraversion - may need encouragement to share ideas in groups',
    ],
  },
  mustValidate: [
    'Reason for leaving Paystack after strong tenure',
    'Interest in insurance domain specifically',
    'Team size and scope claims (5 engineers, $50M)',
  ],
  suggestedQuestions: [
    'What specifically draws you to Curacel and the insurance technology space?',
    'Tell me about leading the team of 5 at Paystack. What was your biggest challenge?',
    "What's motivating your move from Paystack after such strong performance?",
  ],
  recommendation: 'HIRE',
  recommendationConfidence: 85,
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
  decisionStatus: 'PENDING',
  source: 'linkedin',
  processingStatus: 'completed',
}

// Senior Backend Engineer - 24 candidates matching mockup
const seniorBackendCandidates = [
  // Panel Interview (3)
  { name: 'James Okafor', email: 'james.okafor@email.com', score: 87, stage: 'PANEL' as const, source: 'linkedin' },
  { name: 'Amaka Abubakar', email: 'amaka.abubakar@email.com', score: 76, stage: 'PANEL' as const, source: 'linkedin' },
  { name: 'Olusegun Adeyemi', email: 'olusegun.a@email.com', score: 79, stage: 'PANEL' as const, source: 'referral' },

  // Technical (5)
  { name: 'Adaeze Nwosu', email: 'adaeze.nwosu@email.com', score: 80, stage: 'TECHNICAL' as const, source: 'referral' },
  { name: 'Kelechi Okonkwo', email: 'kelechi.o@email.com', score: 74, stage: 'TECHNICAL' as const, source: 'linkedin' },
  { name: 'Grace Obi', email: 'grace.obi@email.com', score: 78, stage: 'TECHNICAL' as const, source: 'referral' },
  { name: 'Emmanuel Nnamdi', email: 'emmanuel.n@email.com', score: 73, stage: 'TECHNICAL' as const, source: 'careers-page' },
  { name: 'Chinedu Okeke', email: 'chinedu.o@email.com', score: 75, stage: 'TECHNICAL' as const, source: 'linkedin' },

  // HR Screen (6)
  { name: 'Sarah Chen', email: 'sarah.chen@email.com', score: 82, stage: 'HR_SCREEN' as const, source: 'careers-page' },
  { name: 'Tunde Olawale', email: 'tunde.o@email.com', score: 71, stage: 'HR_SCREEN' as const, source: 'careers-page' },
  { name: 'Ngozi Eze', email: 'ngozi.eze@email.com', score: 69, stage: 'HR_SCREEN' as const, source: 'linkedin' },
  { name: 'Fatima Bello', email: 'fatima.b@email.com', score: 70, stage: 'HR_SCREEN' as const, source: 'referral' },
  { name: 'Oluwaseun Dada', email: 'oluwaseun.d@email.com', score: 66, stage: 'HR_SCREEN' as const, source: 'linkedin' },
  { name: 'Aisha Mohammed', email: 'aisha.m@email.com', score: 72, stage: 'HR_SCREEN' as const, source: 'careers-page' },

  // Applied (10)
  { name: 'Blessing Musa', email: 'blessing.m@email.com', score: 68, stage: 'APPLIED' as const, source: 'linkedin' },
  { name: 'David Peters', email: 'david.p@email.com', score: 55, stage: 'APPLIED' as const, source: 'careers-page' },
  { name: 'John Adams', email: 'john.adams@email.com', score: 48, stage: 'APPLIED' as const, source: 'referral' },
  { name: 'Michael Brown', email: 'michael.b@email.com', score: 52, stage: 'APPLIED' as const, source: 'careers-page' },
  { name: 'Chisom Ike', email: 'chisom.i@email.com', score: 61, stage: 'APPLIED' as const, source: 'linkedin' },
  { name: 'Obinna Uche', email: 'obinna.u@email.com', score: 58, stage: 'APPLIED' as const, source: 'linkedin' },
  { name: 'Precious Ogbonna', email: 'precious.o@email.com', score: 45, stage: 'APPLIED' as const, source: 'careers-page' },
  { name: 'Victor Onyekachi', email: 'victor.o@email.com', score: 50, stage: 'APPLIED' as const, source: 'referral' },
  { name: 'Esther Adewale', email: 'esther.a@email.com', score: 63, stage: 'APPLIED' as const, source: 'linkedin' },
  { name: 'Daniel Okonkwo', email: 'daniel.o@email.com', score: 59, stage: 'APPLIED' as const, source: 'careers-page' },
]

// Product Designer - 12 candidates
const designerCandidates = [
  // Panel (2)
  { name: 'Chika Adeola', email: 'chika.adeola@email.com', score: 89, stage: 'PANEL' as const, source: 'dribbble' },
  { name: 'Femi Adeleke', email: 'femi.a@email.com', score: 84, stage: 'PANEL' as const, source: 'behance' },

  // Technical (3)
  { name: 'Emma Watson', email: 'emma.w@email.com', score: 85, stage: 'TECHNICAL' as const, source: 'linkedin' },
  { name: 'Nkechi Osagie', email: 'nkechi.o@email.com', score: 81, stage: 'TECHNICAL' as const, source: 'dribbble' },
  { name: 'Taiwo Bankole', email: 'taiwo.b@email.com', score: 77, stage: 'TECHNICAL' as const, source: 'referral' },

  // HR Screen (3)
  { name: 'Yusuf Ahmed', email: 'yusuf.a@email.com', score: 72, stage: 'HR_SCREEN' as const, source: 'careers-page' },
  { name: 'Chidinma Okafor', email: 'chidinma.o@email.com', score: 75, stage: 'HR_SCREEN' as const, source: 'linkedin' },
  { name: 'Kunle Solanke', email: 'kunle.s@email.com', score: 70, stage: 'HR_SCREEN' as const, source: 'behance' },

  // Applied (3)
  { name: 'Linda Johnson', email: 'linda.j@email.com', score: 68, stage: 'APPLIED' as const, source: 'linkedin' },
  { name: 'Olumide Balogun', email: 'olumide.b@email.com', score: 62, stage: 'APPLIED' as const, source: 'dribbble' },
  { name: 'Sandra Eze', email: 'sandra.e@email.com', score: 58, stage: 'APPLIED' as const, source: 'careers-page' },

  // Hired (1)
  { name: 'Peter Okoro', email: 'peter.o@email.com', score: 95, stage: 'HIRED' as const, source: 'referral' },
]

// Growth Lead - 8 candidates
const growthCandidates = [
  // Panel (1)
  { name: 'Segun Ayodeji', email: 'segun.a@email.com', score: 86, stage: 'PANEL' as const, source: 'linkedin' },

  // Technical (2)
  { name: 'Tobi Falana', email: 'tobi.f@email.com', score: 83, stage: 'TECHNICAL' as const, source: 'linkedin' },
  { name: 'Adaobi Nwankwo', email: 'adaobi.n@email.com', score: 78, stage: 'TECHNICAL' as const, source: 'referral' },

  // HR Screen (2)
  { name: 'Rachel Green', email: 'rachel.g@email.com', score: 79, stage: 'HR_SCREEN' as const, source: 'careers-page' },
  { name: 'Uche Nwosu', email: 'uche.n@email.com', score: 74, stage: 'HR_SCREEN' as const, source: 'linkedin' },

  // Applied (2)
  { name: 'Chris Evans', email: 'chris.e@email.com', score: 62, stage: 'APPLIED' as const, source: 'referral' },
  { name: 'Bisi Adeniran', email: 'bisi.a@email.com', score: 55, stage: 'APPLIED' as const, source: 'careers-page' },

  // Offer (1)
  { name: 'Kehinde Ajayi', email: 'kehinde.a@email.com', score: 91, stage: 'OFFER' as const, source: 'linkedin' },
]

async function main() {
  // Clear existing candidates first
  await prisma.jobCandidate.deleteMany()
  console.log('Cleared existing candidates')

  // Get all jobs
  const jobs = await prisma.job.findMany()

  if (jobs.length === 0) {
    console.log('No jobs found. Run seed-mock-job.ts first.')
    return
  }

  // Find jobs by title
  const engineeringJob = jobs.find(j => j.title.toLowerCase().includes('backend') || j.title.toLowerCase().includes('engineer'))
  const designerJob = jobs.find(j => j.title.toLowerCase().includes('designer') || j.title.toLowerCase().includes('design'))
  const growthJob = jobs.find(j => j.title.toLowerCase().includes('growth') || j.title.toLowerCase().includes('lead'))

  // Seed engineering candidates (24 total)
  if (engineeringJob) {
    console.log(`\nSeeding ${seniorBackendCandidates.length} candidates for: ${engineeringJob.title}`)

    // First, create James Okafor with full profile data
    try {
      await prisma.jobCandidate.create({
        data: {
          jobId: engineeringJob.id,
          ...jamesOkaforFullProfile,
          processedAt: new Date(),
          appliedAt: new Date('2025-12-16'),
        },
      })
      console.log(`  + James Okafor (PANEL) - FULL PROFILE`)
    } catch (e) {
      console.log(`  - Skipped James Okafor: ${(e as Error).message}`)
    }

    // Then create remaining candidates with basic data
    for (const candidate of seniorBackendCandidates.filter(c => c.email !== 'james.okafor@email.com')) {
      try {
        await prisma.jobCandidate.create({
          data: { ...candidate, jobId: engineeringJob.id },
        })
        console.log(`  + ${candidate.name} (${candidate.stage})`)
      } catch (e) {
        console.log(`  - Skipped ${candidate.name}: ${(e as Error).message}`)
      }
    }
  }

  // Seed designer candidates (12 total)
  if (designerJob) {
    console.log(`\nSeeding ${designerCandidates.length} candidates for: ${designerJob.title}`)
    for (const candidate of designerCandidates) {
      try {
        await prisma.jobCandidate.create({
          data: { ...candidate, jobId: designerJob.id },
        })
        console.log(`  + ${candidate.name} (${candidate.stage})`)
      } catch (e) {
        console.log(`  - Skipped ${candidate.name}: ${(e as Error).message}`)
      }
    }
  }

  // Seed growth candidates (8 total)
  if (growthJob) {
    console.log(`\nSeeding ${growthCandidates.length} candidates for: ${growthJob.title}`)
    for (const candidate of growthCandidates) {
      try {
        await prisma.jobCandidate.create({
          data: { ...candidate, jobId: growthJob.id },
        })
        console.log(`  + ${candidate.name} (${candidate.stage})`)
      } catch (e) {
        console.log(`  - Skipped ${candidate.name}: ${(e as Error).message}`)
      }
    }
  }

  // Print summary
  const counts = await prisma.jobCandidate.groupBy({
    by: ['jobId'],
    _count: true,
  })

  console.log('\n=== Summary ===')
  for (const count of counts) {
    const job = jobs.find(j => j.id === count.jobId)
    console.log(`${job?.title}: ${count._count} candidates`)
  }

  console.log('\nDone seeding mock candidates!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
