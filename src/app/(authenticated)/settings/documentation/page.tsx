'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'

type DocBlock = {
  title: string
  text?: string
  items?: string[]
  ordered?: boolean
  image?: {
    src: string
    alt: string
    caption?: string
  }
  diagram?: {
    steps: string[]
    caption?: string
  }
}

type DocSection = {
  id: string
  title: string
  description: string
  blocks: DocBlock[]
}

const docSectionsV2: DocSection[] = [
  {
    id: 'v2-welcome',
    title: 'Welcome to Curacel PeopleOs',
    description: 'A full, plain-language guide for PeopleOps managers and HR teams.',
    blocks: [
      {
        title: 'Who this guide is written for',
        items: [
          'PeopleOps managers who need an end-to-end view of the employee journey.',
          'HR admins who want step-by-step instructions without technical jargon.',
          'Teams who need repeatable processes for hiring, onboarding, and offboarding.',
        ],
      },
      {
        title: 'The people journey',
        diagram: {
          steps: ['Recruit', 'Offer', 'Onboard', 'Grow', 'Offboard'],
          caption: 'Each stage is a module in the sidebar with its own workflows.',
        },
      },
      {
        title: 'Visual map',
        image: {
          src: '/docs/people-journey.svg',
          alt: 'Diagram showing the Curacel People journey from recruiting to offboarding.',
          caption: 'Use this map to orient yourself before you start.',
        },
      },
    ],
  },
  {
    id: 'v2-navigation',
    title: 'Navigation, roles, and daily rhythm',
    description: 'How to move around the product and what a typical PeopleOps day looks like.',
    blocks: [
      {
        title: 'Navigation basics',
        items: [
          'Use the left sidebar to move between Hiring, Offers, People, and Settings.',
          'The top of each page has filters, search, and quick actions.',
          'The bell icon shows notifications for admin roles.',
          'AuntyPelz is the AI assistant for quick questions and drafting.',
        ],
      },
      {
        title: 'Roles, in plain language',
        items: [
          'SUPER_ADMIN: full access, including system configuration.',
          'HR_ADMIN: hiring, contracts, onboarding/offboarding, and people settings.',
          'IT_ADMIN: integrations, automation, provisioning, and security.',
          'MANAGER: visibility into their team and workflows.',
          'EMPLOYEE: self-service profile and onboarding tasks.',
        ],
      },
      {
        title: 'A typical PeopleOps day',
        ordered: true,
        items: [
          'Check Dashboard for pending contracts, onboarding, and upcoming starts.',
          'Review Notifications for anything urgent.',
          'Confirm hiring stages, interviews, and offer approvals.',
          'Track onboarding/offboarding tasks and close blockers.',
          'Update employee records as changes come in.',
        ],
      },
    ],
  },
  {
    id: 'v2-first-day',
    title: 'First-day setup checklist',
    description: 'Make sure the workspace is ready before your team starts using it.',
    blocks: [
      {
        title: 'Company setup',
        ordered: true,
        items: [
          'Settings > Organization profile: add company name, logo, and letterhead.',
          'Settings > Legal entities: add entities used in contracts.',
          'Settings > Signature blocks: create signers for offers and contracts.',
          'Settings > App Admins: invite admins and assign roles.',
          'Settings > Teams: create departments and reporting structure.',
        ],
      },
      {
        title: 'Hiring readiness',
        ordered: true,
        items: [
          'Settings > Hiring > Hiring Flows: confirm your stages.',
          'Settings > Hiring > Interview Types and Rubrics: align on evaluation.',
          'Settings > Hiring > Candidate Scoring: set weighted inputs.',
          'Settings > Hiring > Interest Forms: build candidate forms.',
          'Settings > Hiring > JD Templates: add reusable job descriptions.',
        ],
      },
      {
        title: 'Automation and alerts',
        ordered: true,
        items: [
          'Settings > Applications: connect apps and run Test Connection.',
          'Settings > On/Offboarding: confirm default tasks and order.',
          'Settings > Notifications: choose who gets email alerts.',
          'Settings > AuntyPelz Emails: set candidate email defaults.',
        ],
      },
    ],
  },
  {
    id: 'v2-dashboard',
    title: 'Dashboard',
    description: 'Your at-a-glance overview of work in motion.',
    blocks: [
      {
        title: 'What you will see',
        items: [
          'Pending contracts and signature status.',
          'Active onboarding/offboarding workflows.',
          'Hiring pipeline activity and upcoming interviews.',
          'Recent hires and start dates.',
        ],
      },
      {
        title: 'How to use it',
        ordered: true,
        items: [
          'Use it every morning to spot bottlenecks.',
          'Click any card to jump to the related list.',
          'Watch the contract pipeline to keep offers moving.',
        ],
      },
    ],
  },
  {
    id: 'v2-hiring-overview',
    title: 'Hiring overview',
    description: 'A clear flow from applicant to offer.',
    blocks: [
      {
        title: 'Pipeline overview',
        image: {
          src: '/docs/hiring-pipeline.svg',
          alt: 'Diagram of a hiring pipeline with stages for apply, screen, interview, offer, and hired.',
          caption: 'Stages are editable in Settings > Hiring > Hiring Flows.',
        },
      },
      {
        title: 'A simple hiring rhythm',
        ordered: true,
        items: [
          'Create a position in Hiring > Positions.',
          'Attach an interest form so candidates can apply.',
          'Review candidates and move them through stages.',
          'Schedule interviews and capture feedback with scorecards.',
          'Advance a decision and issue an offer when ready.',
        ],
      },
    ],
  },
  {
    id: 'v2-positions',
    title: 'Positions and job setup',
    description: 'Define the role clearly so the pipeline runs smoothly.',
    blocks: [
      {
        title: 'Create a position',
        ordered: true,
        items: [
          'Go to Hiring > Positions and click Create Job.',
          'Add job title, team, employment type, priority, and deadline.',
          'Select a hiring flow and competency expectations if needed.',
          'Attach a JD template or write the responsibilities directly.',
          'Save as Draft or publish immediately.',
        ],
      },
      {
        title: 'Job settings (Settings > Job Settings)',
        items: [
          'Manage JD templates, interest forms, and public careers settings.',
          'Update recruiter-facing pages and job visibility rules.',
        ],
      },
      {
        title: 'Job descriptions (JD templates)',
        items: [
          'Settings > Hiring > JD Templates holds reusable templates.',
          'Use Manual, Upload Files, or Import from URL to build templates.',
        ],
      },
      {
        title: 'Interest forms',
        items: [
          'Settings > Hiring > Interest Forms lets you build application questions.',
          'Each job must be linked to one interest form before it can accept applicants.',
        ],
      },
    ],
  },
  {
    id: 'v2-candidates',
    title: 'Candidates and profiles',
    description: 'Everything about a candidate lives in one place.',
    blocks: [
      {
        title: 'The candidates list',
        items: [
          'Use filters, search, and stage tags to find the right people fast.',
          'Customize columns using the three-dot menu (country, source, salary, MBTI).',
          'Select one or more candidates and click Advance to Next Stage to move them forward together.',
          'Open a candidate to see their full profile and timeline.',
        ],
      },
      {
        title: 'Inside a candidate profile',
        items: [
          'Stages show where the candidate sits in the hiring flow.',
          'Scorecards capture interview feedback and weighted scores.',
          'Assessments show linked tests and results.',
          'Notes and activity keep all context in one timeline.',
        ],
      },
      {
        title: 'Export a profile',
        ordered: true,
        items: [
          'Open the candidate profile.',
          'Click Export Profile in the header actions.',
          'Share the PDF with stakeholders or attach to approvals.',
        ],
      },
    ],
  },
  {
    id: 'v2-interviews',
    title: 'Interviews, rubrics, and scorecards',
    description: 'Fair, structured evaluation for every role.',
    blocks: [
      {
        title: 'Schedule interviews',
        ordered: true,
        items: [
          'Open a candidate and click Schedule Interview.',
          'Select interview type, interviewer, and time.',
          'Assign a rubric so the scorecard is consistent.',
        ],
      },
      {
        title: 'Interview settings',
        items: [
          'Settings > Hiring > Interview Types controls format and defaults.',
          'Settings > Hiring > Interview Rubrics defines scoring criteria.',
          'Settings > Hiring > Candidate Scoring controls weights.',
          'Settings > Hiring > Question Bank stores reusable questions.',
        ],
      },
      {
        title: 'Featured filters',
        items: [
          'Choose which interview types show as quick filters.',
          'Use featured items to highlight the most common formats.',
        ],
      },
    ],
  },
  {
    id: 'v2-assessments',
    title: 'Assessments',
    description: 'Bring external tests into the hiring flow.',
    blocks: [
      {
        title: 'Use assessment templates',
        items: [
          'Go to Hiring > Assessments to manage templates.',
          'Feature common assessments as quick filters.',
        ],
      },
      {
        title: 'Send an assessment',
        ordered: true,
        items: [
          'Open a candidate profile.',
          'Select the assessment and send it.',
          'Review results in the candidate timeline once completed.',
        ],
      },
    ],
  },
  {
    id: 'v2-contracts',
    title: 'Offers and contracts',
    description: 'Create, send, and track signatures with confidence.',
    blocks: [
      {
        title: 'Create a contract',
        ordered: true,
        items: [
          'Open Contracts and click New employment contract.',
          'Select the candidate and employment type.',
          'Fill compensation details and start date.',
          'Pick the legal entity and signature block.',
        ],
      },
      {
        title: 'Send for signature',
        ordered: true,
        items: [
          'Review the HTML preview to confirm variables.',
          'Click Send for signature.',
          'Track status: Draft, Sent, Viewed, Signed, Declined.',
          'Download signed documents from the contract timeline.',
        ],
      },
      {
        title: 'Contract templates and signatures',
        items: [
          'Settings > Contract templates stores template bodies.',
          'Settings > Signature blocks stores signing profiles.',
        ],
      },
    ],
  },
  {
    id: 'v2-onboarding',
    title: 'Onboarding',
    description: 'A guided, respectful start for every new hire.',
    blocks: [
      {
        title: 'Onboarding flow at a glance',
        image: {
          src: '/docs/onboarding-flow.svg',
          alt: 'Diagram of the onboarding flow from offer signed to completed tasks.',
          caption: 'Automated steps run as soon as apps are connected.',
        },
      },
      {
        title: 'Start onboarding',
        ordered: true,
        items: [
          'Go to Onboarding and click Onboard New Employee.',
          'Select the candidate from Offer Signed.',
          'Confirm start date, manager, and work email provider.',
          'Create the workflow and monitor task progress.',
        ],
      },
      {
        title: 'Employee self-service',
        items: [
          'New hires complete their profile, values, and work style preferences.',
          'They receive a secure link via email to finish onboarding.',
        ],
      },
      {
        title: 'Onboarding settings',
        items: [
          'Settings > On/Offboarding controls default tasks.',
          'Settings > Onboarding Flow lets you reorder or add steps.',
        ],
      },
    ],
  },
  {
    id: 'v2-offboarding',
    title: 'Offboarding',
    description: 'A respectful exit with access removal and clear tasks.',
    blocks: [
      {
        title: 'Start offboarding',
        ordered: true,
        items: [
          'Go to Offboarding and click Offboard employee.',
          'Choose immediate or scheduled, add notes, and confirm.',
          'Run automated tasks (apps connected) or complete manual steps.',
        ],
      },
      {
        title: 'Google Workspace options',
        items: [
          'Transfer Drive/Calendar data to another account.',
          'Set aliases or forward mail if needed.',
          'Delete the account to remove access immediately.',
        ],
      },
      {
        title: 'Offboarding settings',
        items: [
          'Settings > On/Offboarding controls default tasks.',
          'Settings > Offboarding Flow lets you reorder or add steps.',
        ],
      },
    ],
  },
  {
    id: 'v2-employees',
    title: 'Employees',
    description: 'A complete record of every team member.',
    blocks: [
      {
        title: 'Create and manage employees',
        ordered: true,
        items: [
          'Go to Employees and click Add Employee.',
          'Fill in required basics (name, personal email).',
          'Use the profile to update job info, manager, and location.',
          'Track status: Active, Offboarding, or Exited.',
        ],
      },
      {
        title: 'Company stage process',
        items: [
          'Settings > Company Stage Process defines lifecycle stages.',
          'Use it to track progression and internal milestones.',
        ],
      },
      {
        title: 'Personality and values',
        items: [
          'The Personality tab shows values and work style answers.',
          'Use this for team alignment and onboarding conversations.',
        ],
      },
      {
        title: 'Example snapshot',
        image: {
          src: '/samples/mbti-example.png',
          alt: 'Sample MBTI profile chart used for personality templates.',
          caption: 'Personality templates help managers understand work styles.',
        },
      },
    ],
  },
  {
    id: 'v2-analytics',
    title: 'Analytics',
    description: 'Understand what is working in hiring and people operations.',
    blocks: [
      {
        title: 'Hiring analytics',
        items: [
          'Track pipeline conversion and stage drop-off.',
          'Review time-to-hire and interview velocity.',
        ],
      },
      {
        title: 'Employee analytics',
        items: [
          'View headcount changes and department breakdowns.',
          'Use trend charts to spot growth or attrition patterns.',
        ],
      },
    ],
  },
  {
    id: 'v2-notifications',
    title: 'Notifications and audit log',
    description: 'Stay informed and keep a compliance trail.',
    blocks: [
      {
        title: 'Notifications',
        ordered: true,
        items: [
          'Open Notifications from the sidebar or the bell icon.',
          'Archive items you no longer need.',
          'Configure email alerts in Settings > Notifications.',
        ],
      },
      {
        title: 'Audit Log',
        items: [
          'Settings > Audit Log records every key action.',
          'Filter by action type, resource, or date range.',
        ],
      },
    ],
  },
  {
    id: 'v2-applications',
    title: 'Applications and integrations',
    description: 'Connect the tools your team already uses.',
    blocks: [
      {
        title: 'Connect an app',
        ordered: true,
        items: [
          'Settings > Applications shows all available integrations.',
          'Open an app, add credentials, and click Save.',
          'Use Test Connection to confirm it works.',
        ],
      },
      {
        title: 'Provisioning rules',
        items: [
          'Use integration rules to automate onboarding and offboarding steps.',
          'Rules run when tasks move to In Progress.',
        ],
      },
      {
        title: 'Troubleshooting',
        items: [
          'Reconnect apps when tokens expire.',
          'Check the Audit Log if an automation fails.',
        ],
      },
    ],
  },
  {
    id: 'v2-auntypelz',
    title: 'AuntyPelz: your HR co-pilot',
    description: 'Ask questions, generate content, and automate safe actions.',
    blocks: [
      {
        title: 'Using AuntyPelz',
        ordered: true,
        items: [
          'Open AuntyPelz from the sidebar.',
          'Ask questions like “Who starts next week?” or “Draft a welcome email.”',
          'Use the microphone for voice input if you prefer speaking.',
        ],
      },
      {
        title: 'AuntyPelz settings',
        items: [
          'Settings > AuntyPelz manages keys and core behavior.',
          'Settings > Pending AI Tools lets you approve auto-created tools.',
          'Settings > AuntyPelz Interviews configures interview automations.',
        ],
      },
      {
        title: 'Dynamic tools',
        items: [
          'Create no-code actions that AuntyPelz can run for you.',
          'Choose tRPC, webhook, or custom code execution.',
          'Limit access with roles and confirmations.',
        ],
      },
    ],
  },
  {
    id: 'v2-email',
    title: 'Email settings and templates',
    description: 'Control how the platform sends messages.',
    blocks: [
      {
        title: 'Email settings',
        ordered: true,
        items: [
          'Go to Settings > AuntyPelz Emails.',
          'Use Email Settings to set default CC and tracking.',
          'Choose whether emails auto-send on application.',
        ],
      },
      {
        title: 'Email templates',
        items: [
          'Use Email Templates to create or update stage templates.',
          'Templates power automated and manual candidate emails.',
        ],
      },
    ],
  },
  {
    id: 'v2-settings',
    title: 'Settings reference (exhaustive)',
    description: 'Every Settings page, in one place.',
    blocks: [
      {
        title: 'Organization',
        items: [
          'Organization profile: company info and letterhead.',
          'Legal entities: companies used in offers.',
          'Signature blocks: signing profiles and signature images.',
        ],
      },
      {
        title: 'People',
        items: [
          'App Admins: invite admins and manage roles.',
          'Teams: create departments and sub-teams.',
          'Contract templates: edit offer and contract templates.',
          'On/Offboarding: configure default tasks and ordering.',
          'Company Stage Process: track lifecycle stages.',
          'Advisors: manage advisors and access as needed.',
        ],
      },
      {
        title: 'Hiring',
        items: [
          'General Settings: shared hiring defaults and display.',
          'Job Settings: JD templates, interest forms, recruiters, careers.',
          'Hiring Flows: pipeline stages and role-specific flows.',
          'Interview Settings: types, rubrics, scoring, question bank.',
          'Assessments: manage assessment templates.',
          'AuntyPelz Emails: email settings and templates.',
          'Decision Support: personality templates and team profiles.',
          'AuntyPelz Actions: automated candidate filtering.',
        ],
      },
      {
        title: 'Performance',
        items: [
          'Competency Framework: manage and sync competencies.',
        ],
      },
      {
        title: 'System',
        items: [
          'Public Pages: careers and recruiter pages.',
          'Integrations: connect apps and manage credentials.',
          'API Settings: create and revoke API keys.',
          'AuntyPelz: configure AI settings and access.',
          'Pending AI Tools: approve new tools.',
          'Audit Log: compliance history.',
          'Notifications: admin alerts and email rules.',
          'Documentation: this guide.',
        ],
      },
    ],
  },
  {
    id: 'v2-public-pages',
    title: 'Public pages',
    description: 'Candidate-facing pages you can share externally.',
    blocks: [
      {
        title: 'Careers and recruiter pages',
        items: [
          'Public Careers page lists open positions.',
          'Recruiter page shares a controlled application form.',
        ],
      },
      {
        title: 'Candidate application flow',
        items: [
          'Candidates apply through the public job page.',
          'They complete the interest form you selected for the job.',
          'Applications appear instantly in the Candidates list.',
        ],
      },
    ],
  },
  {
    id: 'v2-api',
    title: 'API access (for technical teams)',
    description: 'Only needed if you connect external systems.',
    blocks: [
      {
        title: 'Create an API key',
        ordered: true,
        items: [
          'Go to Settings > API Settings.',
          'Click Create new key and copy it immediately.',
          'Store the key securely and share with engineering.',
        ],
      },
      {
        title: 'API documentation',
        items: [
          'Open the API Docs page to see endpoints and examples.',
          'Share the docs link with your technical team.',
        ],
      },
    ],
  },
  {
    id: 'v2-troubleshooting',
    title: 'Troubleshooting',
    description: 'Quick checks for common issues.',
    blocks: [
      {
        title: 'If something is missing',
        items: [
          'Check role permissions first.',
          'Use search or filters to locate items faster.',
        ],
      },
      {
        title: 'If automation fails',
        items: [
          'Confirm the app connection in Settings > Applications.',
          'Run Test Connection and try again.',
          'Review the Audit Log for details.',
        ],
      },
      {
        title: 'If an email does not send',
        items: [
          'Confirm email settings and signature blocks.',
          'Ensure the record is in Draft or Ready-to-send state.',
          'Check Notifications for error messages.',
        ],
      },
    ],
  },
]

