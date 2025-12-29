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
  UserMinus,
  AppWindow,
  Key,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Users,
  GitBranch,
} from 'lucide-react'

const settingsOptions = [
  {
    title: 'Organization profile',
    description: 'Update your organization profile.',
    icon: Home,
    href: '/settings/organization',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Team members',
    description: 'See all and invite your team members to Curacel.',
    icon: Link2,
    href: '/settings/team',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Signature blocks',
    description: 'Manage electronic signatures for the people who will sign HR contracts on behalf of your organization.',
    icon: Menu,
    href: '/settings/signatures',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Legal entities',
    description: 'Manage your legal entities - your registered company that can enter into a contract legally.',
    icon: Building2,
    href: '/settings/legal-entities',
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
    description: 'Contract templates ranging from full time employment contracts to non-disclosure agreements.',
    icon: FileText,
    href: '/settings/contract-templates',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Job Descriptions',
    description: 'Manage job descriptions for different roles. Create, version, and organize JDs for your hiring pipeline.',
    icon: Briefcase,
    href: '/settings/jd-templates',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Interview settings',
    description: 'Edit hiring flows and interview stages used across recruiting.',
    icon: GitBranch,
    href: '/recruiting/settings',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Onboarding flow',
    description: 'Configure the default onboarding steps and their order.',
    icon: ListChecks,
    href: '/settings/onboarding-flow',
    iconBg: 'bg-indigo-100',
  },
  {
    title: 'Offboarding flow',
    description: 'Configure the default offboarding steps and their order.',
    icon: UserMinus,
    href: '/settings/offboarding-flow',
    iconBg: 'bg-indigo-100',
  },
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
]

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {settingsOptions.map((option, index) => {
              const Icon = option.icon
              return (
                <Link
                  key={index}
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
        </CardContent>
      </Card>
    </div>
  )
}
