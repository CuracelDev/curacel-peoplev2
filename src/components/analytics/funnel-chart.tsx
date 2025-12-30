'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FunnelStage {
  name: string
  value: number
  percentage: number
}

interface FunnelChartProps {
  title: string
  stages: FunnelStage[]
  showPercentages?: boolean
}

export function FunnelChart({ title, stages, showPercentages = true }: FunnelChartProps) {
  const maxValue = Math.max(...stages.map((s) => s.value))

  const colors = [
    'bg-blue-500',
    'bg-blue-400',
    'bg-cyan-400',
    'bg-teal-400',
    'bg-emerald-400',
    'bg-green-400',
    'bg-green-500',
  ]

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
            const color = colors[index % colors.length]

            return (
              <div key={stage.name} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{stage.value.toLocaleString()}</span>
                    {showPercentages && index > 0 && (
                      <span className="text-xs text-gray-500">({stage.percentage.toFixed(1)}%)</span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-500 rounded-lg flex items-center justify-center`}
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                  >
                    {widthPercent > 15 && (
                      <span className="text-xs font-medium text-white">{stage.value}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
