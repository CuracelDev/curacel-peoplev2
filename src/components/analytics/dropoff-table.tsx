'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

interface DropoffItem {
  stage: string
  lossCount: number
  lossPct: number
}

interface DropoffTableProps {
  data: DropoffItem[]
  title?: string
  highlightBiggest?: boolean
}

export function DropoffTable({ data, title = 'Stage Dropoff Analysis', highlightBiggest = true }: DropoffTableProps) {
  const biggestLoss = data.reduce((max, d) => (d.lossCount > max.lossCount ? d : max), data[0])

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                <th className="pb-3 font-medium">Stage Transition</th>
                <th className="pb-3 font-medium text-right">Loss Count</th>
                <th className="pb-3 font-medium text-right">Loss %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    No dropoff data available
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isBiggest = highlightBiggest && item.stage === biggestLoss.stage && item.lossCount > 0
                  return (
                    <tr key={item.stage} className={isBiggest ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {isBiggest && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          <span className={`text-sm font-medium ${isBiggest ? 'text-red-700' : 'text-gray-900'}`}>
                            {item.stage}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-sm font-semibold ${isBiggest ? 'text-red-600' : ''}`}>
                          {item.lossCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-sm ${item.lossPct > 40 ? 'text-red-500 font-semibold' : item.lossPct > 20 ? 'text-orange-500' : 'text-gray-600'}`}>
                          {item.lossPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {highlightBiggest && biggestLoss && biggestLoss.lossCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Biggest loss:</strong> {biggestLoss.stage} ({biggestLoss.lossPct.toFixed(1)}% - {biggestLoss.lossCount} candidates)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
