'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface SourceItem {
  source: string
  count: number
  percentage: number
}

interface ChannelItem {
  channel: string
  count: number
}

interface HiredBySource {
  source: string
  hires: number
}

interface SourceBreakdownProps {
  bySource: SourceItem[]
  byInboundChannel?: ChannelItem[]
  byOutboundChannel?: ChannelItem[]
  hiredBySource?: HiredBySource[]
  total: number
  title?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const SOURCE_LABELS: Record<string, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
  RECRUITER: 'Recruiter',
  EXCELLER: 'Exceller',
  UNKNOWN: 'Unknown',
}

export function SourceBreakdown({
  bySource,
  byInboundChannel = [],
  byOutboundChannel = [],
  hiredBySource = [],
  total,
  title = 'Candidate Sources',
}: SourceBreakdownProps) {
  const chartData = bySource.map((s) => ({
    name: SOURCE_LABELS[s.source] || s.source,
    value: s.count,
    percentage: s.percentage,
  }))

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, payload }) => `${name} (${(payload?.percentage ?? 0).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Table */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">By Source</h4>
              <div className="space-y-2">
                {bySource.map((s, i) => (
                  <div key={s.source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-700">{SOURCE_LABELS[s.source] || s.source}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{s.count.toLocaleString()}</span>
                      <span className="text-xs text-gray-500 w-12 text-right">{s.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {hiredBySource.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Hires by Source</h4>
                <div className="space-y-1">
                  {hiredBySource.map((s) => (
                    <div key={s.source} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{SOURCE_LABELS[s.source] || s.source}</span>
                      <span className="font-semibold text-green-600">{s.hires} hired</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Candidates</span>
                <span className="text-lg font-bold">{total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Channel Breakdown */}
        {(byInboundChannel.length > 0 || byOutboundChannel.length > 0) && (
          <div className="mt-6 pt-6 border-t grid gap-4 md:grid-cols-2">
            {byInboundChannel.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Inbound Channels</h4>
                <div className="space-y-1">
                  {byInboundChannel.map((c) => (
                    <div key={c.channel} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{c.channel}</span>
                      <span className="font-medium">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {byOutboundChannel.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Outbound Channels</h4>
                <div className="space-y-1">
                  {byOutboundChannel.map((c) => (
                    <div key={c.channel} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{c.channel}</span>
                      <span className="font-medium">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
