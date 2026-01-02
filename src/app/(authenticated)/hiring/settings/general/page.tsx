'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { SettingsPageHeader } from '@/components/layout/settings-page-header'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc-client'
import { AutoSendStageSettings } from '@/components/settings/auto-send-stage-settings'

export default function HiringGeneralSettingsPage() {
  const { data: hiringSettings } = trpc.hiringSettings.get.useQuery()
  const updateSettings = trpc.hiringSettings.update.useMutation()
  const [jobScoreDisplay, setJobScoreDisplay] = useState<'average' | 'max'>('average')

  useEffect(() => {
    const value = hiringSettings?.jobScoreDisplay
    if (value === 'average' || value === 'max') {
      setJobScoreDisplay(value)
    }
  }, [hiringSettings?.jobScoreDisplay])

  const handleJobScoreDisplayChange = (value: 'average' | 'max') => {
    setJobScoreDisplay(value)
    updateSettings.mutate({ jobScoreDisplay: value })
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

      {/* Auto-Send Email Settings */}
      <AutoSendStageSettings />
    </div>
  )
}
