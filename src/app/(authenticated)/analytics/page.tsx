'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MetricCard, TrendChart, RoleBreakdownTable, DepartmentFunnelTable } from '@/components/analytics'
import {
  Users,
  Target,
  Clock,
  TrendingUp,
  CheckCircle,
  Award,
  DollarSign,
  UserCheck,
  Percent,
  Timer,
} from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function AnalyticsPage() {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((currentDate.getMonth() + 1) / 3))
  const [selectedDeptYear, setSelectedDeptYear] = useState(currentDate.getFullYear())

  // Queries
  const { data: monthlyData, isLoading: monthlyLoading } = trpc.analytics.getMonthlyMetrics.useQuery({
    month: selectedMonth,
    year: selectedYear,
  })

  const { data: quarterlyData, isLoading: quarterlyLoading } = trpc.analytics.getQuarterlyMetrics.useQuery({
    quarter: selectedQuarter,
    year: selectedYear,
  })

  const { data: weeklyData, isLoading: weeklyLoading } = trpc.analytics.getWeeklyByRole.useQuery({})

  const { data: yearlyData, isLoading: yearlyLoading } = trpc.analytics.getYearlyByDepartment.useQuery({
    years: [selectedDeptYear],
  })

  const { data: trendsData } = trpc.analytics.getHiringTrends.useQuery({
    periods: 6,
  })

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i)

  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  // Transform weekly data to match table component
  const transformedWeeklyData = weeklyData?.roles?.map((role) => ({
    jobId: role.jobId,
    jobTitle: role.jobTitle,
    department: role.department,
    qualifiedCvs: role.qualifiedCVs,
    interviews: role.noOfInterviews,
    stages: {
      applied: 0,
      hrScreen: role.stageConversions.stage1to2,
      technical: role.stageConversions.stage2to3,
      panel: role.stageConversions.stage3to4,
      trial: role.noOfTrials,
      ceoChatCount: 0,
      offer: 0,
      hired: role.noOfRolesFilled,
    },
    conversionRates: {
      cvToInterview: role.qualifiedCVs > 0 ? Math.round((role.noOfInterviews / role.qualifiedCVs) * 100) : 0,
      interviewToOffer: 0,
      offerToHire: 0,
    },
  })) || []

  // Transform yearly data to match funnel table component
  const transformedYearlyData = yearlyData?.years?.[0]?.departments?.map((dept) => ({
    department: dept.department,
    funnel: {
      applied: dept.totalCVs,
      hrScreen: dept.firstStage,
      technical: dept.secondStage,
      panel: dept.thirdStage,
      trial: dept.trial,
      ceoChatCount: dept.ceoChat,
      offer: 0,
      hired: dept.hired,
    },
    conversionRate: dept.totalCVs > 0 ? Math.round((dept.hired / dept.totalCVs) * 100) : 0,
  })) || []

  // Transform trends data for chart
  const chartData = trendsData?.periods?.map((p) => ({
    month: p.label,
    [trendsData.metric]: p.count,
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hiring Analytics</h1>
        <p className="text-gray-500">Track and analyze your hiring performance metrics</p>
      </div>

      <Tabs defaultValue="monthly" className="space-y-6">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="weekly-role">Weekly by Role</TabsTrigger>
          <TabsTrigger value="yearly-dept">By Department</TabsTrigger>
        </TabsList>

        {/* Monthly View */}
        <TabsContent value="monthly" className="space-y-6">
          <div className="flex gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {monthlyLoading ? (
            renderLoading()
          ) : monthlyData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <MetricCard
                  title="No. of Trials"
                  value={monthlyData.metrics.noOfTrials}
                  icon={Target}
                  iconColor="text-purple-600"
                  iconBgColor="bg-purple-100"
                />
                <MetricCard
                  title="Trial Pass Rate"
                  value={monthlyData.metrics.trialPassRate}
                  format="percentage"
                  icon={CheckCircle}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                />
                <MetricCard
                  title="Interview-Trial Rate"
                  value={monthlyData.metrics.interviewTrialRate}
                  format="percentage"
                  icon={TrendingUp}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-100"
                />
                <MetricCard
                  title="Candidates Hired"
                  value={monthlyData.metrics.noOfCandidatesHired}
                  icon={UserCheck}
                  iconColor="text-emerald-600"
                  iconBgColor="bg-emerald-100"
                />
                <MetricCard
                  title="Hiring Velocity"
                  value={monthlyData.metrics.hiringVelocity}
                  format="days"
                  icon={Clock}
                  iconColor="text-orange-600"
                  iconBgColor="bg-orange-100"
                />
                <MetricCard
                  title="No. of Interviews"
                  value={monthlyData.metrics.noOfInterviews}
                  icon={Users}
                  iconColor="text-indigo-600"
                  iconBgColor="bg-indigo-100"
                />
              </div>

              {chartData.length > 0 && (
                <TrendChart
                  title="Hiring Trends (Last 6 Months)"
                  data={chartData}
                  xAxisKey="month"
                  lines={[
                    { dataKey: trendsData?.metric || 'hires', name: trendsData?.metric || 'Hires', color: '#3b82f6' },
                  ]}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No data available for this period
            </div>
          )}
        </TabsContent>

        {/* Quarterly View */}
        <TabsContent value="quarterly" className="space-y-6">
          <div className="flex gap-4">
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {QUARTERS.map((q, index) => (
                <option key={q} value={index + 1}>
                  {q}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {quarterlyLoading ? (
            renderLoading()
          ) : quarterlyData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <MetricCard
                  title="Hiring Velocity"
                  value={quarterlyData.metrics.hiringVelocity}
                  format="days"
                  icon={Clock}
                  iconColor="text-orange-600"
                  iconBgColor="bg-orange-100"
                />
                <MetricCard
                  title="Quality of Hire"
                  value={quarterlyData.metrics.qualityOfHire}
                  subtitle="avg. score"
                  icon={Award}
                  iconColor="text-yellow-600"
                  iconBgColor="bg-yellow-100"
                />
                <MetricCard
                  title="Hiring Fill Rate"
                  value={quarterlyData.metrics.hiringFillRate}
                  format="percentage"
                  icon={Target}
                  iconColor="text-purple-600"
                  iconBgColor="bg-purple-100"
                />
                <MetricCard
                  title="Avg Time to Hire"
                  value={quarterlyData.metrics.avgTimeToHire}
                  format="days"
                  icon={Timer}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-100"
                />
                <MetricCard
                  title="Offer Acceptance Rate"
                  value={quarterlyData.metrics.offerAcceptanceRate}
                  format="percentage"
                  icon={Percent}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                />
                <MetricCard
                  title="Cost per Hire"
                  value={quarterlyData.metrics.costPerHire}
                  format="currency"
                  icon={DollarSign}
                  iconColor="text-emerald-600"
                  iconBgColor="bg-emerald-100"
                />
              </div>

              {chartData.length > 0 && (
                <TrendChart
                  title="Pipeline Conversion Trends"
                  data={chartData}
                  xAxisKey="month"
                  chartType="bar"
                  bars={[
                    { dataKey: trendsData?.metric || 'hires', name: trendsData?.metric || 'Hires', color: '#10b981' },
                  ]}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No data available for this quarter
            </div>
          )}
        </TabsContent>

        {/* Weekly by Role View */}
        <TabsContent value="weekly-role" className="space-y-6">
          <div className="flex gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {weeklyLoading ? (
            renderLoading()
          ) : transformedWeeklyData.length > 0 ? (
            <RoleBreakdownTable
              data={transformedWeeklyData}
              title={`Role Breakdown - ${MONTHS[selectedMonth - 1]} ${selectedYear}`}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No role data available for this period
            </div>
          )}
        </TabsContent>

        {/* Yearly by Department View */}
        <TabsContent value="yearly-dept" className="space-y-6">
          <div className="flex gap-4">
            <select
              value={selectedDeptYear}
              onChange={(e) => setSelectedDeptYear(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {yearlyLoading ? (
            renderLoading()
          ) : transformedYearlyData.length > 0 ? (
            <DepartmentFunnelTable data={transformedYearlyData} year={selectedDeptYear} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No department data available for this year
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
