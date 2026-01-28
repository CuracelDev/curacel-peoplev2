// Static task catalog for onboarding (fallback when Google Sheet is not configured)
// The app will try to fetch from Google Sheet "Task Catalog" tab first,
// then fall back to this static list if sheet is not available

export interface OnboardingTask {
  id: string
  section: 'todo' | 'to_read' | 'to_watch'
  title: string
  url?: string
  notes?: string
  isConditional?: boolean // e.g., "For full time employees"
  conditionalLabel?: string
  appliesTo?: 'all' | 'full_time' | 'contract'
}

export const ONBOARDING_TASKS: OnboardingTask[] = [
  // To Do section
  {
    id: 'task_001',
    section: 'todo',
    title: 'What you should know about me',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
    notes: 'make a copy and fill',
  },
  {
    id: 'task_002',
    section: 'todo',
    title: 'What my personal values are',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
    notes: 'make a copy and fill',
  },
  {
    id: 'task_003',
    section: 'todo',
    title: 'Bring your own device undertaking',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
    notes: 'make a copy and fill',
  },
  {
    id: 'task_004',
    section: 'todo',
    title: 'Personality Test',
    url: 'https://www.16personalities.com/',
    notes: 'forward result to peopleops@curacel.ai',
  },
  {
    id: 'task_005',
    section: 'todo',
    title: 'Biodata',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
    notes: 'make a copy and fill',
  },
  {
    id: 'task_006',
    section: 'todo',
    title: 'Email Signature',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_007',
    section: 'todo',
    title: 'Upload Headshot to personal folder',
  },
  {
    id: 'task_008',
    section: 'todo',
    title: 'Proof of former employment',
    notes: 'Offer letter, last Payslip, letter of resignation, Resignation confirmation letter on company letterhead',
    isConditional: true,
    conditionalLabel: 'For full time employees',
    appliesTo: 'full_time',
  },
  {
    id: 'task_009',
    section: 'todo',
    title: 'Employment Referencing',
    url: 'https://docs.google.com/forms/d/PLACEHOLDER',
    isConditional: true,
    conditionalLabel: 'For full time employees',
    appliesTo: 'full_time',
  },
  {
    id: 'task_010',
    section: 'todo',
    title: 'Sign in to Team GPT',
    url: 'https://app.team-gpt.com/',
  },
  {
    id: 'task_011',
    section: 'todo',
    title: 'Install Calendar plugin on Slack',
    url: 'https://slack.com/apps/A01FKCE2Q8Q-google-calendar',
  },
  {
    id: 'task_012',
    section: 'todo',
    title: 'Curacel Background for Meetings',
    url: 'https://drive.google.com/drive/folders/PLACEHOLDER',
  },
  {
    id: 'task_013',
    section: 'todo',
    title: 'Create a Passbolt Account',
    url: 'https://passbolt.curacel.co/',
  },
  {
    id: 'task_014',
    section: 'todo',
    title: 'Performance Sheet',
    url: 'https://docs.google.com/spreadsheets/d/PLACEHOLDER',
    notes: 'make a copy for yourself',
  },

  // To Read section
  {
    id: 'task_015',
    section: 'to_read',
    title: '47 Habits of highly successfully employees',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_016',
    section: 'to_read',
    title: 'AI/ML Terminologies',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_017',
    section: 'to_read',
    title: 'Curacel Values',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_018',
    section: 'to_read',
    title: 'Employee Handbook',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_019',
    section: 'to_read',
    title: 'Curacel Organogram',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_020',
    section: 'to_read',
    title: 'AI Manifesto',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_021',
    section: 'to_read',
    title: 'Curacel 2025 OKRs & KPIs',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_022',
    section: 'to_read',
    title: 'Curacel Product PRD',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },
  {
    id: 'task_023',
    section: 'to_read',
    title: 'AI Competency Framework',
    url: 'https://docs.google.com/document/d/PLACEHOLDER',
  },

  // To Watch section
  {
    id: 'task_024',
    section: 'to_watch',
    title: 'Start with Why - Simon Sinek',
    url: 'https://www.youtube.com/watch?v=u4ZoJKF_VuA',
  },
  {
    id: 'task_025',
    section: 'to_watch',
    title: 'Why the secret to success is setting the right goals - John Doerr',
    url: 'https://www.youtube.com/watch?v=L4N1q4RNi9I',
  },
  {
    id: 'task_026',
    section: 'to_watch',
    title: 'Passbolt Tutorial',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_027',
    section: 'to_watch',
    title: 'Curacel Health Detection',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_028',
    section: 'to_watch',
    title: 'Curacel Health Collection',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_029',
    section: 'to_watch',
    title: 'Curacel Pay',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_030',
    section: 'to_watch',
    title: 'Curacel Grow',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_031',
    section: 'to_watch',
    title: 'Curacel Auto Customer App',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_032',
    section: 'to_watch',
    title: 'Curacel Auto Insurer Dashboard',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_033',
    section: 'to_watch',
    title: 'How to use Google Drive',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
  {
    id: 'task_034',
    section: 'to_watch',
    title: 'How to create shortcut',
    url: 'https://www.youtube.com/watch?v=PLACEHOLDER',
  },
]

export const TASK_SECTIONS = {
  todo: {
    id: 'todo',
    title: 'To Do',
    description: 'Action items to complete',
  },
  to_read: {
    id: 'to_read',
    title: 'To Read',
    description: 'Documents and resources to review',
  },
  to_watch: {
    id: 'to_watch',
    title: 'To Watch',
    description: 'Videos and tutorials to watch',
  },
} as const

export function getTasksBySection(section: OnboardingTask['section']): OnboardingTask[] {
  return ONBOARDING_TASKS.filter(task => task.section === section)
}

export function getTaskById(id: string): OnboardingTask | undefined {
  return ONBOARDING_TASKS.find(task => task.id === id)
}

// Task progress types - now fetched from Google Sheet "Task Progress" tab
// Use trpc.onboarding.getEmployeeTaskProgress for real-time progress
export interface TaskProgress {
  taskId: string
  userId: string
  status: 'not_started' | 'in_progress' | 'completed'
  updatedAt?: string
}

// Legacy helper - use trpc.onboarding.getEmployeeTaskProgress instead
// This returns empty for backward compatibility
export function getTaskProgressForUser(_userId: string): Map<string, TaskProgress> {
  // Task progress is now fetched from Google Sheet via tRPC
  // See: trpc.onboarding.getEmployeeTaskProgress
  return new Map()
}
