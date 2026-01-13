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

const DEFAULT_PROBATION_MONTHS = 3
const PROBATION_OPTIONS = Array.from({ length: 13 }, (_, index) => index)

export default function HiringGeneralSettingsPage() {
  const { data: hiringSettings } = trpc.hiringSettings.get.useQuery()
  const updateSettings = trpc.hiringSettings.update.useMutation()
  const [jobScoreDisplay, setJobScoreDisplay] = useState<'average' | 'max'>('average')
  const [probationLengths, setProbationLengths] = useState({
    fullTime: String(DEFAULT_PROBATION_MONTHS),
    partTime: String(DEFAULT_PROBATION_MONTHS),
    contractor: String(DEFAULT_PROBATION_MONTHS),
    intern: String(DEFAULT_PROBATION_MONTHS),
  })

  useEffect(() => {
    const value = hiringSettings?.jobScoreDisplay
    if (value === 'average' || value === 'max') {
      setJobScoreDisplay(value)
    }
    if (hiringSettings) {
      setProbationLengths({
        fullTime: String(hiringSettings.probationLengthFullTimeMonths ?? DEFAULT_PROBATION_MONTHS),
        partTime: String(hiringSettings.probationLengthPartTimeMonths ?? DEFAULT_PROBATION_MONTHS),
        contractor: String(hiringSettings.probationLengthContractorMonths ?? DEFAULT_PROBATION_MONTHS),
        intern: String(hiringSettings.probationLengthInternMonths ?? DEFAULT_PROBATION_MONTHS),
      })
    }
  }, [hiringSettings])

  const handleJobScoreDisplayChange = (value: 'average' | 'max') => {
    setJobScoreDisplay(value)
    updateSettings.mutate({ jobScoreDisplay: value })
  }

  const handleProbationLengthChange = (
    key: 'fullTime' | 'partTime' | 'contractor' | 'intern',
    value: string
  ) => {
    setProbationLengths((prev) => ({ ...prev, [key]: value }))
    const months = Number(value)
    updateSettings.mutate({
      ...(key === 'fullTime' ? { probationLengthFullTimeMonths: months } : {}),
      ...(key === 'partTime' ? { probationLengthPartTimeMonths: months } : {}),
      ...(key === 'contractor' ? { probationLengthContractorMonths: months } : {}),
      ...(key === 'intern' ? { probationLengthInternMonths: months } : {}),
    })
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
        <CardContent className="p-6 space-y-4">
          <div>
            <div className="text-lg font-semibold">Probation length defaults</div>
            <p className="text-sm text-muted-foreground">
              Set the default probation length (in months) for each employment type.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: 'fullTime', label: 'Full-time' },
              { key: 'partTime', label: 'Part-time' },
              { key: 'contractor', label: 'Contractor' },
              { key: 'intern', label: 'Internship' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <Select
                  value={probationLengths[item.key as keyof typeof probationLengths]}
                  onValueChange={(value) =>
                    handleProbationLengthChange(item.key as keyof typeof probationLengths, value)
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="3 months" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBATION_OPTIONS.map((months) => (
                      <SelectItem key={months} value={String(months)}>
                        {months === 0 ? 'No probation' : `${months} month${months === 1 ? '' : 's'}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Defaults apply when creating contracts. You can still override the probation end date per contract.
          </p>
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
