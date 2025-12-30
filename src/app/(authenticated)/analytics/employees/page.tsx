'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, UserPlus, UserMinus } from 'lucide-react'

export default function EmployeesAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Analytics</h1>
        <p className="text-gray-500">Track and analyze workforce metrics and trends</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Total Employees</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-gray-500 mt-1">Coming soon</span>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Retention Rate</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-gray-500 mt-1">Coming soon</span>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">New Hires (YTD)</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-gray-500 mt-1">Coming soon</span>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <UserPlus className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Turnover Rate</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-gray-500 mt-1">Coming soon</span>
              </div>
              <div className="p-3 rounded-lg bg-orange-100">
                <UserMinus className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Employee Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Coming Soon</p>
              <p className="text-sm text-gray-400 mt-1">Employee analytics features are under development</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
