'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ChevronRight,
  GitBranch,
  Video,
  FileQuestion,
  ClipboardCheck,
  MessageSquare,
  ClipboardList,
  Star,
  Brain,
  Users,
  BarChart3,
  Webhook,
  UserCircle2,
  Layers,
  Globe,
} from 'lucide-react'

// Section: Pipeline & Interviews
const pipelineOptions = [
  {
    title: 'Hiring Flows',
    description: 'Define interview stages and pipeline for different roles.',
    icon: GitBranch,
    href: '/recruiting/settings/all?section=interview',
  },
  {
    title: 'Interview Types',
    description: 'Configure interview types, formats, and durations.',
    icon: Video,
    href: '/recruiting/settings/all?section=interviewTypes',
  },
  {
    title: 'Interview Rubrics',
    description: 'Set evaluation criteria and scoring for interviews.',
    icon: ClipboardCheck,
    href: '/recruiting/settings/all?section=rubrics',
  },
]

// Section: Forms & Questions
const formsOptions = [
  {
    title: 'Interest Forms',
    description: 'Create application forms for candidates to complete.',
    icon: FileQuestion,
    href: '/recruiting/settings/all?section=interestForms',
  },
  {
    title: 'Question Bank',
    description: 'Manage reusable interview questions with AI suggestions.',
    icon: MessageSquare,
    href: '/recruiting/settings/all?section=questions',
  },
]

// Section: Assessments
const assessmentsOptions = [
  {
    title: 'Assessment Templates',
    description: 'Configure coding tests, personality assessments, and work trials.',
    icon: ClipboardList,
    href: '/recruiting/settings/assessments',
  },
]

// Section: Evaluation Criteria
const evaluationOptions = [
  {
    title: 'Competencies',
    description: 'Define the competencies expected of all hires.',
    icon: Star,
    href: '/recruiting/settings/all?section=competencies',
  },
  {
    title: 'Personality Templates',
    description: 'Define ideal OCEAN personality profiles by department.',
    icon: Brain,
    href: '/recruiting/settings/all?section=personality',
  },
  {
    title: 'Team Profiles',
    description: 'Configure team-specific settings and preferences.',
    icon: Users,
    href: '/recruiting/settings/all?section=team',
  },
  {
    title: 'Candidate Scoring',
    description: 'Configure how candidate scores are weighted.',
    icon: BarChart3,
    href: '/recruiting/settings/all?section=scoring',
  },
]

// Section: Integrations
const integrationsOptions = [
  {
    title: 'Webhooks',
    description: 'Configure webhook endpoints for external integrations.',
    icon: Webhook,
    href: '/recruiting/settings/all?section=webhooks',
  },
  {
    title: 'External Recruiters',
    description: 'Manage external recruiter access and permissions.',
    icon: UserCircle2,
    href: '/recruiting/settings/all?section=recruiters',
  },
  {
    title: 'Source Channels',
    description: 'Configure inbound and outbound candidate sources.',
    icon: Layers,
    href: '/recruiting/settings/all?section=sources',
  },
]

// Section: Public
const publicOptions = [
  {
    title: 'Public Careers Page',
    description: 'Customize your public careers page and job listings.',
    icon: Globe,
    href: '/recruiting/settings/all?section=careers',
  },
]

const sections = [
  { title: 'Pipeline & Interviews', description: 'Configure how candidates move through your hiring process.', options: pipelineOptions },
  { title: 'Forms & Questions', description: 'Manage application forms and interview questions.', options: formsOptions },
  { title: 'Assessments', description: 'Set up technical tests, personality assessments, and work trials.', options: assessmentsOptions },
  { title: 'Evaluation Criteria', description: 'Define how candidates are evaluated and scored.', options: evaluationOptions },
  { title: 'Integrations', description: 'Connect with external tools and platforms.', options: integrationsOptions },
  { title: 'Public Careers', description: 'Manage your public-facing careers presence.', options: publicOptions },
]

function SettingsSection({ title, description, options }: { title: string; description: string; options: typeof pipelineOptions }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">
        {title}
      </h2>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {options.map((option, index) => {
              const Icon = option.icon
              return (
                <Link
                  key={index}
                  href={option.href}
                  className="flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">
                      {option.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function HiringSettingsHubPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hiring Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your hiring pipeline, assessments, and candidate evaluation.
          </p>
        </div>
      </div>

      {sections.map((section) => (
        <SettingsSection
          key={section.title}
          title={section.title}
          description={section.description}
          options={section.options}
        />
      ))}
    </div>
  )
}
