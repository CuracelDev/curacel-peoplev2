'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Mail, ChevronDown, ChevronUp, Paperclip, ArrowDown, ArrowUp, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmailCategoryBadge } from './email-category-badge'
import { cn } from '@/lib/utils'
import type { CandidateEmail, EmailCategory } from '@prisma/client'

interface EmailWithThread extends CandidateEmail {
  thread: {
    id: string
    subject: string
    gmailThreadId: string | null
  }
}

interface CommunicationsTimelineProps {
  emails: EmailWithThread[]
  grouped: Record<string, EmailWithThread[]>
  hiringPeriod: { from: Date; to: Date }
  onCategoryClick?: (emailId: string, currentCategory: EmailCategory | null) => void
}

export function CommunicationsTimeline({
  emails,
  grouped,
  hiringPeriod,
  onCategoryClick,
}: CommunicationsTimelineProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<'date' | 'category'>('category')

  const toggleEmail = (emailId: string) => {
    const newExpanded = new Set(expandedEmails)
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId)
    } else {
      newExpanded.add(emailId)
    }
    setExpandedEmails(newExpanded)
  }

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground mb-1">No emails found</p>
          <p className="text-sm text-muted-foreground/60">
            Sync emails from Gmail to see communication history
          </p>
        </CardContent>
      </Card>
    )
  }

  const renderEmail = (email: EmailWithThread) => {
    const isExpanded = expandedEmails.has(email.id)
    const isInHiringPeriod = email.isInHiringPeriod
    const attachmentCount = Array.isArray(email.attachments) ? email.attachments.length : 0

    return (
      <div
        key={email.id}
        className={cn(
          'border rounded-lg p-4 hover:bg-muted/30 transition-colors',
          isInHiringPeriod && 'border-primary/30 bg-primary/5',
          !isInHiringPeriod && 'opacity-75'
        )}
      >
        {/* Email Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium truncate">
                {email.direction === 'OUTBOUND' ? (
                  <>
                    <ArrowUp className="h-3 w-3 inline text-blue-600" />
                    {' '}To: {email.toEmails.join(', ')}
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-3 w-3 inline text-green-600" />
                    {' '}From: {email.fromName || email.fromEmail}
                  </>
                )}
              </span>
              {email.sentAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(email.sentAt), 'MMM d, yyyy h:mm a')}
                </span>
              )}
              {attachmentCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachmentCount}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground mb-2">{email.subject}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <EmailCategoryBadge
                category={email.category}
                confidence={email.categoryConfidence}
                showConfidence={true}
                onClick={() => onCategoryClick?.(email.id, email.category)}
              />
              {isInHiringPeriod && (
                <Badge variant="outline" className="text-xs">
                  Hiring Period
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleEmail(email.id)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Email Body (Expanded) */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t">
            {email.htmlBody ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.htmlBody }}
              />
            ) : email.textBody ? (
              <div className="text-sm whitespace-pre-wrap">{email.textBody}</div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No content available</p>
            )}

            {/* Attachments */}
            {attachmentCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Attachments:</p>
                <div className="flex flex-wrap gap-2">
                  {(email.attachments as Array<{ filename: string; size?: number }>).map((att, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {att.filename}
                      {att.size && ` (${Math.round(att.size / 1024)}KB)`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (groupBy === 'category') {
    const categories = Object.keys(grouped) as EmailCategory[]
    const categoryOrder: EmailCategory[] = [
      'APPLICATION',
      'INTERVIEW_SCHEDULING',
      'INTERVIEW_FOLLOWUP',
      'ASSESSMENT',
      'OFFER',
      'ONBOARDING',
      'GENERAL_FOLLOWUP',
      'OTHER',
    ]

    const sortedCategories = categories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a)
      const bIndex = categoryOrder.indexOf(b)
      return aIndex - bIndex
    })

    return (
      <div className="space-y-6">
        {sortedCategories.map((category) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-3">
              <EmailCategoryBadge category={category as EmailCategory} />
              <Badge variant="secondary" className="text-xs">
                {grouped[category].length} email{grouped[category].length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-3">
              {grouped[category].map((email) => renderEmail(email))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Group by date
  return (
    <div className="space-y-3">
      {emails.map((email) => renderEmail(email))}
    </div>
  )
}
