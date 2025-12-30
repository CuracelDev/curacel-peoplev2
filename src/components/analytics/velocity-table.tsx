'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface PerHireVelocity {
  id: string
  name: string
  role: string
  department: string | null
  startDate: Date | string
  endDate: Date | string
  velocityDays: number
  year: number
}

interface RoleAverage {
  role: string
  avgVelocity: number
  count: number
}

interface VelocityTableProps {
  perHire?: PerHireVelocity[]
  byRole?: RoleAverage[]
  title?: string
  showPerHire?: boolean
}

export function VelocityTable({ perHire = [], byRole = [], title = 'Hiring Velocity', showPerHire = true }: VelocityTableProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, 'MMM yyyy')
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {showPerHire && perHire.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Per Hire</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Start</th>
                    <th className="pb-3 font-medium">End</th>
                    <th className="pb-3 font-medium text-right">Velocity (days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {perHire.slice(0, 20).map((hire) => (
                    <tr key={hire.id} className="hover:bg-gray-50">
                      <td className="py-2">
                        <span className="text-sm font-medium text-gray-900">{hire.role}</span>
                      </td>
                      <td className="py-2">
                        <span className="text-sm text-gray-600">{hire.name}</span>
                      </td>
                      <td className="py-2">
                        <span className="text-sm text-gray-500">{formatDate(hire.startDate)}</span>
                      </td>
                      <td className="py-2">
                        <span className="text-sm text-gray-500">{formatDate(hire.endDate)}</span>
                      </td>
                      <td className="py-2 text-right">
                        <Badge variant={hire.velocityDays <= 30 ? 'default' : hire.velocityDays <= 60 ? 'secondary' : 'outline'}>
                          {hire.velocityDays} days
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {byRole.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Average by Role</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium text-right">Avg Velocity</th>
                    <th className="pb-3 font-medium text-right">Hires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byRole.map((role) => (
                    <tr key={role.role} className="hover:bg-gray-50">
                      <td className="py-2">
                        <span className="text-sm font-medium text-gray-900">{role.role}</span>
                      </td>
                      <td className="py-2 text-right">
                        <span className="text-sm font-semibold">{role.avgVelocity} days</span>
                      </td>
                      <td className="py-2 text-right">
                        <span className="text-sm text-gray-500">{role.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {perHire.length === 0 && byRole.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No velocity data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
