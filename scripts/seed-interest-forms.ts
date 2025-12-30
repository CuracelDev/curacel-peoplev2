import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const salesFormQuestions = [
  { label: 'What is your name?', type: 'TEXT', isRequired: true },
  { label: 'What keeps you awake?', type: 'TEXTAREA', isRequired: true },
  { label: 'Most impressive thing you\'ve done', type: 'TEXTAREA', isRequired: true },
  { label: 'Big dream to achieve', type: 'TEXTAREA', isRequired: true },
  { label: 'MBTI type (take test at 16personalities.com)', type: 'TEXT', isRequired: true },
  { label: 'Why are you interested in Sales?', type: 'TEXTAREA', isRequired: true },
  { label: 'Why do you want to work at Curacel?', type: 'TEXTAREA', isRequired: true },
  { label: 'How long have you been in Sales?', type: 'TEXT', isRequired: true },
  { label: 'What type of sales experience do you have?', type: 'MULTISELECT', isRequired: true, options: 'Retail Sales,Sales Support,Lead Development & Generation,Account Management,Inside Sales,Business & Partnership Development,Outside Sales,Enterprise Sales,Other' },
  { label: 'What sales skills do you possess?', type: 'MULTISELECT', isRequired: true, options: 'Prospecting,Lead Qualification,Contract Negotiation,Closing Skills,Sales Presentations/Demos,Virtual selling,Client Engagement,Business Communication,Insurance industry experience,Selling software/SaaS,G suite,Prospecting through LinkedIn,Tech Savvy,Relationship Building,Objection Handling,Public Speaking,Time Management and Planning,Storytelling,Research/information gathering,Other' },
  { label: 'What tools can you use?', type: 'MULTISELECT', isRequired: true, options: 'Google Sheets,CRM,LinkedIn Sales Navigator,WordPress,Canva,Google Slides/PowerPoint,Docsend,Asana,Docusign,Typeform,Google Meet,Zoom,Google Forms,Trello,Calendly,Intercom,Tawk.to' },
  { label: 'Rate your Prospecting skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Connecting/Qualifying skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Company Research skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Presenting skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Objection Handling skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Closing skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Tell us about the last deal you closed', type: 'TEXTAREA', isRequired: true },
  { label: 'What is your most significant sales achievement?', type: 'TEXTAREA', isRequired: true },
  { label: 'Describe your enterprise selling experience', type: 'TEXTAREA', isRequired: false },
  { label: 'How do you generate sales opportunities?', type: 'TEXTAREA', isRequired: true },
  { label: 'Tell us about a time you failed to achieve your goals', type: 'TEXTAREA', isRequired: true },
  { label: 'What products have you sold?', type: 'MULTISELECT', isRequired: true, options: 'Insurance,SaaS,Enterprise,Healthcare,AI & Machine Learning,B2B,Credit Products,Embedded Finance,Cloud Applications,Other' },
  { label: 'Provide references for products sold', type: 'TEXTAREA', isRequired: false },
  { label: 'Provide 2 professional references (name, company, contact)', type: 'TEXTAREA', isRequired: true },
  { label: 'What is your current/last monthly salary?', type: 'TEXT', isRequired: true },
  { label: 'What is your expected monthly salary?', type: 'TEXT', isRequired: true },
  { label: 'Rate your French fluency (1-5, Novice to Professional)', type: 'SCALE', isRequired: false },
  { label: 'Any additional comments?', type: 'TEXTAREA', isRequired: false },
]

