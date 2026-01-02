'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileType,
  GitBranch,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const hiringSettingsItems = [
  {
    title: 'General Settings',
    description: 'Shared hiring defaults and display options.',
    icon: SlidersHorizontal,
    href: '/hiring/settings/general',
  },
  {
    title: 'Job Settings',
    description: 'Manage job postings, forms, recruiters, and careers page.',
    icon: Briefcase,
    href: '/settings/job-settings',
  },
  {
    title: 'Interest Forms',
    description: 'Customize candidate application forms.',
    icon: ClipboardCheck,
    href: '/hiring/settings/interest-forms',
  },
  {
    title: 'JD Templates',
    description: 'Job description templates.',
    icon: FileType,
    href: '/hiring/settings/jd-templates',
  },
  {
    title: 'Hiring Flows',
    description: 'Define interview stages and pipeline.',
    icon: GitBranch,
    href: '/hiring/settings/all?section=interview',
  },
  {
    title: 'Interview Settings',
    description: 'Manage interview types, rubrics, scoring, and question bank.',
    icon: Settings,
    href: '/hiring/settings/interview',
  },
  {
    title: 'Assessments',
    description: 'Configure tests and assessments.',
    icon: ClipboardList,
    href: '/hiring/settings/assessments',
  },
  {
    title: 'Auto Send Settings',
    description: 'Configure automatic stage emails and templates.',
    icon: Zap,
    href: '/settings/email-settings',
  },
  {
    title: 'AuntyPelz Decision Support',
    description: 'Configure personality templates and team profile guidance.',
    icon: Sparkles,
    href: '/hiring/settings/all?section=decision-support',
  },
]

export default function HiringSettingsHomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hiring</h1>
          <p className="text-sm text-foreground/80">
            Manage hiring workflows, forms, templates, and decision support in one place.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {hiringSettingsItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-4 p-6 hover:bg-muted transition-colors"
                >
                  <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-foreground/80">{item.description}</p>
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
