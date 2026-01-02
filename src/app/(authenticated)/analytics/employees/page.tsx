'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, UserPlus, UserMinus } from 'lucide-react'

export default function EmployeesAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total Employees</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-muted-foreground mt-1">Coming soon</span>
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
                <span className="text-sm text-muted-foreground">Retention Rate</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-muted-foreground mt-1">Coming soon</span>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">New Hires (YTD)</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-muted-foreground mt-1">Coming soon</span>
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
                <span className="text-sm text-muted-foreground">Turnover Rate</span>
                <span className="text-3xl font-bold mt-1">—</span>
                <span className="text-xs text-muted-foreground mt-1">Coming soon</span>
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
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              <p className="text-lg font-medium">Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1">Employee analytics features are under development</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
