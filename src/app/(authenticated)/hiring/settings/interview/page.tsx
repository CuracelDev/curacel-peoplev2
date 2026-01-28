'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { BarChart3, ChevronRight, ClipboardCheck, MessageSquare, Video, UserCheck } from 'lucide-react'

const interviewSettingsOptions = [
  {
    title: 'Interview Types',
    description: 'Configure interview formats, durations, and question categories.',
    icon: Video,
    href: '/hiring/settings/interview-types',
  },
  {
    title: 'Interview Rubrics',
    description: 'Define evaluation criteria and scoring rubrics for interviews.',
    icon: ClipboardCheck,
    href: '/hiring/settings/rubrics',
  },
  {
    title: 'Candidate Scoring',
    description: 'Configure score weighting for candidate profiles.',
    icon: BarChart3,
    href: '/hiring/settings/all?section=scoring',
  },
  {
    title: 'Question Bank',
    description: 'Manage reusable interview questions and categories.',
    icon: MessageSquare,
    href: '/hiring/questions',
  },
  {
    title: 'Advisors',
    description: 'Manage external interview advisors.',
    icon: UserCheck,
    href: '/settings/advisors',
  },
]

export default function InterviewSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Interview Settings"
        description="Manage interview configuration, rubrics, and scoring."
      />

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {interviewSettingsOptions.map((option) => {
              const Icon = option.icon
              return (
                <Link
                  key={option.title}
                  href={option.href}
                  className="flex items-center gap-4 p-6 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-foreground/80">
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
