'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MetricCard,
  TrendChart,
  FunnelChart,
  DropoffTable,
  VelocityTable,
  SourceBreakdown,
  MonthlyTable,
} from '@/components/analytics'
import {
  Users,
  Target,
  Clock,
  TrendingUp,
  CheckCircle,
  UserCheck,
  Percent,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsPage() {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [funnelYear, setFunnelYear] = useState(currentDate.getFullYear())
  const [funnelRole, setFunnelRole] = useState<string | undefined>(undefined)

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i)

  // Queries
  const { data: monthlyTableData, isLoading: monthlyTableLoading } = trpc.analytics.getMonthlyTable.useQuery({
    year: selectedYear,
  })

  const { data: funnelData, isLoading: funnelLoading } = trpc.analytics.getFunnelByRoleYear.useQuery({
    years: [funnelYear],
    roles: funnelRole ? [funnelRole] : undefined,
  })

  const { data: funnelSummary, isLoading: funnelSummaryLoading } = trpc.analytics.getFunnelSummary.useQuery({
    years: [funnelYear],
  })

  const { data: velocityData, isLoading: velocityLoading } = trpc.analytics.getHiringVelocityByRole.useQuery({
    years: [selectedYear],
  })

  const { data: sourceData, isLoading: sourceLoading } = trpc.analytics.getSourceBreakdown.useQuery({
    year: selectedYear,
  })

  const { data: trendsData } = trpc.analytics.getHiringTrends.useQuery({
    periods: 6,
  })

  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  // Transform trends data for chart
  const chartData = trendsData?.periods?.map((p) => ({
    month: p.label,
    [trendsData.metric]: p.count,
  })) || []

  // Get unique roles from funnel data for filter dropdown
  const uniqueRoles = funnelData?.funnelData?.map((r) => r.role).filter((v, i, a) => a.indexOf(v) === i) || []

  // Calculate velocity summary stats
  const velocityStats = velocityData?.perHire?.length
    ? {
        average: Math.round(velocityData.perHire.reduce((sum, h) => sum + h.velocityDays, 0) / velocityData.perHire.length),
        fastest: Math.min(...velocityData.perHire.map((h) => h.velocityDays)),
        slowest: Math.max(...velocityData.perHire.map((h) => h.velocityDays)),
      }
    : { average: 0, fastest: 0, slowest: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hiring Analytics</h1>
        <p className="text-gray-500">Track and analyze your hiring performance metrics</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="sources">By Source</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="flex gap-4 mb-4">
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

          {/* Key Metrics Cards */}
          {monthlyTableLoading ? (
            renderLoading()
          ) : monthlyTableData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <MetricCard
                  title="Trial Pass Rate"
                  value={monthlyTableData.keyMetrics.trialPassRate}
                  format="percentage"
                  icon={CheckCircle}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                />
                <MetricCard
                  title="Trial-Hire Rate"
                  value={monthlyTableData.keyMetrics.trialHireRate}
                  format="percentage"
                  icon={UserCheck}
                  iconColor="text-emerald-600"
                  iconBgColor="bg-emerald-100"
                />
                <MetricCard
                  title="Offer Acceptance"
                  value={monthlyTableData.keyMetrics.offerAcceptanceRate}
                  format="percentage"
                  icon={Percent}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-100"
                />
                <MetricCard
                  title="Hiring Fill Rate"
                  value={monthlyTableData.keyMetrics.hiringFillRate}
                  format="percentage"
                  icon={Target}
                  iconColor="text-purple-600"
                  iconBgColor="bg-purple-100"
                />
                <MetricCard
                  title="Interview-Trial"
                  value={monthlyTableData.keyMetrics.interviewTrial}
                  format="percentage"
                  icon={TrendingUp}
                  iconColor="text-orange-600"
                  iconBgColor="bg-orange-100"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Funnel Chart */}
                {funnelSummary && (
                  <FunnelChart
                    title={`Hiring Funnel - ${selectedYear}`}
                    stages={[
                      { name: 'Qualified CVs', value: funnelSummary.totals.qualifiedCVs, percentage: 100 },
                      { name: 'First Stage', value: funnelSummary.totals.firstStage, percentage: funnelSummary.conversionRates.qualToFirst },
                      { name: 'Second Stage', value: funnelSummary.totals.secondStage, percentage: funnelSummary.conversionRates.firstToSecond },
                      { name: 'Third Stage', value: funnelSummary.totals.thirdStage, percentage: funnelSummary.conversionRates.secondToThird },
                      { name: 'Trial', value: funnelSummary.totals.trial, percentage: funnelSummary.conversionRates.thirdToTrial },
                      { name: 'CEO Chat', value: funnelSummary.totals.ceoChat, percentage: funnelSummary.totals.trial > 0 ? Math.round((funnelSummary.totals.ceoChat / funnelSummary.totals.trial) * 100) : 0 },
                      { name: 'Hired', value: funnelSummary.totals.hired, percentage: funnelSummary.conversionRates.trialToHired },
                    ]}
                  />
                )}

                {/* Source Breakdown */}
                {sourceData && (
                  <SourceBreakdown
                    bySource={sourceData.bySource}
                    hiredBySource={sourceData.hiredBySource}
                    total={sourceData.total}
                    title={`Candidate Sources - ${selectedYear}`}
                  />
                )}
              </div>

              {/* Trends Chart */}
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

        {/* Monthly Tab */}
        <TabsContent value="monthly" className="space-y-6">
          <div className="flex gap-4 mb-4">
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

          {monthlyTableLoading ? (
            renderLoading()
          ) : monthlyTableData ? (
            <MonthlyTable
              year={selectedYear}
              months={monthlyTableData.months}
              totals={monthlyTableData.totals}
              keyMetrics={monthlyTableData.keyMetrics}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No data available for this year
            </div>
          )}

          {/* Trends Chart */}
          {chartData.length > 0 && (
            <TrendChart
              title="Monthly Hiring Trends"
              data={chartData}
              xAxisKey="month"
              chartType="bar"
              bars={[
                { dataKey: trendsData?.metric || 'hires', name: trendsData?.metric || 'Hires', color: '#10b981' },
              ]}
            />
          )}
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <div className="flex gap-4 mb-4">
            <select
              value={funnelYear}
              onChange={(e) => setFunnelYear(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={funnelRole || ''}
              onChange={(e) => setFunnelRole(e.target.value || undefined)}
              className="text-sm border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {funnelLoading || funnelSummaryLoading ? (
            renderLoading()
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Main Funnel Chart */}
                {funnelSummary && (
                  <FunnelChart
                    title={`Hiring Funnel - ${funnelYear}`}
                    stages={[
                      { name: 'Qualified CVs', value: funnelSummary.totals.qualifiedCVs, percentage: 100 },
                      { name: 'First Stage', value: funnelSummary.totals.firstStage, percentage: funnelSummary.conversionRates.qualToFirst },
                      { name: 'Second Stage', value: funnelSummary.totals.secondStage, percentage: funnelSummary.conversionRates.firstToSecond },
                      { name: 'Third Stage', value: funnelSummary.totals.thirdStage, percentage: funnelSummary.conversionRates.secondToThird },
                      { name: 'Trial', value: funnelSummary.totals.trial, percentage: funnelSummary.conversionRates.thirdToTrial },
                      { name: 'CEO Chat', value: funnelSummary.totals.ceoChat, percentage: funnelSummary.totals.trial > 0 ? Math.round((funnelSummary.totals.ceoChat / funnelSummary.totals.trial) * 100) : 0 },
                      { name: 'Hired', value: funnelSummary.totals.hired, percentage: funnelSummary.conversionRates.trialToHired },
                    ]}
                  />
                )}

                {/* Dropoff Table */}
                {funnelSummary && (
                  <DropoffTable
                    data={funnelSummary.dropoff}
                    title="Stage Dropoff Analysis"
                  />
                )}
              </div>

              {/* Conversion Rates Card */}
              {funnelSummary && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Conversion Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Qual - First</p>
                        <p className="text-lg font-bold text-blue-600">{funnelSummary.conversionRates.qualToFirst.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">First - Second</p>
                        <p className="text-lg font-bold text-blue-600">{funnelSummary.conversionRates.firstToSecond.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Second - Third</p>
                        <p className="text-lg font-bold text-blue-600">{funnelSummary.conversionRates.secondToThird.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Third - Trial</p>
                        <p className="text-lg font-bold text-blue-600">{funnelSummary.conversionRates.thirdToTrial.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Trial - Hired</p>
                        <p className="text-lg font-bold text-blue-600">{funnelSummary.conversionRates.trialToHired.toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Overall</p>
                        <p className="text-lg font-bold text-green-600">{funnelSummary.conversionRates.qualToHired.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Roles and Insights */}
              {funnelSummary && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Top Roles by Hires</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {funnelSummary.topRoles.length > 0 ? (
                        <div className="space-y-2">
                          {funnelSummary.topRoles.map((role: { role: string; hires: number }, idx: number) => (
                            <div key={role.role} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500">{idx + 1}.</span>
                                <span className="text-sm font-medium">{role.role}</span>
                              </div>
                              <span className="text-sm font-bold text-green-600">{role.hires} hired</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No hire data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <BarChart3 className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Total Candidates</p>
                            <p className="text-sm text-gray-600">{funnelSummary.totals.qualifiedCVs.toLocaleString()} qualified CVs processed</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <UserCheck className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Hires Made</p>
                            <p className="text-sm text-gray-600">{funnelSummary.totals.hired} candidates successfully hired</p>
                          </div>
                        </div>
                        {funnelSummary.biggestLoss && (
                          <div className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Biggest Loss Stage</p>
                              <p className="text-sm text-gray-600">{funnelSummary.biggestLoss.stage} ({funnelSummary.biggestLoss.lossCount} candidates)</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Funnel by Role Table */}
              {funnelData && funnelData.funnelData.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Funnel by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                            <th className="pb-3 font-medium">Role</th>
                            <th className="pb-3 font-medium text-right">Qualified</th>
                            <th className="pb-3 font-medium text-right">1st Stage</th>
                            <th className="pb-3 font-medium text-right">2nd Stage</th>
                            <th className="pb-3 font-medium text-right">3rd Stage</th>
                            <th className="pb-3 font-medium text-right">Trial</th>
                            <th className="pb-3 font-medium text-right">CEO Chat</th>
                            <th className="pb-3 font-medium text-right">Hired</th>
                            <th className="pb-3 font-medium text-right">Conv %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {funnelData.funnelData.map((row) => {
                            const yearData = row.years.find((y) => y.year === funnelYear)
                            if (!yearData) return null
                            return (
                              <tr key={row.role} className="hover:bg-gray-50">
                                <td className="py-2 text-sm font-medium">{row.role}</td>
                                <td className="py-2 text-sm text-right">{yearData.qualifiedCVs}</td>
                                <td className="py-2 text-sm text-right">{yearData.firstStage}</td>
                                <td className="py-2 text-sm text-right">{yearData.secondStage}</td>
                                <td className="py-2 text-sm text-right">{yearData.thirdStage}</td>
                                <td className="py-2 text-sm text-right">{yearData.trial}</td>
                                <td className="py-2 text-sm text-right">{yearData.ceoChat}</td>
                                <td className="py-2 text-sm text-right font-semibold text-green-600">{yearData.hired}</td>
                                <td className="py-2 text-sm text-right">{yearData.conversionRates.qualToHired.toFixed(1)}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Velocity Tab */}
        <TabsContent value="velocity" className="space-y-6">
          <div className="flex gap-4 mb-4">
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

          {velocityLoading ? (
            renderLoading()
          ) : velocityData ? (
            <>
              {/* Summary Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  title="Average Velocity"
                  value={velocityStats.average}
                  format="days"
                  icon={Clock}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-100"
                />
                <MetricCard
                  title="Fastest Hire"
                  value={velocityStats.fastest}
                  format="days"
                  icon={TrendingUp}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                />
                <MetricCard
                  title="Slowest Hire"
                  value={velocityStats.slowest}
                  format="days"
                  icon={Target}
                  iconColor="text-orange-600"
                  iconBgColor="bg-orange-100"
                />
              </div>

              <VelocityTable
                perHire={velocityData.perHire}
                byRole={velocityData.byRole}
                title={`Hiring Velocity - ${selectedYear}`}
              />
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No velocity data available
            </div>
          )}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <div className="flex gap-4 mb-4">
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

          {sourceLoading ? (
            renderLoading()
          ) : sourceData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard
                  title="Total Candidates"
                  value={sourceData.total}
                  icon={Users}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-100"
                />
                <MetricCard
                  title="Inbound"
                  value={sourceData.bySource.find((s) => s.source === 'INBOUND')?.count || 0}
                  icon={TrendingUp}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                />
                <MetricCard
                  title="Outbound"
                  value={sourceData.bySource.find((s) => s.source === 'OUTBOUND')?.count || 0}
                  icon={Target}
                  iconColor="text-purple-600"
                  iconBgColor="bg-purple-100"
                />
                <MetricCard
                  title="Recruiter"
                  value={sourceData.bySource.find((s) => s.source === 'RECRUITER')?.count || 0}
                  icon={UserCheck}
                  iconColor="text-orange-600"
                  iconBgColor="bg-orange-100"
                />
              </div>

              <SourceBreakdown
                bySource={sourceData.bySource}
                byInboundChannel={sourceData.byInboundChannel}
                byOutboundChannel={sourceData.byOutboundChannel}
                hiredBySource={sourceData.hiredBySource}
                total={sourceData.total}
                title={`Source Analysis - ${selectedYear}`}
              />
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No source data available
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
