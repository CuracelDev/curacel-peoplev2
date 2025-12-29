'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronRight, ListChecks, UserMinus } from 'lucide-react'

const flowOptions = [
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
]

export default function OnOffboardingSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">On/Offboarding Settings</h1>
          <p className="text-sm text-gray-600">
            Manage onboarding and offboarding workflows in one place.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {flowOptions.map((option, index) => {
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
