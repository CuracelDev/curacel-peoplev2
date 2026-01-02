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
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b">
                <th className="pb-3 font-medium">Stage Transition</th>
                <th className="pb-3 font-medium text-right">Loss Count</th>
                <th className="pb-3 font-medium text-right">Loss %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    No dropoff data available
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isBiggest = highlightBiggest && item.stage === biggestLoss.stage && item.lossCount > 0
                  return (
                    <tr key={item.stage} className={isBiggest ? 'bg-destructive/10' : 'hover:bg-muted/50'}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {isBiggest && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          <span className={`text-sm font-medium ${isBiggest ? 'text-destructive' : 'text-foreground'}`}>
                            {item.stage}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-sm font-semibold ${isBiggest ? 'text-destructive' : ''}`}>
                          {item.lossCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-sm ${item.lossPct > 40 ? 'text-destructive font-semibold' : item.lossPct > 20 ? 'text-orange-500' : 'text-foreground/80'}`}>
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
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning-foreground">
              <strong>Biggest loss:</strong> {biggestLoss.stage} ({biggestLoss.lossPct.toFixed(1)}% - {biggestLoss.lossCount} candidates)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
