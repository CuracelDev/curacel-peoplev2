'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  iconColor?: string
  iconBgColor?: string
  format?: 'number' | 'percentage' | 'currency' | 'days'
  currency?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  format = 'number',
  currency = 'USD',
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'days':
        return `${val} days`
      default:
        return val.toLocaleString()
    }
  }

  const getChangeIcon = () => {
    if (change === undefined || change === 0) return Minus
    return change > 0 ? TrendingUp : TrendingDown
  }

  const getChangeColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500'
    return change > 0 ? 'text-green-600' : 'text-red-500'
  }

  const ChangeIcon = getChangeIcon()

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">{title}</span>
            <span className="text-3xl font-bold mt-1">{formatValue(value)}</span>
            {change !== undefined && (
              <span className={cn('text-xs mt-1 flex items-center gap-1', getChangeColor())}>
                <ChangeIcon className="h-3 w-3" />
                {change > 0 ? '+' : ''}{change.toFixed(1)}%{changeLabel ? ` ${changeLabel}` : ''}
              </span>
            )}
            {subtitle && !change && (
              <span className="text-xs text-gray-500 mt-1">{subtitle}</span>
            )}
          </div>
          {Icon && (
            <div className={cn('p-3 rounded-lg', iconBgColor)}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
