'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  Home,
  Link2,
  Menu,
  Building2,
  FileText,
  ClipboardList,
  ListChecks,
  AppWindow,
  Key,
  Bell,
  BookOpen,
  Bot,
  Users,
  GitBranch,
  FileQuestion,
  Star,
  Brain,
  Webhook,
  UserCircle2,
  Layers,
  Globe,
  UserCheck,
  SlidersHorizontal,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsSections = [
  {
    title: 'Organization',
    items: [
      {
        title: 'Organization profile',
        description: 'Update your organization profile.',
        icon: Home,
        href: '/settings/organization',
      },
      {
        title: 'Legal entities',
        description: 'Manage the legal entities used on offers and contracts.',
        icon: Building2,
        href: '/settings/legal-entities',
      },
      {
        title: 'Signature blocks',
        description: 'Set signatories and signatures for HR contracts.',
        icon: Menu,
        href: '/settings/signatures',
      },
    ],
  },
  {
    title: 'People',
    items: [
      {
        title: 'App Admins',
        description: 'Invite admins and manage access roles.',
        icon: Link2,
        href: '/settings/team',
      },
      {
        title: 'Teams',
        description: 'Manage teams and departments.',
        icon: Users,
        href: '/settings/teams',
      },
      {
        title: 'Contract templates',
        description: 'Contract templates for offers and employment.',
        icon: FileText,
        href: '/settings/contract-templates',
      },
      {
        title: 'On/Offboarding',
        description: 'Configure onboarding and offboarding workflows.',
        icon: ListChecks,
        href: '/settings/on-offboarding',
      },
    ],
  },
  {
    title: 'Hiring',
    items: [
      {
        title: 'General Settings',
        description: 'Shared hiring defaults and display options.',
        icon: SlidersHorizontal,
        href: '/hiring/settings/general',
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
        title: 'Interest Forms',
        description: 'Create candidate application forms.',
        icon: FileQuestion,
        href: '/hiring/settings/interest-forms',
      },
      {
        title: 'Assessments',
        description: 'Configure tests and assessments.',
        icon: ClipboardList,
        href: '/hiring/settings/assessments',
      },
      {
        title: 'Competencies',
        description: 'Define expected hire competencies.',
        icon: Star,
        href: '/hiring/settings/all?section=competencies',
      },
      {
        title: 'Personality Profiles',
        description: 'Define ideal OCEAN personality profiles.',
        icon: Brain,
        href: '/hiring/settings/all?section=personality',
      },
      {
        title: 'Team Profiles',
        description: 'Team-specific settings and preferences.',
        icon: Users,
        href: '/hiring/settings/all?section=team',
      },
      {
        title: 'Webhooks',
        description: 'External integration endpoints.',
        icon: Webhook,
        href: '/hiring/settings/all?section=webhooks',
      },
      {
        title: 'External Recruiters',
        description: 'Manage recruiter access.',
        icon: UserCircle2,
        href: '/hiring/settings/all?section=recruiters',
      },
      {
        title: 'Advisors',
        description: 'Manage external interview advisors.',
        icon: UserCheck,
        href: '/settings/advisors',
      },
      {
        title: 'Source Channels',
        description: 'Inbound/outbound candidate sources.',
        icon: Layers,
        href: '/hiring/settings/all?section=sources',
      },
      {
        title: 'Careers Page',
        description: 'Public careers page settings.',
        icon: Globe,
        href: '/hiring/settings/all?section=careers',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Public Pages',
        description: 'Manage public portals and links.',
        icon: Globe,
        href: '/settings/public-pages',
      },
      {
        title: 'Integrations',
        description: 'Add and manage integrations.',
        icon: AppWindow,
        href: '/settings/applications',
      },
      {
        title: 'API Settings',
        description: 'Create and manage API keys.',
        icon: Key,
        href: '/settings/api',
      },
      {
        title: 'BlueAI',
        description: 'Configure BlueAI API keys.',
        icon: Bot,
        href: '/settings/ai-agent',
      },
      {
        title: 'Audit Log',
        description: 'View system activity and changes.',
        icon: ClipboardList,
        href: '/settings/audit',
      },
      {
        title: 'Notifications',
        description: 'Manage admin email notifications.',
        icon: Bell,
        href: '/settings/notifications',
      },
      {
        title: 'Documentation',
        description: 'Read the product guide.',
        icon: BookOpen,
        href: '/settings/documentation',
      },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {settingsSections.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">
            {section.title}
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {section.items.map((option) => {
                  const Icon = option.icon
                  return (
                    <Link
                      key={option.title}
                      href={option.href}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl transition-all text-center',
                        'hover:bg-indigo-50 hover:shadow-sm group'
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 group-hover:bg-indigo-600 flex items-center justify-center transition-colors">
                        <Icon className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-foreground leading-tight">
                          {option.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {option.description}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
