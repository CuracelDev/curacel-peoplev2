'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MonthData {
  month: number
  monthName: string
  interviews: number
  trials: number
  hired: number
  trialPassRate: number
  interviewTrialRate: number
}

interface KeyMetrics {
  trialPassRate: number
  trialHireRate: number
  offerAcceptanceRate: number
  hiringFillRate: number
  interviewTrial: number
}

interface MonthlyTableProps {
  year: number
  months: MonthData[]
  totals: { interviews: number; trials: number; hired: number }
  keyMetrics: KeyMetrics
  title?: string
}

export function MonthlyTable({ year, months, totals, keyMetrics, title }: MonthlyTableProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title || `Monthly Metrics - ${year}`}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b">
                <th className="pb-3 font-medium">Month</th>
                <th className="pb-3 font-medium text-right">No of Interviews</th>
                <th className="pb-3 font-medium text-right">No of Trials</th>
                <th className="pb-3 font-medium text-right">Candidates Hired</th>
                <th className="pb-3 font-medium text-right">Trial Pass Rate</th>
                <th className="pb-3 font-medium text-right">Interview-Trial Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {months.map((month) => (
                <tr key={month.month} className="hover:bg-muted/50">
                  <td className="py-2">
                    <span className="text-sm font-medium text-foreground">{month.monthName}</span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-sm">{month.interviews}</span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-sm">{month.trials}</span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-sm font-semibold text-success">
                      {month.hired > 0 ? month.hired : '-'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-sm">{month.trialPassRate > 0 ? `${month.trialPassRate}%` : '-'}</span>
                  </td>
                  <td className="py-2 text-right">
                    <span className="text-sm">{month.interviewTrialRate > 0 ? `${month.interviewTrialRate}%` : '-'}</span>
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-muted/50 font-semibold">
                <td className="py-2">
                  <span className="text-sm text-foreground">Total</span>
                </td>
                <td className="py-2 text-right">
                  <span className="text-sm">{totals.interviews}</span>
                </td>
                <td className="py-2 text-right">
                  <span className="text-sm">{totals.trials}</span>
                </td>
                <td className="py-2 text-right">
                  <span className="text-sm text-success">{totals.hired}</span>
                </td>
                <td className="py-2 text-right">-</td>
                <td className="py-2 text-right">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Key Metrics Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-foreground mb-3">Key Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Trial Pass Rate</p>
              <p className={`text-lg font-bold ${keyMetrics.trialPassRate >= 50 ? 'text-success' : keyMetrics.trialPassRate >= 30 ? 'text-yellow-600' : 'text-destructive'}`}>
                {keyMetrics.trialPassRate}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Trial-Hire Rate</p>
              <p className={`text-lg font-bold ${keyMetrics.trialHireRate >= 30 ? 'text-success' : keyMetrics.trialHireRate >= 20 ? 'text-yellow-600' : 'text-destructive'}`}>
                {keyMetrics.trialHireRate}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Offer Acceptance</p>
              <p className={`text-lg font-bold ${keyMetrics.offerAcceptanceRate >= 70 ? 'text-success' : keyMetrics.offerAcceptanceRate >= 50 ? 'text-yellow-600' : 'text-destructive'}`}>
                {keyMetrics.offerAcceptanceRate}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Hiring Fill Rate</p>
              <p className={`text-lg font-bold ${keyMetrics.hiringFillRate >= 50 ? 'text-success' : keyMetrics.hiringFillRate >= 30 ? 'text-yellow-600' : 'text-destructive'}`}>
                {keyMetrics.hiringFillRate}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Interview-Trial</p>
              <p className={`text-lg font-bold ${keyMetrics.interviewTrial >= 50 ? 'text-success' : keyMetrics.interviewTrial >= 30 ? 'text-yellow-600' : 'text-destructive'}`}>
                {keyMetrics.interviewTrial}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
