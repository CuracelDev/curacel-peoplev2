'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight, Settings, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const autoSendItems = [
  {
    title: 'Email Settings',
    description: 'Sender defaults, tracking, and auto-send controls.',
    icon: Settings,
    href: '/settings/email-settings/general',
  },
  {
    title: 'Email Templates',
    description: 'Manage stage and message templates used for candidate emails.',
    icon: FileText,
    href: '/settings/email-settings/templates',
  },
]

export default function AutoSendSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AuntyPelz Emails</h1>
          <p className="text-sm text-foreground/80">
            Control email templates and auto-send behavior for hiring communications.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {autoSendItems.map((item) => {
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
