'use client'

import { useState, useEffect } from 'react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { trpc } from '@/lib/trpc-client'
import { Sparkles, Loader2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function AuntyPelzActionsPage() {
  const { data: settings, isLoading, refetch } = trpc.hiringSettings.get.useQuery()
  const updateSettings = trpc.hiringSettings.update.useMutation({
    onSuccess: () => {
      refetch()
    }
  })

  const [autoArchiveUnqualified, setAutoArchiveUnqualified] = useState(false)
  const [autoArchiveLocationMismatch, setAutoArchiveLocationMismatch] = useState(false)

  useEffect(() => {
    if (settings) {
      setAutoArchiveUnqualified(settings.autoArchiveUnqualified ?? false)
      setAutoArchiveLocationMismatch(settings.autoArchiveLocationMismatch ?? false)
    }
  }, [settings])

  const handleToggleAutoArchiveUnqualified = (checked: boolean) => {
    setAutoArchiveUnqualified(checked)
    updateSettings.mutate({ autoArchiveUnqualified: checked })
  }

  const handleToggleAutoArchiveLocationMismatch = (checked: boolean) => {
    setAutoArchiveLocationMismatch(checked)
    updateSettings.mutate({ autoArchiveLocationMismatch: checked })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="AuntyPelz Actions"
        description="Configure automated actions to streamline your hiring workflow. AuntyPelz will automatically filter and manage candidates based on your criteria."
        icon={<Sparkles className="h-5 w-5" />}
      />

      {/* Info banner */}
      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-5 w-5 text-indigo-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-indigo-900 mb-1">
              AI-Powered Candidate Filtering
            </div>
            <p className="text-sm text-indigo-700">
              AuntyPelz will automatically analyze candidates and archive those who don't meet your job requirements,
              saving you time and helping you focus on the most qualified applicants.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-archive unqualified applicants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Auto-archive unqualified applicants
                <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                Automatically archive applicants that do not meet your minimum job requirements.
                AuntyPelz will analyze candidate competencies, experience, and qualifications against your job criteria.
              </CardDescription>
            </div>
            <Switch
              checked={autoArchiveUnqualified}
              onCheckedChange={handleToggleAutoArchiveUnqualified}
              disabled={updateSettings.isPending}
            />
          </div>
        </CardHeader>
        {autoArchiveUnqualified && (
          <CardContent className="border-t bg-muted/30">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">What gets checked:</div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Required competencies and skill levels</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Minimum years of experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Education requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Critical job requirements marked as "must-have"</span>
                </li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Auto-archive location mismatch */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Auto-archive location mismatches
                <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                Automatically archive applicants whose location doesn't match your job's location requirements.
                Useful for roles that require on-site presence or specific geographic proximity.
              </CardDescription>
            </div>
            <Switch
              checked={autoArchiveLocationMismatch}
              onCheckedChange={handleToggleAutoArchiveLocationMismatch}
              disabled={updateSettings.isPending}
            />
          </div>
        </CardHeader>
        {autoArchiveLocationMismatch && (
          <CardContent className="border-t bg-muted/30">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">What gets checked:</div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Candidate's current location vs. job location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Willingness to relocate (if specified in interest form)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-0.5">•</span>
                  <span>Remote work eligibility</span>
                </li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Status indicator */}
      {(autoArchiveUnqualified || autoArchiveLocationMismatch) && (
        <Card className="border-success/20 bg-success/10">
          <CardContent className="flex items-center gap-3 py-4">
            <Sparkles className="h-5 w-5 text-success" />
            <div className="text-sm text-success-foreground">
              AuntyPelz automated actions are enabled and will process new candidates automatically.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
