'use client'

import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, FileText, UserPlus, UserMinus, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const { data: stats, isLoading, error } = trpc.dashboard.getStats.useQuery()
  const { data: onboardingProgress } = trpc.dashboard.getOnboardingProgress.useQuery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Default values if stats not loaded
  const employees = stats?.employees || { total: 0, active: 0 }
  const workflows = stats?.workflows || { pendingOnboarding: 0, pendingOffboarding: 0 }
  const contracts = stats?.offers || { draft: 0, sent: 0, viewed: 0, signed: 0, declined: 0 }
  const recentHires = stats?.recentHires || []
  const upcomingStarts = stats?.upcomingStarts || []

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.total}</div>
            <p className="text-xs text-muted-foreground">
              {employees.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(contracts.sent || 0) + (contracts.viewed || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {contracts.signed || 0} signed this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.pendingOnboarding}</div>
            <p className="text-xs text-muted-foreground">in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offboarding</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.pendingOffboarding}</div>
            <p className="text-xs text-muted-foreground">scheduled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contract Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Status</CardTitle>
            <CardDescription>Current pipeline status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-24 text-sm">Draft</div>
                <div className="flex-1">
                  <Progress value={contracts.draft ? (contracts.draft / 10) * 100 : 0} className="h-2" />
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.draft || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm">Sent</div>
                <div className="flex-1">
                  <Progress value={contracts.sent ? (contracts.sent / 10) * 100 : 0} className="h-2" />
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.sent || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm">Viewed</div>
                <div className="flex-1">
                  <Progress value={contracts.viewed ? (contracts.viewed / 10) * 100 : 0} className="h-2" />
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.viewed || 0}</div>
              </div>
              <div className="flex items-center">
                <div className="w-24 text-sm">Signed</div>
                <div className="flex-1">
                  <Progress value={contracts.signed ? (contracts.signed / 10) * 100 : 0} className="h-2 bg-green-100 [&>div]:bg-green-500" />
                </div>
                <div className="w-12 text-right text-sm font-medium">{contracts.signed || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Active Onboarding</CardTitle>
            <CardDescription>Progress for new hires</CardDescription>
          </CardHeader>
          <CardContent>
            {onboardingProgress && onboardingProgress.length > 0 ? (
              <div className="space-y-4">
                {onboardingProgress.map((workflow) => (
                  <Link key={workflow.id} href={`/onboarding/${workflow.id}`}>
                    <div className="flex items-center p-2 rounded hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{workflow.employee.fullName}</p>
                        <p className="text-sm text-gray-500">
                          Start: {workflow.employee.startDate ? formatDate(workflow.employee.startDate) : 'TBD'}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Progress value={workflow.progress} className="w-24 h-2" />
                        <span className="text-sm text-gray-500 w-10">{workflow.progress}%</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No active onboarding</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Hires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Hires
            </CardTitle>
            <CardDescription>Started in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {recentHires && recentHires.length > 0 ? (
              <div className="space-y-4">
                {recentHires.map((employee) => (
                  <Link key={employee.id} href={`/employees/${employee.id}`}>
                    <div className="flex items-center p-2 rounded hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{employee.fullName}</p>
                        <p className="text-sm text-gray-500">{employee.jobTitle}</p>
                      </div>
                      <div className="ml-4">
                        <Badge variant="outline">{employee.department}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No recent hires</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Starts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Starts
            </CardTitle>
            <CardDescription>Starting in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingStarts && upcomingStarts.length > 0 ? (
              <div className="space-y-4">
                {upcomingStarts.map((employee) => (
                  <Link key={employee.id} href={`/employees/${employee.id}`}>
                    <div className="flex items-center p-2 rounded hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{employee.fullName}</p>
                        <p className="text-sm text-gray-500">{employee.jobTitle}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-medium">
                          {employee.startDate ? formatDate(employee.startDate) : 'TBD'}
                        </p>
                        <Badge variant="outline">{employee.department}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No upcoming starts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