const docSectionsV1: DocSection[] = [
  {
    id: 'quick-start',
    title: 'Quick start',
    description: 'A setup checklist for new organizations.',
    blocks: [
      {
        title: 'Goal',
        text: 'Configure the essentials so you can send contracts, onboard employees, and track activity.',
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Open Settings > Organization profile and add your company name, logo, and letterhead details.',
          'Invite the right admins in Settings > App Admins and assign roles for HR and IT.',
          'Create signature blocks in Settings > Signature blocks for anyone who signs contracts.',
          'Add legal entities in Settings > Legal entities so contracts reference the correct company.',
          'Review and edit contract templates in Settings > Contract templates.',
          'Connect tools in Settings > Applications and test each connection (Google Workspace, Slack, etc).',
          'Configure email notifications in Settings > Notifications and select recipients and triggers.',
          'Add employees in Employees so you can send offers and start workflows.',
          'Create a contract in Contracts, send it for signature, and start onboarding when it is signed.',
        ],
      },
      {
        title: 'Result',
        text: 'You now have a configured workspace with contracts, onboarding flows, and notifications ready to use.',
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation and roles',
    description: 'How to move around the product and who can see what.',
    blocks: [
      {
        title: 'Navigation basics',
        items: [
          'Use the left sidebar to switch between Dashboard, Employees, Contracts, Onboarding, Offboarding, Integrations, AuntyPelz, Notifications, and Settings.',
          'Use the menu button in the top bar to collapse or expand the sidebar.',
          'Use the bell icon in the top-right to open recent notifications (admin roles only).',
          'Use the AuntyPelz button at the bottom of the sidebar for quick questions.',
          'Use the profile menu at the bottom of the sidebar for My Profile and sign out.',
          'Most list pages include filters, search, and pagination to narrow results.',
        ],
      },
      {
        title: 'Role-based access',
        items: [
          'SUPER_ADMIN: full access to HR, IT, AuntyPelz, settings, and system data.',
          'HR_ADMIN: employees, contracts, onboarding, AuntyPelz, notifications, and most settings.',
          'IT_ADMIN: applications, provisioning, AuntyPelz, onboarding and offboarding automation, and settings.',
          'MANAGER: dashboard plus onboarding and offboarding visibility.',
          'EMPLOYEE: basic access, typically My Profile only.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your high-level view of people, contracts, and workflows.',
    blocks: [
      {
        title: 'What it shows',
        items: [
          'Employee totals and active headcount.',
          'Pending contracts and signed contract counts.',
          'Onboarding and offboarding totals.',
          'Contract pipeline breakdown (draft, sent, viewed, signed).',
          'Active onboarding progress with quick links.',
          'Recent hires and upcoming start dates.',
        ],
      },
      {
        title: 'How to use it',
        ordered: true,
        items: [
          'Start your day here to spot pending contracts and onboarding progress.',
          'Click an employee or workflow in the lists to open the detailed record.',
          'Use the counts to identify bottlenecks (for example, many sent contracts with no signatures).',
        ],
      },
    ],
  },
  {
    id: 'employees',
    title: 'Employees',
    description: 'Create, update, and manage employee records.',
    blocks: [
      {
        title: 'Create an employee',
        ordered: true,
        items: [
          'Go to Employees and click Add Employee.',
          'Enter full name and personal email (required).',
          'Add optional details such as job title, department, and location.',
          'Click Create Employee and confirm the record appears in the list.',
          'Open the employee record to add more details later.',
        ],
      },
      {
        title: 'Manage employee details',
        items: [
          'Use search to find employees by name or email.',
          'Filter by status or department when the list grows.',
          'Open an employee to edit job info, work email, manager, or status.',
          'Update start and end dates, contact details, bank info, and emergency contacts.',
          'View the Personality tab to see life values and work style preferences.',
          'Start offboarding directly from an employee profile when needed.',
        ],
      },
      {
        title: 'Statuses and workflows',
        items: [
          'Statuses include Candidate, Offer Sent, Offer Signed, Pending Start, Active, Offboarding, and Exited.',
          'Onboarding candidates are pulled from Offer Signed status.',
          'Changing status affects filters and eligibility for workflows.',
        ],
      },
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts',
    description: 'Create offers, send for signature, and track status.',
    blocks: [
      {
        title: 'Create a contract',
        ordered: true,
        items: [
          'Go to Contracts and click New employment contract.',
          'Select the employee (candidate) to attach the contract.',
          'Choose an employment type to auto-select the template.',
          'Fill job title, start date, probation end, and supervisor title.',
          'Add working hours, duties, and benefits as needed.',
          'Select the legal entity and signature block.',
          'Enter compensation details (amount, currency, frequency).',
          'Submit to create the contract record.',
        ],
      },
      {
        title: 'Send and track signatures',
        ordered: true,
        items: [
          'Open the contract from the list to review details.',
          'Check variables and the rendered HTML preview.',
          'Click Send for signature when ready.',
          'Use Resend for contracts in Sent or Viewed status.',
          'Use Cancel to stop a contract that should not proceed.',
          'Download the signed copy once the contract is signed.',
        ],
      },
      {
        title: 'Editing and status rules',
        items: [
          'Edit details while a contract is not Signed, Declined, Expired, or Cancelled.',
          'Statuses include Draft, Sent, Viewed, Signed, Declined, Expired, and Cancelled.',
          'Use the timeline to see the latest activity for the contract.',
        ],
      },
    ],
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    description: 'Manage new hire tasks and automation.',
    blocks: [
      {
        title: 'Start onboarding',
        ordered: true,
        items: [
          'Go to Onboarding and click Onboard New Employee.',
          'Select a candidate from the Offer Signed list.',
          'Set the start date and line manager.',
          'Choose the email provider (Personal, Google Workspace, or Custom).',
          'Confirm the work email address and create the workflow.',
          'The employee receives a self-service link to complete their profile and personality assessment.',
        ],
      },
      {
        title: 'Run tasks',
        ordered: true,
        items: [
          'Open a workflow from the list to view tasks and progress.',
          'For manual tasks, click Complete when finished.',
          'For automated tasks, click Run or Retry to execute the automation.',
          'Use Skip with a reason when a task does not apply.',
        ],
      },
      {
        title: 'Automation tips',
        items: [
          'Connect apps in Settings > Applications before running automated tasks.',
          'Use Settings > On/Offboarding Settings to add or reorder default steps.',
          'Use Notifications and Audit Log to track completed tasks.',
        ],
      },
    ],
  },
  {
    id: 'offboarding',
    title: 'Offboarding',
    description: 'Handle employee departures and access removal.',
    blocks: [
      {
        title: 'Start offboarding',
        ordered: true,
        items: [
          'Go to Offboarding and click Offboard employee.',
          'Select the employee and choose immediate or scheduled offboarding.',
          'Set an end date if scheduled, and add a reason or notes.',
          'Configure Google Workspace options if the app is connected.',
          'Create the workflow to start offboarding tasks.',
        ],
      },
      {
        title: 'Complete tasks',
        ordered: true,
        items: [
          'Open the workflow to see tasks and progress.',
          'Run automated tasks or complete manual tasks as they are done.',
          'Skip tasks with a reason if they are not required.',
          'Monitor status changes from Pending to In Progress and Completed.',
        ],
      },
      {
        title: 'Google Workspace options',
        items: [
          'Delete the account to remove access immediately.',
          'Transfer data to another email for Drive and Calendar.',
          'Set an alias email if mail forwarding is required.',
          'Use the default transfer email from Organization profile if available.',
        ],
      },
    ],
  },
  {
    id: 'ai-agent',
    title: 'AuntyPelz',
    description: 'Chat with AuntyPelz that understands your HR data and can help with tasks.',
    blocks: [
      {
        title: 'Access AuntyPelz',
        ordered: true,
        items: [
          'Click AuntyPelz in the left sidebar (available to SUPER_ADMIN, HR_ADMIN, and IT_ADMIN roles).',
          'Start a new conversation or select a previous chat from the sidebar.',
          'Type your question or request in the text area at the bottom.',
          'Press Enter or click the send button to submit.',
        ],
      },
      {
        title: 'Voice input',
        ordered: true,
        items: [
          'Click the microphone button next to the text input.',
          'Speak your message clearly (browser will request microphone permission).',
          'Click the stop button when finished recording.',
          'Your speech will be transcribed and added to the input field.',
          'Review and edit if needed, then send.',
        ],
      },
      {
        title: 'What AuntyPelz can do',
        items: [
          'Answer questions about employees, contracts, and onboarding status.',
          'Summarize HR metrics and provide insights.',
          'Help draft communications and policies.',
          'Explain how to use features in the system.',
          'Provide suggestions for workflow improvements.',
        ],
      },
      {
        title: 'Chat history',
        items: [
          'All conversations are saved and can be resumed later.',
          'Use the search box to find previous chats by title or content.',
          'Click New Chat to start a fresh conversation.',
          'Each chat maintains full context of previous messages.',
        ],
      },
    ],
  },
  {
    id: 'auntypelz-dynamic-tools',
    title: 'AuntyPelz Dynamic Tools',
    description: 'Create custom AI actions for AuntyPelz without writing code using the dynamic tools system.',
    blocks: [
      {
        title: 'What are Dynamic Tools?',
        items: [
          'Custom AI actions stored in the database that AuntyPelz can execute.',
          'Define tools with parameters, execution logic, and permissions.',
          'Tools are automatically registered with OpenAI for function calling.',
          'Create, update, and delete tools without deploying code changes.',
          'Support for tRPC procedures, webhooks, and custom JavaScript.',
        ],
      },
      {
        title: 'Execution Types',
        items: [
          'tRPC Mutation/Query - Call existing backend procedures with parameter mapping.',
          'Webhook - Integrate with external services via HTTP requests.',
          'Custom JavaScript - Run flexible custom logic with full database access.',
        ],
      },
      {
        title: 'Tool Structure',
        items: [
          'name - Unique function identifier (e.g., archive_candidate).',
          'displayName - Human-readable name shown to users.',
          'description - What the tool does (AI uses this to decide when to use it).',
          'category - Grouping like hiring, contracts, or employees.',
          'parameters - JSON Schema defining function parameters.',
          'executionConfig - How the tool executes (router path, webhook URL, etc).',
          'requiresConfirmation - Whether user approval is needed before execution.',
          'allowedRoles - Array of roles permitted to use this tool.',
        ],
      },
      {
        title: 'Creating a tRPC Tool',
        ordered: true,
        items: [
          'Use the API: trpc.aiCustomTools.create.mutate() with tool definition.',
          'Set executionType to "trpc_mutation" or "trpc_query".',
          'Provide executionConfig with router, procedure, and optional inputMapping.',
          'Define parameters as a JSON Schema with type, properties, and required fields.',
          'Specify allowedRoles (e.g., ["ADMIN", "HR_ADMIN"]) and requiresConfirmation flag.',
          'The tool is immediately available to AuntyPelz for all users with permitted roles.',
        ],
      },
      {
        title: 'Creating a Webhook Tool',
        ordered: true,
        items: [
          'Set executionType to "webhook".',
          'Provide executionConfig with url, method (POST/GET/etc), and optional headers.',
          'Define parameters that will be sent as the webhook payload.',
          'Use headers for authentication (e.g., Authorization: Bearer TOKEN).',
          'The webhook receives parameters as JSON and should return a success response.',
        ],
      },
      {
        title: 'Creating Custom Code Tool',
        ordered: true,
        items: [
          'Set executionType to "custom_code".',
          'Provide executionConfig with code property containing JavaScript.',
          'Code has access to args (parameters), context (user info), and prisma (database).',
          'Return data that will be sent back to the AI.',
          'Use with caution - code has full database access and runs unsandboxed.',
        ],
      },
      {
        title: 'Example: Archive Candidate Tool',
        items: [
          'Name: archive_candidate',
          'Description: Move a candidate to archived stage with a reason',
          'Parameters: candidateId (required), reason (required), notifyCandidate (optional)',
          'Execution: tRPC mutation calling job.archiveCandidate procedure',
          'Permissions: ADMIN and HR_ADMIN only',
          'Confirmation: Required before executing',
          'Once created, users can say "Archive John Doe because position was filled"',
        ],
      },
      {
        title: 'Security Best Practices',
        items: [
          'Always set allowedRoles to limit access to sensitive operations.',
          'Enable requiresConfirmation for destructive or irreversible actions.',
          'Validate webhook URLs and use authentication headers.',
          'Be extremely careful with custom_code - it has full database access.',
          'Test new tools thoroughly before enabling them in production.',
          'Use clear, specific descriptions so AI knows when to use each tool.',
        ],
      },
      {
        title: 'Managing Tools',
        items: [
          'List all tools: trpc.aiCustomTools.list.query({ category, isActive })',
          'Get single tool: trpc.aiCustomTools.get.query({ id })',
          'Update tool: trpc.aiCustomTools.update.mutate({ id, ...changes })',
          'Delete tool: trpc.aiCustomTools.delete.mutate({ id })',
          'Test execution: trpc.aiCustomTools.test.mutate({ id, args })',
          'Built-in tools (isBuiltIn: true) cannot be deleted.',
        ],
      },
      {
        title: 'Documentation',
        text: 'See docs/AUNTYPELZ_DYNAMIC_TOOLS.md for detailed examples, API usage, and implementation guides.',
      },
    ],
  },
  {
    id: 'personality-values',
    title: 'Personality & Values',
    description: 'Collect and view employee work style preferences during onboarding.',
    blocks: [
      {
        title: 'What it captures',
        items: [
          'Life Values - employees rate importance of 12 values (Family, Career Growth, Work-Life Balance, etc.) on a 1-5 scale.',
          'What You Should Know About Me - 19 questions about work style, communication preferences, and collaboration habits.',
          'This data helps teams understand new hires and work together more effectively.',
        ],
      },
      {
        title: 'Employee onboarding experience',
        ordered: true,
        items: [
          'New hires receive their onboarding link via email.',
          'Step 1: Complete profile (address, contact, bank details, emergency contact).',
          'Step 2: Rate life values by importance (1-5 scale for each value).',
          'Step 3: Answer work style questions (as many or as few as desired).',
          'Step 4: View completion confirmation and resources.',
        ],
      },
      {
        title: 'Viewing employee personality data',
        ordered: true,
        items: [
          'Go to Employees and open an employee profile.',
          'Click the Personality tab.',
          'View Life Values sorted by importance (highest rated first).',
          'Review work style answers in the What You Should Know About Me section.',
          'If data is not available, the employee has not completed this section.',
        ],
      },
      {
        title: 'Best practices',
        items: [
          'Share personality profiles with managers before a new hire starts.',
          'Use life values to understand what motivates team members.',
          'Reference work style preferences in 1:1s and team settings.',
          'Respect that some employees may share less - all questions are optional.',
        ],
      },
    ],
  },
  {
    id: 'applications',
    title: 'Applications and integrations',
    description: 'Connect external systems used in onboarding and offboarding.',
    blocks: [
      {
        title: 'Applications page',
        ordered: true,
        items: [
          'Open Applications in the sidebar to see enabled apps.',
          'Toggle an app on or off when it is connected.',
          'Use Test Connection to validate credentials.',
          'Open Manage in Settings for advanced configuration.',
        ],
      },
      {
        title: 'Configure a connection',
        ordered: true,
        items: [
          'Go to Settings > Applications and open the app you want to connect.',
          'Enter the required credentials (domain, admin email, tokens).',
          'Click Save and verify the connection status.',
          'Run Test Connection to confirm everything is working.',
          'Use Disconnect if you need to rotate credentials.',
        ],
      },
      {
        title: 'Custom apps and archiving',
        items: [
          'Use Add application to create custom integrations.',
          'Archive apps you no longer need and restore them from the archived list.',
          'Use Initialize defaults if you want to rebuild the standard app list.',
        ],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'In-app alerts and optional email notifications for admins.',
    blocks: [
      {
        title: 'In-app notifications',
        items: [
          'The bell icon shows the unread count for admin roles.',
          'Opening the dropdown marks items as read.',
          'Recent activity includes a label, actor, and timestamp.',
          'Click View all notifications to open the full list.',
        ],
      },
      {
        title: 'Notification center',
        ordered: true,
        items: [
          'Open Notifications from the bell menu or the sidebar.',
          'Use Show archived to view or hide archived items.',
          'Archive items you no longer need and restore them later.',
          'Open the audit log from this page for full history.',
        ],
      },
      {
        title: 'Email notification settings',
        ordered: true,
        items: [
          'Go to Settings > Notifications.',
          'Enable Send email alerts if you want emails in addition to in-app alerts.',
          'Choose the recipient mode: All admins, Initiator, or Selected admins.',
          'Select triggers by category (offers, employees, onboarding, offboarding, apps, provisioning, auth).',
          'Click Save changes and confirm the success message.',
        ],
      },
    ],
  },
  {
    id: 'audit-log',
    title: 'Audit log',
    description: 'System activity for compliance and troubleshooting.',
    blocks: [
      {
        title: 'View and filter',
        ordered: true,
        items: [
          'Go to Settings > Audit Log.',
          'Filter by action, resource type, and date range.',
          'Clear filters to reset the view.',
        ],
      },
      {
        title: 'How to interpret entries',
        items: [
          'Timestamp shows when the activity occurred.',
          'Actor shows who performed the action (user or system).',
          'Action shows what happened (created, updated, deleted, signed).',
          'Resource shows the affected entity and identifier.',
          'Details provide extra context for troubleshooting.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-hiring-flow',
    title: 'Recruiting hiring flow',
    description: 'Manage interview stages for each role type.',
    blocks: [
      {
        title: 'Where to edit',
        items: [
          'Go to Settings > Hiring > Hiring Flows.',
          'Use the Hiring Flows tile in Settings to jump into the same page.',
          'Pick the role flow you want to manage.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Select a flow (Standard, Engineering, Sales, Executive).',
          'Edit stage names to match your process.',
          'Add or remove stages to reflect real-world steps.',
          'Review the preview to confirm the order.',
          'Click Save Changes to apply updates (button turns green to confirm).',
        ],
      },
      {
        title: 'Access',
        items: [
          'SUPER_ADMIN and HR_ADMIN can edit hiring flows.',
          'MANAGER can view flows when creating positions.',
        ],
      },
    ],
  },
  {
    id: 'interview-settings',
    title: 'Interview settings',
    description: 'Centralize interview configuration and scoring tools.',
    blocks: [
      {
        title: 'Where to configure',
        items: [
          'Go to Settings > Hiring > Interview Settings.',
        ],
      },
      {
        title: 'What you can manage',
        items: [
          'Interview Types for format, duration, and question category defaults.',
          'Interview Rubrics for evaluator criteria and weights.',
          'Candidate Scoring to control weighted inputs.',
          'Question Bank to curate reusable interview questions.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Open Interview Settings and choose the area you want to update.',
          'Make your edits or additions in the selected screen.',
          'Save changes to apply them across the hiring workflow.',
        ],
      },
    ],
  },
  {
    id: 'featured-filters',
    title: 'Featured hiring filters',
    description: 'Control which interview and assessment types appear as quick filter cards.',
    blocks: [
      {
        title: 'Interview types',
        ordered: true,
        items: [
          'Go to Settings > Hiring > Interview Settings.',
          'Open Interview Types and select a type.',
          'Toggle “Feature in interview filters” to control whether it appears on the Interviews page.',
        ],
      },
      {
        title: 'Assessment templates',
        ordered: true,
        items: [
          'Go to Settings > Hiring > Assessments.',
          'Open an assessment template.',
          'Toggle “Feature in assessment filters” to show or hide it on the Assessments page.',
        ],
      },
      {
        title: 'Notes',
        items: [
          'The All filter always shows every interview and assessment, featured or not.',
          'Featured filters are ideal for the most common interview or assessment types.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-interest-forms',
    title: 'Interest forms',
    description: 'Create application forms that candidates fill out when applying.',
    blocks: [
      {
        title: 'What they are',
        items: [
          'Interest forms are custom application questionnaires linked to job postings.',
          'Candidates complete these forms when they apply for a position.',
          'Forms can include text fields, dropdowns, multi-select, rating scales, and more.',
        ],
      },
      {
        title: 'Create or edit a form',
        ordered: true,
        items: [
          'Go to Recruiting > Settings > Interest Forms.',
          'Click Create Form or Edit on an existing form.',
          'Enter a form name and optional description.',
          'Add questions with the appropriate field type (Short Text, Long Text, Dropdown, Multi-Select, Rating Scale, etc).',
          'Mark questions as required or optional.',
          'For dropdown or multi-select, enter comma-separated options.',
          'Click Create Form or Update Form to save.',
        ],
      },
      {
        title: 'Generate with AuntyPelz',
        ordered: true,
        items: [
          'Enter a form name (and optional description) to guide the generator.',
          'Select Generate with AuntyPelz to create a starter set of questions.',
          'Review the generated questions and edit as needed before saving.',
        ],
      },
      {
        title: 'Link to jobs',
        items: [
          'When creating or editing a job, select an interest form to attach.',
          'Every job needs an interest form before candidates can apply.',
          'Candidates see and complete this form on the public apply page.',
          'View submitted responses in the candidate profile.',
        ],
      },
    ],
  },
  {
    id: 'auto-send-settings',
    title: 'AuntyPelz Emails',
    description: 'Manage candidate email templates and sending behavior.',
    blocks: [
      {
        title: 'Where to configure',
        items: [
          'Go to Settings > Hiring > AuntyPelz Emails.',
          'Choose Email Settings or Email Templates from the list.',
        ],
      },
      {
        title: 'Email Settings',
        items: [
          'Set default CC and tracking preferences for candidate emails.',
          'Enable or disable auto-send on application.',
          'Configure auto-send behavior by stage.',
        ],
      },
      {
        title: 'Email Templates',
        items: [
          'Create and update templates for hiring stages and candidate messages.',
          'Use templates in auto-send rules and manual sends.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-rubrics',
    title: 'Interview rubrics',
    description: 'Define scoring criteria for consistent candidate evaluation.',
    blocks: [
      {
        title: 'What they are',
        items: [
          'Rubrics define the criteria interviewers use to score candidates.',
          'Each rubric is tied to an interview stage (HR Screen, Technical, Panel, etc).',
          'Criteria include a name, description, and weight (1-5).',
          'Scores use a 1-5 scale from Poor to Excellent.',
        ],
      },
      {
        title: 'Create or edit a rubric',
        ordered: true,
        items: [
          'Go to Settings > Hiring > Interview Settings.',
          'Select Interview Rubrics.',
          'Click Create Rubric or Edit on an existing rubric.',
          'Enter a rubric name and select the interview stage.',
          'Add scoring criteria with names, descriptions, and weights.',
          'Higher weights indicate more important criteria.',
          'Click Create Rubric or Update Rubric to save.',
        ],
      },
      {
        title: 'Using rubrics in interviews',
        items: [
          'When scheduling an interview, the assigned rubric determines the scorecard.',
          'Interviewers rate each criterion from 1-5 with notes.',
          'Scores are aggregated across all interviewers for comparison.',
          'Click on a rubric to preview the scoring scale and criteria.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-scoring',
    title: 'Candidate scoring',
    description: 'Configure how overall candidate scores are weighted.',
    blocks: [
      {
        title: 'Where to configure',
        items: [
          'Go to Settings > Hiring > Interview Settings.',
          'Select Candidate Scoring.',
          'Enable or disable score inputs based on your process.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Toggle the inputs you want included in the overall score.',
          'Adjust the weight sliders to set their importance.',
          'Review the enabled weight total (weights are normalized).',
          'Click Save Scoring to apply the new weights.',
        ],
      },
      {
        title: 'Notes',
        items: [
          'Only available profile data is included in the calculation.',
          'Missing inputs are excluded from the weighted average.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-job-score-display',
    title: 'Job score display',
    description: 'Control the score shown in the jobs list donut.',
    blocks: [
      {
        title: 'Where to configure',
        items: [
          'Go to Settings > Hiring > General Settings.',
          'Locate Jobs list score display.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Choose Average score to show the mean candidate score.',
          'Choose Max score to highlight the top candidate score.',
          'Return to Hiring > Positions to see the updated donut value and label.',
        ],
      },
      {
        title: 'Notes',
        items: [
          'Only candidates with a score contribute to the metrics.',
          'The display choice does not change candidate scores, only the jobs list summary.',
        ],
      },
    ],
  },
  {
    id: 'decision-support-settings',
    title: 'AuntyPelz Decision Support',
    description: 'Manage personality templates, team profile guidance, and toggle them by job.',
    blocks: [
      {
        title: 'Where to configure',
        items: [
          'Go to Settings > Hiring > General Settings for global and per-job toggles.',
          'Go to Settings > Teams to edit personality templates and team profiles.',
        ],
      },
      {
        title: 'Global toggles',
        ordered: true,
        items: [
          'Enable decision support to turn on AuntyPelz guidance in hiring insights.',
          'Toggle Personality profiles to include OCEAN/MBTI templates.',
          'Toggle Team profiles to include team-specific preferences.',
        ],
      },
      {
        title: 'Per-job overrides',
        ordered: true,
        items: [
          'In General Settings, find the Per-job overrides list.',
          'Switch Decision, Personality, or Team for a specific role.',
          'Use overrides to exclude sensitive roles or experiments.',
        ],
      },
    ],
  },
  {
    id: 'candidate-profile-export',
    title: 'Candidate profile export',
    description: 'Download a structured PDF summary of a candidate profile.',
    blocks: [
      {
        title: 'How to export',
        ordered: true,
        items: [
          'Open Recruiting > Candidates and select a candidate.',
          'In the profile header, click Export Profile.',
          'Wait for the PDF to generate and download.',
          'Share the PDF with stakeholders or attach it to hiring notes.',
        ],
      },
      {
        title: 'What is included',
        items: [
          'Candidate contact details, stage, and position.',
          'Weighted score breakdown and overall score.',
          'Stage progress, interviews, and assessments.',
          'AuntyPelz summary, strengths, and areas to explore.',
          'Must-validate items and resume summary when available.',
        ],
      },
    ],
  },
  {
    id: 'candidates-list',
    title: 'Candidates list columns',
    description: 'Customize which fields appear in the candidates table.',
    blocks: [
      {
        title: 'Show LinkedIn profiles',
        items: [
          'LinkedIn icons appear below candidate names when a profile link exists.',
          'Click the icon to open the candidate’s LinkedIn profile in a new tab.',
        ],
      },
      {
        title: 'Choose additional columns',
        ordered: true,
        items: [
          'Go to Recruiting > Candidates.',
          'You can also use this on a specific job’s Candidates view.',
          'Select the three-dot menu beside Last Updated.',
          'Toggle fields like Country, Source, Salary, or MBTI to show them.',
        ],
      },
    ],
  },
  {
    id: 'recruiting-jobs',
    title: 'Recruiting jobs',
    description: 'Create and manage job roles for the recruiting pipeline.',
    blocks: [
      {
        title: 'Create a job',
        ordered: true,
        items: [
          'Go to Recruiting > Positions and click Create Job.',
          'Fill in the job details (title, team, employment type, priority).',
          'Set a Deadline date to indicate when the role should be filled.',
          'Set Number of Hires if you plan to fill multiple seats.',
          'Add locations (multi-select); you can enter any city or region and Lagos is suggested.',
          'Choose the interview flow and competency requirements.',
          'Click Create Job to publish or Save as Draft to finish later.',
        ],
      },
      {
        title: 'Dates in job headers',
        items: [
          'Start shows the job creation date.',
          'Deadline shows the target fill date you set in job details.',
        ],
      },
    ],
  },
  {
    id: 'settings-reference',
    title: 'Settings reference',
    description: 'What each Settings page does and how to use it.',
    blocks: [
      {
        title: 'Organization profile',
        items: [
          'Upload a logo and update company information.',
          'Edit letterhead fields (email, phone, website, address).',
          'Set the default Google Workspace transfer email if needed.',
          'Save changes to apply them across templates.',
        ],
      },
      {
        title: 'App Admins',
        items: [
          'Invite new admins by email and assign a role.',
          'Copy the invite link when email delivery is not available.',
          'Resend or revoke pending invites as needed.',
          'Update roles for existing admins.',
        ],
      },
      {
        title: 'Signature blocks',
        items: [
          'Create signatory blocks used on offers and contracts.',
          'Store the signatory name, title, and optional signature image.',
          'Edit existing blocks to update signatory information.',
        ],
      },
      {
        title: 'Legal entities',
        items: [
          'Add the legal entities used on offers and contracts.',
          'Remove entities that are no longer in use.',
          'Select a legal entity when creating a new contract.',
        ],
      },
      {
        title: 'Contract templates',
        items: [
          'Open a template type (full time, contractor, internship, etc).',
          'Edit the name, description, and template body.',
          'Use placeholders like %{variable_name} for dynamic values.',
          'Save to apply the template to new contracts.',
        ],
      },
      {
        title: 'On/Offboarding settings',
        items: [
          'Open On/Offboarding Settings to manage both flows.',
          'Add manual or integration steps for onboarding.',
          'Edit offboarding tasks used in employee departures.',
          'Reorder steps to match your internal process.',
          'Reset to defaults if you need the base workflow.',
        ],
      },
      {
        title: 'Integrations (Settings)',
        items: [
          'Initialize default integrations if the list is empty.',
          'Create custom integrations for tools not listed by default.',
          'Archive and restore integrations as your stack changes.',
          'Open an integration to configure credentials and run tests.',
        ],
      },
      {
        title: 'AuntyPelz Settings',
        items: [
          'Configure AuntyPelz behavior and capabilities.',
          'View chat history and usage statistics.',
          'Manage AuntyPelz access by role.',
        ],
      },
      {
        title: 'API settings',
        items: [
          'Create API keys for integrations and automation.',
          'Copy the generated key immediately and store it securely.',
          'Revoke keys that are no longer needed.',
          'Open API documentation for developer guidance.',
        ],
      },
      {
        title: 'Documentation',
        items: [
          'Use this page as a reference for every module.',
          'Start with Quick start if you are setting up a new workspace.',
          'Use the table of contents to jump to a specific section.',
        ],
      },
    ],
  },
  {
    id: 'my-profile',
    title: 'My Profile',
    description: 'Manage your own account details and password.',
    blocks: [
      {
        title: 'What you can do',
        items: [
          'View your name, email, and role.',
          'Open your linked employee profile if available.',
          'Update your password securely.',
        ],
      },
      {
        title: 'Step-by-step',
        ordered: true,
        items: [
          'Open the profile menu and click My Profile.',
          'Review your account details.',
          'Fill out the Update Password form and save changes.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and quick checks.',
    blocks: [
      {
        title: 'Notifications not showing',
        items: [
          'Confirm you are using an admin role (only admins see notifications).',
          'Check Settings > Notifications for email settings.',
          'Disable Show archived if you only want active items.',
        ],
      },
      {
        title: 'Automation tasks failing',
        items: [
          'Verify the app connection in Settings > Applications.',
          'Run Test Connection and confirm the status is Connected.',
          'Review provisioning rules and required app permissions.',
          'Check the Audit Log for details on the failure.',
        ],
      },
      {
        title: 'Contracts not sending',
        items: [
          'Confirm the candidate email and signature block are set.',
          'Make sure the contract is in Draft status before sending.',
          'Check Notifications and the Audit Log for any errors.',
        ],
      },
    ],
  },
]

export default function DocumentationPage() {
  const renderSections = (sections: DocSection[]) => (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Table of contents</CardTitle>
          <CardDescription>Jump to any section in this guide.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {section.title}
            </a>
          ))}
        </CardContent>
      </Card>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.blocks.map((block, blockIndex) => (
                <div key={`${section.id}-${blockIndex}`} className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">{block.title}</h4>
                  {block.text ? <p className="text-sm text-foreground/80">{block.text}</p> : null}
                  {block.items ? (
                    block.ordered ? (
                      <ol className="list-decimal list-inside text-sm text-foreground/80 space-y-1">
                        {block.items.map((item, itemIndex) => (
                          <li key={`${section.id}-${blockIndex}-${itemIndex}`}>{item}</li>
                        ))}
                      </ol>
                    ) : (
                      <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                        {block.items.map((item, itemIndex) => (
                          <li key={`${section.id}-${blockIndex}-${itemIndex}`}>{item}</li>
                        ))}
                      </ul>
                    )
                  ) : null}
                  {block.diagram ? (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Diagram
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-foreground/80">
                        {block.diagram.steps.map((step, stepIndex) => (
                          <span key={`${section.id}-${blockIndex}-diagram-${stepIndex}`}>
                            <span className="rounded-full border bg-background px-2 py-1 text-xs font-medium text-foreground">
                              {step}
                            </span>
                            {stepIndex < block.diagram.steps.length - 1 ? (
                              <span className="mx-2 text-xs text-muted-foreground">-&gt;</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                      {block.diagram.caption ? (
                        <p className="mt-2 text-sm text-foreground/70">{block.diagram.caption}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {block.image ? (
                    <figure className="space-y-2">
                      <div className="overflow-hidden rounded-lg border bg-muted/30">
                        <img
                          src={block.image.src}
                          alt={block.image.alt}
                          className="h-auto w-full"
                          loading="lazy"
                        />
                      </div>
                      {block.image.caption ? (
                        <figcaption className="text-xs text-muted-foreground">
                          {block.image.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ))}
    </>
  )

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Documentation"
        description="Step-by-step guidance for every area of Curacel People."
      />

      <div className="space-y-6 max-w-5xl">
        {renderSections(docSectionsV2)}
        <div className="flex items-center justify-between border-t pt-6">
          <p className="text-sm text-muted-foreground">Looking for the classic guide?</p>
          <a href="#classic-documentation" className="text-sm text-blue-600 hover:underline">
            Version 1 documentation
          </a>
        </div>
        <div id="classic-documentation" className="scroll-mt-24">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Classic documentation (V1)</h2>
            <p className="text-sm text-muted-foreground">
              The original reference guide for legacy workflows and labels.
            </p>
          </div>
        </div>
        {renderSections(docSectionsV1)}
      </div>
    </div>
  )
}
