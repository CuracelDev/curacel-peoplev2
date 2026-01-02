'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, Webhook, ArrowRight, Sparkles } from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc-client'

export default function HiringGeneralSettingsPage() {
  const utils = trpc.useUtils()
  const { data: hiringSettings } = trpc.hiringSettings.get.useQuery()
  const { data: decisionSupportJobs } = trpc.hiringSettings.getDecisionSupportJobs.useQuery()
  const updateSettings = trpc.hiringSettings.update.useMutation()
  const updateJobDecisionSupport = trpc.hiringSettings.updateJobDecisionSupport.useMutation({
    onSuccess: () => {
      utils.hiringSettings.getDecisionSupportJobs.invalidate()
    },
  })
  const [jobScoreDisplay, setJobScoreDisplay] = useState<'average' | 'max'>('average')
  const [decisionSupportEnabled, setDecisionSupportEnabled] = useState(true)
  const [personalityProfilesEnabled, setPersonalityProfilesEnabled] = useState(true)
  const [teamProfilesEnabled, setTeamProfilesEnabled] = useState(true)

  useEffect(() => {
    const value = hiringSettings?.jobScoreDisplay
    if (value === 'average' || value === 'max') {
      setJobScoreDisplay(value)
    }
    if (typeof hiringSettings?.decisionSupportEnabled === 'boolean') {
      setDecisionSupportEnabled(hiringSettings.decisionSupportEnabled)
    }
    if (typeof hiringSettings?.personalityProfilesEnabled === 'boolean') {
      setPersonalityProfilesEnabled(hiringSettings.personalityProfilesEnabled)
    }
    if (typeof hiringSettings?.teamProfilesEnabled === 'boolean') {
      setTeamProfilesEnabled(hiringSettings.teamProfilesEnabled)
    }
  }, [hiringSettings])

  const handleJobScoreDisplayChange = (value: 'average' | 'max') => {
    setJobScoreDisplay(value)
    updateSettings.mutate({ jobScoreDisplay: value })
  }

  const handleToggle = (key: 'decisionSupportEnabled' | 'personalityProfilesEnabled' | 'teamProfilesEnabled', value: boolean) => {
    if (key === 'decisionSupportEnabled') {
      setDecisionSupportEnabled(value)
      updateSettings.mutate({ decisionSupportEnabled: value })
      return
    }
    if (key === 'personalityProfilesEnabled') {
      setPersonalityProfilesEnabled(value)
      updateSettings.mutate({ personalityProfilesEnabled: value })
      return
    }
    setTeamProfilesEnabled(value)
    updateSettings.mutate({ teamProfilesEnabled: value })
  }

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="General Settings"
        description="Shared defaults for hiring and recruiting views."
        icon={<SlidersHorizontal className="h-5 w-5" />}
      />

      <Card className="border border-border rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">Jobs list score display</div>
              <p className="text-sm text-muted-foreground">
                Choose whether the jobs list donut shows the average or highest candidate score.
              </p>
            </div>
            <Select
              value={jobScoreDisplay}
              onValueChange={(value) => handleJobScoreDisplayChange(value as 'average' | 'max')}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Average score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Average score</SelectItem>
                <SelectItem value="max">Max score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border rounded-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">AuntyPelz Decision Support</div>
              <p className="text-sm text-muted-foreground">
                Control whether personality templates and team profiles are used in hiring insights.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Enable decision support</div>
                <p className="text-sm text-muted-foreground">Master switch for personality and team profile insights.</p>
              </div>
              <Switch checked={decisionSupportEnabled} onCheckedChange={(value) => handleToggle('decisionSupportEnabled', value)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Personality profiles</div>
                <p className="text-sm text-muted-foreground">Use OCEAN/MBTI templates for fit analysis.</p>
              </div>
              <Switch checked={personalityProfilesEnabled} onCheckedChange={(value) => handleToggle('personalityProfilesEnabled', value)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">Team profiles</div>
                <p className="text-sm text-muted-foreground">Include team-specific preferences in recommendations.</p>
              </div>
              <Switch checked={teamProfilesEnabled} onCheckedChange={(value) => handleToggle('teamProfilesEnabled', value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Per-job overrides</div>
            <div className="rounded-xl border border-border divide-y">
              {(decisionSupportJobs || []).map((job) => (
                <div key={job.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{job.title}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{job.department || 'Unassigned'}</span>
                      <Badge variant="secondary">{job.status}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Decision</span>
                      <Switch
                        checked={job.decisionSupportEnabled}
                        onCheckedChange={(value) => updateJobDecisionSupport.mutate({ jobId: job.id, decisionSupportEnabled: value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Personality</span>
                      <Switch
                        checked={job.personalityProfilesEnabled}
                        onCheckedChange={(value) => updateJobDecisionSupport.mutate({ jobId: job.id, personalityProfilesEnabled: value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Team</span>
                      <Switch
                        checked={job.teamProfilesEnabled}
                        onCheckedChange={(value) => updateJobDecisionSupport.mutate({ jobId: job.id, teamProfilesEnabled: value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {decisionSupportJobs && decisionSupportJobs.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No jobs available yet.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Link href="/hiring/settings/all?section=webhooks">
        <Card className="border border-border rounded-2xl hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Webhook className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Webhooks</div>
                  <p className="text-sm text-muted-foreground">
                    Configure webhooks to push job data to external systems.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
