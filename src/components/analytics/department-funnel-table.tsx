'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

interface DepartmentFunnel {
  department: string
  funnel: {
    applied: number
    hrScreen: number
    technical: number
    panel: number
    trial: number
    ceoChatCount: number
    offer: number
    hired: number
  }
  conversionRate: number
}

interface DepartmentFunnelTableProps {
  data: DepartmentFunnel[]
  year: number
  title?: string
}

export function DepartmentFunnelTable({ data, year, title }: DepartmentFunnelTableProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {title || `Hiring Funnel by Department (${year})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium text-center">Applied</th>
                <th className="pb-3 font-medium text-center"></th>
                <th className="pb-3 font-medium text-center">HR Screen</th>
                <th className="pb-3 font-medium text-center"></th>
                <th className="pb-3 font-medium text-center">Technical</th>
                <th className="pb-3 font-medium text-center"></th>
                <th className="pb-3 font-medium text-center">Panel</th>
                <th className="pb-3 font-medium text-center"></th>
                <th className="pb-3 font-medium text-center">Trial</th>
                <th className="pb-3 font-medium text-center"></th>
                <th className="pb-3 font-medium text-center">CEO Chat</th>
                <th className="pb-3 font-medium text-center"></th>
                <th className="pb-3 font-medium text-center">Offer</th>
                <th className="pb-3 font-medium text-center"></th>
                <th className="pb-3 font-medium text-center">Hired</th>
                <th className="pb-3 font-medium text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-8 text-center text-gray-500">
                    No data available for this year
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.department} className="hover:bg-gray-50">
                    <td className="py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {row.department || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm font-semibold">{row.funnel.applied}</span>
                    </td>
                    <td className="py-3 text-center">
                      <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{row.funnel.hrScreen}</span>
                    </td>
                    <td className="py-3 text-center">
                      <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{row.funnel.technical}</span>
                    </td>
                    <td className="py-3 text-center">
                      <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{row.funnel.panel}</span>
                    </td>
                    <td className="py-3 text-center">
                      <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{row.funnel.trial}</span>
                    </td>
                    <td className="py-3 text-center">
                      <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{row.funnel.ceoChatCount}</span>
                    </td>
                    <td className="py-3 text-center">
                      <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm">{row.funnel.offer}</span>
                    </td>
                    <td className="py-3 text-center">
                      <ArrowRight className="h-3 w-3 text-gray-300 mx-auto" />
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-sm font-semibold text-green-600">{row.funnel.hired}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-sm font-medium ${
                        row.conversionRate >= 10 ? 'text-green-600' :
                        row.conversionRate >= 5 ? 'text-yellow-600' :
                        'text-red-500'
                      }`}>
                        {row.conversionRate.toFixed(1)}%
                      </span>
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
