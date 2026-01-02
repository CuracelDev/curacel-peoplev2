'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

// Route label mappings for human-readable breadcrumbs
const ROUTE_LABELS: Record<string, string> = {
  // Recruiting
  recruiting: 'Hiring',
  positions: 'Jobs',
  candidates: 'Candidates',
  new: 'New',
  edit: 'Edit',

  // People
  employees: 'Employees',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',

  // Offer
  contracts: 'Contracts',

  // Settings
  settings: 'Settings',
  general: 'General',
  integrations: 'Integrations',
  teams: 'Teams',
  'jd-templates': 'JD Templates',
  'job-description-templates': 'JD Templates',
  competencies: 'Competencies',
  'hiring-rubrics': 'Hiring Rubrics',
  documentation: 'Documentation',

  // Question Bank
  'question-bank': 'Question Bank',

  // Dashboard
  dashboard: 'Dashboard',

  // API
  'api-docs': 'API Documentation',
}

interface BreadcrumbProps {
  className?: string
  customLabels?: Record<string, string>
}

export function Breadcrumb({ className, customLabels = {} }: BreadcrumbProps) {
  const pathname = usePathname()

  // Split path and filter empty segments
  const segments = pathname.split('/').filter(Boolean)

  // Don't show breadcrumb for root/dashboard
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null
  }

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1

    // Check if segment is a UUID (dynamic route)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)

    // Get label - prefer custom labels, then route labels, then format the segment
    let label = customLabels[segment] || ROUTE_LABELS[segment]

    if (!label) {
      if (isUuid) {
        // For UUIDs, use context from previous segment
        const prevSegment = segments[index - 1]
        if (prevSegment === 'positions') {
          label = 'Job Details'
        } else if (prevSegment === 'employees') {
          label = 'Employee Details'
        } else {
          label = 'Details'
        }
      } else {
        // Format segment: replace-hyphens and capitalize
        label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
    }

    return { path, label, isLast, segment }
  })

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm text-muted-foreground', className)}
    >
      <ol className="flex items-center gap-1">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {breadcrumbs.map(({ path, label, isLast }) => (
          <li key={path} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={path}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
