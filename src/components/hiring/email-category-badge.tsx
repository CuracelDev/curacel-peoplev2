'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EmailCategory } from '@prisma/client'

interface EmailCategoryBadgeProps {
  category: EmailCategory | null
  confidence?: number | null
  showConfidence?: boolean
  onClick?: () => void
}

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  APPLICATION: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
  INTERVIEW_SCHEDULING: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  INTERVIEW_FOLLOWUP: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
  ASSESSMENT: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  OFFER: 'bg-green-100 text-green-700 hover:bg-green-200',
  ONBOARDING: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  GENERAL_FOLLOWUP: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  OTHER: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
}

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  APPLICATION: 'Application',
  INTERVIEW_SCHEDULING: 'Interview Scheduling',
  INTERVIEW_FOLLOWUP: 'Interview Follow-up',
  ASSESSMENT: 'Assessment',
  OFFER: 'Offer',
  ONBOARDING: 'Onboarding',
  GENERAL_FOLLOWUP: 'Follow-up',
  OTHER: 'Other',
}

export function EmailCategoryBadge({
  category,
  confidence,
  showConfidence = false,
  onClick,
}: EmailCategoryBadgeProps) {
  if (!category) {
    return (
      <Badge
        variant="outline"
        className={cn('text-xs', onClick && 'cursor-pointer')}
        onClick={onClick}
      >
        Uncategorized
      </Badge>
    )
  }

  const showLowConfidence = showConfidence && confidence !== null && confidence !== undefined && confidence < 0.8

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={cn(
          'text-xs font-medium',
          CATEGORY_COLORS[category],
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        {CATEGORY_LABELS[category]}
      </Badge>
      {showLowConfidence && (
        <span className="text-xs text-muted-foreground" title={`Confidence: ${Math.round((confidence || 0) * 100)}%`}>
          ({Math.round((confidence || 0) * 100)}%)
        </span>
      )}
    </div>
  )
}
