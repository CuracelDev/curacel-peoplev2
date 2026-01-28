'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ChevronRight, ListChecks, UserMinus, Settings } from 'lucide-react'
import { trpc } from '@/lib/trpc-client'

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
  const [googleTransferEmail, setGoogleTransferEmail] = useState('')
  const { data: organization } = trpc.organization.get.useQuery()
  const updateOrganization = trpc.organization.update.useMutation()

  useEffect(() => {
    if (organization?.googleWorkspaceTransferToEmail) {
      setGoogleTransferEmail(organization.googleWorkspaceTransferToEmail)
    }
  }, [organization])

  const handleSaveGoogleSettings = async () => {
    if (!organization) return
    await updateOrganization.mutateAsync({
      name: organization.name,
      googleWorkspaceTransferToEmail: googleTransferEmail || null,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">On/Offboarding Settings</h1>
          <p className="text-sm text-foreground/80">
            Manage onboarding and offboarding workflows in one place.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {flowOptions.map((option, index) => {
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

      {/* General Settings */}
      <Card>
        <CardHeader className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-muted p-2 rounded-lg">
              <Settings className="h-5 w-5 text-foreground/80" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">General Settings</h2>
              <p className="text-sm text-muted-foreground">Configure general offboarding settings</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="googleTransferEmail" className="text-sm font-medium">
                Google Workspace - Default file transfer owner
              </Label>
              <div className="flex gap-3">
                <Input
                  id="googleTransferEmail"
                  type="email"
                  value={googleTransferEmail}
                  onChange={(e) => setGoogleTransferEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="max-w-md"
                />
                <Button
                  onClick={handleSaveGoogleSettings}
                  disabled={updateOrganization.isPending}
                >
                  {updateOrganization.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used when transferring Google Drive ownership during employee offboarding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
