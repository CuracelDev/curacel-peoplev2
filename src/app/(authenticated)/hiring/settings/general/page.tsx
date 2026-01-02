'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, Webhook, ArrowRight } from 'lucide-react'
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

export default function HiringGeneralSettingsPage() {
  const { data: hiringSettings } = trpc.hiringSettings.get.useQuery()
  const updateSettings = trpc.hiringSettings.update.useMutation()
  const [jobScoreDisplay, setJobScoreDisplay] = useState<'average' | 'max'>('average')

  useEffect(() => {
    const value = hiringSettings?.jobScoreDisplay
    if (value === 'average' || value === 'max') {
      setJobScoreDisplay(value)
    }
  }, [hiringSettings])

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
