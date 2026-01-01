'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  GitBranch,
  ChevronRight,
  ArrowLeft,
  ClipboardList,
  Target,
} from 'lucide-react'

const jobSettingsOptions = [
  {
    title: 'Job Descriptions',
    description: 'Manage job descriptions for different roles. Create, version, and organize JDs for your hiring pipeline.',
    icon: Briefcase,
    href: '/hiring/settings/jd-templates',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Interview Settings',
    description: 'Edit hiring flows and interview stages used across recruiting.',
    icon: GitBranch,
    href: '/hiring/settings',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Hiring Rubrics',
    description: 'Create evaluation rubrics with weighted criteria for consistent candidate assessment.',
    icon: ClipboardList,
    href: '/hiring/settings/rubrics',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Role Competencies',
    description: 'Define competencies that can be selected when creating job positions.',
    icon: Target,
    href: '/hiring/settings/competencies',
    iconBg: 'bg-indigo-100',
  },
]

export default function JobSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Settings</h1>
          <p className="text-sm text-foreground/80">
            Manage job descriptions, interview flows, and hiring configurations
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {jobSettingsOptions.map((option, index) => {
              const Icon = option.icon
              return (
                <Link
                  key={index}
                  href={option.href}
                  className="flex items-center gap-4 p-6 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className={`${option.iconBg} p-3 rounded-lg flex-shrink-0`}>
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
