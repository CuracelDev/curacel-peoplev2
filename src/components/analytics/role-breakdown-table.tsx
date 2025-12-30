'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface RoleMetrics {
  jobId: string
  jobTitle: string
  department: string | null
  qualifiedCvs: number
  interviews: number
  stages: {
    applied: number
    hrScreen: number
    technical: number
    panel: number
    trial: number
    ceoChatCount: number
    offer: number
    hired: number
  }
  conversionRates: {
    cvToInterview: number
    interviewToOffer: number
    offerToHire: number
  }
}

interface RoleBreakdownTableProps {
  data: RoleMetrics[]
  title?: string
}

export function RoleBreakdownTable({ data, title = 'Weekly by Role' }: RoleBreakdownTableProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium text-center">Qualified CVs</th>
                <th className="pb-3 font-medium text-center">Interviews</th>
                <th className="pb-3 font-medium text-center">HR Screen</th>
                <th className="pb-3 font-medium text-center">Technical</th>
                <th className="pb-3 font-medium text-center">Panel</th>
                <th className="pb-3 font-medium text-center">Trial</th>
                <th className="pb-3 font-medium text-center">CEO Chat</th>
                <th className="pb-3 font-medium text-center">Offer</th>
                <th className="pb-3 font-medium text-center">Hired</th>
                <th className="pb-3 font-medium">CV to Interview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-500">
                    No data available for this period
                  </td>
                </tr>
              ) : (
                data.map((role) => (
                  <tr key={role.jobId} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{role.jobTitle}</p>
                        {role.department && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {role.department}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm font-semibold">{role.qualifiedCvs}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm font-semibold">{role.interviews}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{role.stages.hrScreen}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{role.stages.technical}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{role.stages.panel}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{role.stages.trial}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{role.stages.ceoChatCount}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{role.stages.offer}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm font-semibold text-green-600">{role.stages.hired}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={role.conversionRates.cvToInterview} className="h-2 w-16" />
                        <span className="text-xs text-gray-500">
                          {role.conversionRates.cvToInterview.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
