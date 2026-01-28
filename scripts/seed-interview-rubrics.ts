import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Executive Ops HR Screen Rubric
const execOpsHRScreenCriteria = [
  { name: 'Role Understanding & Motivation', description: 'Understands the Executive Operations role, defines operational leverage, comfortable with AI workflow automation intersection, understands being a force multiplier for leadership', weight: 5 },
  { name: 'Curiosity & Problem Solving', description: 'Can identify and fix messy processes, approaches new systems systematically, demonstrates first-principles thinking that leads to significant changes', weight: 5 },
  { name: 'Ownership & Bias for Action', description: 'Delivers results without formal authority, ensures projects maintain momentum, proud of end-to-end delivery', weight: 5 },
  { name: 'AI Familiarity & Systems Thinking', description: 'Experience with AI/automation tools (Notion AI, n8n, Zapier, ChatGPT, Claude), can build workflows and integrations', weight: 4 },
  { name: 'Communication Skills', description: 'Clear and effective verbal communication, can articulate complex ideas simply', weight: 4 },
  { name: 'Cultural Fit', description: 'Alignment with PRESS values, demonstrates passion, growth mindset, and sense of urgency', weight: 3 },
]

// Executive Ops Panel Rubric
const execOpsPanelCriteria = [
  { name: 'Incident Management', description: 'Can manage sudden incidents from third-party providers, stakeholder communication, post-mortem follow-up', weight: 5 },
  { name: 'LLM & Automation Knowledge', description: 'Understands when to use different LLMs, can design workflows using AI tools, knows limitations of LLMs', weight: 5 },
  { name: 'Practical Automation Experience', description: 'Has automated workflows using technology tools, understands tech stack choices for automation', weight: 4 },
  { name: 'Stakeholder Management', description: 'Manages stakeholders when timelines slip, maintains morale and focus under pressure', weight: 4 },
  { name: 'AI Agent Building', description: 'Experience building AI agents that work autonomously with minimal human interaction', weight: 3 },
  { name: 'Evaluation & Testing', description: 'Approach to evaluating and testing automations before deployment', weight: 3 },
]

// Senior PM Panel Rubric
const seniorPMPanelCriteria = [
  { name: 'AI/ML Product Thinking', description: 'Can design products using AI technologies vs rule-based logic, understands AI tradeoffs and risks', weight: 5 },
  { name: 'System Design', description: 'Can design reliable systems (e.g., reconciliation between collections and disbursements), thinks about edge cases', weight: 5 },
  { name: 'Technical Debt Management', description: 'Handles communicating and managing technical debt between engineering and stakeholders', weight: 4 },
  { name: 'Data & Analytics', description: 'Defines metrics, understands fraud patterns, can create trust scores and dashboards', weight: 4 },
  { name: 'Go-to-Market Strategy', description: 'Understands market expansion, defines success criteria, plays key roles in GTM process', weight: 4 },
  { name: 'Stakeholder Communication', description: 'Balances transparency with business risks, handles legal and compliance challenges', weight: 3 },
]

// Engineering Technical Rubric
const engineeringTechnicalCriteria = [
  { name: 'Technical Problem Solving', description: 'Approaches complex technical problems systematically, demonstrates debugging skills', weight: 5 },
  { name: 'Code Quality', description: 'Writes clean, maintainable, and well-documented code, follows best practices', weight: 5 },
  { name: 'System Design', description: 'Can design scalable systems, understands tradeoffs between different architectures', weight: 5 },
  { name: 'Domain Knowledge', description: 'Relevant experience in insurance, fintech, SaaS, or enterprise software', weight: 4 },
  { name: 'Testing & QA', description: 'Writes comprehensive tests, understands testing strategies and coverage', weight: 4 },
  { name: 'DevOps & Infrastructure', description: 'Experience with CI/CD, cloud infrastructure, monitoring and observability', weight: 3 },
]

// Engineering Panel Rubric
const engineeringPanelCriteria = [
  { name: 'Technical Communication', description: 'Explains technical concepts clearly, asks clarifying questions, articulates tradeoffs', weight: 5 },
  { name: 'Collaboration', description: 'Works well with cross-functional teams, gives and receives feedback constructively', weight: 4 },
  { name: 'Learning Agility', description: 'Learns new technologies quickly, stays current with industry trends', weight: 4 },
  { name: 'Ownership & Initiative', description: 'Takes ownership of problems, proactively identifies improvements', weight: 4 },
  { name: 'Cultural Fit', description: 'Alignment with PRESS values, demonstrates passion and growth mindset', weight: 4 },
  { name: 'Leadership Potential', description: 'Shows potential to mentor others, lead projects, or grow into leadership', weight: 3 },
]

