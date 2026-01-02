'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  Target,
  Brain,
} from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function AssessmentAnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  const { data: metrics, isLoading: metricsLoading } = trpc.assessmentAnalytics.getOverviewMetrics.useQuery()
  const { data: funnel, isLoading: funnelLoading } = trpc.assessmentAnalytics.getCompletionFunnel.useQuery()
  const { data: benchmarks, isLoading: benchmarksLoading } = trpc.assessmentAnalytics.getRoleBenchmarks.useQuery({})
  const { data: trends, isLoading: trendsLoading } = trpc.assessmentAnalytics.getAssessmentTrends.useQuery({ period })
  const { data: aiAccuracy, isLoading: aiAccuracyLoading } = trpc.assessmentAnalytics.getAIAccuracyMetrics.useQuery()

  const isLoading = metricsLoading || funnelLoading || benchmarksLoading || trendsLoading

  const recommendationData = metrics?.recommendationDistribution
    ? Object.entries(metrics.recommendationDistribution).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assessment Analytics</h1>
          <p className="text-muted-foreground">Track assessment performance, trends, and AI accuracy</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="quarter">Last 90 days</SelectItem>
            <SelectItem value="year">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalAssessments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.pendingAssessments || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.completionRate || 0}%</div>
            <Progress value={metrics?.completionRate || 0} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgScore || 0}</div>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgCompletionMinutes || 0}</div>
            <p className="text-xs text-muted-foreground">minutes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Completion Funnel</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="benchmarks">Role Benchmarks</TabsTrigger>
          <TabsTrigger value="ai">AI Accuracy</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Funnel Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Assessment Funnel</CardTitle>
                <CardDescription>Candidate progression through assessment stages</CardDescription>
              </CardHeader>
              <CardContent>
                {funnel?.stages && funnel.stages.length > 0 ? (
                  <div className="space-y-4">
                    {funnel.stages.map((stage, index) => (
                      <div key={stage.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{stage.name}</span>
                          <span className="font-medium">{stage.count} ({stage.percentage}%)</span>
                        </div>
                        <Progress
                          value={stage.percentage}
                          className="h-2"
                          style={{
                            background: '#e5e7eb',
                          }}
                        />
                      </div>
                    ))}
                    {funnel.expired > 0 && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 pt-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>{funnel.expired} assessments expired</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No funnel data available</p>
                )}
              </CardContent>
            </Card>

            {/* Recommendation Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendation Distribution</CardTitle>
                <CardDescription>AI recommendations for completed assessments</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {recommendationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={recommendationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {recommendationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No recommendation data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Trends</CardTitle>
              <CardDescription>Assessment volume and completion over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="created"
                      stroke="#8884d8"
                      name="Created"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="completed"
                      stroke="#82ca9d"
                      name="Completed"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgScore"
                      stroke="#ffc658"
                      name="Avg Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No trend data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Benchmarks</CardTitle>
              <CardDescription>Average assessment scores by role</CardDescription>
            </CardHeader>
            <CardContent>
              {benchmarks && benchmarks.length > 0 ? (
                <div className="space-y-6">
                  {benchmarks.map((benchmark: any) => (
                    <div key={benchmark.jobId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{benchmark.jobTitle}</p>
                          <p className="text-sm text-muted-foreground">{benchmark.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{benchmark.avgScore}</p>
                          <p className="text-xs text-muted-foreground">{benchmark.totalAssessments} assessments</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {benchmark.hireRate}% hire rate
                        </span>
                        <span className="text-muted-foreground">
                          Median: {benchmark.medianScore}
                        </span>
                      </div>
                      {benchmark.typeAverages && benchmark.typeAverages.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {benchmark.typeAverages.map((ta: any) => (
                            <span
                              key={ta.type}
                              className="px-2 py-1 bg-gray-100 rounded text-xs"
                            >
                              {ta.type}: {ta.avgScore}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No benchmark data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Prediction Accuracy
                </CardTitle>
                <CardDescription>How accurate are AI hiring recommendations?</CardDescription>
              </CardHeader>
              <CardContent>
                {aiAccuracy?.accuracy !== null && aiAccuracy?.accuracy !== undefined ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-success">{aiAccuracy.accuracy}%</p>
                      <p className="text-muted-foreground">Accuracy Rate</p>
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      Based on {aiAccuracy.totalPredictions} predictions
                    </div>
                    <Progress value={aiAccuracy.accuracy} className="h-2" />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{aiAccuracy?.message || 'Not enough data yet'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Recommendation Breakdown</CardTitle>
                <CardDescription>Distribution of AI recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                {aiAccuracy?.breakdown ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <span className="font-medium text-success">HIRE</span>
                      <span className="text-2xl font-bold text-success">
                        {aiAccuracy.breakdown.hireRecommended}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="font-medium text-amber-700">HOLD</span>
                      <span className="text-2xl font-bold text-amber-700">
                        {aiAccuracy.breakdown.holdRecommended}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                      <span className="font-medium text-destructive">NO HIRE</span>
                      <span className="text-2xl font-bold text-destructive">
                        {aiAccuracy.breakdown.noHireRecommended}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No breakdown data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