const execOpsFormQuestions = [
  { label: 'What is your name?', type: 'TEXT', isRequired: true },
  { label: 'What keeps you awake?', type: 'TEXTAREA', isRequired: true },
  { label: 'Most impressive thing you have done', type: 'TEXTAREA', isRequired: true },
  { label: 'Big dream you want to achieve', type: 'TEXTAREA', isRequired: true },
  { label: 'MBTI type (take test at 16personalities.com)', type: 'TEXT', isRequired: true },
  { label: 'Why did you apply for Executive Operations?', type: 'TEXTAREA', isRequired: true },
  { label: 'Why do you want to work at Curacel?', type: 'TEXTAREA', isRequired: true },
  { label: 'What skills do you have?', type: 'MULTISELECT', isRequired: true, options: 'Multitasking,Communication,Organization,Time Management,Adaptability,People Skills,Composure,Event Coordination,Discretion,Attention to Detail,Tech Savvy,Critical Thinking/Problem Solving,Active Listening,Building Automation & Workflows' },
  { label: 'What tools can you use?', type: 'MULTISELECT', isRequired: true, options: 'Gmail,Google Calendar,Slides/PowerPoint,Asana,Docusign,Typeform,Meet,Zoom,Forms,Trello,Calendly,Slack,N8N,Zapier,Chat GPT,Claude,Gamma AI' },
  { label: 'Rate your Multitasking skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Communication skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Time Management skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Attention to Detail (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Critical Thinking skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'Rate your Problem Solving skill (1-5)', type: 'SCALE', isRequired: true },
  { label: 'What is your most significant career achievement?', type: 'TEXTAREA', isRequired: true },
  { label: 'Tell us about a time you failed to achieve your goals', type: 'TEXTAREA', isRequired: true },
  { label: 'Provide 2 professional references (name, company, contact)', type: 'TEXTAREA', isRequired: true },
  { label: 'What is your current/previous monthly earnings?', type: 'TEXT', isRequired: false },
  { label: 'What is your expected monthly salary?', type: 'TEXT', isRequired: true },
  { label: 'Any additional comments?', type: 'TEXTAREA', isRequired: false },
]

const engineerFormQuestions = [
  { label: 'What is your name?', type: 'TEXT', isRequired: true },
  { label: 'Why do you wake and go to work? And what keeps you up at night?', type: 'TEXTAREA', isRequired: true },
  { label: 'Most impressive thing you have done', type: 'TEXTAREA', isRequired: true },
  { label: 'Big dream you want to achieve', type: 'TEXTAREA', isRequired: true },
  { label: 'MBTI type (take test at 16personalities.com)', type: 'TEXT', isRequired: true },
  { label: 'Why are you a Software Engineer?', type: 'TEXTAREA', isRequired: true },
  { label: 'Why do you want to work at Curacel?', type: 'TEXTAREA', isRequired: true },
  { label: 'How long have you been an Engineer?', type: 'TEXT', isRequired: true },
  { label: 'What type of Engineer are you?', type: 'SELECT', isRequired: true, options: 'Front-End Engineer,Back-End Engineer,Full Stack Engineer,Software Engineer in Test (QA),DevOps Engineer,Security Engineer,ML Engineer,Data Engineer,Mobile Engineer,UI/UX Design,Other' },
  { label: 'Rate your PHP skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your Vue skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your React Native skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your Electron skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your MySQL/MS SQL skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your Laravel skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your UX skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your ML skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your Backend skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your DevOps skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Rate your QA skill (1-5)', type: 'SCALE', isRequired: false },
  { label: 'Tell us about a project you\'re proud of', type: 'TEXTAREA', isRequired: true },
  { label: 'What project themes do you have experience with?', type: 'MULTISELECT', isRequired: true, options: 'Insurance,SaaS,Enterprise,Healthcare,Multilingual,AI & Machine Learning,B2B,Data Labelling,Credit Products,Embedded Finance,B2B2C' },
  { label: 'Provide references for project themes', type: 'TEXTAREA', isRequired: false },
  { label: 'Provide 2 professional references (name, company, contact)', type: 'TEXTAREA', isRequired: true },
  { label: 'What is your current/last monthly salary?', type: 'TEXT', isRequired: true },
  { label: 'What is your expected monthly salary?', type: 'TEXT', isRequired: true },
  { label: 'How did you hear about this role?', type: 'TEXT', isRequired: false },
  { label: 'Any additional comments?', type: 'TEXTAREA', isRequired: false },
]

async function main() {
  console.log('Seeding interest forms...')

  // Create Sales Application Form
  const salesForm = await prisma.interestFormTemplate.create({
    data: {
      name: 'Sales Application',
      description: 'Application form for sales positions at Curacel',
      isDefault: false,
      questions: {
        create: salesFormQuestions.map((q, i) => ({
          question: q.label,
          type: q.type,
          required: q.isRequired,
          options: q.options ? JSON.parse(JSON.stringify(q.options.split(',').map(o => ({ value: o.trim(), label: o.trim() })))) : null,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${salesForm.name} with ${salesFormQuestions.length} questions`)

  // Create Executive Operations Form
  const execOpsForm = await prisma.interestFormTemplate.create({
    data: {
      name: 'Executive Operations Application',
      description: 'Application form for executive operations positions at Curacel',
      isDefault: false,
      questions: {
        create: execOpsFormQuestions.map((q, i) => ({
          question: q.label,
          type: q.type,
          required: q.isRequired,
          options: q.options ? JSON.parse(JSON.stringify(q.options.split(',').map(o => ({ value: o.trim(), label: o.trim() })))) : null,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${execOpsForm.name} with ${execOpsFormQuestions.length} questions`)

  // Create Engineering Application Form
  const engineerForm = await prisma.interestFormTemplate.create({
    data: {
      name: 'Engineering Application',
      description: 'Application form for engineering positions at Curacel',
      isDefault: true, // Set as default
      questions: {
        create: engineerFormQuestions.map((q, i) => ({
          question: q.label,
          type: q.type,
          required: q.isRequired,
          options: q.options ? JSON.parse(JSON.stringify(q.options.split(',').map(o => ({ value: o.trim(), label: o.trim() })))) : null,
          sortOrder: i,
        })),
      },
    },
  })
  console.log(`Created: ${engineerForm.name} with ${engineerFormQuestions.length} questions (default)`)

  console.log('\nDone! Created 3 interest form templates.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