// Sales HR Screen Rubric
const salesHRScreenCriteria = [
  { name: 'Sales Experience & Track Record', description: 'Proven sales experience, can describe specific deals closed and achievements', weight: 5 },
  { name: 'Prospecting Skills', description: 'Strong ability to identify and qualify leads, generate sales opportunities', weight: 5 },
  { name: 'Product Knowledge', description: 'Experience selling relevant products (insurance, SaaS, enterprise, B2B)', weight: 4 },
  { name: 'Communication & Presentation', description: 'Clear communication, strong presentation and demo skills', weight: 4 },
  { name: 'Objection Handling', description: 'Skilled at handling objections and closing deals', weight: 4 },
  { name: 'Cultural Fit', description: 'Alignment with PRESS values, demonstrates passion and competitive drive', weight: 3 },
]

// General HR Screen Rubric
const generalHRScreenCriteria = [
  { name: 'Role Fit', description: 'Understands the role requirements and has relevant experience', weight: 5 },
  { name: 'Motivation', description: 'Clear motivation for the role and for joining Curacel', weight: 4 },
  { name: 'Communication', description: 'Articulates thoughts clearly and professionally', weight: 4 },
  { name: 'Cultural Fit', description: 'Alignment with PRESS values (Passionate Work, Relentless Growth, Empowered Action, Sense of Urgency, Seeing Possibilities)', weight: 4 },
  { name: 'Problem Solving', description: 'Demonstrates analytical thinking and problem-solving approach', weight: 4 },
  { name: 'Growth Mindset', description: 'Shows willingness to learn and adapt', weight: 3 },
]

async function main() {
  console.log('Seeding interview rubrics...')

  // Executive Ops HR Screen
  const execOpsHR = await prisma.interviewStageTemplate.create({
    data: {
      name: 'Executive Ops - HR Screen',
      description: 'HR screening questions for Executive Operations candidates focusing on role understanding, problem solving, and AI familiarity',
      stage: 'HR_SCREEN',
      sortOrder: 1,
      criteria: {
        create: execOpsHRScreenCriteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${execOpsHR.name}`)

  // Executive Ops Panel
  const execOpsPanel = await prisma.interviewStageTemplate.create({
    data: {
      name: 'Executive Ops - Panel',
      description: 'Panel interview for Executive Operations candidates with technical and situational questions',
      stage: 'PANEL',
      sortOrder: 2,
      criteria: {
        create: execOpsPanelCriteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${execOpsPanel.name}`)

  // Senior PM Panel
  const seniorPMPanel = await prisma.interviewStageTemplate.create({
    data: {
      name: 'Senior Product Manager - Panel',
      description: 'Panel interview for Senior PM candidates focusing on AI/ML product thinking, system design, and go-to-market',
      stage: 'PANEL',
      sortOrder: 3,
      criteria: {
        create: seniorPMPanelCriteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${seniorPMPanel.name}`)

  // Engineering Technical
  const engTechnical = await prisma.interviewStageTemplate.create({
    data: {
      name: 'Engineering - Technical',
      description: 'Technical assessment for engineering candidates covering coding, system design, and domain knowledge',
      stage: 'TECHNICAL',
      sortOrder: 4,
      criteria: {
        create: engineeringTechnicalCriteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${engTechnical.name}`)

  // Engineering Panel
  const engPanel = await prisma.interviewStageTemplate.create({
    data: {
      name: 'Engineering - Panel',
      description: 'Panel interview for engineering candidates focusing on communication, collaboration, and cultural fit',
      stage: 'PANEL',
      sortOrder: 5,
      criteria: {
        create: engineeringPanelCriteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${engPanel.name}`)

  // Sales HR Screen
  const salesHR = await prisma.interviewStageTemplate.create({
    data: {
      name: 'Sales - HR Screen',
      description: 'HR screening for sales candidates focusing on track record, prospecting, and communication skills',
      stage: 'HR_SCREEN',
      sortOrder: 6,
      criteria: {
        create: salesHRScreenCriteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${salesHR.name}`)

  // General HR Screen
  const generalHR = await prisma.interviewStageTemplate.create({
    data: {
      name: 'General - HR Screen',
      description: 'General HR screening rubric applicable to most roles',
      stage: 'HR_SCREEN',
      sortOrder: 7,
      criteria: {
        create: generalHRScreenCriteria.map((c, i) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${generalHR.name}`)

  console.log('\nDone! Created 7 interview rubric templates.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
