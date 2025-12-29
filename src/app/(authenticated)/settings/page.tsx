'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  Home,
  Link2,
  Menu,
  Building2,
  FileText,
  ChevronRight,
  ClipboardList,
  ListChecks,
  AppWindow,
  Key,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Users,
} from 'lucide-react'

const settingsSections = [
  {
    title: 'Organization',
    items: [
      {
        title: 'Organization profile',
        description: 'Update your organization profile.',
        icon: Home,
        href: '/settings/organization',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Legal entities',
        description: 'Manage the legal entities used on offers and contracts.',
        icon: Building2,
        href: '/settings/legal-entities',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Signature blocks',
        description: 'Set signatories and signatures for HR contracts.',
        icon: Menu,
        href: '/settings/signatures',
        iconBg: 'bg-indigo-100',
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
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Teams',
        description: 'Manage teams and departments. Sync from employee departments or create new teams.',
        icon: Users,
        href: '/settings/teams',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Contract templates',
        description: 'Contract templates for offers and employment agreements.',
        icon: FileText,
        href: '/settings/contract-templates',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'On/Offboarding Settings',
        description: 'Configure onboarding and offboarding workflows in one place.',
        icon: ListChecks,
        href: '/settings/on-offboarding',
        iconBg: 'bg-indigo-100',
      },
    ],
  },
  {
    title: 'Hiring',
    items: [
      {
        title: 'Job Settings',
        description: 'Manage job descriptions, interview flows, and hiring configurations.',
        icon: Briefcase,
        href: '/settings/job-settings',
        iconBg: 'bg-indigo-100',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Applications',
        description: 'Add, disable, archive, and manage applications.',
        icon: AppWindow,
        href: '/settings/applications',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'API Settings',
        description: 'Create and manage API keys for external integrations.',
        icon: Key,
        href: '/settings/api',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Blue AI',
        description: 'Configure Blue AI with OpenAI, Anthropic, or Gemini API keys.',
        icon: Bot,
        href: '/settings/ai-agent',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Audit Log',
        description: 'View all system activity, changes, and user actions for compliance and tracking.',
        icon: ClipboardList,
        href: '/settings/audit',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Notifications',
        description: 'Choose which admin emails are sent for key system events.',
        icon: Bell,
        href: '/settings/notifications',
        iconBg: 'bg-indigo-100',
      },
      {
        title: 'Documentation',
        description: 'Read a detailed guide on how each part of Curacel People works.',
        icon: BookOpen,
        href: '/settings/documentation',
        iconBg: 'bg-indigo-100',
      },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {settingsSections.map((section, sectionIndex) => (
            <div key={section.title} className={sectionIndex ? 'border-t border-gray-200' : ''}>
              <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {section.title}
              </div>
              <div className="divide-y divide-gray-200">
                {section.items.map((option, index) => {
                  const Icon = option.icon
                  return (
                    <Link
                      key={`${section.title}-${index}`}
                      href={option.href}
                      className="flex items-center gap-4 p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className={`${option.iconBg} p-3 rounded-lg flex-shrink-0`}>
                        <Icon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {option.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {option.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
